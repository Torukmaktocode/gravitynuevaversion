import { store } from '../lib/store.js';
import { supaClient } from '../api/supa-client.js';
import {
  MEDIA_RECORDER_TIMESLICE_MS,
  audioBlobLooksEmpty,
  createHoldState,
  isPrimaryPointer,
  micGateAction,
  onHoldEnd,
  onHoldStart,
  onHoldStartFailed,
  onRecordingReady,
  onRecordingStopped,
  pickAudioMimeType,
  queryMicPermission,
} from '../lib/trainerHold.js';

let orb: ParticleOrb | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let currentMimeType = '';
let currentStream: MediaStream | null = null;
const holdState = createHoldState();
let micListenersBound = false;
let unlockListenersBound = false;
let micGranted = false;

function endInteractionClock() {
  if (_ctx && typeof _ctx.recordInteractionEnd === 'function') { _ctx.recordInteractionEnd(); }
}

function beginInteractionClock() {
  if (_ctx && typeof _ctx.recordInteractionStart === 'function') { _ctx.recordInteractionStart(); }
}

function setTrainerStatus(title: string, subtitle: string) {
  const statusText = document.getElementById('trainer-status');
  const subStatus = document.getElementById('trainer-substatus');
  if (statusText) { statusText.textContent = title; }
  if (subStatus) { subStatus.textContent = subtitle; }
}

async function finishSession() {
  const stop = _ctx?.finishTrainingSession || _ctx?.stopTrainingTimer;
  if (typeof stop === 'function') { await stop(); }
  stopConversation();
  if (orb) { orb.setState('idle'); }
}

function bindMicHold(micBtn: HTMLElement) {
  if (micListenersBound) { return; }
  micListenersBound = true;

  const onPointerDown = (e: PointerEvent) => {
    if (!isPrimaryPointer(e)) { return; }
    if (e.cancelable) { e.preventDefault(); }
    if (onHoldStart(holdState, e.pointerId) === 'ignore') { return; }
    try { micBtn.setPointerCapture(e.pointerId); } catch { /* capture not required */ }
    void handleStart();
  };

  const releaseAndStop = (e: PointerEvent) => {
    if (e.cancelable) { e.preventDefault(); }
    const action = onHoldEnd(holdState, e.pointerId);
    try { if (micBtn.hasPointerCapture(e.pointerId)) { micBtn.releasePointerCapture(e.pointerId); } } catch { /* already released */ }
    if (action === 'stop') { handleStop(); }
  };

  micBtn.addEventListener('pointerdown', onPointerDown);
  micBtn.addEventListener('pointerup', releaseAndStop);
  micBtn.addEventListener('pointercancel', releaseAndStop);
  micBtn.addEventListener('lostpointercapture', (e: PointerEvent) => {
    if (holdState.pointerId !== e.pointerId) { return; }
    const action = onHoldEnd(holdState, e.pointerId);
    if (action === 'stop') { handleStop(); }
  });
  micBtn.addEventListener('contextmenu', (e) => { e.preventDefault(); });
}

export async function init(ctx: any) {
  setCtx(ctx);
  const startBtn = document.getElementById('training-timer-start-btn') || document.getElementById('start-training');
  const endBtn = document.getElementById('trainer-exit-btn') || document.getElementById('end-training');
  const muteBtn = document.getElementById('mute-btn');

  if (startBtn) { startBtn.onclick = () => { unlockAudio(); ctx.startTrainingTimer(); loadConversation(); }; }
  if (endBtn) { endBtn.onclick = () => { void finishSession(); }; }
  if (muteBtn) { muteBtn.onclick = () => { orb?.toggleMute(); }; }

  const micBtn = document.getElementById('trainer-mic-btn');
  if (micBtn) { bindMicHold(micBtn); }

  if (!unlockListenersBound) {
    unlockListenersBound = true;
    document.addEventListener('pointerdown', unlockAudio, { once: true });
  }

  loadConversation();
}

