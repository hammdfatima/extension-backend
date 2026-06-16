export function buildTelemedicineSoapTemplatePrompt(
  appointmentCallType?: 'CHAT' | 'AUDIO' | 'VIDEO' | null,
): string {
  switch (appointmentCallType) {
    case 'VIDEO':
      return `Visit modality: VIDEO telemedicine.
- Objective may include visual observations explicitly stated during the video visit (e.g. appearance, respiratory effort, rash if shown).
- Note limitations of remote visual exam when relevant.`
    case 'AUDIO':
      return `Visit modality: AUDIO telemedicine (no video).
- Objective must rely on patient-reported findings, audible observations (cough, voice changes), and any vitals or measurements stated on the call.
- Do not document visual exam findings unless explicitly described by the patient or clinician from prior context in the transcript.`
    case 'CHAT':
      return `Visit modality: CHAT / text-based telemedicine.
- Objective is limited to information typed or read aloud in the transcript; there is no live audio or video exam.
- Favor patient-reported symptoms and any measurements or results shared in text.`
    default:
      return `Visit modality: telemedicine (unspecified). Apply standard telemedicine documentation rules; do not assume an in-person physical exam occurred.`
  }
}
