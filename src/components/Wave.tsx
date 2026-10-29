import { useMemo } from 'react'

export const Wave = ({ progress, count = 72, seed = 3, h = 40 }: { progress: number; count?: number; seed?: number; h?: number }) => {
  const bars = useMemo(() => Array.from({ length: count }, (_, i) => 0.2 + 0.8 * Math.abs(Math.sin(i * 0.5 + seed) * Math.cos(i * 0.17 + seed * 2))), [count, seed])
  return (
    <div className="flex items-center gap-[3px] w-full" style={{ height: h }}>
      {bars.map((b, i) => (
        <div key={i} className="flex-1 rounded-full" style={{ height: `${b * 100}%`, background: i / count < progress ? 'linear-gradient(180deg,#22d3ee,#7c3aed)' : 'rgba(255,255,255,.18)' }} />
      ))}
    </div>
  )
}
