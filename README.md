# Meeting Transcript & Notes

Chrome extension + backend for recording WebRTC video call audio, live transcription, and saving meeting notes.

## Project structure

| Folder | Description |
|--------|-------------|
| `extension-frontend` | React Chrome extension (side panel UI) |
| `extension-backend` | Hono + Prisma API for meetings, transcripts, and notes |

## Quick start

### 1. Backend

```bash
cd extension-backend
bun install
bun run db:migrate
bun run dev
```

API runs at `http://localhost:8080`. OpenAPI docs at `http://localhost:8080/reference`.

Optional: set `OPENAI_API_KEY` in `.env` for real Whisper transcription of tab audio. Without it, demo phrases are returned for audio chunks while browser speech recognition still provides live captions.

### 2. Chrome extension

```bash
cd extension-frontend
npm install
node scripts/generate-icons.mjs
cp .env.example .env
npm run dev
```

Load the `extension-frontend/dist` folder in `chrome://extensions` (Developer mode → Load unpacked).

### 3. Record a meeting

1. Open a video call in Chrome (Meet, Zoom web, Teams, etc.)
2. Click the extension icon to open the side panel
3. Press **Start Recording**
4. Watch live transcripts
5. Press **Stop & Save Notes** to upload audio and edit generated notes

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/meetings` | Start meeting session |
| `GET` | `/meetings` | List meetings |
| `GET` | `/meetings/:id` | Get meeting + transcript + notes |
| `POST` | `/meetings/:id/transcripts` | Append transcript line |
| `POST` | `/meetings/:id/transcribe` | Transcribe audio chunk (webm) |
| `POST` | `/meetings/:id/complete` | End meeting |
| `POST` | `/meetings/:id/audio` | Upload full recording |
| `POST` | `/meetings/:id/notes` | Save notes |
| `POST` | `/meetings/:id/notes/generate` | Auto-generate notes from transcript |
