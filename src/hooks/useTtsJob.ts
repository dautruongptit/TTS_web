import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, type CreateJobInput, type JobProgress } from '../api/client'

const POLL_MS = 1500

/** Tạo job rồi polling /progress đến khi COMPLETED hoặc FAILED. */
export function useTtsJob(onDone: (job: JobProgress) => void) {
  const [job, setJob] = useState<JobProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const poll = useCallback(async (jobId: string) => {
    try {
      const p = await api.progress(jobId)
      setJob(p)
      if (p.status === 'COMPLETED') { setBusy(false); onDoneRef.current(p); return }
      if (p.status === 'FAILED') { setBusy(false); setError(p.message || 'Tạo giọng nói thất bại.'); return }
      timer.current = window.setTimeout(() => poll(jobId), POLL_MS)
    } catch (e) {
      // Mất mạng thoáng qua: thử lại; job không còn (404) thì dừng.
      if (e instanceof ApiError && e.status !== 0 && e.status < 500) {
        setBusy(false); setError(e.message); return
      }
      timer.current = window.setTimeout(() => poll(jobId), POLL_MS * 2)
    }
  }, [])

  const start = useCallback(async (input: CreateJobInput) => {
    window.clearTimeout(timer.current)
    setError(null); setJob(null); setBusy(true)
    try {
      const { jobId } = await api.createJob(input)
      await poll(jobId)
    } catch (e) {
      setBusy(false)
      setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra, vui lòng thử lại.')
    }
  }, [poll])

  return { job, error, busy, start, clearError: () => setError(null) }
}
