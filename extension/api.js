/**
 * Backend API client for meetings, transcripts, and notes.
 * Loaded via importScripts in the service worker.
 */

/**
 * @param {string} path
 * @param {RequestInit} [options]
 */
async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof ArrayBuffer) && !(options.body instanceof Blob)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    throw new Error(json.message || `API request failed (${response.status})`);
  }

  return json.data;
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
  });
}

/**
 * @param {string} meetingId
 */
async function completeMeeting(meetingId) {
  return apiRequest(`/meetings/${meetingId}/complete`, { method: 'POST' });
}

/**
 * @param {string} meetingId
 */
async function generateMeetingNotes(meetingId) {
  return apiRequest(`/meetings/${meetingId}/notes/generate`, { method: 'POST' });
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
