import { useEffect, useRef, useState } from 'react'
import { Icon, I } from './Icon'
import { api, ApiError, type AudioFile } from '../api/client'

// Sao chép văn bản; dự phòng cho trình duyệt/ngữ cảnh không có navigator.clipboard (ví dụ http thường).
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* thử cách dự phòng */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** Cửa sổ xem văn bản đã dùng để tạo file, có nút sao chép. */
export function TextModal({ file, onClose }: { file: AudioFile; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let alive = true
    api.fileText(file.id)
      .then((r) => { if (alive) setText(r.text) })
      .catch((e) => { if (alive) setError(e instanceof ApiError ? e.message : 'Không tải được văn bản.') })
    return () => { alive = false }
  }, [file.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    if (text === null) return
    setCopied((await copyText(text)) ? 'ok' : 'fail')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label="Văn bản đã dùng" className="glass rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" style={{ background: 'rgba(15,20,35,.96)' }}>
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-white/10">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white">Văn bản đã dùng</h2>
            <p className="text-xs text-slate-400 truncate">{file.fileName} · {file.voice}</p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-white"><Icon d={I.x} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {text === null && !error && <p className="text-sm text-slate-500">Đang tải...</p>}
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          {text !== null && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-100 select-text">{text}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/10">
          <span className="text-xs text-slate-400">{text !== null ? `${text.length.toLocaleString()} ký tự` : ''}</span>
          <div className="flex gap-2">
            <button onClick={copy} disabled={text === null}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold grad text-white disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-110">
              <Icon d={copied === 'ok' ? I.check : I.copy} className="w-4 h-4" />
              {copied === 'ok' ? 'Đã sao chép' : copied === 'fail' ? 'Không sao chép được' : 'Sao chép'}
            </button>
            <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 text-white">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  )
}
