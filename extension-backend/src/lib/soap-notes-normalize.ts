export type SoapNoteFields = {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

function coerceSoapField(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.map(item => coerceSoapField(item)).filter(Boolean).join('\n')
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const text = coerceSoapField(val)
        return text ? `${key}: ${text}` : ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

export function parseSoapNoteJson(raw: string): SoapNoteFields {
  const parsed = JSON.parse(raw) as Record<string, unknown>
  return {
    subjective: coerceSoapField(parsed.subjective),
    objective: coerceSoapField(parsed.objective),
    assessment: coerceSoapField(parsed.assessment),
    plan: coerceSoapField(parsed.plan),
  }
}

/** Normalize model output to canonical JSON string with four SOAP keys. */
export function normalizeGeneratedSoapJson(raw: string): string {
  const soap = parseSoapNoteJson(raw)
  return JSON.stringify(soap)
}

export function formatSoapNotesMarkdown(soap: SoapNoteFields): string {
  const section = (title: string, body: string) =>
    `## ${title}\n\n${body || 'Not documented in transcript.'}`

  return [
    section('Subjective', soap.subjective),
    section('Objective', soap.objective),
    section('Assessment', soap.assessment),
    section('Plan', soap.plan),
  ].join('\n\n')
}
