import { createClient } from '@/lib/supabase/server'
import { EmployeeTable } from '@/components/admin/settings/EmployeeTable'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: employees } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-[24px] font-bold text-[#2B2B2B] tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#71717A] mt-0.5">Manage your team and account settings.</p>
      </div>

      <EmployeeTable employees={employees ?? []} currentUserId={user?.id ?? ''} />
    </div>
  )
}
