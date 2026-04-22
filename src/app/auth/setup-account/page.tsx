'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function SetupAccountInner() {
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash')
  const typeParam = searchParams.get('type')

  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tokenHash || !typeParam) {
      setError('Invalid invite link — please ask your administrator to re-send.')
      setVerifying(false)
      return
    }

    if (typeParam !== 'invite' && typeParam !== 'recovery') {
      setError('Invalid invite link — please ask your administrator to re-send.')
      setVerifying(false)
      return
    }

    const supabase = createClient()
    supabase.auth
      .verifyOtp({ type: typeParam, token_hash: tokenHash })
      .then(({ error: verifyError }) => {
        if (verifyError) {
          setError(verifyError.message)
        } else {
          setVerified(true)
        }
        setVerifying(false)
      })
  }, [tokenHash, typeParam])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    window.location.assign('/admin/dispatch')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg shadow-sm p-8">
        <h1 className="text-xl font-semibold text-slate-900 text-center mb-2">
          Seller&apos;s Compliance
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Set up your account
        </p>

        {verifying && (
          <p className="text-sm text-slate-600 text-center" role="status">
            Verifying invite…
          </p>
        )}

        {!verifying && !verified && (
          <p className="text-sm text-red-600" role="alert">
            {error ?? 'Invalid or expired invite link.'}
          </p>
        )}

        {!verifying && verified && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={submitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={submitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Setting password…' : 'Set password and sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    }>
      <SetupAccountInner />
    </Suspense>
  )
}
