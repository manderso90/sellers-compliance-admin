'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { EmployeeFormDialog } from './EmployeeFormDialog'
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { Profile } from '@/types/database'

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  inspector: 'Inspector',
  worker: 'Worker',
  external: 'External',
  agent: 'Agent',
  escrow: 'Escrow',
  coordinator: 'Coordinator',
}

interface EmployeeTableProps {
  employees: Profile[]
  currentUserId: string
}

export function EmployeeTable({ employees, currentUserId }: EmployeeTableProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null)

  const handleEdit = (employee: Profile) => {
    setSelectedEmployee(employee)
    setEditOpen(true)
  }

  const handleDelete = (employee: Profile) => {
    setSelectedEmployee(employee)
    setDeleteOpen(true)
  }

  return (
    <>
      <div className="bg-white border-2 border-[#2B2B2B] rounded-xl overflow-hidden neo-shadow-sm">
        <div className="px-5 py-4 border-b-2 border-[#2B2B2B]/10 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[#2B2B2B] display-font">Team Members</h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Manage your team&apos;s access and roles.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-[#C8102E] hover:bg-[#E8354F] text-white border-2 border-[#2B2B2B] rounded-lg text-sm neo-shadow-sm btn-press"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Employee
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#2B2B2B]/10 bg-[#FFFDF5]">
              <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                Email
              </th>
              <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                Joined
              </th>
              <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2B2B2B]/5">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-[#FFFDF5] transition-colors">
                <td className="px-5 py-3 font-medium text-[#2B2B2B]">
                  {emp.full_name || '\u2014'}
                </td>
                <td className="px-5 py-3 text-[#A1A1AA] hidden md:table-cell">{emp.email}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(emp.roles ?? []).map((r) => (
                      <span key={r} className="text-[10px] bg-blue-50 text-blue-700 border-2 border-blue-200 px-2 py-0.5 rounded-full font-bold uppercase">
                        {roleLabel[r] || r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border-2 ${
                      emp.is_active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-[#FFFDF5] text-[#A1A1AA] border-[#2B2B2B]/20'
                    }`}
                  >
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-[#A1A1AA] hidden lg:table-cell">
                  {format(new Date(emp.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleEdit(emp)}
                      className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#71717A] hover:bg-[#FFFDF5] transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {emp.id !== currentUserId && (
                      <button
                        onClick={() => handleDelete(emp)}
                        className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {employees.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-[#A1A1AA]">
            No team members yet. Click &quot;Add Employee&quot; to invite your first team member.
          </div>
        )}
      </div>

      <EmployeeFormDialog mode="add" open={addOpen} onOpenChange={setAddOpen} />

      {selectedEmployee && (
        <>
          <EmployeeFormDialog
            mode="edit"
            employee={selectedEmployee}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteEmployeeDialog
            employee={selectedEmployee}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </>
  )
}
