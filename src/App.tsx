import { useRef, useState } from 'react'
import { Icon, I } from './components/Icon'
import { Avatar } from './components/Avatar'
import { Wave } from './components/Wave'

const featured = [
  { name: 'Minh Quân', gender: 'Nam', tone: 'Trầm ấm', from: '#7c3aed', to: '#4f46e5' },
  { name: 'Adam Tốp Tốp', gender: 'Nam', tone: 'Sôi động', from: '#06b6d4', to: '#2563eb' },
  { name: 'Hải Đăng', gender: 'Nam', tone: 'Truyền cảm', from: '#0ea5e9', to: '#7c3aed' },
  { name: 'Duyên Hà My', gender: 'Nữ', tone: 'Ngọt ngào', from: '#ec4899', to: '#7c3aed' },
]
const others = ['Thu Trang', 'Bảo Ngọc', 'Quang Huy', 'Lan Anh', 'Tuấn Kiệt', 'Mai Phương', 'Đức Anh', 'Khánh Linh']

const files = [
  { name: 'kich_ban_video.mp3', voice: 'Minh Quân', speed: '1.0x', fmt: 'MP3', ttl: 23, dur: '02:14' },
  { name: 'kich_ban_video (1).mp3', voice: 'Duyên Hà My', speed: '1.2x', fmt: 'MP3', ttl: 22, dur: '02:09' },
  { name: 'Xin chào.wav', voice: 'Hải Đăng', speed: '0.8x', fmt: 'WAV', ttl: 14, dur: '00:08' },
  { name: 'Xin_chào (1).mp3', voice: 'Adam Tốp Tốp', speed: '1.0x', fmt: 'MP3', ttl: 24, dur: '00:06' },
]

