/**
 * Popup UI — entry point after the user's toolbar click (user gesture).
 */

const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const errorEl = document.getElementById('error');
const sessionPanel = document.getElementById('sessionPanel');
const generateNotesBtn = document.getElementById('generateNotesBtn');
const notesBlock = document.getElementById('notesBlock');
const notesTitleEl = document.getElementById('notesTitle');
const notesSummaryEl = document.getElementById('notesSummary');
const notesContentEl = document.getElementById('notesContent');
const saveNotesBtn = document.getElementById('saveNotesBtn');
const startNewRecordingBtn = document.getElementById('startNewRecordingBtn');
const dismissSessionBtn = document.getElementById('dismissSessionBtn');
const saveStatusEl = document.getElementById('saveStatus');
const recordingButtonsEl = document.getElementById('recordingButtons');

/** @type {'idle' | 'recording' | 'saving' | 'syncing' | 'generating' | 'ready' | 'notes' | 'saved'} */
let uiState = 'idle';

/**
 * @type {{
 *   meetingId: string,
 *   note?: { title?: string | null, summary?: string | null, content: string } | null,
 *   notesSaved?: boolean
 * } | null}
 */
let currentSession = null;

function setStatus(state, message) {
  uiState = state;
  statusEl.dataset.state = state;

  const labels = {
    idle: 'Idle',
    recording: 'Recording',
    saving: 'Saving & transcribing…',
    syncing: 'Saving recording to server…',
    generating: 'Generating SOAP notes…',
    ready: 'Recording saved',
    notes: 'SOAP notes ready',
    saved: 'Notes saved',
  };

  statusTextEl.textContent = message || labels[state];
  startBtn.disabled = ['recording', 'saving', 'syncing', 'generating'].includes(state);
  stopBtn.disabled = state !== 'recording';
}

function updateSessionButtons() {
  const hasSession = Boolean(currentSession);
  const hasNote = Boolean(currentSession?.note);
  const notesSaved = Boolean(currentSession?.notesSaved);

  recordingButtonsEl.classList.toggle('hidden', hasSession);
  sessionPanel.classList.toggle('visible', hasSession);

  // Generate Notes: only before SOAP notes exist
  generateNotesBtn.classList.toggle('hidden', !hasSession || hasNote);
  generateNotesBtn.disabled = !currentSession?.meetingId;

  // Save Notes: only after notes are generated, before saved
  saveNotesBtn.classList.toggle('hidden', !hasNote || notesSaved);

  // Start New Recording: only after notes are saved
  startNewRecordingBtn.classList.toggle('hidden', !notesSaved);

  // Dismiss: available whenever a session is open
  dismissSessionBtn.classList.toggle('hidden', !hasSession);

  notesBlock.classList.toggle('visible', hasNote);
}

function showSession(session) {
  currentSession = session;

  if (session.note) {
    notesTitleEl.textContent = session.note.title || 'SOAP Notes';
    notesSummaryEl.textContent = session.note.summary || '';
    notesContentEl.value = session.note.content || '';
    if (session.notesSaved) {
      setSaveStatus('Notes saved to database.');
    } else {
      setSaveStatus('');
    }
    setStatus(session.notesSaved ? 'saved' : 'notes');
  } else {
    notesContentEl.value = '';
    notesSummaryEl.textContent = '';
    setSaveStatus('');
    setStatus('ready');
  }

  updateSessionButtons();
}

function showSoapNotes(note, notesSaved = false) {
  currentSession = {
    ...currentSession,
    note,
    notesSaved,
  };
  notesTitleEl.textContent = note.title || 'SOAP Notes';
  notesSummaryEl.textContent = note.summary || '';
  notesContentEl.value = note.content || '';
  setStatus(notesSaved ? 'saved' : 'notes');
  if (notesSaved) {
    setSaveStatus('Notes saved to database.');
  }
  updateSessionButtons();
}

function hideSession() {
  currentSession = null;
  sessionPanel.classList.remove('visible');
  notesBlock.classList.remove('visible');
  notesContentEl.value = '';
  notesSummaryEl.textContent = '';
  setSaveStatus('');
  updateSessionButtons();
  chrome.storage.local.remove(['pendingSession', 'syncError']);
}

function showError(text) {
  if (!text) {
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
    return;
  }
  errorEl.textContent = text;
  errorEl.classList.add('visible');
}

function setSaveStatus(text) {
  saveStatusEl.textContent = text || '';
}

function sendToBackground(type, data) {
  return chrome.runtime.sendMessage({ type, target: 'background', data });
}

function restoreFromStorage() {
  chrome.storage.local.get(
    ['recording', 'pendingSession', 'processing', 'syncError'],
    ({ recording, pendingSession, processing, syncError }) => {
      if (pendingSession?.meetingId) {
        showSession(pendingSession);
        return;
      }

      if (processing) {
        setStatus('syncing');
        return;
      }

      if (syncError) {
        setStatus('idle', 'Saved locally');
        showError(
          `Files downloaded, but server sync failed: ${syncError}. ` +
            'Make sure the backend is running on http://localhost:5000.'
        );
        chrome.storage.local.remove('syncError');
        return;
      }

      if (recording) {
        setStatus('recording');
      }
    }
  );
}

const MIC_DENIED_HELP =
  'Microphone access is blocked. Click the lock icon in Chrome’s address bar → ' +
  'Site settings → Microphone → Allow, or open chrome://settings/content/microphone ' +
  'and allow this extension. Then reload the extension and try again.';

