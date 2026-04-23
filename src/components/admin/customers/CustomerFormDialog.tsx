'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { updateCustomer } from '@/lib/actions/customer-actions'
import type { Customer } from '@/types/database'

type CustomerType = 'agent' | 'broker' | 'transaction_coordinator' | 'seller' | 'escrow' | 'other'

const customerTypeOptions: readonly [CustomerType, string][] = [
  ['agent', 'Agent'],
  ['broker', 'Broker'],
  ['transaction_coordinator', 'Transaction Coordinator'],
  ['seller', 'Seller'],
  ['escrow', 'Escrow'],
  ['other', 'Other'],
]

interface Props {
  customer: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function CustomerFormDialog({ customer, open, onOpenChange }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Initial state is derived once per mount. The parent unmounts this
  // component between edit sessions, so each open is a fresh mount with
  // fresh initial values — no reset effect needed.
  const [fullName, setFullName] = useState(customer.full_name)
  const [email, setEmail] = useState(customer.email)
  const [phone, setPhone] = useState(customer.phone ? formatPhone(customer.phone) : '')
  const [companyName, setCompanyName] = useState(customer.company_name ?? '')
  const [customerType, setCustomerType] = useState<CustomerType>(
    (customer.customer_type as CustomerType) ?? 'agent'
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        await updateCustomer(customer.id, {
          full_name: fullName,
          email,
          phone: phone || null,
          company_name: companyName || null,
          customer_type: customerType,
        })
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update customer')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 border-[#2B2B2B] rounded-xl neo-shadow">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-[#2B2B2B]">Edit Customer</DialogTitle>
          <DialogDescription className="text-[13px] text-[#71717A]">
            Update customer contact details and role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <Label htmlFor="edit_full_name" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Full Name *
            </Label>
            <Input
              id="edit_full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit_email" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Email *
            </Label>
            <Input
              id="edit_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit_phone" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Phone
            </Label>
            <Input
              id="edit_phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="edit_company" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Company
            </Label>
            <Input
              id="edit_company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Role
            </Label>
            <div className="flex flex-wrap gap-2">
              {customerTypeOptions.map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                    customerType === value
                      ? 'border-[#2B2B2B] bg-[#2B2B2B] text-white'
                      : 'border-[#2B2B2B] bg-transparent hover:bg-[#FFFDF5]'
                  }`}
                >
                  <input
                    type="radio"
                    name="customer_type"
                    value={value}
                    checked={customerType === value}
                    onChange={() => setCustomerType(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border-2 border-red-200">{error}</p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="border-2 border-[#2B2B2B] rounded-lg neo-shadow-sm btn-press"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#FDE047] text-black border-2 border-black font-bold rounded-lg neo-shadow-sm btn-press hover:bg-[#FACC15]"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
