'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircle,
  Calendar,
  Phone,
  MapPin,
  Droplets,
  Flame,
  Home,
  ChevronDown,
  Shield,
  Clock,
} from 'lucide-react'
import PublicHeader from '@/components/public/PublicHeader'

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAQ_DATA = [
  {
    question: "What is Seller's Compliance?",
    answer:
      "Seller's Compliance is a home compliance inspection company serving Los Angeles and Orange Counties. We perform visual inspections to verify that homes meet California's required safety and compliance standards prior to sale.",
  },
  {
    question: 'What does the inspection include?',
    answer:
      "We check for smoke detectors in each bedroom and hallway outside bedrooms, smoke and carbon monoxide detectors on each level, low-flow toilets, proper water heater strapping, water heater TPR valve and overflow pipe, and in certain locations, a seismic gas shutoff valve on the gas meter.",
  },
  {
    question: 'How much does an inspection cost?',
    answer: 'The inspection fee is $125.',
  },
  {
    question: 'How long does the inspection take?',
    answer: 'Most inspections take approximately 10–15 minutes.',
  },
  {
    question: 'How quickly can I get an appointment?',
    answer:
      'Most inspections are completed the same day or within 24 hours. Inspection hours are Monday–Friday 9:00 AM – 4:00 PM and Saturday 10:00 AM – 2:00 PM. Closed Sundays.',
  },
  {
    question: 'Do you have Supra access?',
    answer:
      'Yes, we have Supra key access. If you have both, a Supra lockbox and a combination lockbox installed, please tell us the combination code too.',
  },
  {
    question: 'When will I receive the report?',
    answer: 'The written report is emailed the same day as the inspection.',
  },
  {
    question: 'Can work be completed the same day?',
    answer:
      'Yes, in many cases we can install smoke and carbon monoxide detectors the same day. Most corrective work is completed within an hour.',
  },
  {
    question: 'Do you bill through escrow?',
    answer:
      'No, we do not bill through escrow. Payment is due upon completion of service. We accept checks or online payment.',
  },
  {
    question: 'What areas do you serve?',
    answer:
      'We serve the greater Los Angeles and Orange County areas, including areas outside the City of Los Angeles. Contact us to confirm service in your specific city.',
  },
]

