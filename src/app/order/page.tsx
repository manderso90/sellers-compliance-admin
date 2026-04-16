'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { APIProvider } from '@vis.gl/react-google-maps'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  MapPin,
  User,
  Calendar,
  Wrench,
  ClipboardCheck,
  Phone,
  Clock,
  Pencil,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react'

// Brand tokens
const B = {
  red: '#C62026',
  redHover: '#a81b20',
  redLight: '#fdf2f2',
  redBorder: '#f5c2c3',
  gold: '#ECB120',
  goldLight: '#fffbeb',
  goldBorder: '#f5dfa0',
  charcoal: '#222222',
  neutral: '#F5F5F5',
}

type FormData = {
  // Step 1: Property
  street_address: string
  unit: string
  city: string
  zip_code: string
  property_type: string
  // Step 2: Contact
  customer_full_name: string
  customer_email: string
  customer_phone: string
  customer_type: string
  company_name: string
  // Step 3: Scheduling
  requested_date: string
  requested_time_preference: string
  preferred_time_1: string
  preferred_time_2: string
  // Step 4: Service + Access
  service_type: string
  previous_inspection_ref: string
  includes_installation: boolean
  access_instructions: string
  lockbox_code: string
  lockbox_type: string
  lockbox_cbs_code: string
  contact_on_site: string
  listing_agent_name: string
  public_notes: string
}

const STEPS = [
  { number: 1, label: 'Property', icon: MapPin },
  { number: 2, label: 'Contact', icon: User },
  { number: 3, label: 'Schedule', icon: Calendar },
  { number: 4, label: 'Details', icon: Wrench },
  { number: 5, label: 'Review', icon: ClipboardCheck },
]

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (!digits.length) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

const initialForm: FormData = {
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
  requested_time_preference: '',
  preferred_time_1: '',
  preferred_time_2: '',
  service_type: 'standard',
  previous_inspection_ref: '',
  includes_installation: false,
  access_instructions: '',
  lockbox_code: '',
  lockbox_type: '',
  lockbox_cbs_code: '',
  contact_on_site: '',
  listing_agent_name: '',
  public_notes: '',
}

const TIME_OPTIONS: { value: string; label: string; helper?: string }[] = [
  { value: 'morning', label: 'Morning (8am\u201312pm)', helper: 'We start our work day at 9 a.m. Once your request has been submitted, a scheduling specialist will reach out within one business hour to confirm a specific time.' },
  { value: 'afternoon', label: 'Afternoon (12pm\u20135pm)', helper: 'We end our work day at 5 p.m. Once your request has been submitted, a scheduling specialist will reach out within one business hour to confirm a specific time.' },
  { value: 'anytime', label: 'Flexible Access (Lockbox / Go Anytime)', helper: 'Fastest option \u2014 we\u2019ll schedule at the earliest availability' },
]

const TIME_LABELS: Record<string, string> = {
  morning: 'Morning (8am\u201312pm)',
  afternoon: 'Afternoon (12pm\u20135pm)',
  anytime: 'Flexible Access (Lockbox / Go Anytime)',
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  single_family: 'Single Family',
  condo: 'Condo',
  townhouse: 'Townhouse',
  multi_family: 'Multi-Family',
  other: 'Other',
}

const ROLE_LABELS: Record<string, string> = {
  agent: 'Real Estate Agent',
  broker: 'Broker',
  transaction_coordinator: 'Transaction Coordinator',
  seller: 'Seller',
  escrow: 'Escrow Officer',
  other: 'Other',
}

