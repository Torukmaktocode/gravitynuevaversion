/** Timeslice so Chrome/Windows flushes audio chunks before stop(). */
export const MEDIA_RECORDER_TIMESLICE_MS = 250;

export type HoldState = {
  pointerId: number | null;
  startInFlight: boolean;
  recording: boolean;
  stopOnceStarted: boolean;
};

export function createHoldState(): HoldState {
  return { pointerId: null, startInFlight: false, recording: false, stopOnceStarted: false };
}

export function isPrimaryPointer(e: { isPrimary?: boolean; pointerType?: string; button?: number }): boolean {
  if (e.isPrimary === false) { return false; }
  if (e.pointerType === 'mouse' && e.button !== undefined && e.button !== 0) { return false; }
  return true;
}

export function onHoldStart(state: HoldState, pointerId: number): 'start' | 'ignore' {
  if (state.pointerId !== null || state.startInFlight || state.recording) { return 'ignore'; }
  state.pointerId = pointerId;
  state.startInFlight = true;
  state.stopOnceStarted = false;
  return 'start';
}

export function onHoldEnd(state: HoldState, pointerId: number): 'stop' | 'mark-pending' | 'ignore' {
  if (state.pointerId === null || state.pointerId !== pointerId) { return 'ignore'; }
  state.pointerId = null;
  if (state.startInFlight && !state.recording) {
    state.stopOnceStarted = true;
    return 'mark-pending';
  }
  if (state.recording) { return 'stop'; }
  return 'ignore';
}

export function onRecordingReady(state: HoldState): 'continue' | 'stop-now' {
  state.recording = true;
  state.startInFlight = false;
  return state.stopOnceStarted ? 'stop-now' : 'continue';
}

export function onRecordingStopped(state: HoldState): void {
  state.pointerId = null;
  state.recording = false;
  state.startInFlight = false;
  state.stopOnceStarted = false;
}

export function onHoldStartFailed(state: HoldState): void {
  state.pointerId = null;
  state.startInFlight = false;
  state.recording = false;
  state.stopOnceStarted = false;
}

export function pickAudioMimeType(isTypeSupported?: (mime: string) => boolean): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/aac'];
  const check = isTypeSupported
    || (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
      ? (m: string) => MediaRecorder.isTypeSupported(m)
      : null);
  if (!check) { return ''; }
  for (const m of candidates) {
    if (check(m)) { return m; }
  }
  return '';
}

export function audioBlobLooksEmpty(blob: { size: number }): boolean {
  return blob.size < 256;
}

export type MicPermissionState = 'granted' | 'denied' | 'prompt';
export type MicGateAction = 'deny' | 'prime' | 'record';

/**
 * Decide if this mic press should record, only request permission, or abort.
 * Time and audio must not start until the browser permission is already granted.
 */
export function micGateAction(permission: MicPermissionState, alreadyGranted: boolean): MicGateAction {
  if (permission === 'denied' && !alreadyGranted) { return 'deny'; }
  if (alreadyGranted || permission === 'granted') { return 'record'; }
  return 'prime';
}

export async function queryMicPermission(
  query?: (desc: { name: string }) => Promise<{ state: string }>
): Promise<MicPermissionState> {
  const q = query ?? (typeof navigator !== 'undefined' && navigator.permissions?.query
    ? (desc: { name: string }) => navigator.permissions.query(desc as PermissionDescriptor)
    : undefined);
  if (!q) { return 'prompt'; }
  try {
    const status = await q({ name: 'microphone' });
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
      return status.state;
    }
  } catch {
    /* Safari and some Chromium builds reject microphone PermissionName */
  }
  return 'prompt';
}
