'use client'

import { useState } from 'react'
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

export default function SignInPage() {
  const router = useRouter()
  const [view, setView] = useState<AuthView>('credentials')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

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
            <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-background p-6">
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
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Sign in'}
              </Button>

              {/* Magic link option — sign-in only */}
              {!isSignUp && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    className="w-full"
                    onClick={handleMagicLink}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Sign in with Magic Link
                  </Button>
                </>
              )}
            </form>

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
