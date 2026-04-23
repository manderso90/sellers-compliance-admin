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
import { Loader2 } from 'lucide-react'
import { deleteCustomer } from '@/lib/actions/customer-actions'
import type { Customer } from '@/types/database'

interface Props {
  customer: Customer
  inspectionCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteCustomerDialog({ customer, inspectionCount, open, onOpenChange }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const blocked = inspectionCount > 0

  function handleDelete() {
    setError('')
    startTransition(async () => {
      try {
        await deleteCustomer(customer.id)
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete customer')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-2 border-[#2B2B2B] rounded-xl neo-shadow">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-[#2B2B2B]">Delete Customer</DialogTitle>
          <DialogDescription className="text-[13px] text-[#71717A]">
            <strong>{customer.full_name}</strong> ({customer.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {blocked ? (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                {inspectionCount} inspection{inspectionCount === 1 ? '' : 's'} reference this customer
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Delete or reassign those inspections first. This prevents accidental data loss.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">This cannot be undone.</p>
              <p className="text-xs text-red-600 mt-1">
                The customer has no inspections and can be safely removed.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border-2 border-red-200">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="border-2 border-[#2B2B2B] rounded-lg neo-shadow-sm btn-press"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending || blocked}
            className="bg-white text-[#C8102E] hover:bg-red-50 border-2 border-[#C8102E] rounded-lg neo-shadow-sm btn-press disabled:opacity-60"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
