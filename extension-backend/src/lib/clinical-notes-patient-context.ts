export type ClinicalNotesPatientContext = {
  gender: string | null
  genderSource: 'known' | 'inferred' | 'unknown'
}

export function buildPatientContextPromptBlock(context: ClinicalNotesPatientContext): string {
  if (context.gender && context.genderSource === 'known') {
    return `Patient context: documented gender is "${context.gender}". Use clinically appropriate pronouns and language.`
  }

  if (context.gender && context.genderSource === 'inferred') {
    return `Patient context: gender may be "${context.gender}" (inferred, not confirmed). Prefer neutral language unless the transcript clearly indicates otherwise.`
  }

  return 'Patient gender is not documented. Use neutral clinical language where gender is unspecified.'
}
