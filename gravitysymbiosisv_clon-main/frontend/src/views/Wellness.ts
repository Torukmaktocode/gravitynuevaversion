let countdownInterval: number | null = null;
let breathingInterval: number | null = null;
let countdownSeconds = 60;
let isRunning = false;
let pulseCount = 0;
let history: any[] = JSON.parse(localStorage.getItem("wellness-pulse-history") || "[]");

export function init() {
  pulseCount = 0;
  countdownSeconds = 60;
  isRunning = false;
  updatePulseDisplay();
  updateHistoryUI();
  bindEvents();
  resetBreathing();
}

export function cleanup() {
  if (countdownInterval) {clearInterval(countdownInterval);}
  if (breathingInterval) {clearInterval(breathingInterval);}
  isRunning = false;
}

function bindEvents() {
  const startBtn = document.getElementById("pulse-start-btn");
  const plusBtn = document.getElementById("pulse-plus");
  const minusBtn = document.getElementById("pulse-minus");
  const saveBtn = document.getElementById("pulse-save-btn");
  const resetBtn = document.getElementById("pulse-reset-btn");
  const clearBtn = document.getElementById("pulse-clear-history");
  const breathStart = document.getElementById("breathing-start-btn");
  const breathReset = document.getElementById("breathing-reset-btn");

  if (startBtn) {
    const newBtn = startBtn.cloneNode(true) as HTMLElement;
    startBtn.parentNode!.replaceChild(newBtn, startBtn);
    newBtn.addEventListener("click", togglePulse);
  }
  if (plusBtn) {
    const newBtn = plusBtn.cloneNode(true) as HTMLElement;
    plusBtn.parentNode!.replaceChild(newBtn, plusBtn);
    newBtn.addEventListener("click", () => { if (isRunning) {pulseCount++;} updatePulseDisplay(); });
  }
  if (minusBtn) {
    const newBtn = minusBtn.cloneNode(true) as HTMLElement;
    minusBtn.parentNode!.replaceChild(newBtn, minusBtn);
    newBtn.addEventListener("click", () => { if (isRunning && pulseCount > 0) {pulseCount--;} updatePulseDisplay(); });
  }
  if (saveBtn) {
    const newBtn = saveBtn.cloneNode(true) as HTMLElement;
    saveBtn.parentNode!.replaceChild(newBtn, saveBtn);
    newBtn.addEventListener("click", saveMeasurement);
  }
  if (resetBtn) {
    const newBtn = resetBtn.cloneNode(true) as HTMLElement;
    resetBtn.parentNode!.replaceChild(newBtn, resetBtn);
    newBtn.addEventListener("click", resetPulse);
  }
  if (clearBtn) {
    const newBtn = clearBtn.cloneNode(true) as HTMLElement;
    clearBtn.parentNode!.replaceChild(newBtn, clearBtn);
    newBtn.addEventListener("click", clearHistory);
  }
  if (breathStart) {
    const newBtn = breathStart.cloneNode(true) as HTMLElement;
    breathStart.parentNode!.replaceChild(newBtn, breathStart);
    newBtn.addEventListener("click", toggleBreathing);
  }
  if (breathReset) {
    const newBtn = breathReset.cloneNode(true) as HTMLElement;
    breathReset.parentNode!.replaceChild(newBtn, breathReset);
    newBtn.addEventListener("click", resetBreathing);
  }
}

function togglePulse() {
  if (isRunning) {stopPulse();}
  else {startPulse();}
}