// ─── Components ───────────────────────────────────────────────────────────────

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
        open
          ? 'bg-white border-stone-300 shadow-md'
          : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm'
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="font-semibold text-stone-900 pr-4 text-base leading-snug">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-amber-500 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">
          {answer}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50">

      {/* ─── Header ─── */}
      <PublicHeader />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden min-h-[88vh] flex items-end">
        <Image
          src="/sellerscompliance_hero.png"
          alt="Southern California home — Seller's Compliance"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950/90 via-neutral-900/65 to-neutral-800/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/75 via-transparent to-transparent" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 pb-20 pt-32 md:pb-28 md:pt-40">
          <div className="max-w-2xl opacity-0 animate-fade-in-up">

            <div className="inline-flex items-center px-4 py-2 bg-amber-500/20 border border-amber-400/40 rounded-full mb-6 backdrop-blur-sm">
              <span className="text-amber-300 text-sm font-semibold tracking-wide">
                Simple. Fast. Compliant.
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight text-white">
              Keep Escrow Moving.<br />
              <span className="text-red-400">We Handle the Compliance.</span>
            </h1>

            <p className="text-lg md:text-xl mb-8 text-stone-200 leading-relaxed font-medium">
              Same-day inspections&nbsp;&bull;&nbsp;$125 flat fee&nbsp;&bull;&nbsp;State-required safety items handled fast
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10 opacity-0 animate-fade-in-up animation-delay-200">
              <Link
                href="/order"
                className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-base transition-all shadow-lg shadow-red-900/50 hover:shadow-xl hover:shadow-red-900/60 transform hover:-translate-y-0.5 text-center tracking-wide"
              >
                Book $125 Inspection
              </Link>
              <a
                href="#services"
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-semibold text-base transition-all border border-white/30 hover:border-white/50 text-center backdrop-blur-sm"
              >
                See What&apos;s Required at Sale
              </a>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 opacity-0 animate-fade-in-up animation-delay-300">
              {[
                '15-Minute Visual Inspection',
                'Serving Los Angeles & Orange Counties',
                'Same-Day or Next-Day Service',
                'Payment due day of services rendered',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-stone-200 text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center px-4 py-2 bg-red-50 border border-red-200 rounded-full mb-5">
              <span className="text-red-700 text-sm font-semibold tracking-wide">WHY CHOOSE US</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-4 tracking-tight">
              Professional Service You Can Trust
            </h2>
            <p className="text-lg md:text-xl text-stone-500 max-w-3xl mx-auto leading-relaxed">
              Exceptional compliance inspections with a commitment to quality, speed, and complete coverage
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                Icon: Shield,
                gradFrom: 'from-red-600',
                gradTo: 'to-red-700',
                shadowColor: 'shadow-red-200',
                borderHover: 'hover:border-red-200',
                title: 'Professional Inspectors',
                desc: 'Experienced inspectors who know California compliance requirements inside and out — done right the first time.',
                delay: 'animation-delay-100',
              },
              {
                Icon: Clock,
                gradFrom: 'from-amber-500',
                gradTo: 'to-amber-600',
                shadowColor: 'shadow-amber-200',
                borderHover: 'hover:border-amber-200',
                title: 'Quick Turnaround',
                desc: 'Same-day and next-day service to keep your escrow on schedule — no delays, no surprises.',
                delay: 'animation-delay-200',
              },
              {
                Icon: CheckCircle,
                gradFrom: 'from-red-600',
                gradTo: 'to-red-700',
                shadowColor: 'shadow-red-200',
                borderHover: 'hover:border-red-200',
                title: 'Everything Covered',
                desc: 'Smoke detectors, water heaters, low-flow fixtures — your point-of-sale requirements, fully handled.',
                delay: 'animation-delay-300',
              },
            ].map(({ Icon, gradFrom, gradTo, shadowColor, borderHover, title, desc, delay }) => (
              <div
                key={title}
                className={`opacity-0 animate-fade-in-up ${delay} group bg-white rounded-2xl border border-stone-200 ${borderHover} p-8 text-center transition-all duration-500 hover:shadow-xl hover:-translate-y-1`}
              >
                <div
                  className={`bg-gradient-to-br ${gradFrom} ${gradTo} w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg ${shadowColor}`}
                >
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-stone-900">{title}</h3>
                <p className="text-stone-500 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      <section id="services" className="py-24 md:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-200 rounded-full mb-5">
              <span className="text-amber-700 text-sm font-semibold tracking-wide">OUR SERVICES</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-4 tracking-tight">
              Comprehensive Compliance, <span className="text-red-600">Only $125</span>
            </h2>
            <p className="text-lg md:text-xl text-stone-500">
              Everything your Southern California property needs to close — inspected and handled.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">

            {/* Smoke & CO Detectors */}
            <div className="opacity-0 animate-fade-in-up animation-delay-100 group rounded-2xl overflow-hidden border border-stone-200 hover:border-red-300 transition-all duration-500 hover:shadow-2xl hover:shadow-red-100 hover:-translate-y-1 bg-white flex flex-col">
              <div className="bg-gradient-to-br from-red-700 to-red-900 p-7 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/15 to-transparent" />
                <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-white/5 rounded-full" />
                <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-4 relative z-10">
                  <Flame className="h-6 w-6 text-amber-300" />
                </div>
                <h3 className="text-xl font-bold text-white relative z-10 leading-snug">
                  Smoke &amp; Carbon Monoxide Detectors
                </h3>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-stone-600 text-sm">Inspection of existing smoke detectors and installation of new detectors when needed</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-stone-600 text-sm">CO detector testing and placement verification</span>
                  </li>
                </ul>
                <div className="border-t border-stone-100 pt-5 mt-auto">
                  <p className="text-xs font-semibold text-amber-600 tracking-widest uppercase mb-3">Installation Prices</p>
                  <ul className="space-y-2.5">
                    {[
                      ['10-Year Sealed Battery Smoke Detector', '$59'],
                      ['Hard-Wired Smoke Detector', '$69'],
                      ['Combination Smoke and CO Detector', '$99'],
                      ['Carbon Monoxide Detector', '$65'],
                    ].map(([label, price]) => (
                      <li key={label} className="flex justify-between items-center gap-4">
                        <span className="text-stone-500 text-sm">{label}</span>
                        <span className="font-bold text-red-600 text-sm shrink-0">{price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Water Heater Compliance */}
            <div className="opacity-0 animate-fade-in-up animation-delay-200 group rounded-2xl overflow-hidden border border-stone-200 hover:border-amber-300 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-100 hover:-translate-y-1 bg-white flex flex-col">
              <div className="bg-gradient-to-br from-amber-600 to-amber-800 p-7 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent" />
                <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-white/5 rounded-full" />
                <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-4 relative z-10">
                  <Droplets className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white relative z-10 leading-snug">Water Heater Compliance</h3>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <ul className="space-y-3 mb-6">
                  {[
                    'Double strapping and bracing inspection',
                    'Temperature & pressure relief valves',
                    'Overflow pipe installation',
                    'Water heater blocking',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-stone-600 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-stone-100 pt-5 mt-auto">
                  <p className="text-xs font-semibold text-amber-600 tracking-widest uppercase mb-3">Installation Prices</p>
                  <ul className="space-y-2.5">
                    {[
                      ['Double Water Heater Straps', '$129'],
                      ['TPR Valve', '$129'],
                      ['Overflow Pipe', '$99'],
                      ['Water Heater Blocking', '$195'],
                    ].map(([label, price]) => (
                      <li key={label} className="flex justify-between items-center gap-4">
                        <span className="text-stone-500 text-sm">{label}</span>
                        <span className="font-bold text-amber-600 text-sm shrink-0">{price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Low-Flow Fixtures */}
            <div className="opacity-0 animate-fade-in-up animation-delay-300 group rounded-2xl overflow-hidden border border-stone-200 hover:border-red-300 transition-all duration-500 hover:shadow-2xl hover:shadow-red-100 hover:-translate-y-1 bg-white flex flex-col">
              <div className="bg-gradient-to-br from-red-700 to-red-900 p-7 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/15 to-transparent" />
                <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-white/5 rounded-full" />
                <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-4 relative z-10">
                  <Home className="h-6 w-6 text-amber-300" />
                </div>
                <h3 className="text-xl font-bold text-white relative z-10 leading-snug">Low-Flow Fixtures</h3>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <ul className="space-y-3 mb-6">
                  {[
                    'Low-flow toilet inspection & replacement',
                    'Showerhead compliance verification',
                    'Water conservation certificate (certain cities)',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-stone-600 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-stone-100 pt-5 mt-auto">
                  <p className="text-xs font-semibold text-amber-600 tracking-widest uppercase mb-3">Installation Prices</p>
                  <ul className="space-y-2.5">
                    {[
                      ['Low-Flow Toilet Installation', '$429'],
                      ['Showerhead Replacement', '$59'],
                      ['Water Conservation Certificate', '$25'],
                    ].map(([label, price]) => (
                      <li key={label} className="flex justify-between items-center gap-4">
                        <span className="text-stone-500 text-sm">{label}</span>
                        <span className="font-bold text-red-600 text-sm shrink-0">{price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Additional Services ─── */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 opacity-0 animate-fade-in-up">
            <div className="inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-200 rounded-full mb-5">
              <span className="text-amber-700 text-sm font-semibold tracking-wide">ADDITIONAL SERVICES</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-4 tracking-tight">
              Beyond the Basics
            </h2>
          </div>
          <div className="max-w-4xl mx-auto opacity-0 animate-scale-in animation-delay-200">
            <div className="relative rounded-2xl overflow-hidden border border-stone-200 hover:border-amber-300 transition-all duration-500 hover:shadow-xl hover:shadow-amber-100/60 hover:-translate-y-1 group bg-white">
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
              {/* Subtle ambient glow */}
              <div className="absolute top-0 right-0 w-96 h-80 bg-gradient-to-bl from-amber-50 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="relative p-8 md:p-12 pl-10 md:pl-14">
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-200 mt-1">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-stone-900 mb-3 tracking-tight">
                      Seismic Gas Shutoff Valves
                    </h3>
                    <p className="text-base md:text-lg text-stone-600 leading-relaxed">
                      Not required in most areas of Los Angeles and Orange Counties — but often expected by insurance carriers. We inspect
                      and install seismic gas shutoff valves to help property owners meet insurance
                      guidelines and reduce earthquake-related risk. Call for a quote: <a href="tel:7142105025" className="text-red-600 hover:text-red-700 font-medium">(714) 210-5025</a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── About / Why SC ─── */}
      <section id="about" className="py-24 md:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">

            <div className="opacity-0 animate-slide-in-left">
              <div className="inline-flex items-center px-4 py-2 bg-red-50 border border-red-200 rounded-full mb-6">
                <span className="text-red-700 text-sm font-semibold tracking-wide">LOCAL EXPERTISE</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-5 tracking-tight">
                Why Choose Seller&apos;s Compliance?
              </h2>
              <p className="text-base md:text-lg text-stone-600 mb-10 leading-relaxed">
                We specialize in ensuring Southern California properties meet all local and state
                compliance requirements for successful real estate transactions.
              </p>
              <div className="space-y-6">
                {[
                  {
                    gradFrom: 'from-red-600',
                    gradTo: 'to-red-700',
                    shadowColor: 'shadow-red-200',
                    title: 'Expert Knowledge',
                    desc: 'Deep understanding of California real estate compliance laws and local requirements.',
                  },
                  {
                    gradFrom: 'from-amber-500',
                    gradTo: 'to-amber-600',
                    shadowColor: 'shadow-amber-200',
                    title: 'Trusted by Professionals',
                    desc: 'Preferred compliance partner for real estate agents and property owners across SoCal.',
                  },
                  {
                    gradFrom: 'from-red-600',
                    gradTo: 'to-red-700',
                    shadowColor: 'shadow-red-200',
                    title: 'Fast & Reliable',
                    desc: 'Quick scheduling, same-day service, and same-day report delivery.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-5 group">
                    <div
                      className={`bg-gradient-to-br ${item.gradFrom} ${item.gradTo} rounded-xl p-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg ${item.shadowColor}`}
                    >
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="pt-0.5">
                      <h4 className="font-bold text-stone-900 mb-1.5 text-base">{item.title}</h4>
                      <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="opacity-0 animate-slide-in-right animation-delay-200 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-100/60 to-amber-100/30 rounded-2xl blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-stone-200 p-8 md:p-10 shadow-xl">
                <h3 className="text-xl md:text-2xl font-bold mb-6 text-center text-stone-900">
                  Serving Los Angeles &amp; Orange County
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100/60 hover:border-red-200 transition-colors">
                    <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-red-200">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-stone-800">Los Angeles County</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100/60 hover:border-amber-200 transition-colors">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-200">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-stone-800">Orange County</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-stone-200 text-center space-y-2">
                  <p className="text-xs font-semibold text-amber-600 tracking-widest uppercase">Office Hours</p>
                  <p className="text-stone-700 text-sm">M–F: 9:00 AM – 5:00 PM</p>
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-amber-600 tracking-widest uppercase">Inspection Hours</p>
                    <p className="text-stone-700 text-sm">Mon–Fri: 9:00 AM – 4:00 PM</p>
                    <p className="text-stone-700 text-sm">Saturday: 10:00 AM – 2:00 PM</p>
                    <p className="text-stone-400 text-sm">Closed Sundays</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Book Now ─── */}
      <section id="book-now" className="py-24 md:py-32 bg-white relative overflow-hidden">
        {/* Subtle warm ambient accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-red-50 rounded-full blur-3xl pointer-events-none opacity-60" />

        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="opacity-0 animate-fade-in-up mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-red-50 border border-red-200 rounded-full mb-5">
              <span className="text-red-700 text-sm font-semibold tracking-wide">BOOK AN INSPECTION</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-4 tracking-tight">
              Schedule Your Inspection<br />
              <span className="text-red-600">Only $125</span>
            </h2>
            <p className="text-base md:text-xl text-stone-500">
              Fill out our simple form and we&apos;ll confirm your appointment within 1 business hour.
            </p>
            <p className="text-base md:text-lg text-stone-500 mt-2">
              (Combination and Supra Lockbox, Okay!)
            </p>
          </div>
          <div className="opacity-0 animate-scale-in animation-delay-200 bg-stone-50 rounded-2xl border border-stone-200 p-8 md:p-10 text-left shadow-sm">
            <div className="space-y-5 mb-8">
              {[
                { step: '1', text: 'Enter your property address and contact details' },
                { step: '2', text: 'Choose your preferred date and time' },
                { step: '3', text: 'Tell us about the property and access instructions' },
                { step: '4', text: "Review and submit — we'll confirm within 1 hour" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-md shadow-red-200">
                    {item.step}
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
            <Link
              href="/order"
              className="block w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 transform hover:-translate-y-0.5 text-center text-base tracking-wide"
            >
              Book Inspection →
            </Link>
            <p className="text-xs text-stone-400 mt-4 text-center">
              Same-day and next-day appointments available. We accept checks and credit cards.
              Payment due upon completion.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 md:py-32 bg-stone-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-200 rounded-full mb-5">
              <span className="text-amber-700 text-sm font-semibold tracking-wide">FAQ</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-stone-900 mb-4 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-stone-500 max-w-2xl mx-auto">
              Everything you need to know before scheduling your inspection
            </p>
          </div>
          <div className="space-y-3">
            {FAQ_DATA.map((faq, i) => (
              <FaqItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact / Footer ─── */}
      <section id="contact" className="bg-stone-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            <div>
              <Image
                src="/Seller_Compliance_SVG_File.svg"
                alt="Seller's Compliance"
                width={160}
                height={60}
                className="h-28 w-auto mb-5"
              />
              <div className="border-l-2 border-amber-500/50 pl-4 mt-1">
                <p className="text-stone-300 text-sm leading-relaxed mb-3">
                  SoCal&apos;s agent-friendly compliance inspection service.
                </p>
                <p className="text-amber-400/80 text-xs font-semibold uppercase tracking-[0.2em]">
                  Simple &middot; Fast &middot; Compliant
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-stone-100 mb-4 uppercase tracking-wider text-sm">Contact</h4>
              <div className="space-y-3 text-stone-400 text-sm">
                <a href="tel:7142105025" className="flex items-center gap-2 hover:text-amber-400 transition-colors">
                  <Phone className="h-4 w-4" />
                  (714) 210-5025
                </a>
                <a
                  href="mailto:info@sellerscompliance.com"
                  className="flex items-center gap-2 hover:text-amber-400 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  info@sellerscompliance.com
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-stone-100 mb-4 uppercase tracking-wider text-sm">Hours</h4>
              <div className="space-y-3 text-stone-400 text-sm">
                <div>
                  <p className="text-stone-300 font-semibold mb-1">Office Hours</p>
                  <p>M–F: 9:00 AM – 5:00 PM</p>
                </div>
                <div>
                  <p className="text-stone-300 font-semibold mb-1">Inspection Hours</p>
                  <p>Mon–Fri: 9:00 AM – 4:00 PM</p>
                  <p>Saturday: 10:00 AM – 2:00 PM</p>
                  <p>Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-500 text-xs">
            <p>© 2026 Seller&apos;s Compliance. Serving Orange County &amp; Los Angeles, CA.</p>
            <p>CA Point-of-Sale Compliance Inspections</p>
          </div>
        </div>
      </section>

    </div>
  )
}
