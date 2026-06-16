import { createRouter } from '~/lib/create-app'
import { MEETING_ROUTE_HANDLER } from '~/routes/meetings/meetings.handler'
import { MEETING_ROUTES } from '~/routes/meetings/meetings.routes'

const router = createRouter()
  .openapi(MEETING_ROUTES.create_meeting, MEETING_ROUTE_HANDLER.create_meeting)
  .openapi(MEETING_ROUTES.list_meetings, MEETING_ROUTE_HANDLER.list_meetings)
  .openapi(MEETING_ROUTES.get_meeting, MEETING_ROUTE_HANDLER.get_meeting)
  .openapi(MEETING_ROUTES.append_transcript, MEETING_ROUTE_HANDLER.append_transcript)
  .openapi(MEETING_ROUTES.bulk_transcript, MEETING_ROUTE_HANDLER.bulk_transcript)
  .openapi(MEETING_ROUTES.transcribe_chunk, MEETING_ROUTE_HANDLER.transcribe_chunk)
  .openapi(MEETING_ROUTES.complete_meeting, MEETING_ROUTE_HANDLER.complete_meeting)
  .openapi(MEETING_ROUTES.save_note, MEETING_ROUTE_HANDLER.save_note)
  .openapi(MEETING_ROUTES.generate_notes, MEETING_ROUTE_HANDLER.generate_notes)
  .openapi(MEETING_ROUTES.upload_audio, MEETING_ROUTE_HANDLER.upload_audio)

export default router