function startPulse() {
  isRunning = true;
  if (countdownSeconds <= 0 || countdownSeconds >= 60) {
    countdownSeconds = 60;
    pulseCount = 0;
  }
  const btn = document.getElementById("pulse-start-btn");
  if (btn) {btn.textContent = "Pausar";}
  updatePulseDisplay();
  const circle = document.getElementById("pulse-timer-circle");
  if (circle && countdownSeconds >= 60) {circle.style.strokeDashoffset = "0";}
  countdownInterval = window.setInterval(() => {
    countdownSeconds--;
    updatePulseDisplay();
    const circleEl = document.getElementById("pulse-timer-circle");
    if (circleEl) {
      const offset = 553 * (1 - countdownSeconds / 60);
      circleEl.style.strokeDashoffset = String(offset);
    }
    if (countdownSeconds <= 0) {stopPulse();}
  }, 1000);
}

function stopPulse() {
  isRunning = false;
  if (countdownInterval) {clearInterval(countdownInterval);}
  const btn = document.getElementById("pulse-start-btn");
  if (btn) {btn.textContent = "Iniciar";}
  if (countdownSeconds <= 0) {countdownSeconds = 60;}
  updatePulseDisplay();
}

function resetPulse() {
  if (countdownInterval) {clearInterval(countdownInterval);}
  isRunning = false;
  countdownSeconds = 60;
  pulseCount = 0;
  const btn = document.getElementById("pulse-start-btn");
  if (btn) {btn.textContent = "Iniciar";}
  const circle = document.getElementById("pulse-timer-circle");
  if (circle) {circle.style.strokeDashoffset = "0";}
  updatePulseDisplay();
}

function updatePulseDisplay() {
  const countdownEl = document.getElementById("pulse-countdown");
  if (countdownEl) {countdownEl.textContent = String(countdownSeconds);}
  const countEl = document.getElementById("pulse-count");
  if (countEl) {countEl.textContent = String(pulseCount);}
}

function saveMeasurement() {
  if (pulseCount === 0) {return;}
  const entry = { date: new Date().toISOString(), bpm: pulseCount };
  history.push(entry);
  localStorage.setItem("wellness-pulse-history", JSON.stringify(history));
  updateHistoryUI();
  resetPulse();
}

function clearHistory() {
  history = [];
  localStorage.removeItem("wellness-pulse-history");
  updateHistoryUI();
}

function updateHistoryUI() {
  const avgEl = document.getElementById("pulse-avg");
  const lastEl = document.getElementById("pulse-last");
  const maxEl = document.getElementById("pulse-max");
  const totalEl = document.getElementById("pulse-total");
  const listEl = document.getElementById("pulse-history-list");
  if (history.length === 0) {
    if (avgEl) {avgEl.textContent = "--";}
    if (lastEl) {lastEl.textContent = "--";}
    if (maxEl) {maxEl.textContent = "--";}
    if (totalEl) {totalEl.textContent = "0";}
    if (listEl) {listEl.innerHTML = '<p class="text-sm text-gray-300 text-center py-4">No hay mediciones guardadas</p>';}
    return;
  }
  const values = history.map((h: any) => h.bpm);
  const avg = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
  const max = Math.max(...values);
  const last = values[values.length - 1];
  if (avgEl) {avgEl.textContent = String(avg);}
  if (lastEl) {lastEl.textContent = String(last);}
  if (maxEl) {maxEl.textContent = String(max);}
  if (totalEl) {totalEl.textContent = String(history.length);}
  if (listEl) {
    listEl.innerHTML = history
      .slice(-10)
      .reverse()
      .map((h: any) =>
        `<div class="flex justify-between items-center text-sm py-1.5 px-2 rounded-lg bg-white/5"><span>${new Date(h.date).toLocaleDateString("es-ES")} ${new Date(h.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span><span class="font-bold text-primary">${h.bpm} bpm</span></div>`
      ).join("");
  }
}

let breathingPhase = 0;
let breathingActive = false;
const phases = [
  { text: "Inhala", duration: 4000 },
  { text: "Sostén", duration: 4000 },
  { text: "Exhala", duration: 4000 },
  { text: "Espera", duration: 4000 },
];

function toggleBreathing() {
  if (breathingActive) {stopBreathing();}
  else {startBreathing();}
}

