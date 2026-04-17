'use client'

import { Syne, Space_Grotesk } from 'next/font/google'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
})

export function CommandCenterShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${syne.variable} ${spaceGrotesk.variable} sc-bold relative -m-6 p-6 min-h-full`}
      style={{ backgroundColor: '#FFFDF5' }}
    >
      {/* Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-[5%] left-[10%] w-72 h-72 bg-[#C8102E] rounded-full mix-blend-multiply blur-3xl opacity-[0.12] animate-blob" />
        <div className="absolute top-[50%] right-[5%] w-80 h-80 bg-[#D4AF37] rounded-full mix-blend-multiply blur-3xl opacity-[0.12] animate-blob blob-delay-2" />
        <div className="absolute bottom-[5%] left-[40%] w-64 h-64 bg-[#C8102E] rounded-full mix-blend-multiply blur-[80px] opacity-[0.08] animate-blob blob-delay-4" />
      </div>

      {/* Content */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
