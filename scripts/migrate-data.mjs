import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function parseEnv(p) {
  const out = {}
  for (const raw of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    const k = line.slice(0, i).trim()
    const v = line.slice(i + 1).trim()
    if (!(k in out)) out[k] = v
  }
  return out
}

const devEnv = parseEnv(resolve(root, 'apps/backend/.env'))
const prodEnv = parseEnv(resolve(root, 'apps/backend/.env.prod'))

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
for (const k of REQUIRED) {
  if (!devEnv[k] || !prodEnv[k] || devEnv[k].toLowerCase().includes('paste_aqui') || prodEnv[k].toLowerCase().includes('paste_aqui')) {
    console.error(`FALTA ${k} en .env (dev) y/o .env.prod`)
    process.exit(1)
  }
}

const dev = createClient(devEnv.SUPABASE_URL, devEnv.SUPABASE_SERVICE_ROLE_KEY)
const prod = createClient(prodEnv.SUPABASE_URL, prodEnv.SUPABASE_SERVICE_ROLE_KEY)

const TABLES = ['loyalty_transactions', 'orders', 'order_items', 'payments']
const PAGE = 500

async function readAll(client, table) {
  const rows = []
  let from = 0
  for (;;) {
    const { data, error } = await client.from(table).select('*').order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(`${table} read: ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return rows
}

async function writeAll(client, table, rows) {
  let inserted = 0
  for (let i = 0; i < rows.length; i += PAGE) {
    const chunk = rows.slice(i, i + PAGE)
    const { error } = await client.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new Error(`${table} insert chunk ${i}: ${error.message}`)
  }
  return inserted
}

for (const table of TABLES) {
  const rows = await readAll(dev, table)
  console.log(`${table}: dev tiene ${rows.length} filas`)
  await writeAll(prod, table, rows)
  const { count, error } = await prod.from(table).select('id', { count: 'exact', head: true })
  if (error) throw new Error(`${table} count prod: ${error.message}`)
  console.log(`${table}: prod quedó con ${count} filas`)
  if (count !== rows.length) console.warn(`  ⚠️  DISCREPANCIA: dev ${rows.length} vs prod ${count}`)
}
console.log('OK')