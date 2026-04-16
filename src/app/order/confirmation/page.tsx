import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, Calendar, MapPin, Mail, Phone, Clock, ClipboardCheck, FileText, Plus } from 'lucide-react'
import { Suspense } from 'react'

const B = {
  red: '#C62026',
  gold: '#ECB120',
  goldLight: '#fffbeb',
  goldBorder: '#f5dfa0',
  charcoal: '#222222',
  neutral: '#F5F5F5',
}

const TIME_LABELS: Record<string, string> = {
  morning: 'Morning (8am\u201312pm)',
  afternoon: 'Afternoon (12pm\u20135pm)',
  anytime: 'Flexible Access (Lockbox / Go Anytime)',
  flexible: 'Flexible \u2014 will contact to schedule',
}

function ConfirmationContent({
  searchParams,
}: {
  searchParams: Record<string, string>
}) {
  const address = searchParams.address || '\u2014'
  const requestedDate = searchParams.date || null
  const timePreference = searchParams.time || null
  const notes = searchParams.notes || null

  const nextSteps = [
    {
      icon: Clock,
      title: 'Confirmation',
      text: 'We\u2019ll review your request and confirm your appointment within \u003Cstrong\u003E1 business hour\u003C/strong\u003E.',
    },
    {
      icon: Phone,
      title: 'Scheduling',
      text: 'You\u2019ll receive a confirmation call or email with your scheduled time.',
    },
    {
      icon: ClipboardCheck,
      title: 'Inspection',
      text: 'Our inspector will arrive on time and complete the inspection in \u003Cstrong\u003E10\u201315 minutes\u003C/strong\u003E.',
    },
    {
      icon: FileText,
      title: 'Report',
      text: 'You\u2019ll receive a clear digital report summarizing all findings.',
    },
  ]

  return (
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
              Inspection Confirmed
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">

        {/* Success card */}
        <div className="bg-white rounded-2xl p-8 sm:p-10 text-center space-y-5" style={{ border: '1px solid #e5e5e5', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div className="flex justify-center">
            <div className="w-18 h-18 rounded-full flex items-center justify-center" style={{ width: '4.5rem', height: '4.5rem', backgroundColor: B.goldLight, border: `2px solid ${B.goldBorder}` }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: B.gold }} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-sans" style={{ color: B.charcoal }}>
              Inspection Request Confirmed
            </h1>
            <p className="mt-3 text-sm font-sans" style={{ color: '#666' }}>
              We have received your request. A scheduling specialist will reach out within one business hour to confirm a specific time.
            </p>
          </div>
        </div>

        {/* Inspection details card */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e5e5', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider font-sans" style={{ backgroundColor: B.charcoal, color: '#fff' }}>
            Inspection Details
          </div>
          <div className="divide-y divide-gray-100 p-2">

            <div className="flex items-start gap-3.5 px-4 py-4">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: B.red }} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1 font-sans" style={{ color: '#999' }}>Property Address</p>
                <p className="text-sm font-sans" style={{ color: B.charcoal }}>{address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 px-4 py-4">
              <Calendar className="w-4 h-4 mt-0.5 shrink-0" style={{ color: B.red }} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1 font-sans" style={{ color: '#999' }}>Requested Date &amp; Time</p>
                <p className="text-sm font-sans" style={{ color: B.charcoal }}>
                  {requestedDate
                    ? new Date(requestedDate + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : "Flexible \u2014 we'll contact you to schedule"}
                </p>
                {timePreference && (
                  <p className="text-sm mt-0.5 font-sans" style={{ color: '#666' }}>
                    {TIME_LABELS[timePreference] ?? timePreference}
                  </p>
                )}
              </div>
            </div>

            {notes && (
              <div className="flex items-start gap-3.5 px-4 py-4">
                <div className="w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1 font-sans" style={{ color: '#999' }}>Additional Notes</p>
                  <p className="text-sm font-sans" style={{ color: B.charcoal }}>{notes}</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* What happens next */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e5e5', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider font-sans" style={{ backgroundColor: B.charcoal, color: '#fff' }}>
            What Happens Next
          </div>
          <div className="p-6 space-y-5">
            {nextSteps.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: B.goldLight, border: `1px solid ${B.goldBorder}` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: '#92700c' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-sans" style={{ color: B.charcoal }}>{item.title}</p>
                    <p
                      className="text-sm mt-0.5 font-sans"
                      style={{ color: '#555' }}
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: B.goldLight, border: `1px solid ${B.goldBorder}` }}>
          <p className="text-sm font-semibold mb-2 font-sans" style={{ color: B.charcoal }}>Questions? Reach us anytime:</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <a
              href="mailto:info@sellerscompliance.com"
              className="flex items-center gap-2 text-sm hover:underline font-sans"
              style={{ color: B.red }}
            >
              <Mail className="w-4 h-4" />
              info@sellerscompliance.com
            </a>
            <a
              href="tel:7142105025"
              className="flex items-center gap-2 text-sm hover:underline font-sans"
              style={{ color: B.red }}
            >
              <Phone className="w-4 h-4" />
              (714) 210-5025
            </a>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/order"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md font-sans"
            style={{ backgroundColor: B.red }}
          >
            <Plus className="w-4 h-4" />
            Schedule Another Inspection
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors hover:shadow-sm font-sans"
            style={{ borderColor: '#e5e5e5', color: B.charcoal, backgroundColor: '#fff' }}
          >
            Back to Home
          </Link>
        </div>

        {/* Brand reassurance */}
        <p className="text-center text-xs font-sans" style={{ color: '#bbb' }}>
          Seller&apos;s Compliance &mdash; Fast, reliable compliance inspections for real estate professionals.
        </p>

      </div>
    </div>
  )
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  return (
    <Suspense>
      <ConfirmationContent searchParams={params} />
    </Suspense>
  )
}
