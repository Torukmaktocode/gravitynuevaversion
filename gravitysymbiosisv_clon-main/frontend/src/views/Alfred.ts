import { store } from '../lib/store.js';
import { supaClient } from '../api/supa-client.js';

const API_URL = '/api';
let alfredData: any[] = [];

export async function init() {
  const quizContainer = document.getElementById('alfred-quiz-container');
  const finalCard = document.getElementById('alfred-final-card');
  const questionCard = document.getElementById('question-card');

  const restartBtn = document.getElementById('restart-alfred');
  if (restartBtn) {
    restartBtn.onclick = async () => {
      localStorage.removeItem(`alfred_idx_${store.currentUser?.id}`);
      localStorage.removeItem(`alfred_answers_${store.currentUser?.id}`);
      if (store.currentUser) {
        await supaClient.client.from('training_plans').delete().eq('user_id', store.currentUser.id);
      }
      if (quizContainer) {quizContainer.classList.remove('hidden');}
      if (questionCard) {questionCard.classList.remove('hidden');}
      if (finalCard) {finalCard.classList.add('hidden');}
      alfredData = [];
      init();
    };
  }

  const hasPlan = await loadAlfredPlan();

  if (hasPlan) {
    if (quizContainer) {quizContainer.classList.remove('hidden');}
    if (questionCard) {questionCard.classList.add('hidden');}
    if (finalCard) {finalCard.classList.remove('hidden');}
    return;
  }

  if (quizContainer) {quizContainer.classList.remove('hidden');}
  if (questionCard) {questionCard.classList.remove('hidden');}
  if (finalCard) {finalCard.classList.add('hidden');}

  showAlfredQuestion();
}

