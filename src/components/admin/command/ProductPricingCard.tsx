'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrencyPrecise } from '@/lib/utils/formatting'
import { createProduct, updateProduct, deleteProduct } from '@/lib/actions/product-actions'
import type { Product } from '@/types/database'

interface EditState {
  product_name: string
  price: string
  part_cost: string
  labor_cost: string
}

const emptyForm: EditState = { product_name: '', price: '', part_cost: '', labor_cost: '' }

export function ProductPricingCard({ products }: { products: Product[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditState>(emptyForm)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState<EditState>(emptyForm)

  const regularProducts = products.filter((p) => p.category !== 'discount')
  const discountProducts = products.filter((p) => p.category === 'discount')

  function isPercentageDiscount(name: string) {
    return /\d+%/.test(name)
  }

  function getDiscountDisplayPrice(product: Product) {
    if (isPercentageDiscount(product.product_name)) {
      const match = product.product_name.match(/(\d+)%/)
      return match ? `${match[1]}%` : `${product.price}%`
    }
    return formatCurrencyPrecise(-Math.abs(Number(product.price)))
  }

  function startEdit(product: Product) {
    setEditingId(product.id)
    setEditForm({
      product_name: product.product_name,
      price: String(product.price),
      part_cost: String(product.part_cost),
      labor_cost: String(product.labor_cost),
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      await updateProduct(id, {
        product_name: editForm.product_name,
        price: parseFloat(editForm.price) || 0,
        part_cost: parseFloat(editForm.part_cost) || 0,
        labor_cost: parseFloat(editForm.labor_cost) || 0,
      })
      setEditingId(null)
      router.refresh()
    })
  }

  function saveNew() {
    if (!newForm.product_name.trim()) return
    startTransition(async () => {
      await createProduct({
        product_name: newForm.product_name,
        price: parseFloat(newForm.price) || 0,
        part_cost: parseFloat(newForm.part_cost) || 0,
        labor_cost: parseFloat(newForm.labor_cost) || 0,
      })
      setAddingNew(false)
      setNewForm(emptyForm)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    startTransition(async () => {
      await deleteProduct(id)
      router.refresh()
    })
  }

  function unitProfit(price: string, partCost: string, laborCost: string) {
    return (parseFloat(price) || 0) - (parseFloat(partCost) || 0) - (parseFloat(laborCost) || 0)
  }

  const inputClass = 'w-full bg-white border-2 border-[#2B2B2B] rounded-xl px-2 py-1 text-xs focus:outline-none focus:ring-0 focus:border-[#C8102E] focus:shadow-[3px_3px_0px_0px_#2B2B2B]'

  return (
    <div className="bg-white border-2 border-[#2B2B2B] rounded-xl neo-shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-[#2B2B2B] flex items-center justify-between">
        <div>
          <h3 className="display-font text-lg font-bold text-[#2B2B2B] tracking-tight">Product Pricing</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Install product catalog</p>
        </div>
        {!addingNew && (
          <button
            onClick={() => setAddingNew(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#C8102E] text-white text-xs font-bold border-2 border-[#2B2B2B] rounded-lg neo-shadow-sm btn-press"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#FFFDF5] border-b-2 border-[#2B2B2B]/10">
              <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Product</th>
              <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 w-20">Price</th>
              <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 w-20">Parts</th>
              <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 w-20">Labor</th>
              <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 w-20">Profit</th>
              <th className="w-16 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2B2B2B]/5">
            {addingNew && (
              <tr className="bg-[#FFF0F0]/30">
                <td className="px-3 py-2">
                  <input type="text" value={newForm.product_name} onChange={(e) => setNewForm({ ...newForm, product_name: e.target.value })} placeholder="Product name" className={inputClass} autoFocus />
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.01" value={newForm.price} onChange={(e) => setNewForm({ ...newForm, price: e.target.value })} placeholder="0.00" className={cn(inputClass, 'text-right')} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.01" value={newForm.part_cost} onChange={(e) => setNewForm({ ...newForm, part_cost: e.target.value })} placeholder="0.00" className={cn(inputClass, 'text-right')} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.01" value={newForm.labor_cost} onChange={(e) => setNewForm({ ...newForm, labor_cost: e.target.value })} placeholder="0.00" className={cn(inputClass, 'text-right')} />
                </td>
                <td className="px-3 py-2 text-right font-medium text-[#16a34a]">
                  {formatCurrencyPrecise(unitProfit(newForm.price, newForm.part_cost, newForm.labor_cost))}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={saveNew} disabled={isPending} className="p-1 rounded-lg hover:bg-[#F0FDF4] text-[#16a34a]"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setAddingNew(false); setNewForm(emptyForm) }} className="p-1 rounded-lg hover:bg-[#FFFDF5] text-[#A1A1AA]"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            )}

            {regularProducts.map((product) => {
              const isEditing = editingId === product.id

              if (isEditing) {
                return (
                  <tr key={product.id} className="bg-[#FFF0F0]/30">
                    <td className="px-3 py-2">
                      <input type="text" value={editForm.product_name} onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })} className={inputClass} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className={cn(inputClass, 'text-right')} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={editForm.part_cost} onChange={(e) => setEditForm({ ...editForm, part_cost: e.target.value })} className={cn(inputClass, 'text-right')} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={editForm.labor_cost} onChange={(e) => setEditForm({ ...editForm, labor_cost: e.target.value })} className={cn(inputClass, 'text-right')} />
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-[#16a34a]">
                      {formatCurrencyPrecise(unitProfit(editForm.price, editForm.part_cost, editForm.labor_cost))}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => saveEdit(product.id)} disabled={isPending} className="p-1 rounded-lg hover:bg-[#F0FDF4] text-[#16a34a]"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={cancelEdit} className="p-1 rounded-lg hover:bg-[#FFFDF5] text-[#A1A1AA]"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              }

              const profit = Number(product.price) - Number(product.part_cost) - Number(product.labor_cost)

              return (
                <tr key={product.id} className="hover:bg-[#FFFDF5] transition-colors">
                  <td className="px-3 py-2.5 font-medium text-[#2B2B2B]">{product.product_name}</td>
                  <td className="px-3 py-2.5 text-right text-[#2B2B2B] tabular-nums">{formatCurrencyPrecise(Number(product.price))}</td>
                  <td className="px-3 py-2.5 text-right text-[#71717A] tabular-nums">{formatCurrencyPrecise(Number(product.part_cost))}</td>
                  <td className="px-3 py-2.5 text-right text-[#71717A] tabular-nums">{formatCurrencyPrecise(Number(product.labor_cost))}</td>
                  <td className={cn('px-3 py-2.5 text-right font-medium tabular-nums', profit >= 0 ? 'text-[#16a34a]' : 'text-[#C8102E]')}>
                    {formatCurrencyPrecise(profit)}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-0.5 justify-end">
                      <button onClick={() => startEdit(product)} className="p-1 rounded-lg hover:bg-[#FFFDF5] text-[#A1A1AA] hover:text-[#71717A]"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(product.id)} disabled={isPending} className="p-1 rounded-lg hover:bg-[#FFF0F0] text-[#A1A1AA] hover:text-[#C8102E]"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {regularProducts.length === 0 && !addingNew && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#A1A1AA]">
                  No products yet. Add your first product above.
                </td>
              </tr>
            )}

            {/* Discounts section */}
            {discountProducts.length > 0 && (
              <>
                <tr>
                  <td colSpan={6} className="px-3 pt-4 pb-1">
                    <span className="text-[10px] font-bold text-[#C8102E] uppercase tracking-wider">Discounts</span>
                  </td>
                </tr>
                {discountProducts.map((product) => {
                  const isEditing = editingId === product.id

                  if (isEditing) {
                    return (
                      <tr key={product.id} className="bg-[#FFF0F0]/30">
                        <td className="px-3 py-2">
                          <input type="text" value={editForm.product_name} onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })} className={inputClass} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className={cn(inputClass, 'text-right')} />
                        </td>
                        <td className="px-3 py-2 text-center text-[#A1A1AA]">—</td>
                        <td className="px-3 py-2 text-center text-[#A1A1AA]">—</td>
                        <td className="px-3 py-2 text-center text-[#A1A1AA]">—</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => saveEdit(product.id)} disabled={isPending} className="p-1 rounded-lg hover:bg-[#F0FDF4] text-[#16a34a]"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={cancelEdit} className="p-1 rounded-lg hover:bg-[#FFFDF5] text-[#A1A1AA]"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={product.id} className="hover:bg-[#FFF0F0]/20 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-[#2B2B2B]">{product.product_name}</td>
                      <td className="px-3 py-2.5 text-right text-[#C8102E] font-medium tabular-nums">
                        {getDiscountDisplayPrice(product)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[#A1A1AA]">—</td>
                      <td className="px-3 py-2.5 text-center text-[#A1A1AA]">—</td>
                      <td className="px-3 py-2.5 text-center text-[#A1A1AA]">—</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-0.5 justify-end">
                          <button onClick={() => startEdit(product)} className="p-1 rounded-lg hover:bg-[#FFFDF5] text-[#A1A1AA] hover:text-[#71717A]"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => handleDelete(product.id)} disabled={isPending} className="p-1 rounded-lg hover:bg-[#FFF0F0] text-[#A1A1AA] hover:text-[#C8102E]"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
