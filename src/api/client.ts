// Client gọi tts-api qua đường dẫn tương đối /api/... (Vite proxy ở dev, nginx ở production).
const BASE = '/api/v1'

export interface Voice { id: string; name: string; priority: boolean; sampleReady: boolean }

export interface AppConfig {
  maxTextLength: number
  defaultTtlHours: number
  maxTtlHours: number
  minSpeed: number
  maxSpeed: number
  maxUploadBytes: number
  formats: string[]
}

export interface AudioFile {
  id: string
  fileName: string
  format: string
  fileSize: number
  voice: string
  speed: number
  ttlHours: number
  createdAt: string
  expiresAt: string
  remainingSeconds: number
  streamUrl: string
  downloadUrl: string
}

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface JobProgress {
  jobId: string
  status: JobStatus
  progressPercent: number
  message: string | null
  queuePosition: number | null
  resultFile: AudioFile | null
}

export interface CreateJobInput {
  text?: string
  file?: File
  voice: string
  speed: number
  format: 'mp3' | 'wav'
  ttlHours: number
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, init)
  } catch {
    throw new ApiError(0, 'NETWORK', 'Không kết nối được máy chủ. Vui lòng thử lại.')
  }
  if (!res.ok) {
    let code = 'ERROR'
    let message = `Lỗi máy chủ (${res.status})`
    try {
      const body = await res.json()
      if (body?.code) code = body.code
      if (body?.message) message = body.message
    } catch { /* không phải JSON */ }
    throw new ApiError(res.status, code, message)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  config: () => request<AppConfig>('/config'),
  voices: () => request<Voice[]>('/voices'),
  files: () => request<AudioFile[]>('/tts/files'),
  progress: (jobId: string) => request<JobProgress>(`/tts/jobs/${jobId}/progress`),
  deleteFile: (id: string) => request<void>(`/tts/files/${id}`, { method: 'DELETE' }),
  createJob: (input: CreateJobInput) => {
    const form = new FormData()
    if (input.file) form.append('file', input.file)
    else form.append('text', input.text ?? '')
    form.append('voice', input.voice)
    form.append('speed', String(input.speed))
    form.append('format', input.format)
    form.append('ttlHours', String(input.ttlHours))
    return request<{ jobId: string }>('/tts/jobs', { method: 'POST', body: form })
  },
}