async function loadAlfredPlan(): Promise<boolean> {
  if (!store.currentUser) {return false;}

  const container = document.getElementById('question-content');
  if (container) {
    container.innerHTML = `
      <div class="animate-pulse flex flex-col items-center gap-4 py-10">
        <div class="h-8 bg-white/5 w-3/4 rounded-lg"></div>
        <div class="h-16 bg-white/5 w-full rounded-2xl"></div>
        <div class="h-16 bg-white/5 w-full rounded-2xl"></div>
      </div>`;
  }

  const { data, error } = await supaClient.client
    .from('training_plans')
    .select('plan, level, vendedor_info')
    .eq('user_id', store.currentUser.id)
    .maybeSingle();

  if (error) {console.error('Alfred fetch error:', error);}
  if (!data || !data.plan) {
    const defaultPlan = [
      { question: '¿Qué es lo que más te frena hoy para cerrar más ventas?', options: ['Miedo al rechazo', 'Falta de argumentos', 'No sé generar confianza', 'No identifico necesidades', 'Cierro tarde o nunca'], category: 'diagnosis' },
      { question: '¿Cuántos contactos nuevos haces por semana?', options: ['Menos de 5', 'Entre 5 y 10', 'Entre 10 y 20', 'Más de 20'], category: 'activity' },
      { question: 'Cuando recibes un NO, ¿cuál es tu reacción más común?', options: ['Insisto una vez más', 'Lo acepto y me retiro', 'Pregunto el motivo', 'Me desanimo'], category: 'resilience' },
      { question: '¿Qué tipo de objeción te cuesta más manejar?', options: ['Precio', 'Tiempo', 'Confianza', 'Competencia', 'No interesado'], category: 'objections' },
      { question: 'Del 1 al 5, ¿cómo calificarías tu técnica de cierre?', options: ['1 - Muy débil', '2 - Débil', '3 - Regular', '4 - Buena', '5 - Excelente'], category: 'closing' },
      { question: '¿Qué te gustaría mejorar primero?', options: ['Prospección', 'Argumentación', 'Manejo de objeciones', 'Cierre', 'Seguridad'], category: 'priority' },
    ];
    const { error: upsertErr } = await supaClient.client.from('training_plans').upsert({
      user_id: store.currentUser.id, plan: defaultPlan
    }, { onConflict: 'user_id' });
    if (!upsertErr) {alfredData = defaultPlan;}
    else {console.error('Alfred upsert error:', upsertErr);}
    return false;
  }

  if (typeof data.plan === 'string' && data.plan.length > 50 && data.level) {
    const finalContent = document.getElementById('alfred-final-content');
    const progressBar = document.getElementById('alfred-progress-bar');
    const stepIndicator = document.getElementById('alfred-step-indicator');
    const progressPercent = document.getElementById('alfred-progress-percent');

    if (progressBar) {progressBar.style.width = '100%';}
    if (stepIndicator) {stepIndicator.textContent = 'Diagnóstico Completo';}
    if (progressPercent) {progressPercent.textContent = '100% COMPLETO';}

    let levelColor = 'text-primary border-primary/20 bg-primary/5';
    if (data.level?.includes('Elite') || data.level?.includes('Leyenda')) {levelColor = 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5';}
    else if (data.level?.includes('Master')) {levelColor = 'text-purple-400 border-purple-400/20 bg-purple-400/5';}

    const sanitizedPlan = data.plan
      .replace(/bg-gray-100/g, 'bg-white/5')
      .replace(/bg-white(?!\/)/g, 'bg-white/5')
      .replace(/text-black/g, 'text-gray-300')
      .replace(/bg-gray-50/g, 'bg-white/5');

    if (finalContent) {
      finalContent.innerHTML = `
        <div class="text-center mb-10">
          <div class="inline-block px-4 py-1 rounded-full border ${levelColor} font-orbitron text-[10px] uppercase tracking-widest mb-4">
            ${data.level || 'Nivel Calculado'}
          </div>
          <h2 class="text-4xl font-bold text-white mb-2">Tu Plan de Entrenamiento</h2>
          <p class="text-gray-400">Diagnóstico completado.</p>
        </div>
        <div class="alfred-plan-results prose prose-invert max-w-none">
          ${sanitizedPlan}
        </div>`;
    }
    return true;
  }

  if (Array.isArray(data.plan) && data.plan.length > 0) {
    alfredData = data.plan;
    return false;
  }

  if (data.plan?.questions && Array.isArray(data.plan.questions)) {
    alfredData = data.plan.questions;
    return false;
  }

  return false;
}


function showAlfredQuestion() {
  const currentIndex = parseInt(localStorage.getItem(`alfred_idx_${store.currentUser?.id}`) || '0');
  const q = alfredData[currentIndex];
  const total = alfredData.length;

  const container = document.getElementById('question-content');
  if (!container) {return;}
  if (!q || !q.options || currentIndex >= total) {
    finishAlfredDiagnostic();
    return;
  }

  const progress = (currentIndex / total) * 100;
  const progressBar = document.getElementById('alfred-progress-bar');
  const stepIndicator = document.getElementById('alfred-step-indicator');
  const progressPercent = document.getElementById('alfred-progress-percent');

  if (progressBar) {progressBar.style.width = `${progress}%`;}
  if (stepIndicator) {stepIndicator.textContent = `Fase ${currentIndex + 1} / ${total}`;}
  if (progressPercent) {progressPercent.textContent = `${Math.round(progress)}% COMPLETO`;}

  container.innerHTML = `
    <h2 class="font-orbitron text-2xl md:text-3xl font-bold text-white mb-8 text-center leading-tight">
        ${q.question}
    </h2>
    <div class="space-y-4">
        ${q.options.map((opt: string, i: number) => `
            <button class="alfred-option w-full p-5 rounded-2xl bg-secondary/20 border border-white/5 text-left text-gray-300 hover:text-white hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 flex items-center justify-between group active:scale-[0.98]" data-opt-index="${i}">
                <span class="text-lg font-medium">${opt}</span>
                <div class="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/20 transition-all">
                    <div class="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
            </button>
        `).join('')}
    </div>`;

  container.querySelectorAll('.alfred-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const answers = JSON.parse(localStorage.getItem(`alfred_answers_${store.currentUser?.id}`) || '{}');
      answers[currentIndex] = {
        question: q.question,
        answer: (btn.querySelector('.font-medium') as HTMLElement).textContent!.trim(),
        category: q.category,
      };
      localStorage.setItem(`alfred_answers_${store.currentUser?.id}`, JSON.stringify(answers));
      localStorage.setItem(`alfred_idx_${store.currentUser?.id}`, String(currentIndex + 1));
      showAlfredQuestion();
    });
  });

  const resetBtn = document.getElementById('reset-alfred');
  if (resetBtn) {
    resetBtn.onclick = () => {
      localStorage.removeItem(`alfred_idx_${store.currentUser?.id}`);
      localStorage.removeItem(`alfred_answers_${store.currentUser?.id}`);
      showAlfredQuestion();
    };
  }
}

