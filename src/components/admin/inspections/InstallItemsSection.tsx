'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react'
import { formatCurrencyPrecise } from '@/lib/utils/formatting'
import { addLineItem, updateLineItem, deleteLineItem } from '@/lib/actions/line-item-actions'
import type { Product, InstallLineItem } from '@/types/database'

interface InstallItemsSectionProps {
  inspectionId: string
  products: Product[]
  lineItems: InstallLineItem[]
}

export function InstallItemsSection({ inspectionId, products, lineItems }: InstallItemsSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Add form state
  const [showAdd, setShowAdd] = useState(false)
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('1')
  const [editPrice, setEditPrice] = useState('')

  // Only real install products — discounts are rendered/handled separately in the catalog.
  const catalog = products.filter((p) => p.category !== 'discount')

  const installTotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.unit_price),
    0
  )

  function handleSelectProduct(id: string) {
    setProductId(id)
    const product = catalog.find((p) => p.id === id)
    if (product) setUnitPrice(String(product.price))
  }

  function resetAdd() {
    setShowAdd(false)
    setProductId('')
    setQuantity('1')
    setUnitPrice('')
  }

  function handleAdd() {
    const qty = parseInt(quantity, 10)
    const price = parseFloat(unitPrice)
    if (!productId || isNaN(qty) || qty < 1 || isNaN(price) || price < 0) return

    startTransition(async () => {
      await addLineItem(inspectionId, { productId, quantity: qty, unitPrice: price })
      resetAdd()
      router.refresh()
    })
  }

  function startEdit(item: InstallLineItem) {
    setEditingId(item.id)
    setEditQty(String(item.quantity))
    setEditPrice(String(item.unit_price))
  }

  function handleUpdate(itemId: string) {
    const qty = parseInt(editQty, 10)
    const price = parseFloat(editPrice)
    if (isNaN(qty) || qty < 1 || isNaN(price) || price < 0) return

    startTransition(async () => {
      await updateLineItem(itemId, inspectionId, { quantity: qty, unitPrice: price })
      setEditingId(null)
      router.refresh()
    })
  }

  function handleDelete(itemId: string) {
    if (!confirm('Remove this item?')) return
    startTransition(async () => {
      await deleteLineItem(itemId, inspectionId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Install Items
        </h2>
        {!showAdd && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 border-2 border-[#2B2B2B] rounded-lg neo-shadow-sm"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Item
          </Button>
        )}
      </div>

      {/* Line item rows */}
      {lineItems.length > 0 ? (
        <div className="space-y-2">
          {lineItems.map((item) => {
            const isEditing = editingId === item.id

            if (isEditing) {
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2.5 bg-[#FFFDF5] rounded-xl border-2 border-[#2B2B2B]"
                >
                  <span className="text-sm font-medium text-[#2B2B2B] flex-1 truncate">
                    {item.item_name || 'Item'}
                  </span>
                  <Input
                    type="number"
                    min="1"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="h-8 w-16 text-sm text-right"
                  />
                  <span className="text-xs text-[#A1A1AA]">×</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="h-8 w-24 text-sm text-right"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-[#16a34a]"
                    onClick={() => handleUpdate(item.id)}
                    disabled={isPending}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-[#A1A1AA]"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )
            }

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-[#FFFDF5] rounded-xl border-2 border-[#2B2B2B]/10"
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-[#2B2B2B]">
                    {item.item_name || 'Item'}
                  </span>
                  <p className="text-xs text-[#A1A1AA]">
                    {item.quantity} × {formatCurrencyPrecise(Number(item.unit_price))}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-[#2B2B2B] tabular-nums mr-1">
                    {formatCurrencyPrecise(item.quantity * Number(item.unit_price))}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => startEdit(item)}
                    disabled={isPending}
                  >
                    <Pencil className="w-3 h-3 text-[#A1A1AA]" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : !showAdd ? (
        <p className="text-sm text-[#A1A1AA] text-center py-4">No install items recorded.</p>
      ) : null}

      {/* Add form */}
      {showAdd && (
        <div className="border-2 border-[#2B2B2B] rounded-xl p-3 space-y-3 bg-[#FFFDF5]">
          <div>
            <label className="text-xs text-[#A1A1AA] mb-1 block">Item</label>
            <Select value={productId} onValueChange={(v) => handleSelectProduct(v ?? '')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select a product..." />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.product_name} — {formatCurrencyPrecise(Number(p.price))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-[#A1A1AA] mb-1 block">Quantity</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[#A1A1AA] mb-1 block">Unit Price</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={resetAdd}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={handleAdd}
              disabled={isPending || !productId || !unitPrice || parseFloat(unitPrice) < 0}
            >
              {isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Add Item
            </Button>
          </div>
        </div>
      )}

      {/* Running install total */}
      <div className="flex items-center justify-between pt-2 border-t-2 border-[#2B2B2B]/10">
        <span className="text-sm text-[#71717A]">Install Total</span>
        <span className="text-sm font-semibold text-[#2B2B2B] tabular-nums">
          {formatCurrencyPrecise(installTotal)}
        </span>
      </div>
    </div>
  )
}
