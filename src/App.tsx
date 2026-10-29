import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon, I } from './components/Icon'
import { Wave } from './components/Wave'
import { api, ApiError, type AppConfig, type AudioFile, type Voice } from './api/client'
import { useTtsJob } from './hooks/useTtsJob'

const TTL_OPTIONS = [1, 6, 24, 72, 168]

const fmtTime = (s: number) => {
  if (!isFinite(s)) return '00:00'
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
const fmtSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const fmtTtl = (h: number) => (h >= 24 && h % 24 === 0 ? `${h / 24} ngày` : `${h} giờ`)
const remainText = (sec: number) => (sec >= 3600 ? `Còn ${Math.ceil(sec / 3600)} giờ` : `Còn ${Math.max(1, Math.ceil(sec / 60))} phút`)

// Đo thực tế trên engine CPU: khoảng 0,165 giây xử lý cho mỗi ký tự (381 ký tự ≈ 63 giây).
const SECONDS_PER_CHAR = 0.165
const estimateSeconds = (chars: number) => 5 + chars * SECONDS_PER_CHAR
const fmtEta = (s: number) => (s < 60 ? `~${Math.max(5, Math.round(s / 5) * 5)} giây` : `~${Math.round(s / 60)} phút`)

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const [files, setFiles] = useState<AudioFile[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [tab, setTab] = useState<'file' | 'text'>('text')
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [format, setFormat] = useState<'MP3' | 'WAV'>('WAV')
  const [ttlHours, setTtlHours] = useState(24)
  const [notif, setNotif] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted')
  const [toast, setToast] = useState<AudioFile | null>(null)
  const [drag, setDrag] = useState(false)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [upload, setUpload] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const voiceBoxRef = useRef<HTMLDivElement>(null)

  // Trình phát
  const audioRef = useRef<HTMLAudioElement>(null)
  // Nghe thử giọng đọc mẫu (tách riêng khỏi trình phát file)
  const sampleRef = useRef<HTMLAudioElement>(null)
  const [sampleId, setSampleId] = useState<string | null>(null)
  const [sampleState, setSampleState] = useState<'loading' | 'playing' | null>(null)
  const [current, setCurrent] = useState<AudioFile | null>(null)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(0)

  const maxLen = config?.maxTextLength ?? 5000
  const minSpeed = config?.minSpeed ?? 0.5
  const maxSpeed = config?.maxSpeed ?? 2
  const maxTtl = config?.maxTtlHours ?? 720

  const refreshFiles = useCallback(() => {
    api.files().then(setFiles).catch(() => { /* giữ danh sách cũ */ })
  }, [])

  const { job, error, busy, start, clearError } = useTtsJob((p) => {
    refreshFiles()
    if (!p.resultFile) return
    setToast(p.resultFile)
    if (notif && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Tạo voice hoàn tất', { body: `File ${p.resultFile.fileName} đã sẵn sàng.` })
    }
  })

  useEffect(() => {
    Promise.all([api.config(), api.voices(), api.files()])
      .then(([c, v, f]) => {
        setConfig(c); setVoices(v); setFiles(f)
        setVoice((cur) => cur || v[0]?.id || '')
        setTtlHours((t) => Math.min(t, c.maxTtlHours))
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : 'Không tải được dữ liệu từ máy chủ.'))
  }, [])

  // Cập nhật "Còn ... giờ" và dọn các file đã hết hạn khỏi danh sách.
  useEffect(() => {
    const t = window.setInterval(refreshFiles, 60_000)
    return () => window.clearInterval(t)
  }, [refreshFiles])

  const filtered = useMemo(
    () => voices.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())),
    [voices, q],
  )

  // Đóng danh sách giọng khi bấm ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (voiceBoxRef.current && !voiceBoxRef.current.contains(e.target as Node)) { setOpen(false); setQ('') }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setQ('') } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  // Đổi giọng khi đang nghe thử giọng khác thì dừng mẫu cũ.
  useEffect(() => {
    if (sampleId && sampleId !== voice) stopSample()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice])

  function stopSample() {
    sampleRef.current?.pause()
    setSampleId(null)
    setSampleState(null)
  }

  function toggleSample(v: Voice) {
    const s = sampleRef.current
    if (!s) return
    if (sampleId === v.id) { stopSample(); return }
    audioRef.current?.pause()
    setSampleId(v.id)
    setSampleState('loading')
    s.src = `/api/v1/voices/sample?voice=${encodeURIComponent(v.id)}`
    void s.play().catch((e: unknown) => { if ((e as Error)?.name === 'NotAllowedError') stopSample() }) // lỗi tải xử lý ở onError
  }

  function play(f: AudioFile) {
    const a = audioRef.current
    if (!a) return
    stopSample()
    if (current?.id === f.id) {
      if (a.paused) void a.play(); else a.pause()
      return
    }
    setCurrent(f); setPos(0); setDur(0)
    a.src = f.streamUrl
    void a.play().catch(() => setPlaying(false))
  }

  async function remove(f: AudioFile) {
    try {
      await api.deleteFile(f.id)
      if (current?.id === f.id) { audioRef.current?.pause(); setCurrent(null) }
      refreshFiles()
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Không xóa được file.')
    }
  }

  function pickFile(f: File | undefined) {
    if (!f) return
    setFileError(null)
    if (!/\.(txt|srt|json|csv)$/i.test(f.name)) { setFileError('Chỉ hỗ trợ file .txt, .srt, .json, .csv'); return }
    if (config && f.size > config.maxUploadBytes) { setFileError(`File vượt quá ${fmtSize(config.maxUploadBytes)}`); return }
    setUpload(f)
  }

  async function toggleNotif() {
    if (typeof Notification === 'undefined') return
    if (notif) { setNotif(false); return }
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    setNotif(perm === 'granted')
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const overLimit = text.length > maxLen
  const hasInput = tab === 'file' ? !!upload : text.trim().length > 0
  const canSubmit = !busy && !!voice && hasInput && !overLimit
  const pct = ((speed - minSpeed) / (maxSpeed - minSpeed)) * 100
  const percent = job?.progressPercent ?? 0
  const selVoice = voices.find((v) => v.id === voice)
  const eta = tab === 'text' && text.trim() ? estimateSeconds(text.trim().length) : null

  function submit() {
    if (!canSubmit) return
    setToast(null)
    void start({
      text: tab === 'text' ? text : undefined,
      file: tab === 'file' ? upload ?? undefined : undefined,
      voice, speed, format: format.toLowerCase() as 'mp3' | 'wav', ttlHours,
    })
  }

  const ttlOptions = TTL_OPTIONS.filter((h) => h <= maxTtl)

  return (
    <div className={`flex flex-col min-h-dvh lg:h-dvh lg:overflow-hidden font-sans text-slate-200 ${current ? "pb-24 lg:pb-0" : ""}`}>
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onError={() => { if (current) { setPlaying(false); setLoadError('Không phát được file (có thể đã hết hạn).'); refreshFiles() } }}
      />

      <audio
        ref={sampleRef}
        onPlaying={() => setSampleState('playing')}
        onEnded={stopSample}
        onError={() => {
          if (sampleId) setLoadError('Không phát được giọng mẫu. Vui lòng thử lại sau ít phút.')
          stopSample()
        }}
      />

      {/* Toast */}
      {toast && (
        <div className="toast fixed top-20 right-4 sm:right-6 z-50 w-[calc(100%-2rem)] sm:w-[360px] glass rounded-2xl p-4 flex gap-3 items-start" style={{ background: 'rgba(17,24,39,.85)' }}>
          <div className="w-10 h-10 rounded-xl grad grid place-items-center shrink-0"><Icon d={I.check} className="w-5 h-5 text-white" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-0.5"><span>Voice Studio</span><span>•</span><span>vừa xong</span></div>
            <p className="text-sm font-semibold text-white">🎉 Tạo voice hoàn tất!</p>
            <p className="text-sm text-slate-300 truncate">File <span className="text-cyan-300 font-medium">{toast.fileName}</span> đã sẵn sàng.</p>
          </div>
          <button onClick={() => setToast(null)} aria-label="Đóng" className="text-slate-400 hover:text-white"><Icon d={I.x} /></button>
        </div>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-[#0B0F19]/70">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl grad grid place-items-center shadow-[0_0_24px_rgba(124,58,237,.6)]">
              <div className="flex items-end gap-[2px] h-4">{[.5, 1, .7, .9].map((h, i) => <span key={i} className="w-[3px] rounded-full bg-white" style={{ height: `${h * 100}%` }} />)}</div>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Voice <span className="grad-text">Studio</span></span>
          </div>
          {typeof Notification !== 'undefined' && (
            <button onClick={toggleNotif} className={`flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border text-xs font-medium transition ${notif ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-white/5 text-slate-400'}`}>
              <Icon d={I.bell} className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thông báo trình duyệt: {notif ? 'Bật' : 'Tắt'}</span>
              <span className={`w-9 h-5 rounded-full p-0.5 transition ${notif ? 'grad' : 'bg-white/15'}`}><span className={`block w-4 h-4 rounded-full bg-white transition-transform ${notif ? 'translate-x-4' : ''}`} /></span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-[1320px] mx-auto px-4 sm:px-6 py-4 grid grid-cols-12 gap-4 lg:gap-y-0 lg:grid-rows-[auto_minmax(0,1fr)]">
        {loadError && (
            <div role="alert" className="col-span-12 lg:row-start-1 lg:mb-4 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              <span className="flex-1">{loadError}</span>
              <button onClick={() => setLoadError(null)} aria-label="Đóng"><Icon d={I.x} className="w-4 h-4" /></button>
            </div>
        )}

        {/* Cột trái: nhập liệu + lịch sử (lịch sử co theo số file) */}
        <div className="contents lg:flex lg:flex-col lg:gap-4 lg:col-span-7 lg:row-start-2 lg:min-h-0">
        {/* Input */}
        <section className="glass rounded-2xl p-4 col-span-12 order-1 lg:order-none shrink-0 flex flex-col gap-3">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/30 border border-white/10">
            {([['file', 'Tải File (.json, .csv, .txt, .srt)', I.upload], ['text', 'Nhập Văn Bản', I.type]] as const).map(([k, label, ic]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-2 rounded-lg py-2 px-2 text-xs sm:text-sm font-semibold transition ${tab === k ? 'grad text-white shadow-lg shadow-violet-900/40' : 'text-slate-400 hover:text-white'}`}>
                <Icon d={ic} className="w-4 h-4 shrink-0" /><span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {tab === 'file' && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]) }}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-cyan-400 bg-cyan-400/10' : 'border-violet-400/40 bg-violet-500/5 hover:bg-violet-500/10'}`}>
                <input ref={fileRef} type="file" accept=".json,.csv,.txt,.srt" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
                <div className="w-14 h-14 mx-auto rounded-2xl grad grid place-items-center shadow-[0_0_30px_rgba(124,58,237,.5)]"><Icon d={I.upload} className="w-6 h-6 text-white" /></div>
                <p className="mt-4 font-semibold text-white break-all">{upload ? `${upload.name} (${fmtSize(upload.size)})` : 'Kéo thả file vào đây'}</p>
                <p className="text-sm text-slate-400 mt-1">hoặc <span className="text-cyan-300 underline underline-offset-2">chọn từ máy tính</span> · tối đa {config ? fmtSize(config.maxUploadBytes) : '20 MB'}</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['.JSON', '.CSV', '.TXT', '.SRT'].map((f) => <span key={f} className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide bg-white/5 border border-white/10 text-slate-300">{f}</span>)}
                </div>
              </div>
              {fileError && <p role="alert" className="text-sm text-rose-300">{fileError}</p>}
              {upload && <button onClick={() => setUpload(null)} className="self-start flex items-center gap-1 text-xs text-slate-400 hover:text-white"><Icon d={I.trash} className="w-3.5 h-3.5" />Bỏ file đã chọn</button>}
            </>
          )}

          {tab === 'text' && (
            <div className={`flex flex-col rounded-xl bg-black/30 border transition focus-within:shadow-[0_0_0_4px_rgba(124,58,237,.15)] ${overLimit ? 'border-rose-400/60' : 'border-white/10 focus-within:border-violet-400/60'}`}>
              <div className="flex items-center justify-between px-4 pt-3 text-xs text-slate-400">
                <span className="font-medium uppercase tracking-wider">Văn bản</span>
                <button onClick={() => setText('')} className="flex items-center gap-1 hover:text-white"><Icon d={I.trash} className="w-3.5 h-3.5" />Xóa</button>
              </div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Mỗi buổi sáng là một cơ hội mới để bắt đầu lại. Đừng sợ bước chậm, chỉ sợ đứng yên. Hãy tin rằng những cố gắng nhỏ bé hôm nay sẽ trở thành thành quả lớn lao ngày mai. Cứ kiên trì đi tiếp, vì con đường nào cũng có điểm đến cho người không bỏ cuộc." rows={4}
                className="w-full bg-transparent resize-none outline-none px-4 py-2 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500" />
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 text-xs text-slate-400">
                <span><b className={overLimit ? 'text-rose-300' : 'text-white'}>{text.length.toLocaleString()}</b> ký tự · <b className="text-white">{words}</b> từ{eta !== null && <> · <span className="text-cyan-300">ước tính {fmtEta(eta)}</span></>}</span>
                <span className={overLimit ? 'text-rose-300' : ''}>Tối đa {maxLen.toLocaleString()} ký tự</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 text-xs rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-200">
              <Icon d={I.file} className="w-4 h-4" /> Tên file tự đặt theo nội dung
            </span>
            <span className="text-xs text-slate-500">Tự động đánh số khi trùng tên</span>
          </div>
        </section>

        {/* History */}
        <section className="glass rounded-2xl col-span-12 order-3 lg:order-none overflow-hidden flex flex-col lg:min-h-0">
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <div><h2 className="text-lg font-bold text-white">Lịch sử file đã tạo</h2><p className="text-sm text-slate-400">{files.length} file · tự động dọn khi hết hạn</p></div>
          </div>
          {files.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-slate-500">Chưa có file nào. Tạo voice đầu tiên của bạn ở trên.</p>
          ) : (
            <>
            <div className={`hidden md:block overflow-auto lg:min-h-0 ${current ? "lg:pb-20" : ""}`}>
              <table className="w-full min-w-[900px] text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-y border-white/10">
                  {['Tên file', 'Giọng đọc', 'Tốc độ / Định dạng', 'Thời gian lưu', ''].map((h, i) => <th key={i} className={`px-6 py-3 font-semibold ${i === 4 ? 'text-right' : ''}`}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {files.map((f) => {
                    const mp3 = f.format.toLowerCase() === 'mp3'
                    const isCur = current?.id === f.id
                    return (
                      <tr key={f.id} className="border-b border-white/5 hover:bg-white/[.03] transition">
                        <td className="px-6 py-3.5"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-xl grid place-items-center ${mp3 ? 'bg-violet-500/20 text-violet-300' : 'bg-cyan-500/20 text-cyan-300'}`}><Icon d={I.file} /></div><div className="min-w-0"><p className="font-medium text-white break-all">{f.fileName}</p><p className="text-xs text-slate-500">{fmtSize(f.fileSize)}</p></div></div></td>
                        <td className="px-6 py-3.5 text-slate-300">{f.voice}</td>
                        <td className="px-6 py-3.5"><span className="inline-flex gap-1.5"><span className="px-2 py-1 rounded-md bg-white/10 text-xs font-semibold">{f.speed.toFixed(1)}x</span><span className={`px-2 py-1 rounded-md text-xs font-bold ${mp3 ? 'bg-violet-500/20 text-violet-200' : 'bg-cyan-500/20 text-cyan-200'}`}>{f.format.toUpperCase()}</span></span></td>
                        <td className="px-6 py-3.5"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${f.remainingSeconds > 6 * 3600 ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}><Icon d={I.clock} className="w-3 h-3" />{remainText(f.remainingSeconds)} - Tự dọn rác</span></td>
                        <td className="px-6 py-3.5"><div className="flex justify-end gap-2">
                          <button onClick={() => play(f)} aria-label="Phát" className={`w-9 h-9 rounded-full grid place-items-center transition ${isCur && playing ? 'grad text-white' : 'bg-white/10 hover:bg-white/20'}`}>{isCur && playing ? <Icon d={I.pause} className="w-3.5 h-3.5" fill /> : <Icon d={I.play} className="w-3.5 h-3.5" fill />}</button>
                          <a href={f.downloadUrl} aria-label="Tải xuống" className="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20"><Icon d={I.down} /></a>
                          <button onClick={() => remove(f)} aria-label="Xóa" className="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-rose-500/30"><Icon d={I.trash} className="w-4 h-4" /></button>
                        </div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Điện thoại: mỗi file là một thẻ */}
            <ul className="md:hidden divide-y divide-white/5 border-t border-white/10">
              {files.map((f) => {
                const mp3 = f.format.toLowerCase() === 'mp3'
                const isCur = current?.id === f.id
                return (
                  <li key={f.id} className="px-4 py-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${mp3 ? 'bg-violet-500/20 text-violet-300' : 'bg-cyan-500/20 text-cyan-300'}`}><Icon d={I.file} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white break-words">{f.fileName}</p>
                        <p className="text-xs text-slate-500">{f.voice} · {fmtSize(f.fileSize)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded-md bg-white/10 font-semibold">{f.speed.toFixed(1)}x</span>
                      <span className={`px-2 py-1 rounded-md font-bold ${mp3 ? 'bg-violet-500/20 text-violet-200' : 'bg-cyan-500/20 text-cyan-200'}`}>{f.format.toUpperCase()}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${f.remainingSeconds > 6 * 3600 ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}><Icon d={I.clock} className="w-3 h-3" />{remainText(f.remainingSeconds)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => play(f)} className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition ${isCur && playing ? 'grad text-white' : 'bg-white/10'}`}>{isCur && playing ? <Icon d={I.pause} className="w-3.5 h-3.5" fill /> : <Icon d={I.play} className="w-3.5 h-3.5" fill />}{isCur && playing ? 'Tạm dừng' : 'Phát'}</button>
                      <a href={f.downloadUrl} aria-label="Tải xuống" className="w-10 h-10 rounded-xl grid place-items-center bg-white/10"><Icon d={I.down} /></a>
                      <button onClick={() => remove(f)} aria-label="Xóa" className="w-10 h-10 rounded-xl grid place-items-center bg-white/10"><Icon d={I.trash} className="w-4 h-4" /></button>
                    </div>
                  </li>
                )
              })}
            </ul>
            </>
          )}
        </section>
        </div>

        {/* Cột phải: điều khiển */}
        <div className="contents lg:flex lg:flex-col lg:gap-4 lg:col-span-5 lg:row-start-2 lg:min-h-0">
        {/* Controls */}
        <section className="glass rounded-2xl p-4 col-span-12 order-2 lg:order-none shrink-0 flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-white mb-3">Giọng đọc</h2>
            {!voices.length && !loadError && <p className="text-sm text-slate-500">Đang tải danh sách giọng...</p>}
            {voices.length > 0 && (
              <div className="flex items-center gap-2">
              <div ref={voiceBoxRef} className="relative flex-1 min-w-0">
                <button onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border text-sm text-white transition ${open ? 'border-violet-400/60' : 'border-white/10 hover:border-white/25'}`}>
                  <span className="w-7 h-7 rounded-full grad grid place-items-center text-xs font-bold shrink-0">{(voices.find((v) => v.id === voice)?.name ?? '?').trim().slice(0, 1)}</span>
                  <span className="flex-1 text-left font-semibold truncate">{voices.find((v) => v.id === voice)?.name ?? 'Chọn giọng đọc'}</span>
                  <span className="text-xs text-slate-500">{voices.length} giọng</span>
                  <Icon d={I.chev} className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 p-2 shadow-2xl" style={{ background: 'rgba(15,20,35,.97)' }}>
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm..." className="w-full mb-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm outline-none focus:border-violet-400" />
                    <div role="listbox" className="max-h-60 overflow-auto">
                      {filtered.map((o) => (
                        <button key={o.id} role="option" aria-selected={o.id === voice} onClick={() => { setVoice(o.id); setOpen(false); setQ('') }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 ${o.id === voice ? 'bg-violet-500/20 text-white font-semibold' : ''}`}>{o.name}</button>
                      ))}
                      {!filtered.length && <p className="px-3 py-2 text-sm text-slate-500">Không tìm thấy</p>}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => selVoice && toggleSample(selVoice)} disabled={!selVoice?.sampleReady}
                aria-label={sampleId === voice ? 'Dừng nghe thử' : 'Nghe thử giọng đã chọn'}
                title={selVoice && !selVoice.sampleReady ? 'Chưa có giọng mẫu' : 'Nghe thử giọng đã chọn (không tạo file)'}
                className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 border transition disabled:opacity-30 disabled:cursor-not-allowed ${sampleId === voice ? 'grad border-transparent text-white' : 'bg-black/30 border-white/10 text-white enabled:hover:border-white/25 enabled:hover:bg-white/10'}`}>
                {sampleId === voice && sampleState === 'loading'
                  ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  : sampleId === voice && sampleState === 'playing'
                    ? <Icon d={I.pause} className="w-3.5 h-3.5" fill />
                    : <Icon d={I.play} className="w-3.5 h-3.5 ml-0.5" fill />}
              </button>
            </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2"><h2 className="font-semibold text-white text-sm">Tốc độ đọc</h2><span className="px-2.5 py-1 rounded-lg bg-white/10 text-sm font-bold text-cyan-300 tabular-nums">{speed.toFixed(1)}x</span></div>
            <input type="range" min={minSpeed} max={maxSpeed} step={0.1} value={speed} onChange={(e) => setSpeed(Math.round(+e.target.value * 10) / 10)} aria-label="Tốc độ" className="range w-full"
              style={{ background: `linear-gradient(90deg,#7c3aed 0%,#06b6d4 ${pct}%,rgba(255,255,255,.12) ${pct}%)` }} />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5"><span>{minSpeed.toFixed(1)}x</span><span>{maxSpeed.toFixed(1)}x</span></div>
            <div className="flex gap-2 mt-2">
              {[0.8, 1.0, 1.2, 1.5].map((s) => <button key={s} onClick={() => setSpeed(s)} className={`flex-1 py-1 rounded-full text-xs font-semibold border transition ${speed === s ? 'grad border-transparent text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>{s.toFixed(1)}x</button>)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <h2 className="font-semibold text-white mb-3">Định dạng</h2>
              <div className="grid grid-cols-2 p-1 rounded-xl bg-black/30 border border-white/10">
                {(['MP3', 'WAV'] as const).map((f) => <button key={f} onClick={() => setFormat(f)} className={`py-1.5 rounded-lg text-xs font-semibold transition ${format === f ? 'bg-white/15 text-white ring-1 ring-cyan-400/50' : 'text-slate-400'}`}>{f} <span className="block font-normal text-[10px] opacity-70">{f === 'MP3' ? '(Nhẹ)' : '(Gốc)'}</span></button>)}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h2 className="font-semibold text-white mb-3">Lưu trữ file</h2>
              <label className="flex items-center gap-2 px-3 py-[11px] rounded-xl bg-black/30 border border-white/10 text-xs text-slate-200">
                <Icon d={I.clock} className="w-4 h-4 text-violet-300" />
                <span className="shrink-0">Tự xóa sau</span>
                <select value={ttlHours} onChange={(e) => setTtlHours(+e.target.value)} className="flex-1 min-w-0 bg-transparent outline-none font-semibold text-white">
                  {ttlOptions.map((h) => <option key={h} value={h} className="bg-slate-900">{fmtTtl(h)}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button onClick={submit} disabled={!canSubmit}
              className="relative overflow-hidden w-full py-2.5 rounded-xl grad text-white font-semibold text-sm shadow-[0_10px_40px_-8px_rgba(124,58,237,.8)] enabled:hover:brightness-110 enabled:active:scale-[.99] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <Icon d={I.bolt} className="w-5 h-5" fill /> {busy ? 'Đang xử lý...' : 'Tạo Voice Ngay'}
            </button>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                <span className="flex-1">{error}</span>
                <button onClick={clearError} aria-label="Đóng"><Icon d={I.x} className="w-4 h-4" /></button>
              </div>
            )}
            {busy && (
              <div className="rounded-xl bg-black/30 border border-white/10 p-3.5">
                <div className="flex items-center justify-between text-sm mb-2.5">
                  <span className="text-slate-200">
                    {job?.status === 'PENDING' && job.queuePosition
                      ? `Đang chờ trong hàng đợi (vị trí ${job.queuePosition})...`
                      : job?.message || 'Đang gửi yêu cầu...'}
                  </span>
                  <b className="text-cyan-300 tabular-nums">{percent}%{eta !== null && <span className="font-normal text-slate-400"> · ước tính {fmtEta(eta)}</span>}</b>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="relative h-full rounded-full grad overflow-hidden shadow-[0_0_18px_rgba(6,182,212,.8)] transition-[width] duration-500" style={{ width: `${percent}%` }}>
                    <div className="sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        </div>
      </main>

      {/* Mini player */}
      {current && (
        <div className="fixed bottom-4 inset-x-4 z-40">
          <div className="max-w-[1100px] mx-auto glass rounded-2xl px-4 py-3 flex items-center gap-4" style={{ background: 'rgba(15,20,35,.8)' }}>
            <button onClick={() => play(current)} aria-label={playing ? 'Tạm dừng' : 'Phát'} className="w-11 h-11 rounded-full grad grid place-items-center shrink-0 shadow-[0_0_24px_rgba(124,58,237,.6)]">{playing ? <Icon d={I.pause} className="w-4 h-4 text-white" fill /> : <Icon d={I.play} className="w-4 h-4 text-white ml-0.5" fill />}</button>
            <div className="hidden sm:block min-w-0 w-40"><p className="text-sm font-semibold text-white truncate">{current.fileName}</p><p className="text-xs text-slate-400">{current.voice} · {current.speed.toFixed(1)}x</p></div>
            <span className="text-xs tabular-nums text-slate-300">{fmtTime(pos)}</span>
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={(e) => {
                const a = audioRef.current
                if (!a || !dur) return
                const r = e.currentTarget.getBoundingClientRect()
                a.currentTime = ((e.clientX - r.left) / r.width) * dur
              }}>
              <div className="hidden sm:block"><Wave progress={dur ? pos / dur : 0} count={80} seed={2} h={36} /></div>
              <div className="sm:hidden"><Wave progress={dur ? pos / dur : 0} count={22} seed={2} h={36} /></div>
            </div>
            <span className="hidden sm:inline text-xs tabular-nums text-slate-500">{fmtTime(dur)}</span>
            <a href={current.downloadUrl} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-semibold text-white shrink-0"><Icon d={I.down} /><span className="hidden sm:inline">Tải xuống</span></a>
          </div>
        </div>
      )}
    </div>
  )
}