export default function OrderPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Auto-dismiss validation banner after 6 seconds
  useEffect(() => {
    if (!validationMessage) return
    const timer = setTimeout(() => setValidationMessage(null), 6000)
    return () => clearTimeout(timer)
  }, [validationMessage])

  const FIELD_LABELS: Partial<Record<keyof FormData, string>> = {
    street_address: 'Street Address',
    city: 'City',
    zip_code: 'Zip Code',
    customer_full_name: 'Full Name',
    customer_email: 'Email Address',
    requested_date: 'Preferred Date',
    requested_time_preference: 'Time Preference',
  }

  const set = (field: keyof FormData, value: string | boolean | null) => {
    setForm((prev) => ({ ...prev, [field]: value ?? '' }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validateStep = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (step === 1) {
      if (!form.street_address.trim()) newErrors.street_address = 'Required'
      if (!form.city.trim()) newErrors.city = 'Required'
      if (!/^\d{5}$/.test(form.zip_code)) newErrors.zip_code = 'Enter a valid 5-digit zip'
    }
    if (step === 2) {
      if (!form.customer_full_name.trim()) newErrors.customer_full_name = 'Required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email))
        newErrors.customer_email = 'Enter a valid email'
    }
    if (step === 3) {
      if (!form.requested_date) newErrors.requested_date = 'Required'
      if (!form.requested_time_preference) newErrors.requested_time_preference = 'Required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const next = () => {
    if (validateStep()) {
      setValidationMessage(null)
      setStep((s) => Math.min(s + 1, 5))
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    } else {
      // Build a friendly message listing the missing fields
      const newErrors: Partial<Record<keyof FormData, string>> = {}
      if (step === 1) {
        if (!form.street_address.trim()) newErrors.street_address = 'Required'
        if (!form.city.trim()) newErrors.city = 'Required'
        if (!/^\d{5}$/.test(form.zip_code)) newErrors.zip_code = 'Required'
      }
      if (step === 2) {
        if (!form.customer_full_name.trim()) newErrors.customer_full_name = 'Required'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email)) newErrors.customer_email = 'Required'
      }
      if (step === 3) {
        if (!form.requested_date) newErrors.requested_date = 'Required'
        if (!form.requested_time_preference) newErrors.requested_time_preference = 'Required'
      }
      const missingFields = Object.keys(newErrors)
        .map((k) => FIELD_LABELS[k as keyof FormData] || k)
      if (missingFields.length === 1) {
        setValidationMessage(`Please complete the required field: ${missingFields[0]}`)
      } else {
        setValidationMessage(`Please complete the following required fields: ${missingFields.join(', ')}`)
      }
    }
  }
  const back = () => {
    setStep((s) => Math.max(s - 1, 1))
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const notesWithRef = form.previous_inspection_ref
        ? `[Previous inspection: ${form.previous_inspection_ref}] ${form.public_notes}`.trim()
        : form.public_notes

      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          public_notes: notesWithRef,
          includes_installation: form.includes_installation,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        alert(result.error || 'Something went wrong. Please try again.')
        return
      }

      const params = new URLSearchParams({
        id: result.inspectionId,
        cn: result.confirmationNumber,
        address: result.address,
        date: result.requestedDate || '',
        time: form.requested_time_preference,
        notes: form.public_notes,
      })
      router.push(`/order/confirmation?${params.toString()}`)
    } catch (err) {
      alert('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places']}>
    <div className="min-h-screen" style={{ backgroundColor: B.neutral }}>
      {/* Header */}
      <header className="w-full bg-black border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-32 lg:h-40">
            <div className="flex-shrink-0">
              <Link href="/">
                <Image
                  src="/Seller_Compliance_SVG_File.svg"
                  alt="Seller's Compliance Logo"
                  width={200}
                  height={148}
                  className="h-[7.35rem] lg:h-[9.1rem] w-auto"
                  priority
                />
              </Link>
            </div>
            <div className="flex items-center justify-center flex-1">
              <a
                href="tel:7142105025"
                className="flex items-center gap-3 text-white font-semibold text-2xl lg:text-3xl tracking-tight hover:text-amber-400 transition-all duration-200 cursor-pointer group"
              >
                <Phone className="h-7 w-7 lg:h-8 lg:w-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200" />
                <span>(714) 210-5025</span>
              </a>
            </div>
            <div className="hidden sm:flex items-center text-stone-300 text-sm font-medium tracking-wider uppercase">
              Schedule an Inspection
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Progress stepper */}
        <div className="flex items-center pb-2">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className={cn('flex flex-col items-center', i < STEPS.length - 1 && 'flex-1')}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all"
                  style={
                    step > s.number
                      ? { backgroundColor: B.gold, borderColor: B.gold, color: '#fff', boxShadow: `0 0 0 3px ${B.goldLight}` }
                      : step === s.number
                      ? { backgroundColor: B.red, borderColor: B.red, color: '#fff', boxShadow: `0 0 0 3px ${B.redLight}, 0 2px 8px rgba(198,32,38,0.25)` }
                      : { backgroundColor: '#fff', borderColor: '#e5e5e5', color: '#bbb' }
                  }
                >
                  {step > s.number ? <Check className="w-4 h-4" strokeWidth={3} /> : s.number}
                </div>
                <span
                  className="text-xs sm:text-sm mt-1.5 hidden sm:block font-sans"
                  style={
                    step === s.number
                      ? { color: B.red, fontWeight: 600 }
                      : step > s.number
                      ? { color: B.charcoal, fontWeight: 500 }
                      : { color: '#bbb', fontWeight: 400 }
                  }
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="h-1 flex-1 mx-2 mb-6 rounded-full transition-all"
                  style={{ backgroundColor: step > s.number ? B.gold : '#e5e5e5' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div ref={formRef} className="bg-white rounded-2xl p-7 sm:p-8 space-y-6" style={{ border: '1px solid #e5e5e5', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

          {/* Validation banner */}
          {validationMessage && (
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300"
              style={{
                backgroundColor: B.redLight,
                border: `1px solid ${B.redBorder}`,
                color: B.red,
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="flex-1">{validationMessage}</span>
              <button
                type="button"
                onClick={() => setValidationMessage(null)}
                className="shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Property */}
          {step === 1 && (
            <>
              <StepHeader
                icon={<MapPin className="w-5 h-5" style={{ color: B.red }} />}
                title="Property Address"
                desc="Where is the inspection taking place?"
              />
              <Field label="Street Address" error={errors.street_address} required helperText="Start typing to search addresses">
                <AddressAutocomplete
                  value={form.street_address}
                  onChange={(val) => set('street_address', val)}
                  onSelect={(addr) => {
                    setForm((prev) => ({
                      ...prev,
                      street_address: addr.street_address,
                      city: addr.city,
                      zip_code: addr.zip_code,
                    }))
                    setErrors((prev) => ({
                      ...prev,
                      street_address: undefined,
                      city: undefined,
                      zip_code: undefined,
                    }))
                    setAutoFilled(true)
                    setTimeout(() => setAutoFilled(false), 1500)
                  }}
                  className="h-11"
                />
              </Field>
              <Field label="Unit / Apt (optional)">
                <Input
                  value={form.unit}
                  onChange={(e) => set('unit', e.target.value)}
                  className="h-11"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City" error={errors.city} required>
                  <Input
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    className={cn("h-11", autoFilled && "ring-2 ring-amber-300/60 transition-all duration-700")}
                  />
                </Field>
                <Field label="Zip Code" error={errors.zip_code} required>
                  <Input
                    value={form.zip_code}
                    onChange={(e) => set('zip_code', e.target.value)}
                    maxLength={5}
                    className={cn("h-11", autoFilled && "ring-2 ring-amber-300/60 transition-all duration-700")}
                  />
                </Field>
              </div>

              {/* Property Type — Card Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: '#333' }}>Property Type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'single_family', label: 'Single Family' },
                    { value: 'condo', label: 'Condo' },
                    { value: 'townhouse', label: 'Townhouse' },
                    { value: 'multi_family', label: 'Multi-Family' },
                    { value: 'other', label: 'Other' },
                  ].map((opt) => {
                    const selected = form.property_type === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('property_type', opt.value)}
                        className={cn(
                          'card-selectable flex items-center gap-2.5 px-4 py-3',
                          selected && 'card-selectable-selected'
                        )}
                      >
                        <span
                          className="card-selectable-indicator w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                          style={{
                            borderColor: selected ? B.red : '#ccc',
                            backgroundColor: selected ? B.red : 'transparent',
                          }}
                        >
                          {selected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                        </span>
                        <span className="text-sm font-medium" style={{ color: selected ? B.red : B.charcoal }}>
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <p className="trust-copy">
                Most inspections are completed same-day or within 24 hours.
              </p>
            </>
          )}

          {/* Step 2: Contact */}
          {step === 2 && (
            <>
              <StepHeader
                icon={<User className="w-5 h-5" style={{ color: B.red }} />}
                title="Contact Details"
                desc="Who should we coordinate with for this inspection?"
              />
              <Field label="Full Name" error={errors.customer_full_name} required>
                <Input
                  value={form.customer_full_name}
                  onChange={(e) => set('customer_full_name', e.target.value)}
                  className="h-11"
                />
              </Field>
              <Field label="Email Address" error={errors.customer_email} required>
                <Input
                  type="email"
                  value={form.customer_email}
                  onChange={(e) => set('customer_email', e.target.value)}
                  className="h-11"
                />
              </Field>
              <Field label="Phone Number (Recommended)">
                <Input
                  type="tel"
                  value={form.customer_phone}
                  onChange={(e) => set('customer_phone', formatPhone(e.target.value))}
                  className="h-11"
                />
              </Field>

              {/* Role — Card Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: '#333' }}>Your Role</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'agent', label: 'Real Estate Agent' },
                    { value: 'broker', label: 'Broker' },
                    { value: 'transaction_coordinator', label: 'Transaction Coordinator' },
                    { value: 'seller', label: 'Seller' },
                    { value: 'escrow', label: 'Escrow Officer' },
                    { value: 'other', label: 'Other' },
                  ].map((opt) => {
                    const selected = form.customer_type === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('customer_type', opt.value)}
                        className={cn(
                          'card-selectable flex items-center gap-2.5 px-4 py-3',
                          selected && 'card-selectable-selected'
                        )}
                      >
                        <span
                          className="card-selectable-indicator w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                          style={{
                            borderColor: selected ? B.red : '#ccc',
                            backgroundColor: selected ? B.red : 'transparent',
                          }}
                        >
                          {selected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                        </span>
                        <span className="text-sm font-medium" style={{ color: selected ? B.red : B.charcoal }}>
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Field label="Company / Brokerage (optional)">
                <Input
                  value={form.company_name}
                  onChange={(e) => set('company_name', e.target.value)}
                  className="h-11"
                />
              </Field>
            </>
          )}

          {/* Step 3: Scheduling */}
          {step === 3 && (
            <>
              <StepHeader
                icon={<Calendar className="w-5 h-5" style={{ color: B.red }} />}
                title="Preferred Schedule"
                desc="When would you like the inspection? We offer same-day and next-day service."
              />
              <Field label="Preferred Date" labelStyle={{ color: B.red }}>
                <Input
                  type="date"
                  value={form.requested_date}
                  onChange={(e) => set('requested_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-11"
                />
              </Field>

              {/* Time Preference + Turnaround — locked until date is selected */}
              <div className="relative">
                {!form.requested_date && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#999' }}>
                      <Lock className="w-4 h-4" />
                      Please select a date first
                    </div>
                  </div>
                )}
                <div className={cn(
                  'space-y-6 transition-all duration-300',
                  !form.requested_date && 'opacity-50 pointer-events-none'
                )}>
                  {/* Time Preference — Card Selector */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium" style={{ color: B.red }}>Time Preference</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {TIME_OPTIONS.map((opt) => {
                        const selected = form.requested_time_preference === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => set('requested_time_preference', opt.value)}
                            className={cn(
                              'card-selectable flex items-start gap-2.5 px-4 py-3.5',
                              selected && 'card-selectable-selected'
                            )}
                          >
                            <span
                              className="card-selectable-indicator mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                              style={{
                                borderColor: selected ? B.red : '#ccc',
                                backgroundColor: selected ? B.red : 'transparent',
                              }}
                            >
                              {selected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                            </span>
                            <span>
                              <span className="text-sm font-medium block" style={{ color: selected ? B.red : B.charcoal }}>
                                {opt.label}
                              </span>
                              {opt.helper && (
                                <span className="text-xs block mt-0.5" style={{ color: '#888' }}>
                                  {opt.helper}
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Turnaround Reassurance */}
                  <div
                    className="rounded-xl p-5 flex items-start gap-4"
                    style={{
                      backgroundColor: B.goldLight,
                      border: `1px solid ${B.goldBorder}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: '#fef3c7' }}
                    >
                      <Clock className="w-5 h-5" style={{ color: '#92700c' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold font-sans" style={{ color: '#78350f' }}>
                        Fast Turnaround
                      </p>
                      <p className="text-sm mt-0.5 font-sans" style={{ color: '#92400e' }}>
                        We typically confirm within 1 business hour and can often schedule same-day or next-day.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 4: Service details */}
          {step === 4 && (
            <>
              <StepHeader
                icon={<Wrench className="w-5 h-5" style={{ color: B.red }} />}
                title="Service Details"
                desc="Takes less than 30 seconds. Tell us how to access the property and any important details."
              />

              {/* 1. Service Type Cards */}
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: '#333' }}>Service Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { value: 'standard', title: 'Standard Inspection', desc: 'For new compliance inspections' },
                    { value: 'reinspection', title: 'Work Completion (Follow-Up)', desc: 'Use this if we\'re completing items from a previous inspection' },
                  ] as const).map((opt) => {
                    const selected = form.service_type === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          set('service_type', opt.value)
                          if (opt.value === 'reinspection') {
                            set('includes_installation', false)
                          }
                        }}
                        className={cn(
                          'card-selectable flex items-start gap-3 px-4 py-4 text-left',
                          selected && 'card-selectable-selected'
                        )}
                      >
                        <span
                          className="card-selectable-indicator mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                          style={{
                            borderColor: selected ? B.red : '#ccc',
                            backgroundColor: selected ? B.red : 'transparent',
                          }}
                        >
                          {selected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                        </span>
                        <span>
                          <span className="text-sm font-semibold block" style={{ color: selected ? B.red : B.charcoal }}>
                            {opt.title}
                          </span>
                          <span className="text-xs block mt-0.5" style={{ color: '#888' }}>
                            {opt.desc}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Conditional: Previous Inspection Reference */}
              {form.service_type === 'reinspection' && (
                <Field label="Previous Inspection Address or Invoice #">
                  <Input
                    value={form.previous_inspection_ref}
                    onChange={(e) => set('previous_inspection_ref', e.target.value)}
                    className="h-11"
                  />
                </Field>
              )}

              {/* 2. Property Access Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pt-1">
                  <h3 className="text-sm font-semibold font-sans" style={{ color: '#555' }}>Property Access</h3>
                  <div className="flex-1 h-px" style={{ backgroundColor: '#e5e5e5' }} />
                </div>
                <Field label="Access Instructions">
                  <Textarea
                    value={form.access_instructions}
                    onChange={(e) => set('access_instructions', e.target.value)}
                    className="min-h-[100px] resize-none rounded-xl"
                  />
                </Field>
                {/* Lockbox Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium" style={{ color: '#333' }}>Lockbox Type (Optional)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { value: 'combination', label: 'Combination Lock Box' },
                      { value: 'supra', label: 'Supra' },
                    ] as const).map((opt) => {
                      const selected = form.lockbox_type === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            if (form.lockbox_type === opt.value) {
                              set('lockbox_type', '')
                              set('lockbox_code', '')
                              set('lockbox_cbs_code', '')
                            } else {
                              set('lockbox_type', opt.value)
                              if (opt.value === 'combination') {
                                set('lockbox_cbs_code', '')
                              } else {
                                set('lockbox_code', '')
                              }
                            }
                          }}
                          className={cn(
                            'card-selectable flex flex-col gap-2 px-4 py-3.5 text-left',
                            selected && 'card-selectable-selected'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="card-selectable-indicator w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                              style={{
                                borderColor: selected ? B.red : '#ccc',
                                backgroundColor: selected ? B.red : 'transparent',
                              }}
                            >
                              {selected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                            </span>
                            <span className="text-sm font-medium" style={{ color: selected ? B.red : B.charcoal }}>
                              {opt.label}
                            </span>
                          </div>
                          {selected && opt.value === 'combination' && (
                            <Input
                              value={form.lockbox_code}
                              onChange={(e) => set('lockbox_code', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-10 mt-1"
                            />
                          )}
                          {selected && opt.value === 'supra' && (
                            <Input
                              value={form.lockbox_cbs_code}
                              onChange={(e) => set('lockbox_cbs_code', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-10 mt-1"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Field label="On-Site Contact (Optional)">
                  <Input
                    value={form.contact_on_site}
                    onChange={(e) => set('contact_on_site', e.target.value)}
                    className="h-11"
                  />
                </Field>
              </div>

              {/* 3. Installation Card Toggle — hidden for reinspection */}
              {form.service_type !== 'reinspection' && (
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-start gap-4 p-5 rounded-xl cursor-pointer transition-all text-left border-2',
                    form.includes_installation
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                  )}
                  onClick={() => set('includes_installation', !form.includes_installation)}
                >
                  <div
                    className="mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all"
                    style={{
                      backgroundColor: form.includes_installation ? B.gold : '#fff',
                      borderColor: form.includes_installation ? B.gold : '#d4d4d4',
                    }}
                  >
                    {form.includes_installation && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <div>
                    <span className="text-sm font-semibold block" style={{ color: B.charcoal }}>
                      Add Installation Service
                    </span>
                    <span className="text-xs block mt-0.5" style={{ color: '#666' }}>
                      Fix failed items on the same visit and avoid rescheduling
                    </span>
                  </div>
                </button>
              )}

              {/* 4. Additional Notes */}
              <Field label="Additional Notes (optional)">
                <Textarea
                  value={form.public_notes}
                  onChange={(e) => set('public_notes', e.target.value)}
                  className="h-20 resize-none rounded-xl"
                />
              </Field>

              <p className="trust-copy">
                Most inspections are completed same-day or within 24 hours.
              </p>
            </>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <>
              <StepHeader
                icon={<ClipboardCheck className="w-5 h-5" style={{ color: B.red }} />}
                title="Review & Submit"
                desc="Everything look right? Submit your request and we'll be in touch within 1 business hour."
              />

              <div className="space-y-4">
                {/* Property Section */}
                <ReviewSection
                  icon={<MapPin className="w-4 h-4" style={{ color: B.red }} />}
                  title="Property"
                  onEdit={() => setStep(1)}
                >
                  <ReviewRow label="Address">
                    {form.street_address}
                    {form.unit ? ` #${form.unit}` : ''}, {form.city}, CA {form.zip_code}
                  </ReviewRow>
                  <ReviewRow label="Type">{PROPERTY_TYPE_LABELS[form.property_type] || form.property_type}</ReviewRow>
                </ReviewSection>

                {/* Contact Section */}
                <ReviewSection
                  icon={<User className="w-4 h-4" style={{ color: B.red }} />}
                  title="Contact"
                  onEdit={() => setStep(2)}
                >
                  <ReviewRow label="Name">{form.customer_full_name}</ReviewRow>
                  <ReviewRow label="Email">{form.customer_email}</ReviewRow>
                  {form.customer_phone && <ReviewRow label="Phone">{form.customer_phone}</ReviewRow>}
                  <ReviewRow label="Role">{ROLE_LABELS[form.customer_type] || form.customer_type}</ReviewRow>
                  {form.company_name && <ReviewRow label="Company">{form.company_name}</ReviewRow>}
                </ReviewSection>

                {/* Schedule Section */}
                <ReviewSection
                  icon={<Calendar className="w-4 h-4" style={{ color: B.red }} />}
                  title="Schedule"
                  onEdit={() => setStep(3)}
                >
                  <ReviewRow label="Date">
                    {form.requested_date || 'Flexible \u2014 will contact to schedule'}
                  </ReviewRow>
                  <ReviewRow label="Time">
                    {TIME_LABELS[form.requested_time_preference] ?? form.requested_time_preference}
                  </ReviewRow>
                </ReviewSection>

                {/* Service Section */}
                <ReviewSection
                  icon={<Wrench className="w-4 h-4" style={{ color: B.red }} />}
                  title="Service"
                  onEdit={() => setStep(4)}
                >
                  <div className="px-4 py-3">
                    <ul className="space-y-1.5">
                      <li className="flex items-center gap-2 text-sm" style={{ color: B.charcoal }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: B.red }} />
                        {form.service_type === 'reinspection' ? 'Work Completion (Follow-Up)' : 'Standard Inspection'}
                      </li>
                      {form.includes_installation && (
                        <li className="flex items-center gap-2 text-sm" style={{ color: B.charcoal }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: B.gold }} />
                          Installation Service Included
                        </li>
                      )}
                    </ul>
                    {form.previous_inspection_ref && (
                      <p className="text-sm mt-2 pt-2" style={{ color: '#666', borderTop: '1px solid #f0f0f0' }}>
                        <span className="font-medium" style={{ color: '#999' }}>Previous Ref: </span>
                        {form.previous_inspection_ref}
                      </p>
                    )}
                  </div>
                </ReviewSection>

                {/* Access Section */}
                {(form.access_instructions || form.lockbox_type || form.contact_on_site || form.public_notes) && (
                  <ReviewSection
                    icon={<Wrench className="w-4 h-4" style={{ color: B.red }} />}
                    title="Access & Notes"
                    onEdit={() => setStep(4)}
                  >
                    {form.access_instructions && <ReviewRow label="Access">{form.access_instructions}</ReviewRow>}
                    {form.lockbox_type === 'combination' && form.lockbox_code && (
                      <ReviewRow label="Lockbox">Combination Lock Box: {form.lockbox_code}</ReviewRow>
                    )}
                    {form.lockbox_type === 'supra' && form.lockbox_cbs_code && (
                      <ReviewRow label="Lockbox">Supra: {form.lockbox_cbs_code}</ReviewRow>
                    )}
                    {form.lockbox_type && !form.lockbox_code && !form.lockbox_cbs_code && (
                      <ReviewRow label="Lockbox">{form.lockbox_type === 'combination' ? 'Combination Lock Box' : 'Supra'}</ReviewRow>
                    )}
                    {form.contact_on_site && <ReviewRow label="On-Site">{form.contact_on_site}</ReviewRow>}
                    {form.public_notes && <ReviewRow label="Notes">{form.public_notes}</ReviewRow>}
                  </ReviewSection>
                )}
              </div>

              {/* Terms */}
              <p className="text-xs rounded-xl p-4" style={{ backgroundColor: B.neutral, color: '#777', border: '1px solid #e5e5e5' }}>
                By submitting, you agree that Seller&apos;s Compliance will contact you to confirm your appointment.
                Inspections typically take 10–15 minutes.
              </p>

              {/* Confidence copy */}
              <p className="text-sm text-center font-sans font-medium" style={{ color: '#666' }}>
                You&apos;re almost done &mdash; we&apos;ll confirm within 1 business hour.
              </p>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-3 border-t" style={{ borderColor: '#f0f0f0' }}>
            <button
              type="button"
              onClick={step === 1 ? () => router.back() : back}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm"
              style={{ borderColor: '#e5e5e5', color: B.charcoal, backgroundColor: '#fff' }}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md"
                style={{ backgroundColor: B.red }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = B.redHover)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = B.red)}
              >
                {step === 4 ? 'Continue to Review' : 'Continue'} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white min-w-44 justify-center transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-md"
                style={{ backgroundColor: B.red }}
                onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = B.redHover)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = B.red)}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  'Confirm & Submit Request'
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs font-sans" style={{ color: '#aaa' }}>
          Questions? Email{' '}
          <a href="mailto:info@sellerscompliance.com" className="underline" style={{ color: B.red }}>
            info@sellerscompliance.com
          </a>
        </p>
      </div>
    </div>
    </APIProvider>
  )
}

/* ─── Inline Helper Components ─── */

function StepHeader({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3.5 pb-2 mb-2">
      <div
        className="p-2.5 rounded-xl shrink-0"
        style={{ backgroundColor: '#fdf2f2' }}
      >
        {icon}
      </div>
      <div>
        <h2 className="font-semibold text-lg tracking-wide font-sans" style={{ color: '#222222' }}>
          {title}
        </h2>
        <p className="text-sm mt-1 font-sans" style={{ color: '#777' }}>{desc}</p>
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  required,
  helperText,
  labelStyle,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  helperText?: string
  labelStyle?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <Label className="text-sm font-medium" style={{ color: '#333', ...labelStyle }}>
          {label}
          {required && <span className="ml-1" style={{ color: '#C62026' }}>*</span>}
        </Label>
        {helperText && <p className="field-helper">{helperText}</p>}
      </div>
      {children}
      {error && <p className="text-xs font-medium mt-1.5" style={{ color: '#C62026' }}>{error}</p>}
    </div>
  )
}

function ReviewSection({
  icon,
  title,
  onEdit,
  children,
}: {
  icon: React.ReactNode
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e5e5' }}>
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider font-sans" style={{ color: '#666' }}>
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-medium transition-colors hover:underline font-sans"
          style={{ color: B.red }}
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {children}
      </div>
    </div>
  )
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3 text-sm">
      <span className="w-20 shrink-0 font-medium text-xs uppercase tracking-wider font-sans" style={{ color: '#999' }}>{label}</span>
      <span className="font-sans" style={{ color: '#222222' }}>{children}</span>
    </div>
  )
}
