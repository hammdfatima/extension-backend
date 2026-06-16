import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import { generateClinicalNotesFromTranscript } from '~/lib/generate-clinical-notes'
import {
  buildMeetingTranscriptText,
  buildSoapNoteFromGeneratedJson,
} from '~/lib/meeting-transcript'
import prisma from '~/lib/prisma'
import { transcribeAudioChunk } from '~/lib/transcription'
import type { MEETING_ROUTES } from '~/routes/meetings/meetings.routes'
import type { HandlerMapFromRoutes } from '~/types'

function serializeMeeting(meeting: {
  id: string
  title: string | null
  status: 'ACTIVE' | 'COMPLETED'
  startedAt: Date
  endedAt: Date | null
  audioPath: string | null
  createdAt: Date
}) {
  return {
    id: meeting.id,
    title: meeting.title,
    status: meeting.status,
    startedAt: meeting.startedAt.toISOString(),
    endedAt: meeting.endedAt?.toISOString() ?? null,
    audioPath: meeting.audioPath,
    createdAt: meeting.createdAt.toISOString(),
  }
}

function serializeSegment(segment: {
  id: string
  meetingId: string
  text: string
  isFinal: boolean
  speaker: string | null
  startMs: number | null
  endMs: number | null
  createdAt: Date
}) {
  return {
    id: segment.id,
    meetingId: segment.meetingId,
    text: segment.text,
    isFinal: segment.isFinal,
    speaker: segment.speaker,
    startMs: segment.startMs,
    endMs: segment.endMs,
    createdAt: segment.createdAt.toISOString(),
  }
}

function serializeNote(note: {
  id: string
  meetingId: string
  title: string | null
  summary: string | null
  content: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: note.id,
    meetingId: note.meetingId,
    title: note.title,
    summary: note.summary,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }
}

async function getMeetingOrThrow(id: string) {
  const meeting = await prisma.meeting.findUnique({ where: { id } })
  if (!meeting) {
    throw new HttpError('Meeting not found', HttpStatusCodes.NOT_FOUND)
  }
  return meeting
}

async function ensureUploadDir() {
  const uploadDir = Bun.env.UPLOAD_DIR ?? './uploads'
  await mkdir(uploadDir, { recursive: true })
  return uploadDir
}

