import { getCustomersWithInspectionCount } from '@/lib/queries/customers'
import { CustomerTable } from '@/components/admin/customers/CustomerTable'

export default async function CustomersPage() {
  const customers = await getCustomersWithInspectionCount()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[24px] font-bold text-[#2B2B2B] tracking-tight">Customers</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {customers.length} customer{customers.length !== 1 ? 's' : ''} in your database
        </p>
      </div>

      <CustomerTable customers={customers} />
    </div>
  )
}
