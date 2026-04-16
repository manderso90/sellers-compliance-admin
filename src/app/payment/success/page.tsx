import { CheckCircle } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-[#2B2B2B] p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Payment Received</h1>
          <p className="text-[#71717A] text-sm leading-relaxed">
            Thank you for your payment. A confirmation receipt will be sent to your email from Stripe.
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
