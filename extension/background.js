/**
 * MV3 Service Worker — orchestrates the offscreen document and routes messages.
 *
 * WHY NO MEDIA HERE?
 * Service workers have no DOM, no AudioContext, and no stable MediaStream APIs.
 * Chrome may suspend them at any time. All capture/recording runs in offscreen.html.
 *
 * DEPRECATED PATTERN WE AVOID:
 * - chrome.tabCapture.capture(callback) — MV2-style; returns MediaStream in the caller
 *   context, which service workers cannot hold. Replaced by getMediaStreamId (Chrome 116+)
 *   plus getUserMedia in an offscreen document.
 * - Opening a visible extension window solely for getUserMedia — replaced by offscreen docs.
 */

importScripts('config.js', 'api.js');

const OFFSCREEN_URL = 'offscreen.html';

/**
 * Ensure the offscreen document exists before sending media commands.
 * Reason USER_MEDIA is required for tabCapture stream redemption + microphone access.
 */
async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['USER_MEDIA'],
    justification: 'Capture tab audio and microphone, mix streams, and record via MediaRecorder.',
  });
}

/**
 * Close the offscreen document when recording is finished to free resources.
 */
async function closeOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });

  if (existingContexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

/**
 * Forward a message to the offscreen document and await its response.
 * @param {string} type
 * @param {unknown} [data]
 */
function sendToOffscreen(type, data) {
  return chrome.runtime.sendMessage({ type, target: 'offscreen', data });
}

/**
 * Save a file via chrome.downloads (service worker only — not available offscreen).
 * @param {string} dataUrl
 * @param {string} filename
 * @param {boolean} [saveAs]
 */
async function downloadFile(dataUrl, filename, saveAs = false) {
  await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs,
  });
}

/**
 * Convert a data URL to an ArrayBuffer for API upload.
 * @param {string} dataUrl
 */
function dataUrlToArrayBuffer(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Relay a message to the popup (if open). Fire-and-forget.
 * @param {string} type
 * @param {unknown} [data]
 */
function notifyPopup(type, data) {
  chrome.runtime.sendMessage({ type, target: 'popup', data }).catch(() => {
    // Popup may be closed; ignore "Receiving end does not exist".
  });
}

/**
 * Persist transcript + audio to the backend (notes generated on demand).
 * @param {{
 *   dataUrl: string,
 *   segments: Array<{ text: string, speaker?: string, startMs?: number, isFinal?: boolean }>,
 *   conversation: string,
 *   filename: string,
 * }} payload
 */
async function syncRecordingToBackend(payload) {
  const meeting = await createMeeting(payload.filename.replace(/\.webm$/, ''));

  const segments =
    payload.segments?.length > 0
      ? payload.segments
      : payload.conversation
        ? [{ text: payload.conversation, isFinal: true }]
        : [];

  if (segments.length > 0) {
    await saveTranscriptSegments(meeting.id, segments);
  }

  const audioBuffer = dataUrlToArrayBuffer(payload.dataUrl);
  await uploadMeetingAudio(meeting.id, audioBuffer);
  await completeMeeting(meeting.id);

  const session = { meetingId: meeting.id, note: null };
  await chrome.storage.local.set({
    pendingSession: session,
    processing: false,
    syncError: null,
    recording: false,
  });
  notifyPopup('session-ready', session);

  return { meetingId: meeting.id };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'background') {
    return false;
  }

  const handle = async () => {
    switch (message.type) {
      case 'start-recording': {
        await ensureOffscreenDocument();
        const result = await sendToOffscreen('start-recording', message.data);
        return result;
      }

      case 'stop-recording': {
        let result;
        let backendError = null;
        let backendResult = null;

        try {
          result = await sendToOffscreen('stop-recording');

          if (result?.ok) {
            // Popup often closes when the Save As dialog opens — persist state here.
            await chrome.storage.local.set({ recording: false, processing: true });
            notifyPopup('sync-status', { stage: 'syncing' });
          }

          if (result?.ok && result.dataUrl && result.filename) {
            await downloadFile(result.dataUrl, result.filename, true);
          }
          if (result?.ok && result.textDataUrl && result.textFilename) {
            await downloadFile(result.textDataUrl, result.textFilename, false);
          }

          if (result?.ok && result.dataUrl) {
            try {
              backendResult = await syncRecordingToBackend({
                dataUrl: result.dataUrl,
                segments: result.segments || [],
                conversation: result.conversation || '',
                filename: result.filename,
              });
            } catch (err) {
              backendError = err instanceof Error ? err.message : String(err);
              console.error('[background] backend sync failed:', err);
              await chrome.storage.local.set({
                processing: false,
                syncError: backendError,
              });
            }
          }
        } finally {
          await closeOffscreenDocument();
          if (!backendResult && !backendError) {
            await chrome.storage.local.set({ processing: false });
          }
        }

        return {
          ...result,
          backendError,
          meetingId: backendResult?.meetingId ?? null,
        };
      }

      case 'generate-notes': {
        const { meetingId } = message.data || {};
        if (!meetingId) {
          return { ok: false, error: 'Meeting ID is required.' };
        }

        const note = await generateMeetingNotes(meetingId);
        const stored = await chrome.storage.local.get('pendingSession');
        const session = {
          meetingId,
          note,
          notesSaved: false,
        };
        await chrome.storage.local.set({ pendingSession: session });
        notifyPopup('notes-ready', session);
        return { ok: true, note };
      }

      case 'save-note': {
        const { meetingId, title, summary, content } = message.data || {};
        if (!meetingId || !content) {
          return { ok: false, error: 'Meeting ID and note content are required.' };
        }

        const note = await saveMeetingNote(meetingId, { title, summary, content });
        const session = {
          meetingId,
          note,
          notesSaved: true,
        };
        await chrome.storage.local.set({ pendingSession: session });
        return { ok: true, note };
      }

      default:
        return { ok: false, error: `Unknown message type: ${message.type}` };
    }
  };

  handle()
    .then(sendResponse)
    .catch((err) => {
      console.error('[background] message handler error:', err);
      const errorText = err instanceof Error ? err.message : String(err);
      notifyPopup('recording-error', errorText);
      sendResponse({ ok: false, error: errorText });
    });

  return true;
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.target === 'background' && message.type === 'offscreen-error') {
    notifyPopup('recording-error', message.data);
    chrome.storage.local.set({ recording: false });
  }
});