export default function App() {
  const [tab, setTab] = useState<'file' | 'text'>('file')
  const [text, setText] = useState('Xin chào, chào mừng bạn đến với VieNeu Voice Studio. Hãy biến văn bản thành giọng nói tự nhiên chỉ trong vài giây.')
  const [voice, setVoice] = useState('Minh Quân')
  const [speed, setSpeed] = useState(1.0)
  const [format, setFormat] = useState<'MP3' | 'WAV'>('MP3')
  const [notif, setNotif] = useState(true)
  const [toast, setToast] = useState(true)
  const [playing, setPlaying] = useState(true)
  const [inline, setInline] = useState<number | null>(null)
  const [drag, setDrag] = useState(false)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sample, setSample] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploaded, setUploaded] = useState<string | null>(null)

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const pct = ((speed - 0.5) / 1.5) * 100
  const filtered = others.filter((o) => o.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="min-h-screen pb-36 font-sans text-slate-200">
      {/* Toast */}
      {toast && (
        <div className="toast fixed top-20 right-4 sm:right-6 z-50 w-[calc(100%-2rem)] sm:w-[360px] glass rounded-2xl p-4 flex gap-3 items-start" style={{ background: 'rgba(17,24,39,.85)' }}>
          <div className="w-10 h-10 rounded-xl grad grid place-items-center shrink-0"><Icon d={I.check} className="w-5 h-5 text-white" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-0.5"><span>VieNeu Studio</span><span>•</span><span>vừa xong</span></div>
            <p className="text-sm font-semibold text-white">🎉 Tạo voice hoàn tất!</p>
            <p className="text-sm text-slate-300">File <span className="text-cyan-300 font-medium">Xin_chào (1).mp3</span> đã sẵn sàng.</p>
          </div>
          <button onClick={() => setToast(false)} aria-label="Đóng" className="text-slate-400 hover:text-white"><Icon d={I.x} /></button>
        </div>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-[#0B0F19]/70">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl grad grid place-items-center shadow-[0_0_24px_rgba(124,58,237,.6)]">
              <div className="flex items-end gap-[2px] h-4">{[.5, 1, .7, .9].map((h, i) => <span key={i} className="w-[3px] rounded-full bg-white" style={{ height: `${h * 100}%` }} />)}</div>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">VieNeu <span className="grad-text">Studio</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setNotif(!notif)} className={`flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border text-xs font-medium transition ${notif ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-400'}`}>
              <Icon d={I.bell} className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Browser Notification: {notif ? 'Enabled' : 'Disabled'}</span>
              <span className={`w-9 h-5 rounded-full p-0.5 transition ${notif ? 'grad' : 'bg-white/15'}`}><span className={`block w-4 h-4 rounded-full bg-white transition-transform ${notif ? 'translate-x-4' : ''}`} /></span>
            </button>
            <div className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold text-white ring-2 ring-violet-500/50" style={{ background: 'linear-gradient(135deg,#f472b6,#7c3aed)' }}>L</div>
          </div>
        </div>
      </header>

      <main className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Biến chữ thành <span className="grad-text">giọng nói</span></h1>
          <p className="text-slate-400 mt-2">Tạo voice tiếng Việt tự nhiên, chuẩn studio, trong vài giây.</p>
        </div>

        {/* Input */}
        <section className="glass rounded-2xl p-5 sm:p-6 col-span-12 lg:col-span-7 flex flex-col gap-5">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/30 border border-white/10">
            {([['file', 'Tải File (.json, .csv, .txt, .srt)', I.upload], ['text', 'Nhập Văn Bản', I.type]] as const).map(([k, label, ic]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-semibold transition ${tab === k ? 'grad text-white shadow-lg shadow-violet-900/40' : 'text-slate-400 hover:text-white'}`}>
                <Icon d={ic} className="w-4 h-4 shrink-0" /><span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {tab === 'file' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setUploaded(f.name) }}
              onClick={() => fileRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-cyan-400 bg-cyan-400/10' : 'border-violet-400/40 bg-violet-500/5 hover:bg-violet-500/10'}`}>
              <input ref={fileRef} type="file" accept=".json,.csv,.txt,.srt" hidden onChange={(e) => e.target.files?.[0] && setUploaded(e.target.files[0].name)} />
              <div className="w-14 h-14 mx-auto rounded-2xl grad grid place-items-center shadow-[0_0_30px_rgba(124,58,237,.5)]"><Icon d={I.upload} className="w-6 h-6 text-white" /></div>
              <p className="mt-4 font-semibold text-white">{uploaded ? uploaded : 'Kéo thả file vào đây'}</p>
              <p className="text-sm text-slate-400 mt-1">hoặc <span className="text-cyan-300 underline underline-offset-2">chọn từ máy tính</span> · tối đa 10MB</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['.JSON', '.CSV', '.TXT', '.SRT'].map((f) => <span key={f} className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide bg-white/5 border border-white/10 text-slate-300">{f}</span>)}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-black/30 border border-white/10 focus-within:border-violet-400/60 focus-within:shadow-[0_0_0_4px_rgba(124,58,237,.15)] transition">
            <div className="flex items-center justify-between px-4 pt-3 text-xs text-slate-400">
              <span className="font-medium uppercase tracking-wider">Văn bản</span>
              <button onClick={() => setText('')} className="flex items-center gap-1 hover:text-white"><Icon d={I.trash} className="w-3.5 h-3.5" />Xóa</button>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập nội dung cần chuyển thành giọng nói..." rows={tab === 'file' ? 6 : 12}
              className="w-full bg-transparent resize-none outline-none px-4 py-3 text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500" />
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 text-xs text-slate-400">
              <span><b className="text-white">{text.length.toLocaleString()}</b> ký tự · <b className="text-white">{words}</b> từ</span>
              <span>Tối đa 5.000 ký tự</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-200">
              <Icon d={I.file} className="w-4 h-4" /> Tên file dự kiến: <b className="font-semibold text-white">Xin_chào (1).mp3</b>
            </span>
            <span className="text-xs text-slate-500">Tự động đánh số khi trùng tên</span>
          </div>
        </section>

        {/* Controls */}
        <section className="glass rounded-2xl p-5 sm:p-6 col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-white">Giọng đọc</h2><span className="text-xs text-slate-400">Đã chọn: <b className="text-cyan-300">{voice}</b></span></div>
            <div className="grid grid-cols-2 gap-3">
              {featured.map((v) => {
                const sel = voice === v.name
                return (
                  <div key={v.name} role="button" tabIndex={0} onClick={() => setVoice(v.name)} onKeyDown={(e) => e.key === 'Enter' && setVoice(v.name)}
                    className={`relative text-left rounded-2xl p-3 border transition cursor-pointer ${sel ? 'border-violet-400 bg-violet-500/15 shadow-[0_0_28px_rgba(124,58,237,.35)]' : 'border-white/10 bg-white/[.03] hover:border-white/25'}`}>
                    <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-white grad flex items-center gap-1"><Icon d={I.bolt} className="w-2.5 h-2.5" fill />Hot / Ưu tiên</span>
                    <div className="flex items-center gap-2.5 mt-1">
                      <Avatar name={v.name} from={v.from} to={v.to} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{v.name}</p>
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${v.gender === 'Nam' ? 'bg-sky-400/15 text-sky-300' : 'bg-pink-400/15 text-pink-300'}`}>{v.gender}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[11px] text-slate-400">{v.tone}</span>
                      <button onClick={(e) => { e.stopPropagation(); setSample(sample === v.name ? null : v.name) }} aria-label={`Nghe thử ${v.name}`}
                        className={`w-7 h-7 rounded-full grid place-items-center transition ${sample === v.name ? 'grad text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                        {sample === v.name ? <Icon d={I.pause} className="w-3 h-3" fill /> : <Icon d={I.play} className="w-3 h-3" fill />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="relative mt-3">
              <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3.5 py-3 rounded-xl bg-black/30 border border-white/10 text-sm text-slate-300 hover:border-white/25">
                <Icon d={I.search} className="w-4 h-4 text-slate-500" />
                <span className="flex-1 text-left">{others.includes(voice) ? voice : 'Tìm giọng đọc khác...'}</span>
                <span className="text-xs text-slate-500">+120 giọng</span>
                <Icon d={I.chev} className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 p-2 shadow-2xl" style={{ background: 'rgba(15,20,35,.97)' }}>
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm..." className="w-full mb-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm outline-none focus:border-violet-400" />
                  <div className="max-h-44 overflow-auto">
                    {filtered.map((o) => <button key={o} onClick={() => { setVoice(o); setOpen(false); setQ('') }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10">{o}</button>)}
                    {!filtered.length && <p className="px-3 py-2 text-sm text-slate-500">Không tìm thấy</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-white">Tốc độ đọc</h2><span className="px-2.5 py-1 rounded-lg bg-white/10 text-sm font-bold text-cyan-300 tabular-nums">{speed.toFixed(1)}x</span></div>
            <input type="range" min={0.5} max={2} step={0.1} value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Tốc độ" className="range w-full"
              style={{ background: `linear-gradient(90deg,#7c3aed 0%,#06b6d4 ${pct}%,rgba(255,255,255,.12) ${pct}%)` }} />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5"><span>0.5x</span><span>2.0x</span></div>
            <div className="flex gap-2 mt-2">
              {[0.8, 1.0, 1.2, 1.5].map((s) => <button key={s} onClick={() => setSpeed(s)} className={`flex-1 py-1.5 rounded-full text-xs font-semibold border transition ${speed === s ? 'grad border-transparent text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>{s.toFixed(1)}x</button>)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <h2 className="font-semibold text-white mb-3">Định dạng</h2>
              <div className="grid grid-cols-2 p-1 rounded-xl bg-black/30 border border-white/10">
                {(['MP3', 'WAV'] as const).map((f) => <button key={f} onClick={() => setFormat(f)} className={`py-2 rounded-lg text-xs font-semibold transition ${format === f ? 'bg-white/15 text-white ring-1 ring-cyan-400/50' : 'text-slate-400'}`}>{f} <span className="block font-normal text-[10px] opacity-70">{f === 'MP3' ? '(Nhẹ)' : '(Gốc)'}</span></button>)}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h2 className="font-semibold text-white mb-3">Lưu trữ file</h2>
              <div className="flex items-center gap-2 px-3 py-[13px] rounded-xl bg-black/30 border border-white/10 text-xs text-slate-200"><Icon d={I.clock} className="w-4 h-4 text-violet-300" /><span className="flex-1">Tự xóa sau 24 giờ</span><Icon d={I.chev} className="w-4 h-4 text-slate-500" /></div>
            </div>
            <div className="col-span-2 flex items-center gap-2 text-xs text-amber-200/90 bg-amber-400/10 border border-amber-300/20 rounded-xl px-3 py-2">
              <span className="px-1.5 py-0.5 rounded bg-amber-300 text-[10px] font-extrabold text-slate-900">PRO</span>
              <Icon d={I.lock} className="w-3.5 h-3.5" /> Coming Soon: Gia hạn lưu trữ
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button className="relative overflow-hidden w-full py-4 rounded-2xl grad text-white font-bold text-base shadow-[0_10px_40px_-8px_rgba(124,58,237,.8)] hover:brightness-110 active:scale-[.99] transition flex items-center justify-center gap-2">
              <Icon d={I.bolt} className="w-5 h-5" fill /> Tạo Voice Ngay
            </button>
            <div className="rounded-xl bg-black/30 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-sm mb-2.5"><span className="text-slate-200">Đang tạo giọng nói...</span><b className="text-cyan-300 tabular-nums">68%</b></div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div className="relative h-full rounded-full grad overflow-hidden shadow-[0_0_18px_rgba(6,182,212,.8)]" style={{ width: '68%' }}>
                  <div className="sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* History */}
        <section className="glass rounded-2xl col-span-12 overflow-hidden">
          <div className="flex items-center justify-between p-5 sm:p-6 pb-4">
            <div><h2 className="text-lg font-bold text-white">Lịch sử file đã tạo</h2><p className="text-sm text-slate-400">{files.length} file · tự động dọn sau 24 giờ</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-y border-white/10">
                {['Tên file', 'Giọng đọc', 'Tốc độ / Định dạng', 'Thời gian lưu', ''].map((h, i) => <th key={i} className={`px-6 py-3 font-semibold ${i === 4 ? 'text-right' : ''}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {files.map((f, i) => (
                  <tr key={f.name} className="border-b border-white/5 hover:bg-white/[.03] transition">
                    <td className="px-6 py-3.5"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-xl grid place-items-center ${f.fmt === 'MP3' ? 'bg-violet-500/20 text-violet-300' : 'bg-cyan-500/20 text-cyan-300'}`}><Icon d={I.file} /></div><div><p className="font-medium text-white">{f.name}</p><p className="text-xs text-slate-500">{f.dur}</p></div></div></td>
                    <td className="px-6 py-3.5 text-slate-300">{f.voice}</td>
                    <td className="px-6 py-3.5"><span className="inline-flex gap-1.5"><span className="px-2 py-1 rounded-md bg-white/10 text-xs font-semibold">{f.speed}</span><span className={`px-2 py-1 rounded-md text-xs font-bold ${f.fmt === 'MP3' ? 'bg-violet-500/20 text-violet-200' : 'bg-cyan-500/20 text-cyan-200'}`}>{f.fmt}</span></span></td>
                    <td className="px-6 py-3.5"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${f.ttl > 20 ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}><Icon d={I.clock} className="w-3 h-3" />Còn {f.ttl} giờ - Tự dọn rác</span></td>
                    <td className="px-6 py-3.5"><div className="flex justify-end gap-2">
                      <button onClick={() => setInline(inline === i ? null : i)} aria-label="Phát" className={`w-9 h-9 rounded-full grid place-items-center transition ${inline === i ? 'grad text-white' : 'bg-white/10 hover:bg-white/20'}`}>{inline === i ? <Icon d={I.pause} className="w-3.5 h-3.5" fill /> : <Icon d={I.play} className="w-3.5 h-3.5" fill />}</button>
                      <button aria-label="Tải xuống" className="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20"><Icon d={I.down} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Mini player */}
      <div className="fixed bottom-4 inset-x-4 z-40">
        <div className="max-w-[1100px] mx-auto glass rounded-2xl px-4 py-3 flex items-center gap-4" style={{ background: 'rgba(15,20,35,.8)' }}>
          <button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Tạm dừng' : 'Phát'} className="w-11 h-11 rounded-full grad grid place-items-center shrink-0 shadow-[0_0_24px_rgba(124,58,237,.6)]">{playing ? <Icon d={I.pause} className="w-4 h-4 text-white" fill /> : <Icon d={I.play} className="w-4 h-4 text-white ml-0.5" fill />}</button>
          <div className="hidden sm:block min-w-0 w-40"><p className="text-sm font-semibold text-white truncate">Xin_chào (1).mp3</p><p className="text-xs text-slate-400">Adam Tốp Tốp · 1.0x</p></div>
          <span className="text-xs tabular-nums text-slate-300">00:04</span>
          <div className="flex-1 min-w-0"><Wave progress={0.62} count={80} seed={2} h={36} /></div>
          <span className="text-xs tabular-nums text-slate-500">00:06</span>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-semibold text-white shrink-0"><Icon d={I.down} /><span className="hidden sm:inline">Tải xuống</span></button>
        </div>
      </div>
    </div>
  )
}