function startBreathing() {
  breathingActive = true;
  breathingPhase = 0;
  const btn = document.getElementById("breathing-start-btn");
  if (btn) {btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-black"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar';}
  applyBreathingPhase(0);
  let phaseStart = Date.now();
  breathingInterval = window.setInterval(() => {
    const elapsed = Date.now() - phaseStart;
    if (elapsed >= phases[breathingPhase].duration) {
      breathingPhase = (breathingPhase + 1) % phases.length;
      phaseStart = Date.now();
      applyBreathingPhase(breathingPhase);
    }
  }, 200);
  startBreathingTimer();
}

function stopBreathing() {
  breathingActive = false;
  if (breathingInterval) {clearInterval(breathingInterval);}
  if (breathingTimerInterval) {clearInterval(breathingTimerInterval); breathingTimerInterval = null;}
  const btn = document.getElementById("breathing-start-btn");
  if (btn) {btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-black"><polygon points="5 3 19 12 5 21 5 3"/></svg> Iniciar';}
}

function resetBreathing() {
  stopBreathing();
  breathingPhase = 0;
  const status = document.getElementById("breathing-status");
  if (status) {status.textContent = "Listo para empezar";}
  const timer = document.getElementById("breathing-timer");
  if (timer) {timer.textContent = "05:00";}
  resetOrbScale();
}

function resetOrbScale() {
  for (let i = 1; i <= 3; i++) {
    const orb = document.getElementById(`breathing-orb-${i}`);
    if (orb) {
      orb.style.transition = "none";
      orb.style.transform = "scale(0.5)";
      orb.style.opacity = String(i === 1 ? 0.4 : i === 2 ? 0.6 : 0.8);
    }
  }
  const core = document.getElementById("breathing-orb-core");
  if (core) {
    core.style.transition = "none";
    core.style.transform = "scale(0.75)";
  }
  setTimeout(() => {
    document.querySelectorAll('[id^="breathing-orb-"]').forEach((el) => {
      (el as HTMLElement).style.transition = "all 5000ms ease-in-out";
    });
    const coreEl = document.getElementById("breathing-orb-core");
    if (coreEl) {coreEl.style.transition = "all 5000ms ease-in-out";}
  }, 50);
}

function applyBreathingPhase(index: number) {
  const status = document.getElementById("breathing-status");
  if (status) {status.textContent = phases[index].text;}
  for (let i = 1; i <= 3; i++) {
    const orb = document.getElementById(`breathing-orb-${i}`);
    if (orb) {
      const scale = index === 0 ? 1.2 : index === 1 ? 1.4 : index === 2 ? 0.8 : 0.5;
      const opacity = index === 0 ? 0.6 : index === 1 ? 0.8 : index === 2 ? 0.4 : 0.2;
      orb.style.transform = `scale(${scale})`;
      orb.style.opacity = String(opacity);
    }
  }
  const core = document.getElementById("breathing-orb-core");
  if (core) {
    const coreScale = index === 0 ? 1.1 : index === 1 ? 1.2 : index === 2 ? 0.85 : 0.6;
    core.style.transform = `scale(${coreScale})`;
  }
}

let breathingTimerSeconds = 300;
let breathingTimerInterval: number | null = null;

function startBreathingTimer() {
  if (breathingTimerInterval) {clearInterval(breathingTimerInterval);}
  breathingTimerSeconds = 300;
  updateBreathingTimer();
  breathingTimerInterval = window.setInterval(() => {
    breathingTimerSeconds--;
    updateBreathingTimer();
    if (breathingTimerSeconds <= 0) {
      stopBreathing();
      if (breathingTimerInterval) {clearInterval(breathingTimerInterval);}
    }
  }, 1000);
}

function updateBreathingTimer() {
  const el = document.getElementById("breathing-timer");
  if (el) {
    const m = Math.floor(breathingTimerSeconds / 60);
    const s = breathingTimerSeconds % 60;
    el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
}
