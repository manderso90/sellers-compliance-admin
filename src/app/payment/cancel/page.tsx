import { XCircle } from 'lucide-react'

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-[#2B2B2B] p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-[#C8102E]" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Payment Cancelled</h1>
          <p className="text-[#71717A] text-sm leading-relaxed">
            No charges were made. If you&apos;d like to complete your payment, please use the link in your invoice email.
          </p>
        </div>

        <hr className="border-[#E5E7EB]" />

        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#2B2B2B]">Seller&apos;s Compliance</p>
          <p className="text-xs text-[#A1A1AA]">Fast. Simple. Frictionless.</p>
          <a
            href="mailto:info@sellerscompliance.com"
            className="text-xs text-[#C8102E] hover:underline"
          >
            info@sellerscompliance.com
          </a>
        </div>
      </div>
    </div>
  )
}
