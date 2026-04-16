import type { Property } from '@/types/database'

export function formatPropertyAddress(property: Pick<Property, 'street_address' | 'unit' | 'city' | 'state' | 'zip_code'>): string {
  const parts = [property.street_address]
  if (property.unit) parts.push(`Unit ${property.unit}`)
  parts.push(`${property.city}, ${property.state} ${property.zip_code}`)
  return parts.join(', ')
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set — skipping geocoding')
    return null
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) {
    console.error('Geocoding API error:', res.status)
    return null
  }

  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.length) {
    console.warn('Geocoding failed for address:', address, 'Status:', data.status)
    return null
  }

  const location = data.results[0].geometry.location
  return { lat: location.lat, lng: location.lng }
}

export async function geocodeProperty(
  supabase: { from: (table: string) => unknown },
  propertyId: string,
  property: Pick<Property, 'street_address' | 'unit' | 'city' | 'state' | 'zip_code'>
): Promise<{ lat: number; lng: number } | null> {
  const address = formatPropertyAddress(property)
  const coords = await geocodeAddress(address)

  if (coords) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('properties') as any)
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq('id', propertyId)
  }

  return coords
}
