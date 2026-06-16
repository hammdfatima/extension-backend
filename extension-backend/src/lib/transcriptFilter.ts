const HALLUCINATION_PATTERNS = [
  /thank you for watching/i,
  /thanks for watching/i,
  /see you in the next video/i,
  /like and subscribe/i,
  /subscribe to my channel/i,
  /fema\.gov/i,
  /for more information, visit/i,
  /^\s*\.+\s*$/,
  /subtitles by/i,
  /amara\.org/i,
  /merry christmas/i,
  /happy new year/i,
  /copyright/i,
  /all rights reserved/i,
  /^\s*you\s*$/i,
  /celebrating \d+ years/i,
  /visit www\./i,
  /^\s*bye!?\s*$/i,
  /thank you so much for your time/i,
  /see you in the next session/i,
  /i will see you in the next/i,
  /have a (great|good|nice) day/i,
]

export function isLikelyHallucination(text: string) {
  const normalized = text.trim()
  if (!normalized) return true
  if (normalized.length < 3) return true
  if (/^[\s.…,!?-]+$/.test(normalized)) return true

  return HALLUCINATION_PATTERNS.some(pattern => pattern.test(normalized))
}

export function cleanTranscriptText(text: string) {
  const trimmed = text.trim()
  if (isLikelyHallucination(trimmed)) return ''
  return trimmed
}
