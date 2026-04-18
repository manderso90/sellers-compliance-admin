'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'
import type { Profile } from '@/types/database'

const roleLabel: Record<string, string> = {
  super_admin: 'Administrator',
  admin: 'Administrator',
  dispatcher: 'Dispatcher',
  inspector: 'Inspector',
  field_tech: 'Field Tech',
}

interface AdminHeaderProps {
  profile: Profile
}

function primaryRole(roles: string[]): string {
  // Display order: admin > dispatcher > inspector > first role
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('dispatcher')) return 'dispatcher'
  if (roles.includes('inspector')) return 'inspector'
  return roles[0] ?? 'member'
}

export function AdminHeader({ profile }: AdminHeaderProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase()

  const roleKey = primaryRole(profile.roles ?? [])
  const roleText = (roleLabel[roleKey] || roleKey).toUpperCase()

  const userPill = (
    <div className="flex items-center gap-2.5 bg-white border border-[#D4D4D4] hover:border-black rounded-full pl-1 pr-3.5 py-1 transition-colors cursor-pointer">
      <Avatar className="w-[34px] h-[34px]">
        <AvatarFallback className="bg-black text-[#EFB948] text-xs font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="text-left hidden sm:block">
        <p className="text-[13px] font-semibold text-[#2B2B2B] leading-tight">
          {profile.full_name || 'Team Member'}
        </p>
        <p className="text-[9px] text-[#A1A1AA] leading-tight uppercase" style={{ letterSpacing: '0.2em' }}>
          {roleText}
        </p>
      </div>
    </div>
  )

  return (
    <header className="h-14 bg-[#FFFDF5] border-b-2 border-black px-6 flex items-center justify-between shrink-0">
      <div />

      {mounted ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            {userPill}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">{profile.full_name || 'Team Member'}</p>
                  <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/admin/settings')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile & Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        userPill
      )}
    </header>
  )
}
