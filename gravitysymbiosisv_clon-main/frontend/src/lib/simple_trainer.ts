import { store } from "./store.js";

let simpleAudioStream: MediaStream | null = null;
let simpleMediaRecorder: MediaRecorder | null = null;
let simpleIsActive = false;
let simpleAudioChunks: Blob[] = [];
let simpleIsRecording = false;

(window as any).startSimpleTraining = async function () {
  try {
    simpleAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    simpleMediaRecorder = new MediaRecorder(simpleAudioStream);
    simpleIsActive = true;

    simpleMediaRecorder.ondataavailable = function (event) {
      if (event.data.size > 0) {simpleAudioChunks.push(event.data);}
    };

    simpleMediaRecorder.onstop = function () {
      sendSimpleAudio();
    };

    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && simpleIsActive && !simpleIsRecording) {
        e.preventDefault();
        startSimpleRecording();
      }
    });

    document.addEventListener('keyup', function (e) {
      if (e.code === 'Space' && simpleIsActive && simpleIsRecording) {
        e.preventDefault();
        stopSimpleRecording();
      }
    });

    return true;
  } catch (error: any) {
    console.error("❌ Error:", error.name);
    alert("Error: " + error.name + ". Recarga la página e intenta de nuevo.");
    return false;
  }
};

function startSimpleRecording() {
  if (!simpleIsRecording && simpleMediaRecorder && simpleMediaRecorder.state === 'inactive') {
    simpleAudioChunks = [];
    simpleMediaRecorder.start();
    simpleIsRecording = true;
    const statusElement = document.querySelector('#trainer-status');
    if (statusElement) {
      statusElement.innerHTML = '<span class="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>🔴 Grabando...';
    }
  }
}

function stopSimpleRecording() {
  if (simpleIsRecording && simpleMediaRecorder && simpleMediaRecorder.state === 'recording') {
    simpleMediaRecorder.stop();
    simpleIsRecording = false;
    const statusElement = document.querySelector('#trainer-status');
    if (statusElement) {
      statusElement.innerHTML = '<span class="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>📤 Procesando...';
    }
  }
}

async function sendSimpleAudio() {
  try {
    if (simpleAudioChunks.length === 0) {return;}
    const audioBlob = new Blob(simpleAudioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const selectedLevel = document.querySelector('#trainer-level-buttons .btn.active')?.textContent || 'Profesional';
    const selectedMode = document.querySelector('#trainer-mode-buttons .btn.active')?.textContent || 'Roleplay';
    formData.append('level', selectedLevel);
    formData.append('mode', selectedMode);
    formData.append('session_id', 'simple_session_' + Date.now());

    const response = await fetch(`${store.API_URL}/entrenar`, { method: 'POST', body: formData });
    if (!response.ok) {throw new Error(`HTTP ${response.status}`);}
    const data = await response.json();

    const transcriptElement = document.getElementById('transcript-text');
    const responseElement = document.getElementById('response-text');
    if (transcriptElement) {transcriptElement.textContent = `Tú: ${data.transcript}`;}
    if (responseElement) {responseElement.textContent = `Gravity: ${data.response_text}`;}

    if ((window as any).addChatMessage) {
      (window as any).addChatMessage(data.transcript, true);
      (window as any).addChatMessage(data.response_text, false);
    }

    if (data.audio_url) {
      const audioUrl = `${store.API_URL}${data.audio_url}`;
      const audio = new Audio(audioUrl);
      audio.play().catch(e => console.log("No se pudo reproducir audio:", e));
    }

    const statusElement = document.querySelector('#trainer-status');
    if (statusElement) {
      statusElement.innerHTML = '<span class="inline-block w-2 h-2 bg-violet-500 rounded-full mr-2 animate-pulse"></span>🎙️ Listo - Presiona ESPACIO para hablar';
    }
  } catch (error) {
    console.error("❌ Error enviando audio:", error);
    const statusElement = document.querySelector('#trainer-status');
    if (statusElement) {
      statusElement.innerHTML = '<span class="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>❌ Error - Intenta de nuevo';
    }
    setTimeout(() => {
      if (statusElement) {
        statusElement.innerHTML = '<span class="inline-block w-2 h-2 bg-violet-500 rounded-full mr-2 animate-pulse"></span>🎙️ Listo - Presiona ESPACIO para hablar';
      }
    }, 3000);
  }
}

(window as any).stopSimpleTraining = function () {
  if (simpleAudioStream) {simpleAudioStream.getTracks().forEach(track => track.stop());}
  simpleIsActive = false;
  simpleIsRecording = false;
};
