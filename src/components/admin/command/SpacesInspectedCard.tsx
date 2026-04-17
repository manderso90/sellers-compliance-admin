import { Bed, Layers, Bath, Flame } from 'lucide-react'
import type { WeeklySpaces } from '@/lib/queries/command-center'

function SpaceStat({
  icon: Icon,
  label,
  value,
  color,
  borderColor,
}: {
  icon: typeof Bed
  label: string
  value: number
  color: string
  borderColor: string
}) {
  return (
    <div className="flex items-center gap-3 border-2 border-[#2B2B2B] rounded-xl neo-shadow-sm neo-shadow-hover bg-white px-4 py-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white border-2 ${borderColor}`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} />
      </div>
      <div>
        <p className="display-font text-3xl font-bold text-[#2B2B2B]">{value}</p>
        <p className="text-xs text-[#A1A1AA]">{label}</p>
      </div>
    </div>
  )
}

export function SpacesInspectedCard({ spaces }: { spaces: WeeklySpaces }) {
  const isEmpty =
    spaces.bedrooms === 0 &&
    spaces.hallways === 0 &&
    spaces.bathrooms === 0 &&
    spaces.waterHeaters === 0

  return (
    <div className="bg-white border-2 border-[#2B2B2B] rounded-xl neo-shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-[#2B2B2B]">
        <h3 className="display-font text-lg font-bold text-[#2B2B2B] tracking-tight">Spaces Inspected This Week</h3>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Property composition</p>
      </div>

      {isEmpty ? (
        <div className="px-5 py-8">
          <p className="text-sm text-[#A1A1AA] text-center">No completed inspections this week</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-5">
          <SpaceStat icon={Bed} label="Bedrooms" value={spaces.bedrooms} color="text-[#3b82f6]" borderColor="border-blue-200" />
          <SpaceStat icon={Layers} label="Hallways" value={spaces.hallways} color="text-[#8b5cf6]" borderColor="border-purple-200" />
          <SpaceStat icon={Bath} label="Bathrooms" value={spaces.bathrooms} color="text-[#06b6d4]" borderColor="border-cyan-200" />
          <SpaceStat icon={Flame} label="Water Heaters" value={spaces.waterHeaters} color="text-[#f97316]" borderColor="border-orange-200" />
        </div>
      )}
    </div>
  )
}