export const MEETING_ROUTE_HANDLER: HandlerMapFromRoutes<typeof MEETING_ROUTES> = {
  create_meeting: async c => {
    const body = c.req.valid('json') ?? {}
    const user = c.get('user')

    const meeting = await prisma.meeting.create({
      data: {
        title: body.title ?? 'Untitled Meeting',
        userId: user?.id,
      },
    })

    return c.json(
      {
        message: 'Meeting created',
        success: true,
        data: serializeMeeting(meeting),
      },
      HttpStatusCodes.CREATED,
    )
  },

  list_meetings: async c => {
    const user = c.get('user')
    const meetings = await prisma.meeting.findMany({
      where: user ? { userId: user.id } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return c.json({
      message: 'Meetings fetched',
      success: true,
      data: meetings.map(serializeMeeting),
    })
  },

  get_meeting: async c => {
    const { id } = c.req.valid('param')
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        segments: { orderBy: { createdAt: 'asc' } },
        note: true,
      },
    })

    if (!meeting) {
      throw new HttpError('Meeting not found', HttpStatusCodes.NOT_FOUND)
    }

    return c.json({
      message: 'Meeting fetched',
      success: true,
      data: {
        ...serializeMeeting(meeting),
        segments: meeting.segments.map(serializeSegment),
        note: meeting.note ? serializeNote(meeting.note) : null,
      },
    })
  },

  append_transcript: async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    await getMeetingOrThrow(id)

    const segment = await prisma.transcriptSegment.create({
      data: {
        meetingId: id,
        text: body.text,
        isFinal: body.isFinal,
        speaker: body.speaker,
        startMs: body.startMs,
        endMs: body.endMs,
      },
    })

    return c.json(
      {
        message: 'Transcript segment added',
        success: true,
        data: serializeSegment(segment),
      },
      HttpStatusCodes.CREATED,
    )
  },

  bulk_transcript: async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    await getMeetingOrThrow(id)

    const segments = await prisma.$transaction(
      body.segments.map(segment =>
        prisma.transcriptSegment.create({
          data: {
            meetingId: id,
            text: segment.text,
            isFinal: segment.isFinal,
            speaker: segment.speaker,
            startMs: segment.startMs,
            endMs: segment.endMs,
          },
        }),
      ),
    )

    return c.json(
      {
        message: 'Transcript segments added',
        success: true,
        data: segments.map(serializeSegment),
      },
      HttpStatusCodes.CREATED,
    )
  },

  transcribe_chunk: async c => {
    const { id } = c.req.valid('param')
    await getMeetingOrThrow(id)

    const contentType = c.req.header('content-type') ?? 'audio/webm'
    const audioBuffer = await c.req.arrayBuffer()
    const result = await transcribeAudioChunk(audioBuffer, contentType)

    if (!result.text) {
      return c.json({
        message: 'No speech detected',
        success: true,
        data: { text: '', source: result.source },
      })
    }

    const segment = await prisma.transcriptSegment.create({
      data: {
        meetingId: id,
        text: result.text,
        isFinal: true,
      },
    })

    return c.json({
      message: 'Audio transcribed',
      success: true,
      data: {
        text: result.text,
        source: result.source,
        segment: serializeSegment(segment),
      },
    })
  },

  complete_meeting: async c => {
    const { id } = c.req.valid('param')
    await getMeetingOrThrow(id)

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    })

    return c.json({
      message: 'Meeting completed',
      success: true,
      data: serializeMeeting(meeting),
    })
  },

  save_note: async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    await getMeetingOrThrow(id)

    const note = await prisma.note.upsert({
      where: { meetingId: id },
      create: {
        meetingId: id,
        title: body.title ?? 'Meeting Notes',
        summary: body.summary,
        content: body.content,
      },
      update: {
        title: body.title,
        summary: body.summary,
        content: body.content,
      },
    })

    return c.json({
      message: 'Note saved',
      success: true,
      data: serializeNote(note),
    })
  },

  generate_notes: async c => {
    const { id } = c.req.valid('param')
    await getMeetingOrThrow(id)

    const segments = await prisma.transcriptSegment.findMany({
      where: { meetingId: id },
      orderBy: { createdAt: 'asc' },
    })

    const transcript = buildMeetingTranscriptText(segments)
    const { content: soapJson } = await generateClinicalNotesFromTranscript(
      transcript,
      undefined,
      'AUDIO',
    )
    const generated = buildSoapNoteFromGeneratedJson(soapJson)

    const note = await prisma.note.upsert({
      where: { meetingId: id },
      create: {
        meetingId: id,
        title: generated.title,
        summary: generated.summary,
        content: generated.content,
      },
      update: {
        title: generated.title,
        summary: generated.summary,
        content: generated.content,
      },
    })

    return c.json({
      message: 'SOAP notes generated',
      success: true,
      data: serializeNote(note),
    })
  },

  upload_audio: async c => {
    const { id } = c.req.valid('param')
    await getMeetingOrThrow(id)

    const uploadDir = await ensureUploadDir()
    const extension = (c.req.header('content-type') ?? 'audio/webm').includes('ogg')
      ? 'ogg'
      : 'webm'
    const fileName = `${id}.${extension}`
    const filePath = join(uploadDir, fileName)
    const audioBuffer = await c.req.arrayBuffer()
    await Bun.write(filePath, audioBuffer)

    const meeting = await prisma.meeting.update({
      where: { id },
      data: { audioPath: filePath },
    })

    return c.json({
      message: 'Audio uploaded',
      success: true,
      data: serializeMeeting(meeting),
    })
  },
}