// Frases rotativas del status en estado idle (sugerencias al vendedor).
// Las frases funcionales (listening/processing/speaking) NO rotan.
const IDLE_PHRASES = [
  '¿Qué quieres trabajar hoy?',
  'Revisamos productos',
  '¿Algún cliente no responde tus mensajes?',
  'Soy tu asistente 24/7',
  'Practica objeciones reales de venta',
  'Refina tu pitch de 60 segundos',
  'Domina el cierre de precios',
];
let idlePhraseIndex = 0;
let idleRotationTimer: number | null = null;

function stopIdleRotation() {
  if (idleRotationTimer !== null) {
    clearInterval(idleRotationTimer);
    idleRotationTimer = null;
  }
}

function swapStatusText(text: string) {
  const statusText = document.getElementById('trainer-status');
  if (!statusText) { return; }
  statusText.textContent = text;
  statusText.classList.remove('phrase-swap');
  void statusText.offsetWidth; // reinicia la animación
  statusText.classList.add('phrase-swap');
}

function startIdleRotation() {
  stopIdleRotation();
  swapStatusText(IDLE_PHRASES[idlePhraseIndex]);
  idlePhraseIndex = (idlePhraseIndex + 1) % IDLE_PHRASES.length;
  idleRotationTimer = window.setInterval(() => {
    // si el trainer se oculta (navegación), corta el interval
    const trainerHidden = document.getElementById('view-trainer')?.classList.contains('hidden');
    if (trainerHidden) { stopIdleRotation(); return; }
    swapStatusText(IDLE_PHRASES[idlePhraseIndex]);
    idlePhraseIndex = (idlePhraseIndex + 1) % IDLE_PHRASES.length;
  }, 3500);
}

function applyStatusForState(state: string) {
  const subStatus = document.getElementById('trainer-substatus');
  switch (state) {
  case 'idle':
    startIdleRotation();
    if (subStatus) { subStatus.textContent = "Mantén presionado para hablar"; }
    break;
  case 'listening':
    stopIdleRotation();
    swapStatusText("Escuchando...");
    if (subStatus) { subStatus.textContent = "Suéltalo para enviar"; }
    break;
  case 'processing':
    stopIdleRotation();
    swapStatusText("Analizando...");
    if (subStatus) { subStatus.textContent = "Generando respuesta experta"; }
    break;
  case 'speaking':
    stopIdleRotation();
    swapStatusText("Gravity AI Responde");
    if (subStatus) { subStatus.textContent = "Escucha atentamente el feedback"; }
    break;
  }
}

function ensureOrb() {
  if (orb) { return; }
  const canvas = document.getElementById('trainer-orb-canvas') as HTMLCanvasElement | null;
  if (!canvas) { return; }
  orb = new ParticleOrb(canvas, {
    onStateChange: (state: string) => {
      applyStatusForState(state);
    }
  });
  orb.setState('idle');
}

