/**
 * Inspection pricing rules for Seller's Compliance.
 *
 * Standard (SFR / Condo / Townhouse): $125
 * ADU surcharge: +$15 per ADU
 * Apartment building (multi_family): $125 + $15 per unit
 */

const BASE_PRICE = 125
const ADU_SURCHARGE = 15
const UNIT_SURCHARGE = 15

export function calculateInspectionPrice(
  propertyType: string,
  aduCount: number = 0,
  unitCount: number = 1
): number {
  if (propertyType === 'multi_family') {
    return BASE_PRICE + UNIT_SURCHARGE * unitCount
  }
  return BASE_PRICE + ADU_SURCHARGE * aduCount
}

export function getInspectionPrice(inspection: {
  price: number | null
  properties?: {
    property_type: string
    adu_count: number | null
    unit_count: number | null
  } | null
}): number {
  if (inspection.price != null && Number(inspection.price) > 0) {
    return Number(inspection.price)
  }
  if (!inspection.properties) return BASE_PRICE
  return calculateInspectionPrice(
    inspection.properties.property_type,
    inspection.properties.adu_count ?? 0,
    inspection.properties.unit_count ?? 1
  )
}

export function getInspectionProfit(inspection: {
  price: number | null
  inspection_labor_cost: number | null
  inspection_travel_cost: number | null
  properties?: {
    property_type: string
    adu_count: number | null
    unit_count: number | null
  } | null
}): number {
  const revenue = getInspectionPrice(inspection)
  const labor = Number(inspection.inspection_labor_cost ?? 0)
  const travel = Number(inspection.inspection_travel_cost ?? 0)
  return revenue - labor - travel
}
