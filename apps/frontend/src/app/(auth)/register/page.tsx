'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const data = new FormData(e.currentTarget)
    const body = {
      store_name: data.get('store_name') as string,
      name: data.get('name') as string,
      email: data.get('email') as string,
      password: data.get('password') as string,
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Registration failed' }))
        setError(err.message || 'Registration failed')
        setIsLoading(false)
        return
      }

      const result = await signIn('credentials', {
        email: body.email,
        password: body.password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/dashboard')
      } else {
        setError('Account created. Please sign in.')
        setIsLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-headline font-extrabold text-primary-on">P</span>
          </div>
          <CardTitle>Create your store</CardTitle>
          <CardDescription>Set up your POS in minutes</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error/10 border border-error p-3 text-sm text-error">
                {error}
              </div>
            )}
            <Input label="Store Name" name="store_name" placeholder="My Store" required />
            <Input label="Your Name" name="name" placeholder="John Doe" required />
            <Input label="Email" name="email" type="email" placeholder="you@store.com" required />
            <Input label="Password" name="password" type="password" placeholder="••••••••" minLength={6} required />
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Store
            </Button>
            <p className="text-sm text-on-surface-variant">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
