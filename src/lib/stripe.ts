import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
      // Use fetch-based HTTP client — more reliable on Vercel Fluid Compute
      // than the default Node http agent, which can hit intermittent
      // connection-reset issues in serverless environments.
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 2,
    })
  }
  return _stripe
}
