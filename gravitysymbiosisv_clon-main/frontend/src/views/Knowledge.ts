import { store } from '../lib/store.js';
import { supaClient } from '../api/supa-client.js';

let currentModule: string | null = null;
let currentQuestionIdx = 0;
let completedCount = 0;
let moduleProgress: Record<string, number> = {};
let moduleQuestions: any[] = [];

function getAnsweredIndices(mod: string): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(`gravity_quiz_answered_${mod}`) || '[]')); }
  catch { return new Set(); }
}
function saveAnsweredIndices(mod: string, set: Set<number>) {
  localStorage.setItem(`gravity_quiz_answered_${mod}`, JSON.stringify([...set]));
}

let _modulesCache: { id: string; title: string; total: number }[] | null = null;

async function _authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supaClient.client.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchModules(): Promise<{ id: string; title: string; total: number }[]> {
  const companyId = store.currentProfile?.company_id;
  if (!companyId) { return []; }

  try {
    const headers = await _authHeaders();
    const res = await fetch(`${store.API_URL}/conocimiento/modulos?company_id=${companyId}`, { headers });
    if (!res.ok) { return []; }
    const data = await res.json();
    _modulesCache = data;
    return data;
  } catch {
    return [];
  }
}

export async function init() {
  if (!store.currentUser) { return; }
  await loadModuleProgress();
  renderModules();
}

async function loadModuleProgress() {
  moduleProgress = {};
  const { data } = await supaClient.client
    .from('knowledge_progress')
    .select('module, progress_percent')
    .eq('user_id', store.currentUser.id);
  if (data) { data.forEach((p: any) => { moduleProgress[p.module] = p.progress_percent || 0; }); }
}

function renderModules() {
  const grid = document.getElementById('knowledge-grid');
  const quizContainer = document.getElementById('knowledge-quiz-container');
  if (!grid) { return; }
  if (quizContainer) { quizContainer.classList.add('hidden'); }
  grid.classList.remove('hidden');

  const companyId = store.currentProfile?.company_id;
  if (!companyId) {
    grid.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center py-16 px-6 text-center"><div class="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div><h3 class="text-lg font-bold text-white mb-1">Sin empresa asignada</h3><p class="text-sm text-gray-400 max-w-md">No tienes una empresa asignada. Contacta al administrador para que te asigne una y puedas ver los módulos.</p><div class="mt-6 w-12 h-1 bg-violet-500/30 rounded-full"></div></div>';
    return;
  }

  fetchModules().then(modules => {
    if (!modules || modules.length === 0) {
      grid.innerHTML = '<div class="card p-10 col-span-full text-center"><p class="text-gray-400">No hay módulos de conocimiento disponibles para tu empresa.</p></div>';
      return;
    }

    const progress = (id: string) => moduleProgress[id] || 0;
    grid.innerHTML = modules.map(m => {
      const pct = progress(m.id);
      return `<div class="card p-6 cursor-pointer hover:border-primary/50 transition-all" data-module="${m.id}">
        <h3 class="font-orbitron text-lg font-bold text-white mb-2">${m.title}</h3>
        <div class="w-full bg-white/10 rounded-full h-2 mb-2"><div class="bg-primary h-2 rounded-full transition-all" style="width:${pct}%"></div></div>
        <p class="text-xs text-gray-400">${pct}% completado (${Math.round(pct * m.total / 100)}/${m.total})</p>
      </div>`;
    }).join('');

    grid.querySelectorAll('[data-module]').forEach(el => {
      el.addEventListener('click', () => startQuiz((el as HTMLElement).dataset.module!));
    });
  });
}

