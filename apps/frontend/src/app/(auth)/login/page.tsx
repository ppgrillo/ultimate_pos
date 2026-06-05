'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { FcGoogle } from 'react-icons/fc'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    const data = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: data.get('email'),
      password: data.get('password'),
      redirect: false,
    })
    if (result?.error) {
      setError(result.error === 'CredentialsSignin'
        ? 'Invalid email or password'
        : result.error
      )
      setIsLoading(false)
      return
    }
    if (result?.ok) router.push('/dashboard')
    setIsLoading(false)
  }

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-headline font-extrabold text-primary-on">P</span>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your store dashboard</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon />
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-outline" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-on-surface-variant">or</span>
            </div>
          </div>
        </CardContent>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error/10 border border-error p-3 text-sm text-error">
                {error}
              </div>
            )}
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="you@store.com"
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
            <p className="text-sm text-on-surface-variant">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Create store
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

function GoogleIcon() {
  return <FcGoogle className="h-5 w-5" />
}
