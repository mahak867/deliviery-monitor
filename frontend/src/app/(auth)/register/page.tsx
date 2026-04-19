'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserPlus, ArrowRight, RefreshCw, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'
import { isValidIndianPhone, normalisePhone } from '@/lib/utils'

type Step = 'details' | 'otp'

export default function RegisterPage() {
  const router = useRouter()
  const [step,    setStep]    = useState<Step>('details')
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [email,   setEmail]   = useState('')
  const [otp,     setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const startCountdown = () => {
    setCountdown(30)
    const interval = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(interval); return 0 } return c - 1 })
    }, 1000)
  }

  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Please enter your name'); return }
    const cleaned = normalisePhone(phone)
    if (!isValidIndianPhone(cleaned)) {
      toast.error('Please enter a valid 10-digit Indian mobile number')
      return
    }
    setLoading(true)
    try {
      await authApi.sendOtp(cleaned)
      setStep('otp')
      startCountdown()
      toast.success('OTP sent to your mobile number')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('Please enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await authApi.register({
        phone: normalisePhone(phone),
        name:  name.trim(),
        email: email.trim() || undefined,
        otp,
      })
      const { tokens, user } = res.data.data
      localStorage.setItem('accessToken',  tokens.accessToken)
      localStorage.setItem('refreshToken', tokens.refreshToken)
      localStorage.setItem('user',         JSON.stringify(user))
      toast.success(`Welcome to TrackAll, ${user.name}! 🎉`)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg ?? 'Registration failed. Please try again.')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          {step === 'otp' && (
            <button
              onClick={() => { setStep('details'); setOtp('') }}
              className="flex items-center gap-1.5 text-sm text-dark-400 hover:text-white mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6 text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
            <p className="text-dark-400 text-sm">
              {step === 'details'
                ? 'Join TrackAll and start tracking all your deliveries.'
                : `Enter the OTP sent to +91 ${normalisePhone(phone)}`}
            </p>
          </div>

          {step === 'details' ? (
            <form onSubmit={handleDetails} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="input-field"
                  autoFocus
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">Mobile Number *</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-300 text-sm font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="input-field flex-1"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">
                  Email Address <span className="text-dark-500">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="input-field"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim() || phone.length < 10}
                className="btn-primary w-full justify-center"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Send OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1.5">
                  One-Time Password
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit OTP"
                  className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary w-full justify-center"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={countdown > 0}
                className="w-full text-center text-sm text-dark-400 hover:text-white transition-colors disabled:opacity-50 py-1"
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-dark-700 text-center">
            <p className="text-sm text-dark-400">
              Already have an account?{' '}
              <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-dark-500 text-center mt-4">
          By registering, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