async function startQuiz(moduleId: string) {
  currentModule = moduleId;
  currentQuestionIdx = 0;

  const grid = document.getElementById('knowledge-grid');
  const quizContainer = document.getElementById('knowledge-quiz-container');
  const quizContent = document.getElementById('quiz-content');
  const prevBtn = document.getElementById('quiz-prev-btn');
  const nextBtn = document.getElementById('quiz-next-btn');

  if (grid) { grid.classList.add('hidden'); }
  if (quizContainer) { quizContainer.classList.remove('hidden'); }
  if (prevBtn) { prevBtn.classList.add('opacity-0', 'pointer-events-none'); }
  if (nextBtn) { nextBtn.classList.add('opacity-0', 'pointer-events-none'); }

  if (prevBtn) {
    const p = prevBtn.cloneNode(true) as HTMLElement;
    prevBtn.parentNode!.replaceChild(p, prevBtn);
    p.addEventListener('click', () => {
      if (currentQuestionIdx > 0) { currentQuestionIdx--; renderQuestion(); }
    });
  }
  if (nextBtn) {
    const n = nextBtn.cloneNode(true) as HTMLElement;
    nextBtn.parentNode!.replaceChild(n, nextBtn);
    n.addEventListener('click', async () => {
      if (currentQuestionIdx < moduleQuestions.length - 1) {
        const item = moduleQuestions[currentQuestionIdx];
        const hasQuiz = item?.pregunta && item.pregunta.trim() && item?.opciones && item.opciones.length > 0;
        if (!hasQuiz) { await markItemSeen(); }
        currentQuestionIdx++;
        renderQuestion();
        document.getElementById('quiz-next-btn')?.classList.remove('animate-bounce');
      }
    });
  }

  const backBtn = document.getElementById('back-to-modules');
  if (backBtn) {
    const b = backBtn.cloneNode(true) as HTMLElement;
    backBtn.parentNode!.replaceChild(b, backBtn);
    b.addEventListener('click', () => loadModuleProgress().then(renderModules));
  }

  if (quizContent) {
    quizContent.innerHTML = `
    <div class="text-center p-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p class="text-primary animate-pulse">Desencriptando módulo...</p>
    </div>`;
  }

  try {
    const companyId = store.currentProfile?.company_id || '';
    const headers = await _authHeaders();
    const response = await fetch(`${store.API_URL}/conocimiento?modulo=${moduleId}&company_id=${companyId}`, { headers });
    const data = await response.json();

    if (!response.ok || !data || data.length === 0) {
      if (quizContent) { quizContent.innerHTML = '<p class="text-center text-gray-300">Módulo vacío.</p>'; }
      return;
    }

    moduleQuestions = data;

    if (store.currentUser) {
      const localAnswered = getAnsweredIndices(moduleId);
      completedCount = localAnswered.size;
      const mod = _modulesCache?.find(m => m.id === moduleId);
      const modTotal = mod?.total || moduleQuestions.length;
      if (modTotal) {
        supaClient.saveModuleProgress(store.currentUser.id, moduleId, localAnswered.size, modTotal).catch(() => { });
      }
    }

    // Resume from first unanswered question
    const answered = getAnsweredIndices(moduleId);
    currentQuestionIdx = 0;
    for (let i = 0; i < moduleQuestions.length; i++) {
      if (!answered.has(i)) { currentQuestionIdx = i; break; }
    }

    renderQuestion();
  } catch (err: any) {
    console.error('Error cargando módulo:', err);
    if (quizContent) { quizContent.innerHTML = `<p class="text-center text-red-500 bg-red-900/20 p-4 rounded border border-red-500">Error: ${err.message}</p>`; }
  }
}

async function markItemSeen() {
  const answered = getAnsweredIndices(currentModule!);
  const isNew = !answered.has(currentQuestionIdx);
  if (isNew) {
    answered.add(currentQuestionIdx);
    saveAnsweredIndices(currentModule!, answered);
    completedCount = answered.size;
  }
  await syncProgressToSupabase(isNew);
}


function renderQuestion() {
  const item = moduleQuestions[currentQuestionIdx];
  const quizContent = document.getElementById('quiz-content');
  if (!quizContent || !item) { return; }

  const hasQuiz = item.pregunta && item.pregunta.trim() && item.opciones && item.opciones.length > 0;

  quizContent.innerHTML = `
    <div class="card p-8 bg-gray-900/90 border border-gray-700 shadow-2xl relative overflow-hidden">
      <div class="absolute top-0 right-0 p-4 opacity-10 text-9xl font-orbitron font-bold text-white select-none pointer-events-none">
        ${currentQuestionIdx + 1}
      </div>
      <div class="relative z-10">
        <div class="mb-6">
          <div class="flex items-center gap-3 mb-4">
            <span class="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/50 tracking-wider">PRINCIPIO #${currentQuestionIdx + 1}</span>
          </div>
          <h3 class="text-3xl font-bold text-white mb-4 leading-tight">${item.concepto}</h3>
          <p class="text-gray-300 text-lg leading-relaxed mb-6 border-l-4 border-primary pl-4 bg-white/5 py-4 pr-4 rounded-r">
            "${item.enseñanza}"
          </p>
          <div class="bg-black/50 p-4 rounded-lg border border-gray-800 mb-8">
            <div class="flex items-start gap-3">
              <span class="text-2xl">💡</span>
              <div>
                <strong class="text-primary block text-sm mb-1 uppercase tracking-wide">Ejemplo Práctico</strong>
                <p class="text-gray-400 text-sm">${item.ejemplo}</p>
              </div>
            </div>
          </div>
        </div>
        ${hasQuiz ? `
        <div class="pt-6 border-t border-gray-800">
          <p class="font-bold text-white mb-4 flex items-center gap-2">
            <span class="text-primary">⚡</span> DESAFÍO TÁCTICO:
            <span class="font-normal text-gray-400 ml-1">${item.pregunta}</span>
          </p>
          <div class="grid gap-3">
            ${item.opciones.map((opt: string) => `
              <button class="w-full text-left p-4 rounded-lg bg-gray-800 hover:bg-gray-700 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all duration-300 text-base border border-gray-700 quiz-option relative overflow-hidden"
                data-selected="${encodeURIComponent(opt)}"
                data-correct="${encodeURIComponent(item.respuesta)}"
                onclick="window._kbCheckAnswer(this, decodeURIComponent(this.dataset.selected), decodeURIComponent(this.dataset.correct))">
                <span class="relative z-10 flex items-center justify-between">
                  ${opt}
                  <div class="w-4 h-4 rounded-full border border-gray-500"></div>
                </span>
              </button>
            `).join('')}
          </div>
          <div class="mt-4 hidden result-msg text-center p-3 rounded-lg font-bold text-lg"></div>
        </div>
        ` : ''}
      </div>
    </div>`;

  updateProgressAndNav();
}

