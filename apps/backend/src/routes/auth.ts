import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import { loginSchema, registerSchema } from '@ultimate-pos/shared'
import { supabaseAdmin } from '../lib/supabase/admin'
import { badRequest, unauthorized } from '../middleware/error'
import type { RegisterInput } from '@ultimate-pos/shared'
import { getPrimaryMembership } from '../lib/membership'

const supabaseUrl = process.env.SUPABASE_URL!
const anonKey = process.env.SUPABASE_ANON_KEY!

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

async function mintToken(userId: string, storeId: string | null, role: string | null) {
  return new SignJWT({ store_id: storeId ?? '', role: role ?? '' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())
}

export const authRouter = new Hono()

authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const supabase = createClient(supabaseUrl, anonKey)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw unauthorized(error.message)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email')
    .eq('email', email)
    .single()

  const membership = await getPrimaryMembership(data.user.id)

  const access_token = await mintToken(
    data.user.id,
    membership?.store_id ?? null,
    membership?.role ?? null,
  )

  return c.json({
    id: data.user.id,
    email: data.user.email,
    name: profile?.name || data.user.user_metadata?.name || '',
    image: data.user.user_metadata?.avatar_url,
    store_id: membership?.store_id || null,
    role: membership?.role || null,
    access_token,
  })
})

authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const input = c.req.valid('json') as RegisterInput

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  })

  if (error) throw badRequest(error.message)
  if (!data.user) throw badRequest('Failed to create user')

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: data.user.id,
    email: input.email,
    name: input.name,
  })
  if (profileError) throw badRequest(profileError.message)

  if (input.store_name) {
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({
        name: input.store_name,
        slug: input.store_name.toLowerCase().replace(/\s+/g, '-'),
        owner_id: data.user.id,
      })
      .select('id')
      .single()

    if (storeError) throw badRequest(storeError.message)

    const { error: memberError } = await supabaseAdmin
      .from('store_members')
      .insert({
        store_id: store.id,
        profile_id: data.user.id,
        role: 'admin',
        joined_at: new Date().toISOString(),
      })
    if (memberError) throw badRequest(memberError.message)
  }

  return c.json({
    id: data.user.id,
    email: input.email,
    name: input.name,
    store_id: undefined,
    role: input.store_name ? 'admin' : null,
  }, 201)
})

authRouter.get('/me', async (c) => {
  const email = c.req.query('email')
  if (!email) throw badRequest('Email required')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!profile) {
    return c.json({ profile_id: null, store_id: null, role: null, access_token: null })
  }

  const membership = await getPrimaryMembership(profile.id)

  const store_id = membership?.store_id || null
  const role = membership?.role || null
  const access_token = await mintToken(profile.id, store_id, role)

  return c.json({
    profile_id: profile.id,
    store_id,
    role,
    access_token,
  })
})

authRouter.post('/check-google', async (c) => {
  const { email, name, avatar_url } = await c.req.json()

  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    const membership = await getPrimaryMembership(existingProfile.id)

    return c.json({
      exists: true,
      profile_id: existingProfile.id,
      store_id: membership?.store_id || null,
      role: membership?.role || null,
    })
  }

  const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name, avatar_url },
  })

  if (createError) throw badRequest(createError.message)
  if (!authUser.user) throw badRequest('Failed to create user')

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authUser.user.id,
    email,
    name: name || email.split('@')[0],
    avatar_url,
  })

  if (profileError) throw badRequest(profileError.message)

  return c.json({
    exists: false,
    profile_id: authUser.user.id,
    store_id: null,
    role: null,
  })
})

authRouter.post('/invite', async (c) => {
  const { email, store_id } = await c.req.json()

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

  if (error) throw badRequest(error.message)

  await supabaseAdmin.from('store_members').insert({
    store_id,
    profile_id: data.user.id,
    role: 'employee',
  })

  return c.json({ message: 'Invitation sent' })
})
