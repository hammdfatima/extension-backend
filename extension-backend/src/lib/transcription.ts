import { cleanTranscriptText } from '~/lib/transcriptFilter'

interface TranscriptionResult {
  text: string
  source: 'openai' | 'demo'
}

export async function transcribeAudioChunk(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  options: { allowSmallFiles?: boolean } = {},
): Promise<TranscriptionResult> {
  const sizeKb = Math.round(audioBuffer.byteLength / 1024)
  if (!options.allowSmallFiles && sizeKb < 8) {
    return { text: '', source: 'openai' }
  }

  const apiKey = Bun.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    return { text: '', source: 'demo' }
  }

  const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' })
  const formData = new FormData()
  formData.append('file', blob, 'chunk.webm')
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'json')
  formData.append('language', 'en')
  formData.append('temperature', '0')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Whisper API error: ${errorText}`)
  }

  const data = (await response.json()) as { text?: string }
  const text = cleanTranscriptText(data.text?.trim() ?? '')
  return { text, source: 'openai' }
}

/** Transcribe a saved meeting audio file with OpenAI Whisper. */
export async function transcribeMeetingAudioFile(audioPath: string): Promise<TranscriptionResult> {
  const file = Bun.file(audioPath)
  if (!(await file.exists())) {
    throw new Error(`Audio file not found: ${audioPath}`)
  }

  const buffer = await file.arrayBuffer()
  const sizeKb = Math.round(buffer.byteLength / 1024)
  if (buffer.byteLength < 1024) {
    throw new Error(
      `Audio file is too small to transcribe (${buffer.byteLength} bytes). The recording may not have uploaded correctly.`,
    )
  }

  const mimeType = audioPath.endsWith('.ogg') ? 'audio/ogg' : 'audio/webm'
  const result = await transcribeAudioChunk(buffer, mimeType, { allowSmallFiles: true })
  if (!result.text) {
    throw new Error(
      `Whisper returned no speech text for this recording (${sizeKb} KB). Try recording a longer visit with clear audio.`,
    )
  }
  return result
}

export function generateNotesFromTranscript(segments: { text: string; speaker?: string | null }[]) {
  const fullText = segments.map(s => s.text).join(' ').trim()

  if (!fullText) {
    return {
      title: 'Meeting Notes',
      summary: 'No transcript was captured for this meeting.',
      content: '## Meeting Notes\n\n_No transcript available._',
    }
  }

  const sentences = fullText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)

  const keyPoints = sentences.slice(0, Math.min(6, sentences.length))
  const summary =
    sentences.length > 2
      ? `${sentences[0]} ${sentences[1]}`
      : fullText.slice(0, 200)

  const bulletPoints = keyPoints.map(point => `- ${point}`).join('\n')
  const content = [
    '## Summary',
    summary,
    '',
    '## Key Points',
    bulletPoints,
    '',
    '## Full Transcript',
    fullText,
  ].join('\n')

  return {
    title: 'Meeting Notes',
    summary,
    content,
  }
}
