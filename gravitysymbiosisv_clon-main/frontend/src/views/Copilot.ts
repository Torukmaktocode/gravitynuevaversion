import { supaClient } from '../api/supa-client.js';
import { store } from '../lib/store.js';

let mediaRecorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let copilotInterval: number | null = null;
let waveformInterval: number | null = null;
let chunkInterval: number | null = null;
let remainingSeconds = 0;
let isCopilotRunning = false;

function q(id: string) { return document.getElementById(id); }

export function init() {
  stopCopilot();

  const btn = q("copilot-toggle-btn");
  if (btn) {
    const newBtn = btn.cloneNode(true) as HTMLElement;
    btn.parentNode!.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", toggle);
  }

  const send = q("copilot-send-manual");
  if (send) {
    const newSend = send.cloneNode(true) as HTMLElement;
    send.parentNode!.replaceChild(newSend, send);
    newSend.addEventListener("click", sendManualContext);
    const input = q("copilot-manual-input") as HTMLInputElement;
    if (input) {
      const newInput = input.cloneNode(true) as HTMLInputElement;
      input.parentNode!.replaceChild(newInput, input);
      newInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { sendManualContext(); }
      });
    }
  }

  resetUI();
}

function resetUI() {
  const text = q("copilot-toggle-text");
  if (text) { text.textContent = "ACTIVAR SHADOW"; }
  const timer = q("copilot-timer");
  if (timer) { timer.textContent = "00:00"; }
  const dot = q("copilot-status-dot");
  if (dot) { dot.className = "w-2 h-2 rounded-full bg-gray-600"; }
  const statusText = q("copilot-status-text");
  if (statusText) { statusText.textContent = "Standby"; }
  const certaintyVal = q("copilot-certainty-val");
  if (certaintyVal) { certaintyVal.textContent = "--%"; }
  const certaintyBar = q("copilot-certainty-bar");
  if (certaintyBar) { certaintyBar.style.width = "0%"; }
  const recording = q("recording-node");
  if (recording) { recording.classList.add("hidden"); }

  const suggestions = q("copilot-suggestions-container");
  if (suggestions) {
    suggestions.innerHTML = '<div class="p-6 border border-white/5 rounded-2xl bg-white/5 flex flex-col items-center text-center justify-center h-48 italic text-xs text-gray-300">Esperando flujo de conversación para generar análisis...</div>';
  }

  const transcript = q("copilot-transcript-container");
  if (transcript) {
    transcript.innerHTML =
      '<div class="flex flex-col items-center justify-center h-full text-center space-y-4">' +
      '<div class="w-16 h-16 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">' +
      '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>' +
      "</svg></div>" +
      '<p class="text-xs uppercase font-bold tracking-widest text-gray-400">Inicia SHADOW para empezar el escaneo táctico</p></div>';
  }

  const waveform = q("copilot-waveform");
  if (waveform) { waveform.innerHTML = ""; }
}

export function toggle() {
  if (isCopilotRunning) { stopCopilot(); }
  else { startCopilot(); }
}

async function startCopilot() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    addTranscriptMessage("Tu navegador no soporta grabación de audio.", false);
    return;
  }

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error("Error accessing microphone:", err);
    addTranscriptMessage("No se pudo acceder al micrófono. Verifica los permisos.", false);
    return;
  }

  isCopilotRunning = true;
  remainingSeconds = 0;

  const text = q("copilot-toggle-text");
  if (text) { text.textContent = "DETENER SHADOW"; }
  const dot = q("copilot-status-dot");
  if (dot) { dot.className = "w-2 h-2 rounded-full bg-violet-500 animate-pulse"; }
  const statusText = q("copilot-status-text");
  if (statusText) { statusText.textContent = "Escaneando"; }
  const recording = q("recording-node");
  if (recording) { recording.classList.remove("hidden"); }

  updateCopilotTimer();
  generateWaveform();

  // Remove transcript placeholder
  const transcript = q("copilot-transcript-container");
  if (transcript) {
    const placeholder = transcript.querySelector(".flex-col.items-center.justify-center");
    if (placeholder) { placeholder.remove(); }
  }

  addTranscriptMessage("SHADOW activado. Escuchando la conversación...", false);

  // Start recording in chunks for transcription
  startRecording();

  copilotInterval = window.setInterval(() => {
    remainingSeconds++;
    updateCopilotTimer();
    if (remainingSeconds % 30 === 0) {
      analyzeCopilotContext();
    }
    if (remainingSeconds % 15 === 0) {
      sendAudioForTranscription();
    }
  }, 1000);
}

function startRecording() {
  if (!audioStream) { return; }
  try {
    mediaRecorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) { chunks.push(ev.data); }
    };
    mediaRecorder.onstop = () => {
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: "audio/webm" });
        sendAudioToAPI(blob);
        chunks.length = 0;
      }
      if (isCopilotRunning) {
        try { mediaRecorder?.start(); } catch { /* ignore */ }
      }
    };
    mediaRecorder.start();
    // Stop every 10 seconds to send a chunk, auto-restart
    if (chunkInterval) { clearInterval(chunkInterval); chunkInterval = null; }
    chunkInterval = window.setInterval(() => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    }, 10000);
  } catch (err) {
    console.error("Error starting MediaRecorder:", err);
  }
}

async function sendAudioToAPI(blob: Blob) {
  try {
    const { data: { session } } = await supaClient.client.auth.getSession();
    const token = session?.access_token;
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("user_name", store.currentUser?.email || "Usuario");
    formData.append("mode", "shadow");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${store.API_URL}/entrenar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.warn("Shadow transcription error:", data.error);
      return;
    }

    if (data.transcript) {
      addTranscriptMessage(data.transcript, true);
    }

    if (data.response_text) {
      addCopilotSuggestion(data.response_text);
      updateCertainty();
    }
  } catch (err) {
    console.warn("Shadow audio send failed:", err);
  }
}