async function ensureMicrophonePermission() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    const name = err instanceof DOMException ? err.name : 'Error';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      throw new Error(MIC_DENIED_HELP);
    }
    if (name === 'NotFoundError') {
      throw new Error('No microphone found. Connect a mic and try again.');
    }
    throw new Error(`Microphone error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

function isRestrictedTabUrl(url) {
  if (!url) return true;
  const restrictedPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'devtools://',
    'view-source:',
  ];
  return restrictedPrefixes.some((prefix) => url.startsWith(prefix));
}

async function startRecording() {
  showError('');
  hideSession();
  updateSessionButtons();
  setStatus('idle', 'Requesting mic…');

  try {
    await ensureMicrophonePermission();
    setStatus('recording');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      throw new Error('No active tab found. Focus a normal browser tab and try again.');
    }

    if (isRestrictedTabUrl(tab.url || '')) {
      throw new Error(
        'This tab cannot be captured. Open a regular HTTPS page (e.g. meet.google.com) and try again.'
      );
    }

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });

    if (!streamId) {
      throw new Error('Tab capture was denied or failed. Check extension permissions.');
    }

    const response = await sendToBackground('start-recording', {
      streamId,
      tabId: tab.id,
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to start recording in offscreen document.');
    }

    await chrome.storage.local.set({ recording: true, processing: false, syncError: null });
  } catch (err) {
    console.error('[popup] startRecording failed:', err);
    setStatus('idle');
    showError(err instanceof Error ? err.message : String(err));
    await chrome.storage.local.set({ recording: false, processing: false });
  }
}

async function stopRecording() {
  showError('');
  setStatus('saving');

  try {
    const response = await sendToBackground('stop-recording');

    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to stop recording.');
    }

    await chrome.storage.local.set({ recording: false, processing: false });

    if (response.backendError) {
      setStatus('idle', 'Saved locally');
      showError(
        `Files downloaded, but server sync failed: ${response.backendError}. ` +
          'Make sure the backend is running on http://localhost:5000.'
      );
      return;
    }

    if (response.meetingId) {
      const session = { meetingId: response.meetingId, note: null };
      showSession(session);
      await chrome.storage.local.set({ pendingSession: session });
      return;
    }

    setStatus('idle', 'Saved');
  } catch (err) {
    console.error('[popup] stopRecording failed:', err);
    setStatus('idle');
    showError(err instanceof Error ? err.message : String(err));
    await chrome.storage.local.set({ recording: false, processing: false });
  }
}

async function generateNotes() {
  if (!currentSession?.meetingId) {
    showError('No meeting session found. Record a visit first.');
    return;
  }

  showError('');
  setStatus('generating');
  generateNotesBtn.disabled = true;

  try {
    const response = await sendToBackground('generate-notes', {
      meetingId: currentSession.meetingId,
    });

    if (!response?.ok || !response.note) {
      throw new Error(response?.error || 'Failed to generate SOAP notes.');
    }

    currentSession = {
      ...currentSession,
      note: response.note,
    };
    await chrome.storage.local.set({ pendingSession: currentSession });
    showSoapNotes(response.note, false);
  } catch (err) {
    console.error('[popup] generateNotes failed:', err);
    setStatus('ready');
    showError(err instanceof Error ? err.message : String(err));
  } finally {
    generateNotesBtn.disabled = false;
  }
}

async function saveNotes() {
  if (!currentSession?.meetingId) {
    showError('No meeting notes to save.');
    return;
  }

  showError('');
  setSaveStatus('Saving…');
  saveNotesBtn.disabled = true;

  try {
    const response = await sendToBackground('save-note', {
      meetingId: currentSession.meetingId,
      title: notesTitleEl.textContent,
      summary: notesSummaryEl.textContent,
      content: notesContentEl.value.trim(),
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to save notes.');
    }

    if (response.note) {
      currentSession = {
        ...currentSession,
        note: response.note,
        notesSaved: true,
      };
      await chrome.storage.local.set({ pendingSession: currentSession });
    }

    showSoapNotes(currentSession.note, true);
  } catch (err) {
    console.error('[popup] saveNotes failed:', err);
    setSaveStatus('');
    showError(err instanceof Error ? err.message : String(err));
  } finally {
    saveNotesBtn.disabled = false;
  }
}

restoreFromStorage();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if (changes.pendingSession?.newValue?.meetingId) {
    showSession(changes.pendingSession.newValue);
  }

  if (changes.processing?.newValue === true) {
    setStatus('syncing');
  }

  if (changes.syncError?.newValue) {
    setStatus('idle', 'Saved locally');
    showError(
      `Files downloaded, but server sync failed: ${changes.syncError.newValue}. ` +
        'Make sure the backend is running on http://localhost:5000.'
    );
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'popup') return;

  if (message.type === 'recording-error') {
    setStatus('idle');
    showError(message.data);
    chrome.storage.local.set({ recording: false, processing: false });
  }

  if (message.type === 'sync-status' && message.data?.stage === 'syncing') {
    setStatus('syncing');
  }

  if (message.type === 'session-ready' && message.data?.meetingId) {
    showSession(message.data);
  }

  if (message.type === 'notes-ready' && message.data?.note) {
    currentSession = message.data;
    showSession(message.data);
  }
});

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
generateNotesBtn.addEventListener('click', generateNotes);
saveNotesBtn.addEventListener('click', saveNotes);
startNewRecordingBtn.addEventListener('click', startRecording);
dismissSessionBtn.addEventListener('click', () => {
  hideSession();
  setStatus('idle');
});

updateSessionButtons();
