/**
 * Backend API client for meetings, transcripts, and notes.
 * Loaded via importScripts in the service worker.
 */

const API_TIMEOUT_MS = 120_000;
const API_WAKE_TIMEOUT_MS = 90_000;

/**
 * @param {string} path
 * @param {RequestInit & { timeoutMs?: number, retries?: number }} [options]
 */
async function apiRequest(path, options = {}) {
  const { timeoutMs = API_TIMEOUT_MS, retries = 0, ...fetchOptions } = options;
  const headers = { ...(fetchOptions.headers || {}) };
  if (
    fetchOptions.body &&
    !(fetchOptions.body instanceof ArrayBuffer) &&
    !(fetchOptions.body instanceof Blob)
  ) {
    headers['Content-Type'] = 'application/json';
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.success === false) {
        throw new Error(json.message || `API request failed (${response.status})`);
      }

      return json.data;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isNetwork =
        isAbort ||
        message.includes('Failed to fetch') ||
        message.includes('NetworkError') ||
        message.includes('network');

      if (attempt < retries && isNetwork) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }

      if (isAbort) {
        throw new Error(
          'Server request timed out. The backend may be waking up — wait a moment and try again.'
        );
      }

      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

/** Ping the server so Render free tier is warm before stop/upload. */
async function wakeBackend() {
  return apiRequest('/health', {
    method: 'GET',
    timeoutMs: API_WAKE_TIMEOUT_MS,
    retries: 1,
  });
}

/**
 * @param {string} [title]
 */
async function createMeeting(title) {
  return apiRequest('/meetings', {
    method: 'POST',
    body: JSON.stringify({ title: title || 'Tab + Mic Recording' }),
  });
}

/**
 * @param {string} meetingId
 * @param {Array<{ text: string, speaker?: string, startMs?: number, endMs?: number, isFinal?: boolean }>} segments
 */
async function saveTranscriptSegments(meetingId, segments) {
  if (!segments.length) {
    return [];
  }

  return apiRequest(`/meetings/${meetingId}/transcripts/bulk`, {
    method: 'POST',
    body: JSON.stringify({ segments }),
  });
}

/**
 * @param {string} meetingId
 * @param {ArrayBuffer} audioBuffer
 */
async function uploadMeetingAudio(meetingId, audioBuffer) {
  return apiRequest(`/meetings/${meetingId}/audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'audio/webm' },
    body: audioBuffer,
    timeoutMs: 180_000,
  });
}

/**
 * @param {string} meetingId
 */
async function completeMeeting(meetingId) {
  return apiRequest(`/meetings/${meetingId}/complete`, { method: 'POST' });
}

async function getMeeting(meetingId) {
  return apiRequest(`/meetings/${meetingId}`);
}

/**
 * @param {string} meetingId
 */
async function generateMeetingNotes(meetingId) {
  return apiRequest(`/meetings/${meetingId}/notes/generate`, {
    method: 'POST',
    timeoutMs: 180_000,
  });
}

/**
 * @param {string} meetingId
 * @param {{ title?: string, summary?: string, content: string }} note
 */
async function saveMeetingNote(meetingId, note) {
  return apiRequest(`/meetings/${meetingId}/notes`, {
    method: 'POST',
    body: JSON.stringify(note),
  });
}
