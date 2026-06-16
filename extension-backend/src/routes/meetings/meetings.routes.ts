import { createRoute, z } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  AppendTranscriptBodySchema,
  BulkTranscriptBodySchema,
  CreateMeetingBodySchema,
  MeetingDetailSchema,
  MeetingSchema,
  NoteSchema,
  SaveNoteBodySchema,
  TranscribeResponseSchema,
  TranscriptSegmentSchema,
} from '~/routes/meetings/meetings.schemas'

export const MEETING_ROUTES = {
  create_meeting: createRoute({
    method: 'post',
    tags: ['Meetings'],
    path: '/',
    summary: 'Start a new meeting session',
    request: {
      body: {
        content: { 'application/json': { schema: CreateMeetingBodySchema } },
        required: false,
      },
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(zodResponseSchema(MeetingSchema), 'Meeting created'),
    },
  }),

  list_meetings: createRoute({
    method: 'get',
    tags: ['Meetings'],
    path: '/',
    summary: 'List meetings',
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(z.array(MeetingSchema)),
        'Meetings list',
      ),
    },
  }),

  get_meeting: createRoute({
    method: 'get',
    tags: ['Meetings'],
    path: '/{id}',
    summary: 'Get meeting with transcript and notes',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(MeetingDetailSchema), 'Meeting detail'),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(zodResponseSchema(), 'Not found'),
    },
  }),

  append_transcript: createRoute({
    method: 'post',
    tags: ['Meetings'],
    path: '/{id}/transcripts',
    summary: 'Append a transcript segment',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: { 'application/json': { schema: AppendTranscriptBodySchema } },
        required: true,
      },
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(TranscriptSegmentSchema),
        'Segment added',
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(zodResponseSchema(), 'Not found'),
    },
  }),

  bulk_transcript: createRoute({
    method: 'post',
    tags: ['Meetings'],
    path: '/{id}/transcripts/bulk',
    summary: 'Save multiple transcript segments at once',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: { 'application/json': { schema: BulkTranscriptBodySchema } },
        required: true,
      },
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(z.array(TranscriptSegmentSchema)),
        'Segments added',
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(zodResponseSchema(), 'Not found'),
    },
  }),

  transcribe_chunk: createRoute({
    method: 'post',
    tags: ['Meetings'],
    path: '/{id}/transcribe',
    summary: 'Transcribe an audio chunk from the meeting tab',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'audio/webm': { schema: z.instanceof(ArrayBuffer) },
          'audio/ogg': { schema: z.instanceof(ArrayBuffer) },
        },
        required: true,
      },
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(TranscribeResponseSchema), 'Transcribed'),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(zodResponseSchema(), 'Not found'),
    },
  }),

  complete_meeting: createRoute({
    method: 'post',
    tags: ['Meetings'],
    path: '/{id}/complete',
    summary: 'End a meeting session',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(MeetingSchema), 'Meeting completed'),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(zodResponseSchema(), 'Not found'),
    },
  }),

  save_note: createRoute({
    method: 'post',
    tags: ['Meetings'],
    path: '/{id}/notes',
    summary: 'Save or update meeting notes',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: { 'application/json': { schema: SaveNoteBodySchema } },
        required: true,
      },
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(NoteSchema), 'Note saved'),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(zodResponseSchema(), 'Not found'),
    },
  }),

  generate_notes: createRoute({
    method: 'post',
    tags: ['Meetings'],
    path: '/{id}/notes/generate',
    summary: 'Auto-generate SOAP clinical notes from transcript (OpenAI)',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(NoteSchema), 'Notes generated'),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(zodResponseSchema(), 'Not found'),
    },
  }),

  upload_audio: createRoute({
    method: 'post',
    tags: ['Meetings'],
    path: '/{id}/audio',
    summary: 'Upload full meeting audio recording',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'audio/webm': { schema: z.instanceof(ArrayBuffer) },
          'audio/ogg': { schema: z.instanceof(ArrayBuffer) },
        },
        required: true,
      },
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(zodResponseSchema(MeetingSchema), 'Audio saved'),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(zodResponseSchema(), 'Not found'),
    },
  }),
}
