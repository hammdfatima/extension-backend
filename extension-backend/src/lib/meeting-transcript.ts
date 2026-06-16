import {
  formatSoapNotesMarkdown,
  parseSoapNoteJson,
} from '~/lib/soap-notes-normalize'

type TranscriptSegment = {
  text: string
  speaker?: string | null
  startMs?: number | null
}

export function buildMeetingTranscriptText(segments: TranscriptSegment[]): string {
  return segments
    .map(segment => {
      const speaker = segment.speaker ? `${segment.speaker}: ` : ''
      return `${speaker}${segment.text}`.trim()
    })
    .filter(Boolean)
    .join('\n\n')
}

export function buildSoapNoteFromGeneratedJson(soapJson: string) {
  const soap = parseSoapNoteJson(soapJson)
  const content = formatSoapNotesMarkdown(soap)
  const summary =
    soap.assessment.slice(0, 280) ||
    soap.subjective.slice(0, 280) ||
    'SOAP notes generated from visit transcript.'

  return {
    title: 'SOAP Notes',
    summary,
    content,
    soapJson,
  }
}