async function finishAlfredDiagnostic() {
  const container = document.getElementById('question-content');

  if (container) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-10">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-6"></div>
        <h3 class="font-orbitron text-xl text-primary animate-pulse uppercase tracking-widest">Calculando Perfil Operativo...</h3>
        <p class="text-gray-300 mt-2 text-sm italic">Alfred está analizando tu DNA de ventas</p>
      </div>`;
  }

  const progressBar = document.getElementById('alfred-progress-bar');
  const stepIndicator = document.getElementById('alfred-step-indicator');
  const progressPercent = document.getElementById('alfred-progress-percent');
  if (progressBar) {progressBar.style.width = '100%';}
  if (stepIndicator) {stepIndicator.textContent = `Fase ${alfredData.length} / ${alfredData.length}`;}
  if (progressPercent) {progressPercent.textContent = '100% COMPLETO';}

  const rawAnswers = JSON.parse(localStorage.getItem(`alfred_answers_${store.currentUser?.id}`) || '{}');
  const answersForBackend: Record<string, string> = {};
  Object.values(rawAnswers).forEach((item: any, i: number) => {
    answersForBackend[`q${i + 1}_${item.category || 'resp'}`] = item.answer;
  });

  try {
    const { session } = await supaClient.getCurrentSession();
    const token = session?.access_token;

    const payload = {
      vendedor_info: {
        ...answersForBackend,
        categoria: answersForBackend.q1_diagnosis || Object.values(answersForBackend)[0] || 'Vendedor activo',
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000);

    const response = await fetch(`${API_URL}/generar_plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {throw new Error(data.error || 'Error en la conexión con Alfred');}

    const planData = {
      level: data.level,
      plan: data.plan_de_entrenamiento || data.plan,
    };

    await supaClient.client.from('training_plans').upsert({
      user_id: store.currentUser.id,
      vendedor_info: payload.vendedor_info,
      level: planData.level,
      plan: planData.plan,
    }, { onConflict: 'user_id' }).select();

    showGeneratedPlan(planData);
  } catch (error: any) {
    console.error('Alfred Error:', error);
    let errorMsg = 'Se interrumpió la conexión con el servidor Alfred.';
    if (error.name === 'AbortError') {
      errorMsg = 'Alfred está tardando más de lo habitual procesando tu plan operativo. Por favor reintenta en unos instantes.';
    }
    if (container) {
      container.innerHTML = `
        <div class="text-center py-10">
          <div class="inline-block p-3 bg-red-500/10 rounded-full mb-4 border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <p class="text-red-400 font-bold mb-2">Protocolo Interrumpido</p>
          <p class="text-gray-300 text-sm mb-6 max-w-xs mx-auto">${errorMsg}</p>
          <button id="retry-alfred" class="btn btn-primary px-8">Reintentar</button>
        </div>`;
      document.getElementById('retry-alfred')?.addEventListener('click', finishAlfredDiagnostic);
    }
  }
}

function showGeneratedPlan(data: any) {
  const quizContainer = document.getElementById('alfred-quiz-container');
  const questionCard = document.getElementById('question-card');
  const finalCard = document.getElementById('alfred-final-card');
  const finalContent = document.getElementById('alfred-final-content');

  if (!finalCard || !finalContent) {return;}

  let sanitizedPlan = data.plan || 'No se pudo generar el plan detallado.';
  sanitizedPlan = sanitizedPlan
    .replace(/bg-gray-100/g, 'bg-white/5')
    .replace(/bg-white(?!\/)/g, 'bg-white/5')
    .replace(/text-black/g, 'text-gray-300')
    .replace(/bg-gray-50/g, 'bg-white/5');

  let levelColor = 'text-primary border-primary/20 bg-primary/5';
  const level = data.level || '';
  if (level.includes('Elite') || level.includes('Leyenda')) {
    levelColor = 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5';
  } else if (level.includes('Master')) {
    levelColor = 'text-purple-400 border-purple-400/20 bg-purple-400/5';
  }

  finalContent.innerHTML = `
    <div class="text-center mb-10">
      <div class="inline-block px-4 py-1 rounded-full border ${levelColor} font-orbitron text-[10px] uppercase tracking-widest mb-4">
        ${level || 'Nivel Calculado'}
      </div>
      <h2 class="text-4xl font-bold text-white mb-2">Tu Plan de Entrenamiento</h2>
      <p class="text-gray-400">Diagnóstico completado con éxito.</p>
    </div>
    <div class="alfred-plan-results prose prose-invert max-w-none">
      ${sanitizedPlan}
    </div>`;

  quizContainer?.classList.remove('hidden');
  questionCard?.classList.add('hidden');
  finalCard?.classList.remove('hidden');
}
