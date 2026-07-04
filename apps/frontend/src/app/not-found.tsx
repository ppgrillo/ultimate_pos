import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container/50 border border-outline-variant/30 mb-6">
        <span className="text-2xl font-headline font-extrabold text-on-surface-variant">404</span>
      </div>
      <h1 className="font-headline text-headline-lg text-on-surface text-balance text-center mb-2">
        Page not found
      </h1>
      <p className="text-sm text-on-surface-variant text-center max-w-sm mb-8">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-label font-bold text-primary-on transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