export async function loadConversation() {
  // siempre asegura la esfera visible, incluso en modo lab sin Supabase
  ensureOrb();
  if (!store.currentUser) { return; }
  const container = document.getElementById('trainer-chat-container');
  if (!container) { return; }
  container.innerHTML = '<div class="text-center text-gray-500 text-sm p-8">Cargando conversación...</div>';

  try {
    const { data: { session } } = await supaClient.client.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      container.innerHTML = '';
      addChatMessage('assistant', `Hola ${store.currentUser?.email || 'Usuario'}. Estoy listo para entrenarte. Presiona el micrófono.`);
      return;
    }

    const res = await fetch(`${store.API_URL}/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    container.innerHTML = '';

    if (!res.ok || !data.messages || data.messages.length === 0) {
      addChatMessage('assistant', `Hola ${store.currentUser?.email || 'Usuario'}. Estoy listo para entrenarte. Presiona el micrófono.`);
    } else {
      data.messages.forEach((msg: any) => addChatMessage(msg.role, msg.content));
    }

    if (!orb) {
      orb = new ParticleOrb(document.getElementById('trainer-orb-canvas') as HTMLCanvasElement, {
        onStateChange: (state: string) => {
          applyStatusForState(state);
        }
      });
    }
    orb.setState('idle');
  } catch (err) {
    console.error('Error loading conversation:', err);
    container.innerHTML = '<div class="text-center text-red-400 text-sm p-8">Error al conectar con el entrenador.</div>';
  }
}

function stopActiveRecorder() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.requestData(); } catch { /* older Chrome */ }
    mediaRecorder.stop();
  }
  currentStream?.getTracks().forEach(t => t.stop());
  currentStream = null;
  onRecordingStopped(holdState);
}

function stopConversation() {
  stopActiveRecorder();
  if (orb) { orb.setState('idle'); }
}

export const handleStop = () => {
  if (holdState.recording && mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.requestData(); } catch { /* older Chrome */ }
    mediaRecorder.stop();
  }
};

export function setCtx(ctx: any) {
  _ctx = ctx;
}
let _ctx: any = null;

export const handleStart = async () => {
  unlockAudio();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    onHoldStartFailed(holdState);
    alert('Tu navegador no soporta grabación de audio.');
    return;
  }

  const permission = await queryMicPermission();
  const gate = micGateAction(permission, micGranted);

  if (gate === 'deny') {
    onHoldStartFailed(holdState);
    setTrainerStatus('Micrófono bloqueado', 'Activa el permiso de micrófono en el navegador');
    alert('Necesitas permitir el micrófono para entrenar. Actívalo en la configuración del navegador.');
    return;
  }

  if (gate === 'prime') {
    setTrainerStatus('Permite el micrófono', 'Acepta el permiso del navegador para poder entrenar');
    try {
      const preview = await navigator.mediaDevices.getUserMedia({ audio: true });
      preview.getTracks().forEach(t => t.stop());
      micGranted = true;
      onHoldStartFailed(holdState);
      if (orb) { orb.setState('idle'); }
      setTrainerStatus('Micrófono listo', 'Mantén presionado para hablar');
      addChatMessage('assistant', 'Micrófono listo. Mantén presionado el botón para hablar y empezar a contar tiempo.');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      onHoldStartFailed(holdState);
      if (orb) { orb.setState('idle'); }
      setTrainerStatus('Micrófono bloqueado', 'Activa el permiso de micrófono en el navegador');
      alert('Necesitas permitir el micrófono para entrenar. Si lo bloqueaste, actívalo en la configuración del navegador.');
    }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    currentStream = stream;
    micGranted = true;

    if (holdState.stopOnceStarted) {
      stream.getTracks().forEach(t => t.stop());
      currentStream = null;
      onHoldStartFailed(holdState);
      return;
    }

    startAudioVisualizer(stream);
    currentMimeType = pickAudioMimeType();
    mediaRecorder = new MediaRecorder(stream, currentMimeType ? { mimeType: currentMimeType } : undefined);
    audioChunks = [];

    mediaRecorder.ondataavailable = (ev) => { if (ev.data.size > 0) { audioChunks.push(ev.data); } };
    mediaRecorder.onstop = async () => {
      onRecordingStopped(holdState);
      stream.getTracks().forEach(t => t.stop());
      if (currentStream === stream) { currentStream = null; }
      if (orb) { orb.setState('processing'); }

      const audioBlob = new Blob(audioChunks, { type: currentMimeType || 'audio/webm' });
      audioChunks = [];

      if (audioBlobLooksEmpty(audioBlob)) {
        if (orb) { orb.setState('idle'); }
        addChatMessage('error', 'No se capturó audio. Mantén presionado el micrófono mientras hablas.');
        endInteractionClock();
        return;
      }

      const tempId = 'user-msg-' + Date.now();
      addChatMessage('user', '🎤 Procesando audio...', tempId);

      // LAB: sin Supabase real — simula respuesta para poder probar UI/orb/audio sin 401
      const isLab = store.currentUser?.id === 'lab-user-001' || window.location.pathname.startsWith('/lab');
      if (isLab) {
        const tempEl = document.getElementById(tempId);
        const t0 = performance.now();
        // simula latencia de red
        await new Promise(r => setTimeout(r, 900));
        const labMs = performance.now() - t0;
        if (tempEl) { tempEl.querySelector('.msg-content')!.textContent = 'Hola, quiero practicar el cierre (modo lab)'; }
        endInteractionClock();
        if (orb) { orb.setState('speaking'); }
        const mockText = '¡Perfecto! Estás en modo laboratorio. ¿Qué objeción quieres practicar? Prueba: "Es muy caro" o "Necesito pensarlo".';
        addChatMessage('assistant', mockText, null, labMs);
        // simula audio con TTS del navegador
        speakText(mockText, () => { if (orb) { orb.setState('idle'); } });
        return;
      }

      try {
        const { data: { session } } = await supaClient.client.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          const tempEl2 = document.getElementById(tempId);
          if (tempEl2) { tempEl2.remove(); }
          addChatMessage('error', 'Sesión no encontrada. Por favor inicia sesión de nuevo.');
          if (orb) { orb.setState('idle'); }
          endInteractionClock();
          return;
        }
        const formData = new FormData();
        const extension = currentMimeType.includes('mp4') || currentMimeType.includes('m4a') ? 'm4a' : 'webm';
        formData.append('audio', audioBlob, 'recording.' + extension);
        formData.append('user_name', store.currentUser?.email || 'Usuario');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const t0 = performance.now();
        const res = await fetch(`${store.API_URL}/entrenar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        const responseMs = performance.now() - t0;

        const tempEl = document.getElementById(tempId);

        if (!res.ok || data.error) {
          if (tempEl) { tempEl.remove(); }
          if (data.error) { addChatMessage('error', data.error); }
          if (orb) { orb.setState('idle'); }
          endInteractionClock();
          return;
        }

        endInteractionClock();

        if (tempEl && data.transcript) {
          tempEl.querySelector('.msg-content')!.textContent = data.transcript;
        }

        if (data.command_detected && orb && typeof (orb as any).triggerCommandEffect === 'function') {
          (orb as any).triggerCommandEffect(data.command_detected);
        }

        if (data.audio_url) {
          const audioUrl = `${store.API_URL}${data.audio_url}?t=${Date.now()}`;
          if (!data.command_detected) { if (orb) { orb.setState('speaking'); } }
          playResponseAudio(audioUrl, () => { if (orb) { orb.setState('idle'); } });
        } else if (data.response_text) {
          if (orb) { orb.setState('speaking'); speakText(data.response_text, () => { if (orb) { orb.setState('idle'); } }); }
        } else {
          if (orb) { orb.setState('idle'); }
        }

        if (data.response_text) { addChatMessage('assistant', data.response_text, null, responseMs); }
      } catch (err) {
        console.error('Error processing audio:', err);
        const tempEl = document.getElementById(tempId);
        if (tempEl) { tempEl.remove(); }
        addChatMessage('error', 'Error de conexión con el servidor.');
        if (orb) { orb.setState('idle'); }
        endInteractionClock();
      }
    };

    try {
      mediaRecorder.start(MEDIA_RECORDER_TIMESLICE_MS);
    } catch {
      mediaRecorder.start();
    }
    if (orb) { orb.setState('listening'); }
    if (onRecordingReady(holdState) === 'stop-now') {
      handleStop();
      return;
    }
    beginInteractionClock();
  } catch (err) {
    console.error('Error accessing microphone:', err);
    onHoldStartFailed(holdState);
    setTrainerStatus('Micrófono bloqueado', 'Activa el permiso de micrófono en el navegador');
    alert('Necesitas permitir el micrófono para entrenar. Si lo bloqueaste, actívalo en la configuración del navegador.');
  }
};

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | AudioBufferSourceNode | null = null;
let fakeVolumeInterval: number | null = null;

