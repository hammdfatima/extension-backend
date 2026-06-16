import { z } from '@hono/zod-openapi'

export const MeetingSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED']),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  audioPath: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  text: z.string(),
  isFinal: z.boolean(),
  speaker: z.string().nullable(),
  startMs: z.number().nullable(),
  endMs: z.number().nullable(),
  createdAt: z.string().datetime(),
})

export const NoteSchema = z.object({
  id: z.string(),
  meetingId: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  content: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const MeetingDetailSchema = MeetingSchema.extend({
  segments: z.array(TranscriptSegmentSchema),
  note: NoteSchema.nullable(),
})

export const CreateMeetingBodySchema = z.object({
  title: z.string().optional(),
})

export const AppendTranscriptBodySchema = z.object({
  text: z.string().min(1),
  isFinal: z.boolean().default(true),
  speaker: z.string().optional(),
  startMs: z.number().optional(),
  endMs: z.number().optional(),
})

export const BulkTranscriptBodySchema = z.object({
  segments: z.array(AppendTranscriptBodySchema).min(1),
})

export const SaveNoteBodySchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  content: z.string().min(1),
})

export const TranscribeResponseSchema = z.object({
  text: z.string(),
  source: z.enum(['openai', 'demo']),
  segment: TranscriptSegmentSchema.optional(),
})
