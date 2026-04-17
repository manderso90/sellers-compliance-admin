'use client'

import { useState, useTransition, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { updateEmployee } from '@/lib/actions/employee-actions'
import { Loader2 } from 'lucide-react'
import type { Profile } from '@/types/database'

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'worker', label: 'Worker' },
  { value: 'external', label: 'External' },
  { value: 'agent', label: 'Agent' },
  { value: 'escrow', label: 'Escrow' },
  { value: 'coordinator', label: 'Coordinator' },
]

interface EmployeeFormDialogProps {
  mode: 'add' | 'edit'
  employee?: Profile
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmployeeFormDialog({
  mode,
  employee,
  open,
  onOpenChange,
}: EmployeeFormDialogProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<string[]>(['inspector'])
  const [phone, setPhone] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && employee) {
        setFullName(employee.full_name || '')
        setEmail(employee.email)
        setRoles(employee.roles || ['inspector'])
        setPhone(employee.phone || '')
        setIsActive(employee.is_active)
      } else {
        setFullName('')
        setEmail('')
        setRoles(['inspector'])
        setPhone('')
        setIsActive(true)
      }
      setError('')
    }
  }, [open, mode, employee])

  const handleRoleToggle = (value: string, checked: boolean) => {
    setRoles(prev =>
      checked
        ? [...prev, value]
        : prev.filter(r => r !== value)
    )
  }

  const handleSubmit = () => {
    if (mode === 'add' && !email.trim()) {
      setError('Email is required')
      return
    }

    if (roles.length === 0) {
      setError('At least one role is required')
      return
    }

    startTransition(async () => {
      try {
        if (mode === 'add') {
          const res = await fetch('/api/employees/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim(),
              full_name: fullName.trim() || null,
              roles,
              phone: phone.trim() || null,
            }),
          })
          const data = await res.json()
          if (!res.ok) {
            setError(data.error || 'Failed to invite employee')
            return
          }
        } else if (employee) {
          await updateEmployee(employee.id, {
            full_name: fullName.trim() || undefined,
            roles,
            phone: phone.trim() || undefined,
            is_active: isActive,
          })
        }
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 border-[#2B2B2B] rounded-xl neo-shadow">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-[#2B2B2B] display-font">{mode === 'add' ? 'Add Employee' : 'Edit Employee'}</DialogTitle>
          <DialogDescription className="text-[13px] text-[#71717A]">
            {mode === 'add'
              ? 'Invite a new team member by email. They will receive an invite to set up their account.'
              : 'Update this team member\'s details.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === 'add' && (
            <div className="space-y-1.5">
              <Label htmlFor="emp-email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</Label>
              <Input
                id="emp-email"
                type="email"
                placeholder="employee@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 border-[#2B2B2B] bg-[#FFFDF5] rounded-lg"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="emp-name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</Label>
            <Input
              id="emp-name"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-2 border-[#2B2B2B] bg-[#FFFDF5] rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Roles</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={roles.includes(value)}
                    onCheckedChange={(checked) => handleRoleToggle(value, !!checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-phone" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</Label>
            <Input
              id="emp-phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border-2 border-[#2B2B2B] bg-[#FFFDF5] rounded-lg"
            />
          </div>

          {mode === 'edit' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-2 border-[#2B2B2B] text-[#C8102E] focus:ring-[#C8102E]"
              />
              <span className="text-sm text-[#71717A]">Active</span>
            </label>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="border-2 border-[#2B2B2B] rounded-lg neo-shadow-sm btn-press">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || (mode === 'add' && !email.trim()) || roles.length === 0}
            className="bg-[#C8102E] hover:bg-[#E8354F] text-white border-2 border-[#2B2B2B] rounded-lg neo-shadow-sm btn-press"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'add' ? 'Inviting...' : 'Saving...'}
              </>
            ) : mode === 'add' ? (
              'Send Invite'
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
