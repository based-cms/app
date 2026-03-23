'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { toast } from 'sonner'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { resolvePostAuthRoute } from '@/lib/org-routing'

type AuthView = 'credentials' | 'verify-otp' | 'magic-link-sent'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84Z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  )
}

export default function SignInPage() {
  const router = useRouter()
  const [view, setView] = useState<AuthView>('credentials')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [lastMethod, setLastMethod] = useState<string | null>(null)

  useEffect(() => {
    // Read last login method from cookie
    const method = authClient.getLastUsedLoginMethod()
    setLastMethod(method)

    // Trigger Google One Tap
    authClient.oneTap({
      callbackURL: '/admin',
    })
  }, [])

  async function handleOAuthSignIn(provider: 'google' | 'github') {
    setOauthLoading(provider)
    // Set last-login cookie client-side before redirect — the server-side
    // plugin hook doesn't fire for OAuth 302 callbacks.
    document.cookie = `better-auth.last_used_login_method=${provider}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: '/admin',
      })
    } catch {
      toast.error('Something went wrong')
      setOauthLoading(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0] || 'user',
        })
        if (error) {
          toast.error(error.message ?? 'Sign up failed')
          return
        }
        // emailOTP plugin auto-sends verification OTP on signup
        toast.success('Check your email for a verification code')
        setView('verify-otp')
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        })
        if (error) {
          toast.error(error.message ?? 'Sign in failed')
          return
        }
        const destination = await resolvePostAuthRoute()
        router.push(destination)
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    if (!email) {
      toast.error('Enter your email first')
      return
    }
    setLoading(true)
    try {
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL: '/admin',
      })
      if (error) {
        toast.error(error.message ?? 'Failed to send magic link')
        return
      }
      setView('magic-link-sent')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    setLoading(true)
    try {
      const { error } = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      })
      if (error) {
        toast.error(error.message ?? 'Invalid code')
        setOtp('')
        return
      }
      toast.success('Email verified!')
      const destination = await resolvePostAuthRoute()
      router.push(destination)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })
      if (error) {
        toast.error(error.message ?? 'Failed to resend code')
        return
      }
      toast.success('New code sent!')
    } catch {
      toast.error('Something went wrong')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-foreground text-xs font-bold text-background">
              B
            </span>
            Based CMS
          </Link>
          {view === 'credentials' && (
            <h1 className="mt-4 text-xl font-semibold">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </h1>
          )}
        </div>

        {/* ── Credentials view ── */}
        {view === 'credentials' && (
          <>
            <div className="space-y-4 rounded-lg border bg-background p-6">
              {/* OAuth buttons */}
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="relative w-full"
                  disabled={!!oauthLoading || loading}
                  onClick={() => handleOAuthSignIn('google')}
                >
                  {oauthLoading === 'google' ? (
                    'Redirecting...'
                  ) : (
                    <>
                      <GoogleIcon className="mr-2 h-4 w-4" />
                      Continue with Google
                    </>
                  )}
                  {lastMethod === 'google' && (
                    <span className="absolute right-3 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Last used
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="relative w-full"
                  disabled={!!oauthLoading || loading}
                  onClick={() => handleOAuthSignIn('github')}
                >
                  {oauthLoading === 'github' ? (
                    'Redirecting...'
                  ) : (
                    <>
                      <GitHubIcon className="mr-2 h-4 w-4" />
                      Continue with GitHub
                    </>
                  )}
                  {lastMethod === 'github' && (
                    <span className="absolute right-3 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Last used
                    </span>
                  )}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Email/password form */}
              <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus={isSignUp}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus={!isSignUp}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="relative w-full">
                {loading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Sign in'}
                {lastMethod === 'email' && !isSignUp && (
                  <span className="absolute right-3 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-medium">
                    Last used
                  </span>
                )}
              </Button>

              {/* Magic link option — sign-in only */}
              {!isSignUp && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loading || !!oauthLoading}
                  className="w-full text-muted-foreground"
                  onClick={handleMagicLink}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Sign in with Magic Link
                </Button>
              )}
              </form>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </>
        )}

        {/* ── Verify OTP view ── */}
        {view === 'verify-otp' && (
          <div className="space-y-4 rounded-lg border bg-background p-6">
            <div className="space-y-2 text-center">
              <h2 className="text-lg font-semibold">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              className="w-full"
              disabled={otp.length < 6 || loading}
              onClick={handleVerifyOtp}
            >
              {loading ? 'Verifying...' : 'Verify email'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('credentials')
                  setOtp('')
                }}
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── Magic link sent view ── */}
        {view === 'magic-link-sent' && (
          <div className="space-y-4 rounded-lg border bg-background p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a sign-in link to{' '}
              <span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              The link expires in 5 minutes.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setView('credentials')}
            >
              Back to sign in
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
          <Link href="/imprint" className="underline-offset-4 hover:underline">
            Imprint
          </Link>
          <Link href="/contact" className="underline-offset-4 hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </main>
  )
}
