'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { APIProvider } from '@vis.gl/react-google-maps'
import { createJob } from '@/lib/actions/job-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { Loader2 } from 'lucide-react'

type PropertyType = 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'other'
type CustomerType = 'agent' | 'broker' | 'transaction_coordinator' | 'seller' | 'escrow' | 'other'
type ServiceType = 'standard' | 'expedited' | 'reinspection'

interface FormState {
  street_address: string
  unit: string
  city: string
  zip_code: string
  property_type: PropertyType
  customer_full_name: string
  customer_email: string
  customer_phone: string
  customer_type: CustomerType
  company_name: string
  requested_date: string
  requested_time: string
  service_type: ServiceType
  includes_installation: boolean
  access_instructions: string
  lockbox_code: string
  contact_on_site: string
  listing_agent_name: string
  public_notes: string
}

const initialForm: FormState = {
  street_address: '',
  unit: '',
  city: '',
  zip_code: '',
  property_type: 'single_family',
  customer_full_name: '',
  customer_email: '',
  customer_phone: '',
  customer_type: 'agent',
  company_name: '',
  requested_date: '',
  requested_time: '',
  service_type: 'standard',
  includes_installation: false,
  access_instructions: '',
  lockbox_code: '',
  contact_on_site: '',
  listing_agent_name: '',
  public_notes: '',
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

const propertyTypeOptions: readonly [PropertyType, string][] = [
  ['single_family', 'Single Family'],
  ['condo', 'Condo'],
  ['townhouse', 'Townhouse'],
  ['multi_family', 'Multi-Family'],
  ['other', 'Other'],
]

const customerTypeOptions: readonly [CustomerType, string][] = [
  ['agent', 'Agent'],
  ['broker', 'Broker'],
  ['transaction_coordinator', 'Transaction Coordinator'],
  ['seller', 'Seller'],
  ['escrow', 'Escrow'],
  ['other', 'Other'],
]

const serviceTypeOptions: readonly [ServiceType, string][] = [
  ['standard', 'Standard'],
  ['expedited', 'Expedited'],
  ['reinspection', 'Reinspection'],
]

function Pill<T extends string>({
  value,
  label,
  checked,
  name,
  onSelect,
}: {
  value: T
  label: string
  checked: boolean
  name: string
  onSelect: (v: T) => void
}) {
  return (
    <label
      className={`cursor-pointer rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
        checked
          ? 'border-[#2B2B2B] bg-[#2B2B2B] text-white'
          : 'border-[#2B2B2B] bg-transparent hover:bg-[#FFFDF5]'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      {label}
    </label>
  )
}

function FormBody() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState('')

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        const result = await createJob({
          street_address: form.street_address,
          unit: form.unit || undefined,
          city: form.city,
          zip_code: form.zip_code,
          property_type: form.property_type,
          customer_full_name: form.customer_full_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone || undefined,
          customer_type: form.customer_type,
          company_name: form.company_name || undefined,
          requested_date: form.requested_date || undefined,
          requested_time_preference: form.requested_time || undefined,
          service_type: form.service_type,
          includes_installation: form.includes_installation,
          access_instructions: form.access_instructions || undefined,
          lockbox_code: form.lockbox_code || undefined,
          contact_on_site: form.contact_on_site || undefined,
          listing_agent_name: form.listing_agent_name || undefined,
          public_notes: form.public_notes || undefined,
        })
        router.push(`/admin/jobs/${result.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create job')
      }
    })
  }

  const hasMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      <div className="rounded-xl border-2 border-[#2B2B2B] bg-white neo-shadow overflow-hidden">
        {/* PROPERTY */}
        <div className="bg-[#FFFDF5] border-b-2 border-[#2B2B2B] px-5 py-4">
          <p className="text-lg font-bold text-[#2B2B2B]">Property</p>
        </div>
        <div className="px-6 pt-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="street_address" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Street Address *
              </Label>
              {hasMapsKey ? (
                <AddressAutocomplete
                  value={form.street_address}
                  onChange={(val) => set('street_address', val)}
                  onSelect={(components) => {
                    setForm((prev) => ({
                      ...prev,
                      street_address: components.street_address,
                      city: components.city || prev.city,
                      zip_code: components.zip_code || prev.zip_code,
                    }))
                  }}
                />
              ) : (
                <Input
                  id="street_address"
                  value={form.street_address}
                  onChange={(e) => set('street_address', e.target.value)}
                  placeholder="123 Main Street"
                  required
                />
              )}
            </div>
            <div>
              <Label htmlFor="unit" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Unit / Suite
              </Label>
              <Input id="unit" value={form.unit} onChange={(e) => set('unit', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="city" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                City *
              </Label>
              <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="zip_code" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Zip Code *
              </Label>
              <Input
                id="zip_code"
                value={form.zip_code}
                onChange={(e) => set('zip_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
                maxLength={5}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Property Type
              </Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {propertyTypeOptions.map(([value, label]) => (
                  <Pill
                    key={value}
                    value={value}
                    label={label}
                    name="property_type"
                    checked={form.property_type === value}
                    onSelect={(v) => set('property_type', v)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CONTACT */}
        <div className="bg-[#FFFDF5] border-t-2 border-b-2 border-[#2B2B2B] px-5 py-4">
          <p className="text-lg font-bold text-[#2B2B2B]">Contact</p>
        </div>
        <div className="px-6 pt-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_full_name" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Full Name *
              </Label>
              <Input
                id="customer_full_name"
                value={form.customer_full_name}
                onChange={(e) => set('customer_full_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="customer_email" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Email *
              </Label>
              <Input
                id="customer_email"
                type="email"
                value={form.customer_email}
                onChange={(e) => set('customer_email', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="customer_phone" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Phone
              </Label>
              <Input
                id="customer_phone"
                type="tel"
                value={form.customer_phone}
                onChange={(e) => set('customer_phone', formatPhone(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="company_name" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Company
              </Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Role
              </Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {customerTypeOptions.map(([value, label]) => (
                  <Pill
                    key={value}
                    value={value}
                    label={label}
                    name="customer_type"
                    checked={form.customer_type === value}
                    onSelect={(v) => set('customer_type', v)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SCHEDULING */}
        <div className="bg-[#FFFDF5] border-t-2 border-b-2 border-[#2B2B2B] px-5 py-4">
          <p className="text-lg font-bold text-[#2B2B2B]">Scheduling</p>
        </div>
        <div className="px-6 pt-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="requested_date" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Requested Date
              </Label>
              <Input
                id="requested_date"
                type="date"
                value={form.requested_date}
                onChange={(e) => set('requested_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="requested_time" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Requested Time
              </Label>
              <Input
                id="requested_time"
                type="time"
                value={form.requested_time}
                onChange={(e) => set('requested_time', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SERVICE */}
        <div className="bg-[#FFFDF5] border-t-2 border-b-2 border-[#2B2B2B] px-5 py-4">
          <p className="text-lg font-bold text-[#2B2B2B]">Service</p>
        </div>
        <div className="px-6 pt-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Service Type
              </Label>
              <div className="flex gap-2 mt-1">
                {serviceTypeOptions.map(([value, label]) => (
                  <Pill
                    key={value}
                    value={value}
                    label={label}
                    name="service_type"
                    checked={form.service_type === value}
                    onSelect={(v) => set('service_type', v)}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-[#2B2B2B]">
                <input
                  type="checkbox"
                  checked={form.includes_installation}
                  onChange={(e) => set('includes_installation', e.target.checked)}
                  className="h-4 w-4 rounded border-2 border-[#2B2B2B] text-[#C8102E] focus:ring-[#C8102E]"
                />
                Includes Installation
              </label>
            </div>
          </div>
        </div>

        {/* ACCESS & NOTES */}
        <div className="bg-[#FFFDF5] border-t-2 border-b-2 border-[#2B2B2B] px-5 py-4">
          <p className="text-lg font-bold text-[#2B2B2B]">Access & Notes</p>
        </div>
        <div className="px-6 pt-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="access_instructions" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Access Instructions
              </Label>
              <Input
                id="access_instructions"
                value={form.access_instructions}
                onChange={(e) => set('access_instructions', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lockbox_code" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Lockbox Code
              </Label>
              <Input
                id="lockbox_code"
                value={form.lockbox_code}
                onChange={(e) => set('lockbox_code', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="contact_on_site" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                On-Site Contact
              </Label>
              <Input
                id="contact_on_site"
                value={form.contact_on_site}
                onChange={(e) => set('contact_on_site', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="listing_agent_name" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Listing Agent
              </Label>
              <Input
                id="listing_agent_name"
                value={form.listing_agent_name}
                onChange={(e) => set('listing_agent_name', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="public_notes" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Notes
              </Label>
              <Textarea
                id="public_notes"
                rows={2}
                value={form.public_notes}
                onChange={(e) => set('public_notes', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SUBMIT */}
        <div className="border-t-2 border-[#2B2B2B] px-6 py-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border-2 border-red-400 mb-3">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="bg-[#FDE047] text-black border-2 border-black font-bold rounded-lg px-6 py-3 text-sm inline-flex items-center gap-2 hover:bg-[#FACC15] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </div>
    </form>
  )
}

export function NewJobForm() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (apiKey) {
    return (
      <APIProvider apiKey={apiKey} libraries={['places']}>
        <FormBody />
      </APIProvider>
    )
  }

  return <FormBody />
}