async function unlockAudio() {
  try {
    if (!audioCtx) {audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();}
    if (audioCtx.state === 'suspended') {await audioCtx.resume();}
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const node = audioCtx.createBufferSource();
    node.buffer = buffer;
    node.connect(audioCtx.destination);
    node.start(0);
  } catch (err) {
    console.warn('Audio unlock failed:', err);
  }
}

function disconnectSource() {
  if (analyser) { try { analyser.disconnect(); } catch { /* already disconnected */ } analyser = null; }
  if (source) { try { (source as any).disconnect(); } catch { /* already disconnected */ } source = null; }
}

function startVolumeLoop() {
  function updateVolume() {
    if (!analyser || !dataArray || !orb) {return;}
    (analyser as any).getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {sum += dataArray[i];}
    const target = (sum / dataArray.length) / 128;

    const active = orb.state === 'listening' || orb.state === 'speaking';
    const goal = active ? target : 0;
    // Suavizado: ataque rápido y liberación lenta → sin saltos ni cortes
    const k = goal > orb.audioVolume ? 0.35 : 0.08;
    orb.audioVolume += (goal - orb.audioVolume) * k;
    if (orb.audioVolume < 0.0006) { orb.audioVolume = 0; }

    // Sigue animando mientras habla o mientras el volumen baja a 0
    if (active || orb.audioVolume > 0) {
      requestAnimationFrame(updateVolume);
    }
  }
  updateVolume();
}

