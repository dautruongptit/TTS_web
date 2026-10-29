export const Avatar = ({ name, from, to, size = 44 }: { name: string; from: string; to: string; size?: number }) => (
  <div className="rounded-full grid place-items-center font-bold text-white shrink-0 ring-2 ring-white/15"
    style={{ width: size, height: size, background: `linear-gradient(135deg, ${from}, ${to})`, fontSize: size * 0.36 }}>
    {name.split(' ').slice(-1)[0][0]}
  </div>
)
