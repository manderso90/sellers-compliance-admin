'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus, Loader2, CreditCard, Copy, Check } from 'lucide-react'
import { format } from 'date-fns'
import { addPayment, deletePayment, createPaymentLink } from '@/lib/actions/payment-actions'
import type { Payment } from '@/types/database'

interface PaymentsSectionProps {
  inspectionId: string
  payments: Payment[]
  balanceDue: number
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'other', label: 'Other' },
]

export function PaymentsSection({ inspectionId, payments, balanceDue }: PaymentsSectionProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [linkStatus, setLinkStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle')
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null)
  const [linkError, setLinkError] = useState('')
  const router = useRouter()

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const handleAdd = () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    startTransition(async () => {
      await addPayment(inspectionId, numAmount, method, note || undefined)
      setAmount('')
      setMethod('cash')
      setNote('')
      setShowAdd(false)
      router.refresh()
    })
  }

  const handleDelete = (paymentId: string) => {
    startTransition(async () => {
      await deletePayment(paymentId, inspectionId)
      router.refresh()
    })
  }

  const handleCreatePaymentLink = async () => {
    setLinkStatus('loading')
    setLinkError('')
    const result = await createPaymentLink(inspectionId)
    if (result.success && result.url) {
      setPaymentLinkUrl(result.url)
      await navigator.clipboard.writeText(result.url)
      setLinkStatus('copied')
      setTimeout(() => setLinkStatus('idle'), 3000)
    } else {
      setLinkError(result.error || 'Failed to create link')
      setLinkStatus('error')
      setTimeout(() => setLinkStatus('idle'), 5000)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Payments
        </h2>
        <div className="flex items-center gap-2">
          {balanceDue > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 border-2 border-[#C8102E] text-[#C8102E] rounded-lg neo-shadow-sm"
              onClick={handleCreatePaymentLink}
              disabled={linkStatus === 'loading'}
            >
              {linkStatus === 'loading' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {linkStatus === 'copied' && <Check className="w-3 h-3 mr-1" />}
              {linkStatus !== 'loading' && linkStatus !== 'copied' && <CreditCard className="w-3 h-3 mr-1" />}
              {linkStatus === 'loading' ? 'Creating...' : linkStatus === 'copied' ? 'Copied!' : 'Payment Link'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 border-2 border-[#2B2B2B] rounded-lg neo-shadow-sm"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Payment
          </Button>
        </div>
      </div>

      {/* Payment link URL display */}
      {paymentLinkUrl && (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
          <span className="text-xs text-green-800 truncate flex-1">{paymentLinkUrl}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => {
              navigator.clipboard.writeText(paymentLinkUrl)
              setLinkStatus('copied')
              setTimeout(() => setLinkStatus('idle'), 2000)
            }}
          >
            <Copy className="w-3 h-3 text-green-700" />
          </Button>
        </div>
      )}
      {linkStatus === 'error' && linkError && (
        <p className="text-xs text-red-600">{linkError}</p>
      )}

      {/* Payment history */}
      {payments.length > 0 ? (
        <div className="space-y-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-2.5 bg-[#FFFDF5] rounded-xl border-2 border-[#2B2B2B]/10"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#2B2B2B]">
                    ${Number(payment.amount).toFixed(2)}
                  </span>
                  <span className="text-xs text-[#A1A1AA] capitalize">
                    {payment.method.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  {format(new Date(payment.paid_at), "MM/dd/yyyy 'at' h:mm a")}
                </p>
                {payment.note && (
                  <p className="text-xs text-[#71717A]">{payment.note}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => handleDelete(payment.id)}
                disabled={isPending}
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </Button>
            </div>
          ))}
        </div>
      ) : !showAdd ? (
        <p className="text-sm text-[#A1A1AA] text-center py-4">No payments recorded.</p>
      ) : null}

      {/* Add payment form */}
      {showAdd && (
        <div className="border-2 border-[#2B2B2B] rounded-xl p-3 space-y-3 bg-[#FFFDF5]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#A1A1AA] mb-1 block">Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[#A1A1AA] mb-1 block">Method</label>
              <Select value={method} onValueChange={(v) => setMethod(v ?? 'cash')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#A1A1AA] mb-1 block">Note (optional)</label>
            <Input
              placeholder="Payment note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => {
                setShowAdd(false)
                setAmount('')
                setNote('')
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={handleAdd}
              disabled={isPending || !amount || parseFloat(amount) <= 0}
            >
              {isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Record Payment
            </Button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between pt-2 border-t-2 border-[#2B2B2B]/10">
        <span className="text-sm text-[#71717A]">Total Paid</span>
        <span className="text-sm font-semibold text-[#2B2B2B]">${totalPaid.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#71717A]">Balance Due</span>
        <span
          className={`text-sm font-semibold ${
            balanceDue > 0 ? 'text-red-600' : 'text-green-700'
          }`}
        >
          ${balanceDue.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
