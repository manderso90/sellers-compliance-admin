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
import { deactivateEmployee, deleteEmployee } from '@/lib/actions/employee-actions'
import { Loader2 } from 'lucide-react'
import type { Profile } from '@/types/database'

interface DeleteEmployeeDialogProps {
  employee: Profile
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: DeleteEmployeeDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const handleDeactivate = () => {
    startTransition(async () => {
      const result = await deactivateEmployee(employee.id)
      if (result.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteEmployee(employee.id)
      if (result.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border-2 border-[#2B2B2B] rounded-xl neo-shadow">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-[#2B2B2B] display-font">Remove Employee</DialogTitle>
          <DialogDescription className="text-[13px] text-[#71717A]">
            Choose how to handle <strong>{employee.full_name || employee.email}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-xl border-2 border-[#2B2B2B] p-3">
            <p className="text-sm font-medium text-[#2B2B2B]">Deactivate</p>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Revokes access but keeps their profile and inspection history. This is the safe option.
            </p>
          </div>
          <div className="rounded-xl border-2 border-red-200 p-3">
            <p className="text-sm font-medium text-red-700">Delete permanently</p>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Removes the profile entirely. Use only if the employee was added by mistake.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="border-2 border-[#2B2B2B] rounded-lg neo-shadow-sm btn-press">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            className="bg-white text-[#C8102E] hover:bg-red-50 border-2 border-[#C8102E] rounded-lg neo-shadow-sm btn-press"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Delete
          </Button>
          <Button
            onClick={handleDeactivate}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white border-2 border-[#2B2B2B] rounded-lg neo-shadow-sm btn-press"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