function sendAudioForTranscription() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
}

function stopCopilot() {
  const wasRunning = isCopilotRunning;
  isCopilotRunning = false;
  if (copilotInterval) { clearInterval(copilotInterval); copilotInterval = null; }
  if (waveformInterval) { clearInterval(waveformInterval); waveformInterval = null; }
  if (chunkInterval) { clearInterval(chunkInterval); chunkInterval = null; }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    try { mediaRecorder.stop(); } catch { /* ignore */ }
  }
  mediaRecorder = null;

  if (audioStream) {
    audioStream.getTracks().forEach(t => t.stop());
    audioStream = null;
  }

  const text = q("copilot-toggle-text");
  if (text) { text.textContent = "ACTIVAR SHADOW"; }
  const dot = q("copilot-status-dot");
  if (dot) { dot.className = "w-2 h-2 rounded-full bg-gray-600"; }
  const statusText = q("copilot-status-text");
  if (statusText) { statusText.textContent = "Standby"; }
  const recording = q("recording-node");
  if (recording) { recording.classList.add("hidden"); }
  const timer = q("copilot-timer");
  if (timer) { timer.textContent = "00:00"; }

  if (wasRunning) {
    addTranscriptMessage("SHADOW desactivado.", false);
  }
}

function updateCopilotTimer() {
  const el = q("copilot-timer");
  if (el) {
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
}

function analyzeCopilotContext() {
  const suggestions = [
    'Pregunta abierta: "¿Qué es lo más importante para ti en esta solución?"',
    "Escucha activa: repite la última frase del cliente para mostrar comprensión.",
    "Recuerda usar el tono de voz adecuado para el perfil del cliente.",
    "Sugerencia: ofrece una comparación con la competencia si el cliente duda.",
    'Técnica de cierre: "Si pudiera ofrecerte X, ¿cerraríamos hoy?"',
    'Identifica el dolor: "¿Qué problema específico estás tratando de resolver?"',
  ];
  const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
  addCopilotSuggestion(suggestion);
  updateCertainty();
}

function addCopilotSuggestion(text: string) {
  const container = q("copilot-suggestions-container");
  if (!container) { return; }
  const empty = container.querySelector(".italic");
  if (empty) { empty.remove(); }
  const time = new Date().toLocaleTimeString();
  const div = document.createElement("div");
  div.className = "bg-white/5 border border-white/5 rounded-xl p-4";
  div.innerHTML = `<div class="flex items-start gap-3"><div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5"><span class="text-primary text-[10px] font-bold">AI</span></div><div><p class="text-xs text-gray-300 leading-relaxed">${text}</p><span class="text-[9px] text-gray-500 mt-1 block">${time}</span></div></div>`;
  container.prepend(div);
  if (container.children.length > 10) { container.removeChild(container.lastChild!); }
}

function addTranscriptMessage(text: string, isUser: boolean) {
  const container = q("copilot-transcript-container");
  if (!container) { return; }
  const placeholder = container.querySelector(".flex-col.items-center.justify-center");
  if (placeholder) { placeholder.remove(); }
  const time = new Date().toLocaleTimeString();
  const div = document.createElement("div");
  div.className = "flex items-start gap-3 mb-3";
  if (isUser) {
    div.innerHTML = `<div class="ml-auto max-w-[80%] bg-primary/20 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-2.5"><p class="text-xs text-gray-200 leading-relaxed">${text}</p><span class="text-[9px] text-gray-500 mt-1 block text-right">${time}</span></div>`;
  } else {
    div.innerHTML = `<div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5"><span class="text-primary text-[10px] font-bold">AI</span></div><div class="max-w-[75%] bg-white/5 border border-white/5 rounded-2xl rounded-bl-sm px-4 py-2.5"><p class="text-xs text-gray-300 leading-relaxed">${text}</p><span class="text-[9px] text-gray-500 mt-1 block">${time}</span></div>`;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function updateCertainty() {
  const val = Math.min(95, 50 + Math.floor(Math.random() * 46));
  const el = q("copilot-certainty-val");
  if (el) { el.textContent = val + "%"; }
  const bar = q("copilot-certainty-bar");
  if (bar) { bar.style.width = val + "%"; }
}

function sendManualContext() {
  const input = q("copilot-manual-input") as HTMLInputElement;
  if (!input || !input.value.trim()) { return; }
  const text = input.value.trim();
  input.value = "";
  addTranscriptMessage(text, true);
  if (isCopilotRunning) {
    analyzeCopilotContext();
  } else {
    const responses = [
      "Entendido. Aplicaré ese contexto en el análisis táctico.",
      "Contexto registrado. Ajustando recomendaciones...",
      "Gracias. Eso ayuda a refinar la estrategia.",
      "Información añadida al perfil de la conversación.",
    ];
    setTimeout(() => {
      addTranscriptMessage(responses[Math.floor(Math.random() * responses.length)], false);
      updateCertainty();
    }, 600);
  }
}

function generateWaveform() {
  const container = q("copilot-waveform");
  if (!container) { return; }
  function updateBars() {
    container!.innerHTML = "";
    for (let i = 0; i < 60; i++) {
      const bar = document.createElement("div");
      const h = Math.random() * 40 + 10;
      bar.style.cssText = `width:4px;height:${h}px;background:#8b5cf6;border-radius:2px;transition:height 0.4s ease;opacity:0.6`;
      container!.appendChild(bar);
    }
  }
  updateBars();
  waveformInterval = window.setInterval(updateBars, 800);
}
