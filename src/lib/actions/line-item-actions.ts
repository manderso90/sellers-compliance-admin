'use server'

import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/** Coerce a quantity to a positive integer (minimum 1). */
function normalizeQuantity(value: number): number {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n >= 1 ? n : 1
}

/** Coerce a price to a finite, non-negative number. */
function normalizePrice(value: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * Add an install line item to an inspection.
 * Snapshots the product's price, part cost, labor cost, and name onto the row so
 * invoice and profit math stay correct even if the catalog changes later.
 * Stamps completed_at = now so the item counts in Command Center weekly rollups.
 */
export async function addLineItem(
  inspectionId: string,
  input: { productId: string; quantity: number; unitPrice: number }
) {
  const { supabase } = await requireAdmin()

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('product_name, price, part_cost, labor_cost')
    .eq('id', input.productId)
    .single()

  if (productError || !product) throw new Error('Product not found')

  const { error } = await supabase.from('install_line_items').insert({
    inspection_id: inspectionId,
    product_id: input.productId,
    item_name: product.product_name,
    quantity: normalizeQuantity(input.quantity),
    unit_price: normalizePrice(input.unitPrice),
    unit_part_cost: Number(product.part_cost) || 0,
    unit_labor_cost: Number(product.labor_cost) || 0,
    completed_at: new Date().toISOString(),
  })

  if (error) throw error

  revalidatePath(`/admin/jobs/${inspectionId}`)
}

/** Update the quantity and unit price of an existing line item. */
export async function updateLineItem(
  itemId: string,
  inspectionId: string,
  input: { quantity: number; unitPrice: number }
) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('install_line_items')
    .update({
      quantity: normalizeQuantity(input.quantity),
      unit_price: normalizePrice(input.unitPrice),
    })
    .eq('id', itemId)

  if (error) throw error

  revalidatePath(`/admin/jobs/${inspectionId}`)
}

/** Remove a line item from an inspection. */
export async function deleteLineItem(itemId: string, inspectionId: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('install_line_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error

  revalidatePath(`/admin/jobs/${inspectionId}`)
}
