'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Trash2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CustomerFormDialog } from './CustomerFormDialog'
import { DeleteCustomerDialog } from './DeleteCustomerDialog'
import type { CustomerWithCount } from '@/lib/queries/customers'

type Tab = 'all' | 'agents' | 'sellers'

const customerTypeLabel: Record<string, string> = {
  agent: 'Agent',
  broker: 'Broker',
  transaction_coordinator: 'Transaction Coordinator',
  seller: 'Seller',
  escrow: 'Escrow',
  other: 'Other',
}

interface Props {
  customers: CustomerWithCount[]
}

export function CustomerTable({ customers }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [editTarget, setEditTarget] = useState<CustomerWithCount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomerWithCount | null>(null)

  const agentCount = useMemo(
    () => customers.filter((c) => c.customer_type === 'agent').length,
    [customers]
  )
  const sellerCount = useMemo(
    () => customers.filter((c) => c.customer_type === 'seller').length,
    [customers]
  )

  const filtered = useMemo(() => {
    let result = customers
    if (activeTab === 'agents') result = result.filter((c) => c.customer_type === 'agent')
    else if (activeTab === 'sellers') result = result.filter((c) => c.customer_type === 'seller')

    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.company_name && c.company_name.toLowerCase().includes(q))
      )
    }
    return result
  }, [customers, activeTab, query])

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: customers.length },
    { key: 'agents', label: 'Agents', count: agentCount },
    { key: 'sellers', label: 'Sellers', count: sellerCount },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-[#2B2B2B] bg-[#2B2B2B] text-white'
                  : 'border-[#2B2B2B] bg-transparent hover:bg-[#FFFDF5]'
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 text-xs ${
                  activeTab === tab.key ? 'text-white/70' : 'text-[#71717A]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or company..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border-2 border-[#2B2B2B] bg-white neo-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FFFDF5] border-b-2 border-[#2B2B2B]">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Inspections
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#71717A]">
                    {customers.length === 0
                      ? 'No customers yet. Create a job to add your first customer.'
                      : 'No customers match this filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-t border-[#E5E5E5] hover:bg-[#FFFDF5]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#2B2B2B]">{customer.full_name}</p>
                      {customer.company_name && (
                        <p className="text-xs text-[#71717A] mt-0.5">{customer.company_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col text-xs text-[#2B2B2B]">
                        {customer.email && (
                          <a
                            href={`mailto:${customer.email}`}
                            className="hover:underline truncate max-w-[240px]"
                          >
                            {customer.email}
                          </a>
                        )}
                        {customer.phone && (
                          <a href={`tel:${customer.phone}`} className="hover:underline text-[#71717A]">
                            {customer.phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-lg border-2 border-[#2B2B2B] px-2 py-0.5 text-xs font-medium ${
                          customer.customer_type === 'agent'
                            ? 'bg-[#FDE047]'
                            : customer.customer_type === 'seller'
                            ? 'bg-[#FFFDF5]'
                            : 'bg-white'
                        }`}
                      >
                        {customerTypeLabel[customer.customer_type] ?? customer.customer_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#2B2B2B]">
                      {customer.inspection_count}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#71717A]">
                      {format(new Date(customer.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setEditTarget(customer)}
                          aria-label={`Edit ${customer.full_name}`}
                          className="p-1.5 rounded-md border-2 border-[#2B2B2B] hover:bg-[#FFFDF5]"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#2B2B2B]" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(customer)}
                          aria-label={`Delete ${customer.full_name}`}
                          className="p-1.5 rounded-md border-2 border-[#C8102E] hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#C8102E]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget && (
        <CustomerFormDialog
          customer={editTarget}
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null)
          }}
        />
      )}
      {deleteTarget && (
        <DeleteCustomerDialog
          customer={deleteTarget}
          inspectionCount={deleteTarget.inspection_count}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}