function updateProgressAndNav() {
  const total = moduleQuestions.length;
  const pct = Math.round((completedCount / total) * 100);
  const progressBar = document.getElementById('quiz-progress-bar');
  const progressText = document.getElementById('quiz-progress-text');
  if (progressBar) { progressBar.style.width = `${pct}%`; }
  if (progressText) { progressText.textContent = `${pct}%`; }

  const prevBtn = document.getElementById('quiz-prev-btn');
  const nextBtn = document.getElementById('quiz-next-btn');

  if (prevBtn) {
    if (currentQuestionIdx > 0) { prevBtn.classList.remove('opacity-0', 'pointer-events-none'); }
    else { prevBtn.classList.add('opacity-0', 'pointer-events-none'); }
  }
  if (nextBtn) {
    if (currentQuestionIdx < total - 1) { nextBtn.classList.remove('opacity-0', 'pointer-events-none'); }
    else { nextBtn.classList.add('opacity-0', 'pointer-events-none'); }
  }
}

(window as any)._kbCheckAnswer = async (btn: HTMLElement, selected: string, correct: string) => {
  const parent = btn.parentElement!;
  const resultMsg = parent.nextElementSibling as HTMLElement;
  const allBtns = parent.querySelectorAll('button');

  allBtns.forEach(b => {
    (b as HTMLButtonElement).disabled = true;
    b.classList.add('opacity-50', 'cursor-not-allowed');
    b.classList.remove('hover:bg-gray-700', 'hover:border-primary/50');
  });

  if (selected === correct) {
    btn.classList.remove('bg-gray-800', 'border-gray-700', 'opacity-50');
    btn.classList.add('bg-violet-900/60', 'border-violet-500', 'text-violet-100', 'shadow-[0_0_20px_rgba(139,92,246,0.3)]');
    const icon = btn.querySelector('div');
    if (icon) { icon.classList.remove('border-gray-500'); icon.classList.add('bg-violet-500', 'border-violet-500'); }

    resultMsg.textContent = '✅ ¡EXCELENTE! HAS GANADO CERTEZA';
    resultMsg.className = 'mt-4 result-msg text-center p-3 rounded-lg font-bold text-lg animate-pulse bg-violet-900/30 text-violet-400 border border-violet-500/30';

    if (currentQuestionIdx < moduleQuestions.length - 1) {
      setTimeout(() => {
        const nb = document.getElementById('quiz-next-btn');
        if (nb) { nb.classList.add('animate-bounce'); nb.classList.remove('opacity-0', 'pointer-events-none'); }
      }, 800);
    }
  } else {
    btn.classList.remove('bg-gray-800', 'border-gray-700', 'opacity-50');
    btn.classList.add('bg-red-900/60', 'border-red-500', 'text-red-100');
    const icon = btn.querySelector('div');
    if (icon) { icon.classList.remove('border-gray-500'); icon.classList.add('bg-red-500', 'border-red-500'); }

    resultMsg.innerHTML = `❌ FALLO TÁCTICO.<br><span class="text-sm font-normal text-gray-300">La respuesta correcta era: "${correct.replace(/[<>]/g, '')}"</span>`;
    resultMsg.className = 'mt-4 result-msg text-center p-3 rounded-lg font-bold text-lg bg-red-900/30 text-red-400 border border-red-500/30';
  }
  resultMsg.classList.remove('hidden');

  const answered = getAnsweredIndices(currentModule!);
  if (!answered.has(currentQuestionIdx)) {
    answered.add(currentQuestionIdx);
    saveAnsweredIndices(currentModule!, answered);
    completedCount = answered.size;
  }

  await syncProgressToSupabase();
};

async function syncProgressToSupabase(recordQuizAnswer = true) {
  if (!store.currentUser) { return; }
  try {
    const mod = _modulesCache?.find(m => m.id === currentModule);
    const modTotal = mod?.total || moduleQuestions.length;
    if (mod || moduleQuestions.length > 0) {
      const answered = getAnsweredIndices(currentModule!);
      await supaClient.saveModuleProgress(store.currentUser.id, currentModule!, answered.size, modTotal);
    }

    if (recordQuizAnswer) {
      await supaClient.recordDailyQuizAnswer(store.currentUser.id);
    }
  } catch (err) {
    console.warn('syncProgressToSupabase error:', err);
  }
}