async function startAudioVisualizer(streamOrElement: MediaStream | HTMLAudioElement) {
  await unlockAudio();
  if (!audioCtx) {return;}
  disconnectSource();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.85;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  if (streamOrElement instanceof MediaStream) {
    source = audioCtx.createMediaStreamSource(streamOrElement);
    source.connect(analyser);
  } else {
    source = audioCtx.createMediaElementSource(streamOrElement);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  startVolumeLoop();
}

function fallbackHtmlAudio(url: string, onEnd?: () => void) {
  const audio = new Audio(url);
  audio.crossOrigin = 'anonymous';
  (audio as any).playsInline = true;
  audio.onended = () => { if (onEnd) {onEnd();} };
  audio.play().catch(err => console.warn('Audio play failed:', err));
}

async function playResponseAudio(url: string, onEnd?: () => void) {
  await unlockAudio();
  if (!audioCtx) {
    fallbackHtmlAudio(url, onEnd);
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
    const arrayBuf = await res.arrayBuffer();
    const audioBuf = await audioCtx.decodeAudioData(arrayBuf);

    disconnectSource();

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    const src = audioCtx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    src.onended = () => { if (onEnd) {onEnd();} };
    src.start(0);
    source = src;

    startVolumeLoop();
  } catch (err) {
    console.warn('Web Audio playback failed, falling back to HTML audio:', err);
    fallbackHtmlAudio(url, onEnd);
  }
}

function startFakeSpeakingVolume() {
  if (fakeVolumeInterval) {clearInterval(fakeVolumeInterval);}
  fakeVolumeInterval = window.setInterval(() => {
    if (orb && orb.state === 'speaking') {
      orb.audioVolume = 0.3 + Math.random() * 0.5;
    } else {
      clearInterval(fakeVolumeInterval!);
      if (orb) {orb.audioVolume = 0;}
    }
  }, 100);
}

function speakText(text: string, onEnd?: () => void) {
  if (!window.speechSynthesis) { if (onEnd) {onEnd();} return; }
  startFakeSpeakingVolume();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 0.9;
  utterance.onend = () => {
    clearInterval(fakeVolumeInterval!);
    if (orb) {orb.audioVolume = 0;}
    if (onEnd) {onEnd();}
  };
  utterance.onerror = utterance.onend;
  window.speechSynthesis.speak(utterance);
}

function addChatMessage(role: string, text: string, id: string | null = null, latencyMs: number | null = null) {
  const container = document.getElementById('trainer-chat-container');
  if (!container) {return;}
  let html: string;
  const idAttr = id ? `id="${id}"` : '';
  const latencyTag = (ms: number) =>
    `<div class="text-[10px] text-gray-500 mt-1 pl-3 font-mono tracking-wide trainer-latency">⏱ ${Math.max(0, Math.round(ms))} ms</div>`;

  if (role === 'assistant') {
    html = `<div ${idAttr} class="mb-4 animate-in fade-in slide-in-from-left-2 duration-500">
          <div class="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-bold">Gravity AI</div>
          <div class="text-gray-400 text-sm leading-relaxed border-l-2 border-violet-500/30 pl-3 msg-content break-words whitespace-normal overflow-wrap-anywhere">${text}</div>
          ${latencyMs !== null ? latencyTag(latencyMs) : ''}
      </div>`;
  } else if (role === 'user') {
    html = `<div ${idAttr} class="mb-4 text-right animate-in fade-in slide-in-from-right-2 duration-500">
          <div class="text-[10px] text-violet-400 mb-1 uppercase tracking-wider font-bold">TÚ</div>
          <div class="text-white text-sm bg-violet-900/20 border border-violet-500/10 rounded-lg p-3 inline-block text-left msg-content">${text}</div>
      </div>`;
  } else {
    html = `<div class="text-center text-xs text-red-400 my-2">${text}</div>`;
  }
  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
}

class ParticleOrb {
  canvas: HTMLCanvasElement | null;
  ctx!: CanvasRenderingContext2D | null;
  onStateChange: (state: string) => void;
  muted!: boolean;
  points!: any[];
  numPoints!: number;
  baseRadius!: number;
  radius!: number;
  targetRadius!: number;
  angleX!: number;
  angleY!: number;
  state!: string;
  pulse!: number;
  audioVolume!: number;
  animFrame!: number | null;

  constructor(canvas: HTMLCanvasElement | null, opts: any = {}) {
    this.canvas = canvas;
    this.onStateChange = opts.onStateChange || (() => {});
    this.muted = false;
    this.points = [];
    this.numPoints = 500;
    this.baseRadius = 110;
    this.radius = 110;
    this.targetRadius = 110;
    this.angleX = 0.003;
    this.angleY = 0.004;
    this.state = 'idle';
    this.pulse = 0;
    this.audioVolume = 0;
    this.animFrame = null;
    if (!this.canvas) {return;}
    this.ctx = this.canvas.getContext('2d');

    this.init();
    this.animate();
  }

  init() {
    for (let i = 0; i < this.numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / this.numPoints);
      const theta = Math.sqrt(this.numPoints * Math.PI) * phi;
      this.points.push({
        x: Math.cos(theta) * Math.sin(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(phi)
      });
    }
  }

  rotateX(p: any, a: number) {
    const cos = Math.cos(a), sin = Math.sin(a);
    const y = p.y * cos - p.z * sin, z = p.y * sin + p.z * cos;
    return { ...p, y, z };
  }

  rotateY(p: any, a: number) {
    const cos = Math.cos(a), sin = Math.sin(a);
    const x = p.x * cos + p.z * sin, z = -p.x * sin + p.z * cos;
    return { ...p, x, z };
  }

  setState(state: string) {
    this.state = state;
    this.onStateChange(state);
    const glow = document.getElementById('orb-glow-outer');

    switch (state) {
    case 'idle':
      this.angleX = 0.003; this.angleY = 0.004;
      this.targetRadius = 110;
      if (glow) {glow.className = "absolute inset-0 bg-violet-500/10 rounded-full blur-3xl scale-125 opacity-30 transition-all duration-1000 pointer-events-none";}
      break;
    case 'listening':
      this.angleX = 0.008; this.angleY = 0.012;
      this.targetRadius = 135;
      if (glow) {glow.className = "absolute inset-0 bg-violet-400/20 rounded-full blur-3xl scale-150 opacity-60 animate-pulse transition-all duration-300 pointer-events-none";}
      break;
    case 'processing':
      this.angleX = 0.001; this.angleY = 0.002;
      this.targetRadius = 90;
      if (glow) {glow.className = "absolute inset-0 bg-violet-200/10 rounded-full blur-2xl scale-100 opacity-40 animate-pulse transition-all duration-500 pointer-events-none";}
      break;
    case 'speaking':
      this.angleX = 0.005; this.angleY = 0.006;
      this.targetRadius = 122;
      if (glow) {glow.className = "absolute inset-0 bg-violet-500/30 rounded-full blur-3xl scale-175 opacity-70 transition-all duration-300 pointer-events-none";}
      break;
    case 'ignite':
      this.angleX = 0.02; this.angleY = 0.03;
      this.targetRadius = 180;
      if (glow) {glow.className = "absolute inset-0 bg-orange-500/50 rounded-full blur-3xl scale-200 opacity-90 animate-pulse transition-all duration-200 pointer-events-none";}
      break;
    case 'scan':
      this.angleX = 0.001; this.angleY = 0.05;
      this.targetRadius = 110;
      if (glow) {glow.className = "absolute inset-0 bg-cyan-400/40 rounded-full blur-3xl scale-150 opacity-70 transition-all duration-700 pointer-events-none";}
      break;
    }
  }

  triggerCommandEffect(cmd: string) {
    const mapping: Record<string, string> = {
      '/ignite': 'ignite',
      '/deep-scan': 'scan',
      '/xray': 'scan',
      '/power-law': 'ignite',
      '/atomic': 'processing',
      '/mirror-client': 'listening'
    };
    const state = mapping[cmd] || 'idle';
    this.setState(state);
    setTimeout(() => {
      if (this.state === state) {this.setState('speaking');}
    }, 3000);
  }

  toggleMute() {
    this.muted = !this.muted;
    const btn = document.getElementById('mute-btn');
    if (btn) {btn.innerHTML = this.muted ? '🔇' : '🔊';}
  }

  animate() {
    if (!this.canvas) {return;}
    this.ctx!.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    this.radius += (this.targetRadius - this.radius) * 0.1;

    let extraRotation = 0;
    let targetPulse: number;
    if (this.state === 'listening') {
      targetPulse = this.audioVolume * 45;
      extraRotation = this.audioVolume * 0.04;
    } else if (this.state === 'speaking') {
      // Cuando habla la IA: movimiento más controlado (no crece tanto)
      targetPulse = this.audioVolume * 24;
      extraRotation = this.audioVolume * 0.025;
    } else if (this.state === 'processing') {
      targetPulse = Math.sin(Date.now() * 0.005) * 2;
    } else {
      targetPulse = Math.sin(Date.now() * 0.001) * 5;
    }
    // Suaviza el pulso para que no salte al cambiar de estado (evita el "corte")
    this.pulse += (targetPulse - this.pulse) * 0.18;

    this.points = this.points.map(p => this.rotateX(this.rotateY(p, this.angleY + extraRotation), this.angleX + extraRotation));

    this.ctx!.lineWidth = 0.5;
    for (let i = 0; i < this.numPoints; i += 8) {
      const p1 = this.points[i];
      for (let j = i + 1; j < Math.min(i + 4, this.numPoints); j++) {
        const p2 = this.points[j];
        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);
        if (dist < 0.4) {
          const r = this.radius + this.pulse;
          const x1 = p1.x * r + cx;
          const y1 = p1.y * r + cy;
          const x2 = p2.x * r + cx;
          const y2 = p2.y * r + cy;
          const op = Math.min(p1.z + 1, p2.z + 1) / 4;
          this.ctx!.beginPath();
          this.ctx!.moveTo(x1, y1);
          this.ctx!.lineTo(x2, y2);
          this.ctx!.strokeStyle = `rgba(139, 92, 246, ${op * 0.3})`;
          this.ctx!.stroke();
        }
      }
    }

    this.points.forEach(p => {
      const r = this.radius + this.pulse;
      const x = p.x * r + cx;
      const y = p.y * r + cy;
      const op = (p.z + 1) / 2;
      const size = (p.z + 1.5) * 2;

      if (p.z > 0.5) {
        this.ctx!.shadowBlur = 10;
        this.ctx!.shadowColor = 'rgba(167, 139, 250, 0.5)';
      } else {
        this.ctx!.shadowBlur = 0;
      }

      this.ctx!.beginPath();
      this.ctx!.arc(x, y, size, 0, Math.PI * 2);

      if (this.state === 'processing') {
        this.ctx!.fillStyle = `rgba(221, 214, 254, ${op * 0.8})`;
      } else if (this.state === 'listening') {
        this.ctx!.fillStyle = `rgba(167, 139, 250, ${op})`;
      } else {
        this.ctx!.fillStyle = `rgba(139, 92, 246, ${op})`;
      }

      this.ctx!.fill();
    });
    this.ctx!.shadowBlur = 0;

    this.animFrame = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animFrame) {cancelAnimationFrame(this.animFrame);}
  }
}
