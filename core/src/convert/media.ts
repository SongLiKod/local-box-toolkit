import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { assetBase } from '../env'
import { baseName } from '../files'
import type { ConvertedFile, ProgressCb } from '../types'

export const VIDEO_FORMATS = ['mp4', 'avi', 'mov', 'flv', 'mkv'] as const
export const AUDIO_FORMATS = ['mp3', 'wav', 'flac'] as const

export type VideoFormat = (typeof VIDEO_FORMATS)[number]
export type AudioFormat = (typeof AUDIO_FORMATS)[number]

export type MediaJob =
  | { kind: 'video'; format: VideoFormat; crf: number; scaleWidth: number | null }
  | { kind: 'audio'; format: AudioFormat; bitrate: string }
  | { kind: 'extractAudio'; format: AudioFormat }

let ffmpegSingleton: FFmpeg | null = null
let loading: Promise<FFmpeg> | null = null

/** ffmpeg.wasm 本地加载（核心文件随应用打包，完全离线，不经过服务器） */
export async function getFFmpeg(onLog?: (line: string) => void): Promise<FFmpeg> {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton
  if (loading) return loading
  loading = (async (): Promise<FFmpeg> => {
    const base = assetBase()
    const ff = new FFmpeg()
    if (onLog) ff.on('log', ({ message }) => onLog(message))
    const coreURL = await toBlobURL(`${base}ffmpeg/ffmpeg-core.js`, 'text/javascript')
    const wasmURL = await toBlobURL(`${base}ffmpeg/ffmpeg-core.wasm`, 'application/wasm')
    const workerURL = await toBlobURL(`${base}ffmpeg/ffmpeg-worker.js`, 'text/javascript')
    await ff.load({ coreURL, wasmURL, classWorkerURL: workerURL })
    ffmpegSingleton = ff
    return ff
  })()
  try {
    return await loading
  } catch (e) {
    loading = null
    throw new Error(`FFmpeg WASM 初始化失败（需支持 Web Worker/SharedArrayBuffer 的浏览器）：${
      e instanceof Error ? e.message : String(e)
    }`)
  }
}

function extOfName(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

/**
 * 音视频本地格式转换：MP4/AVI/MOV/FLV/MKV、MP3/WAV/FLAC，
 * 支持视频压缩、音频提取，批量处理（PRD 3.1.4）。
 */
export async function convertMedia(
  file: File,
  job: MediaJob,
  onProgress?: ProgressCb
): Promise<ConvertedFile> {
  const ff = await getFFmpeg()
  const inExt = extOfName(file.name) || 'bin'
  const inName = `in.${inExt}`
  let outName = ''
  let args: string[] = []

  if (job.kind === 'video') {
    outName = `out.${job.format}`
    args = ['-y', '-i', inName]
    if (job.scaleWidth) args = args.concat(['-vf', `scale=${job.scaleWidth}:-2`])
    args = args.concat(['-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(job.crf)])
    if (job.format === 'mp4' || job.format === 'mov' || job.format === 'flv') {
      args = args.concat(['-c:a', 'aac'])
    } else if (job.format === 'mkv') {
      args = args.concat(['-c:a', 'aac'])
    } else {
      args = args.concat(['-c:a', 'mp2'])
    }
  } else if (job.kind === 'audio') {
    outName = `out.${job.format}`
    args = ['-y', '-i', inName, '-vn', '-b:a', job.bitrate]
  } else {
    outName = `out.${job.format}`
    args = ['-y', '-i', inName, '-vn', '-acodec', 'copy']
  }

  const progressHandler = ({ progress }: { progress: number }): void => {
    onProgress?.({
      done: Math.max(0, Math.min(1, progress)) * 100,
      total: 100,
      label: file.name,
    })
  }
  ff.on('progress', progressHandler)
  try {
    await ff.writeFile(inName, await fetchFile(file))
    await ff.exec(args)
    const data = await ff.readFile(outName)
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data)
    const suffix = job.kind === 'video' ? '' : '_音频'
    return {
      name: `${baseName(file.name)}${suffix}.${(job as { format: string }).format}`,
      blob: new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' }),
    }
  } finally {
    ff.off('progress', progressHandler)
    // 处理完成立即清理临时文件（PRD 7.2 / TechDoc 8.3）
    try {
      await ff.deleteFile(inName)
      await ff.deleteFile(outName)
    } catch {
      /* 忽略清理失败 */
    }
  }
}
