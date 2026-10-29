type IP = { d: string | string[]; className?: string; fill?: boolean }
export const Icon = ({ d, className = 'w-4 h-4', fill }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
)

export const I = {
  play: 'M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z',
  pause: ['M7 4h3v16H7z', 'M14 4h3v16h-3z'],
  down: ['M12 3v12', 'M7 11l5 5 5-5', 'M4 20h16'],
  upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 20h16'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  chev: 'M6 9l6 6 6-6',
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  type: ['M4 7V4h16v3', 'M9 20h6', 'M12 4v16'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  check: 'M20 6L9 17l-5-5',
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M6 6l1 14h10l1-14'],
}
