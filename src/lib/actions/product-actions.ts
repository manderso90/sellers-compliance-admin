'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

interface ProductInput {
  product_name: string
  price: number
  part_cost: number
  labor_cost: number
  is_active?: boolean
  sort_order?: number
  category?: string | null
  notes?: string | null
}

export async function createProduct(data: ProductInput) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from('products').insert({
    product_name: data.product_name,
    price: data.price,
    part_cost: data.part_cost,
    labor_cost: data.labor_cost,
    is_active: data.is_active ?? true,
    sort_order: data.sort_order ?? 0,
    category: data.category ?? null,
    notes: data.notes ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function updateProduct(id: string, data: Partial<ProductInput>) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function deleteProduct(id: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}
