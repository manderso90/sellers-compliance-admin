'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Phone, Menu, X } from 'lucide-react'

export default function PublicHeader({ linkPrefix = '', minimal = false, completedCount }: { linkPrefix?: string; minimal?: boolean; completedCount?: number | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-black border-b border-stone-800">
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

            {!minimal && (
              <div className="hidden lg:flex items-center justify-center flex-1">
                <a
                  href="tel:7142105025"
                  className="flex items-center gap-3 text-white font-semibold text-2xl lg:text-3xl tracking-tight hover:text-amber-400 transition-all duration-200 cursor-pointer group"
                >
                  <Phone className="h-7 w-7 lg:h-8 lg:w-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200" />
                  <span>(714) 210-5025</span>
                </a>
              </div>
            )}

            {minimal && completedCount != null && (
              <div className="flex items-center justify-center flex-1">
                <div className="flex flex-col items-center gap-1.5 lg:gap-2">
                  <div className="flex gap-1 lg:gap-1.5">
                    {String(completedCount).padStart(5, '0').split('').map((digit, i) => (
                      <span
                        key={i}
                        className="font-mono text-xl lg:text-4xl font-bold text-white rounded-md shadow-inner ring-1 ring-white/10 px-2 py-1 lg:px-3 lg:py-2 min-w-[1.75rem] lg:min-w-[2.75rem] text-center"
                        style={{ backgroundColor: '#2B2B2B' }}
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                  <span
                    className="text-[10px] lg:text-xs font-semibold tracking-[0.2em] uppercase"
                    style={{ color: '#D4AF37' }}
                  >
                    Inspections Completed
                  </span>
                </div>
              </div>
            )}

            {!minimal && (
              <nav className="hidden lg:flex items-center space-x-8">
                {['Services', 'About', 'Book Now', 'FAQ', 'Contact'].map((item) => (
                  <a
                    key={item}
                    href={`${linkPrefix}#${item.toLowerCase().replace(' ', '-')}`}
                    className="text-stone-300 text-sm font-medium tracking-wider uppercase hover:text-white transition-colors duration-200 relative group"
                  >
                    {item}
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-red-600 to-amber-500 group-hover:w-full transition-all duration-200" />
                  </a>
                ))}
              </nav>
            )}

            {!minimal && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-stone-300 hover:text-white transition-colors duration-200"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>

          {/* Mobile phone */}
          {!minimal && (
            <div className="lg:hidden flex justify-center pb-4">
              <a
                href="tel:7142105025"
                className="flex items-center gap-2 text-white font-semibold text-xl tracking-tight hover:text-amber-400 transition-all duration-200 group"
              >
                <Phone className="h-6 w-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200" />
                <span>(714) 210-5025</span>
              </a>
            </div>
          )}
        </div>

        {!minimal && mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-800">
            <nav className="px-6 py-6 space-y-4 bg-black">
              {['Services', 'About', 'Book Now', 'FAQ', 'Contact'].map((item) => (
                <a
                  key={item}
                  href={`${linkPrefix}#${item.toLowerCase().replace(' ', '-')}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-stone-300 text-sm font-medium tracking-wider uppercase hover:text-white transition-colors duration-200 py-2"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
