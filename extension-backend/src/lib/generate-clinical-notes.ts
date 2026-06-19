import {
  buildPatientContextPromptBlock,
  type ClinicalNotesPatientContext,
} from '~/lib/clinical-notes-patient-context'
import { normalizeGeneratedSoapJson } from '~/lib/soap-notes-normalize'
import { buildTelemedicineSoapTemplatePrompt } from '~/lib/telemedicine-soap-templates'

export async function generateClinicalNotesFromTranscript(
  transcript: string,
  patientContext?: ClinicalNotesPatientContext,
  appointmentCallType?: 'CHAT' | 'AUDIO' | 'VIDEO' | null,
): Promise<{ content: string; model: string }> {
  const apiKey = Bun.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OpenAI is not configured (missing OPENAI_API_KEY)')
  }

  const trimmed = transcript.trim()
  if (!trimmed) {
    throw new Error(
      'No speech was detected in this recording. Allow microphone access, speak during the visit, and record for at least 10 seconds.',
    )
  }

  const model = Bun.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a clinical documentation assistant for telemedicine visits.
Given a raw visit transcript (which may include off-topic or non-clinical speech), write SOAP visit notes for the treating physician.

Return ONLY valid JSON (no markdown fences, no commentary) with exactly these four keys.
Each value MUST be a single plain-text string (never a nested JSON object or array):
- "subjective": patient-reported symptoms, concerns, history, allergies, and context from the visit
- "objective": measurable and observable clinical data from the encounter (see telemedicine rules below)
- "assessment": clinical impression or differential supported by the visit
- "plan": instructions, referrals, follow-up, and patient education

${buildTelemedicineSoapTemplatePrompt(appointmentCallType)}

Relevance (critical):
- Include ONLY information pertinent to this clinical encounter.
- Omit noise and non-visit content, such as: greetings and pleasantries, small talk unrelated to care, video/audio/connection issues, scheduling chit-chat, filler ("um", "okay"), repetition, and any conversation clearly not about the patient's health or the visit plan.
- Do not summarize or mention filtered-out content in the notes.

Telemedicine — "objective" (important):
- Most visits lack an in-person physical exam. Still populate "objective" from the transcript whenever possible.
- Include: patient-reported vitals and measurements (temperature, pulse, weight, etc.); observable or characterizable findings (e.g. cough, congestion, appearance if described); clinician observations from the video visit if stated; tests or results mentioned.
- Patient-reported symptoms belong in the matching objective exam section (e.g. sore throat → Mouth and Throat). Never mark a body system "Not assessed" if the patient mentioned a symptom for that system.
- Do NOT copy the entire subjective narrative into objective—summarize only measurable/observable facts per body-system line.
- Use "Not documented in transcript." for objective ONLY when the transcript truly contains no vitals, measurements, observable findings, or clinician observations. If symptoms or vitals appear anywhere in the transcript, they must appear in subjective and/or objective as appropriate—never leave objective as only "Not documented" while other sections are filled.

Medications (strict — transcript only):
- Do NOT name, prescribe, recommend, or document any medication, supplement, or OTC product unless it was explicitly mentioned in the transcript (by name or unmistakable description).
- Do NOT suggest acetaminophen, ibuprofen, antibiotics, or any other drug as a default treatment for symptoms.
- If no medications were discussed on the call, "plan" must contain follow-up and general education only — no drug names.
- When a medication WAS discussed, document it in "plan" with indication and dosing only as stated in the transcript. Add brief patient education only for medications actually mentioned.

General rules:
- Paraphrase; do not quote verbatim unless clinically necessary.
- Do not invent diagnoses, drugs, tests, or treatments that were not mentioned in the transcript.
- Use plain text in each field (paragraphs or numbered steps in "plan" when appropriate).
- Use "Not documented in transcript." only for a section with genuinely no relevant content in the transcript. Never use that phrase for all four sections if the visit discussed symptoms, treatment, or plan.

${buildPatientContextPromptBlock(patientContext ?? { gender: null, genderSource: 'unknown' })}`,
        },
        {
          role: 'user',
          content: `Visit transcript:\n\n${trimmed}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    throw new Error(
      `OpenAI request failed (${response.status})${errBody ? `: ${errBody.slice(0, 200)}` : ''}`,
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('OpenAI returned an empty response')
  }

  return { content: normalizeGeneratedSoapJson(content), model }
}
