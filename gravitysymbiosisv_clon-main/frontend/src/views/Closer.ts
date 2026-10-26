import { store } from '../lib/store.js';
import { supaClient } from '../api/supa-client.js';

const rotatingPhrases = [
  "Escribe la objeción de tu cliente",
  "Ej: No tengo presupuesto este mes",
  "Ej: Necesito pensarlo con mi socio",
  "Ej: Es muy caro para lo que ofrece",
  "Ej: Ya trabajo con otro proveedor",
  "Escribe / para ver ejemplos",
];
let phraseIdx = 0;
let phraseInterval: number | null = null;

function startPhraseRotation(input: HTMLTextAreaElement | HTMLInputElement | null) {
  if (!input || phraseInterval) { return; }
  if (input.value.trim().length > 0) { return; }
  input.placeholder = rotatingPhrases[0]!;
  phraseIdx = 0;
  updateCursor();
  phraseInterval = window.setInterval(() => {
    if (!input || document.activeElement === input && input.value.trim().length > 0) { return; }
    if (input.value.trim().length > 0) {
      if (phraseInterval) { clearInterval(phraseInterval); phraseInterval = null; }
      return;
    }
    phraseIdx = (phraseIdx + 1) % rotatingPhrases.length;
    input.style.transition = "opacity 220ms ease";
    input.style.opacity = "0.35";
    setTimeout(() => {
      if (!input) { return; }
      input.placeholder = rotatingPhrases[phraseIdx]!;
      input.style.opacity = "1";
      updateCursor();
    }, 220);
  }, 2600);
}

function stopPhraseRotation() {
  if (phraseInterval) {
    clearInterval(phraseInterval);
    phraseInterval = null;
  }
}

function updateCursor() {
  const input = document.getElementById('client-input') as HTMLTextAreaElement | null;
  const cursor = document.getElementById('closer-cursor') as HTMLElement | null;
  if (!input || !cursor) { return; }
  const isEmpty = input.value.trim().length === 0;
  const isFocused = document.activeElement === input;
  if (isEmpty && (isFocused || !input.value)) {
    cursor.classList.remove('hidden');
    cursor.style.left = '22px';
  } else {
    cursor.classList.add('hidden');
  }
}

function scrollThreadToBottom(thread: HTMLElement) {
  thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
}

/* Revelado en cascada de la respuesta (estilo Gemini): cada sección aparece
   con un pequeño retraso incremental para dar sensación de generación fluida */
function staggerReveal(root: Element) {
  const selectors = [
    '.closer-conv-p',
    '.closer-version',
    '.closer-divider',
    '.closer-playbook-title',
    '.closer-strategy',
    '.closer-script-killer',
    '.closer-calibrated-item',
    '.closer-conv-closing',
  ];
  const els = Array.from(root.querySelectorAll(selectors.join(','))) as HTMLElement[];
  els.forEach((el, i) => {
    el.classList.add('closer-reveal');
    el.style.animationDelay = `${Math.min(i * 80, 800)}ms`;
  });
}

function showEmptyState(hidden: boolean) {
  const empty = document.getElementById('closer-empty');
  if (!empty) { return; }
  if (hidden) {
    if (empty.classList.contains('hidden')) { return; }
    empty.classList.remove('hidden');
    empty.classList.add('closer-empty-leaving');
    window.setTimeout(() => {
      empty.classList.add('hidden');
      empty.classList.remove('closer-empty-leaving');
    }, 280);
  } else {
    empty.classList.remove('closer-empty-leaving');
    empty.classList.remove('hidden');
  }
}

function buildUserBubble(text: string): string {
  const safe = escapeHtml(text);
  return `
    <div class="closer-msg closer-user-msg stream-in-top">
      <div class="closer-avatar bg-gradient-to-br from-violet-500 to-violet-700">TÚ</div>
      <div class="closer-user-bubble">
        <p class="text-[15px] leading-relaxed">${safe}</p>
      </div>
    </div>`;
}

function buildAssistantBubble(): string {
  return `
    <div class="closer-msg closer-assistant-msg stream-in-top">
      <div class="closer-assistant-bubble">
        <div class="closer-thinking"><span></span><span></span><span></span></div>
      </div>
    </div>`;
}

function appendToThread(html: string): HTMLElement | null {
  const thread = document.getElementById('closer-chat');
  if (!thread) { return null; }
  showEmptyState(true);
  thread.insertAdjacentHTML('beforeend', html);
  const nodes = thread.querySelectorAll(':scope > *');
  const last = nodes[nodes.length - 1] as HTMLElement | undefined;
  scrollThreadToBottom(thread);
  return last ?? null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function init() {
  const btn = document.getElementById('analyze-button') as HTMLButtonElement | null;
  const input = document.getElementById('client-input') as HTMLTextAreaElement | null;
  if (!btn) { return; }

  const autoResize = () => {
    if (!input) { return; }
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  };

  stopPhraseRotation();
  if (input) {
    if (input.value.includes("No estoy seguro")) { input.value = ""; }
    startPhraseRotation(input);
    updateCursor();
    autoResize();
    input.addEventListener('input', () => {
      updateCursor();
      autoResize();
      if (input.value.trim().length > 0) { stopPhraseRotation(); }
      else if (!phraseInterval) { startPhraseRotation(input); }
    });
    input.addEventListener('focus', () => {
      updateCursor();
      if (input.value.trim().length === 0 && !phraseInterval) { startPhraseRotation(input); }
    });
    input.addEventListener('blur', () => {
      updateCursor();
      if (input.value.trim().length === 0 && !phraseInterval) { startPhraseRotation(input); }
    });
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        btn.click();
      }
    });
  }

  const sendIcon = btn.innerHTML;
  let isLoading = false;
  let stopped = false;
  let abortController: AbortController | null = null;
  let currentThinking: HTMLElement | null = null;

  // El botón alterna entre enviar (flecha) y detener (cuadrado), como Gemini
  const setButtonState = (loading: boolean) => {
    isLoading = loading;
    btn.classList.toggle('is-loading', loading);
    btn.setAttribute('aria-label', loading ? 'Detener' : 'Enviar');
    btn.innerHTML = loading
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3"></rect></svg>'
      : sendIcon;
  };

  // Detiene la generación en curso (sirve tanto con fetch real como en modo lab)
  const stopGeneration = () => {
    stopped = true;
    if (abortController) { abortController.abort(); }
    setButtonState(false);
    currentThinking?.remove();
    currentThinking = null;
  };

  btn.onclick = async () => {
    // Si está generando, el botón detiene la petición (estilo Gemini)
    if (isLoading) { stopGeneration(); return; }

    const text = input?.value?.trim();
    if (!text) { alert('Escribe una objeción o situación de venta.'); return; }

    // 1) Burbuja del usuario (fluye desde arriba)
    appendToThread(buildUserBubble(text));
    if (input) { input.value = ''; input.style.height = 'auto'; updateCursor(); }

    // Al enviar pasamos a "modo conversación" (estilo Gemini): el título se
    // desvanece y el composer baja al fondo con una animación
    const viewEl = document.getElementById('view-closer');
    const composer = viewEl?.querySelector('.closer-composer') as HTMLElement | null;
    const composerFrom = composer?.getBoundingClientRect();
    viewEl?.classList.add('closer-sent');
    if (composer && composerFrom) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const to = composer.getBoundingClientRect();
        const dx = composerFrom.left - to.left;
        const dy = composerFrom.top - to.top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          composer.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }],
            { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
          );
        }
      }));
    }

    // 2) Indicador de análisis (3 puntos, estilo Gemini)
    stopped = false;
    const thinkingEl = appendToThread(buildAssistantBubble());
    currentThinking = thinkingEl;

    const isLab = store.currentUser?.id === 'lab-user-001' || window.location.pathname.startsWith('/lab');

    const renderResponse = (html: string, tail = '') => `
      <div class="closer-assistant-bubble">
        ${html}
        ${tail}
      </div>`;

    // Latencia del motor IA (ms): se mide desde el envío hasta la respuesta y se
    // muestra bajo la respuesta (importante para tuning/demos)
    const latencyTag = (ms: number) => `
      <div class="closer-latency text-[10px] text-gray-400 mt-2 font-mono tracking-wide">⏱ respondido en ${Math.max(0, Math.round(ms))} ms</div>`;

    const finish = (html: string, t0: number) => {
      const elapsed = performance.now() - t0;
      const tail = latencyTag(elapsed);
      // El indicador "analizando..." se transforma en la respuesta real (estilo Gemini)
      if (thinkingEl) {
        thinkingEl.innerHTML = renderResponse(html, tail);
        thinkingEl.classList.add('closer-replaced');
        const analysis = thinkingEl.querySelector('.closer-analysis');
        if (analysis) { staggerReveal(analysis); }
        const thread = document.getElementById('closer-chat');
        if (thread) {
          scrollThreadToBottom(thread);
          // tras la cascada, asegura que el último bloque sea visible
          window.setTimeout(() => scrollThreadToBottom(thread), 1100);
        }
      } else {
        appendToThread(`<div class="closer-msg closer-assistant-msg stream-in-top">${renderResponse(html, tail)}</div>`);
      }
    };

    setButtonState(true);

    if (isLab) {
      const t0 = performance.now();
      await new Promise(r => setTimeout(r, 1100));
      const mock = {
        tipo_objecion: "Precio",
        sentimiento_cliente: "Inseguridad por inversión",
        arquetipo: "Analítico",
        confianza: "Media",
        probabilidad_cierre: 72,
        respuesta_corta: "Entiendo la preocupación por el precio: es una decisión importante. Permíteme mostrarte cómo otros clientes ya recuperaron esta inversión.",
        respuesta_media: "Es totalmente razonable evaluar el precio antes de decidir. La mayoría de nuestros mejores clientes sintió lo mismo al inicio, pero tras implementarlo descubrieron que el producto se paga solo en pocos meses. Hoy el costo real es seguir sin resolver el problema que ya te está costando dinero y tiempo.",
        preguntas_calibradas: [
          "¿Qué tendría que pasar para que el precio dejara de ser un obstáculo?",
          "¿Cómo encajaría esta inversión dentro de tu presupuesto actual?",
          "¿Cuándo sería el mejor momento para avanzar juntos?"
        ],
        playbook: {
          paso1: { empatia: `Entiendo que "${text}" te haga dudar — es normal querer estar seguro antes de invertir.`, redireccion: "¿Si te muestro cómo otros clientes recuperaron la inversión en 30 días, lo evaluamos juntos?" },
          paso2: { tecnica1: "Prueba social (Cialdini) con caso similar", tecnica2: "Ley 6 — Haz que el cliente se sienta comprendido" },
          paso3: { proxima_jugada: "Probable 'Necesito pensarlo' → responde con urgencia elegante y opción de pago." },
          paso4: { frase_killer: `Si el precio te preocupa, es porque ves el valor. ¿Avanzamos hoy con garantía y lo dejamos cerrado?` }
        }
      };
      if (stopped) { return; }
      currentThinking = null;
      finish(renderPlaybook(mock), t0);
      setButtonState(false);
      return;
    }

    const t0 = performance.now();
    try {
      const controller = new AbortController();
      abortController = controller;
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const res = await fetch(`${store.API_URL}/analizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objecion: text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        setButtonState(false);
        alert('Error: ' + (data.error || 'Error del servidor'));
        thinkingEl?.remove();
        currentThinking = null;
        return;
      }

      if (stopped) { return; }
      currentThinking = null;
      finish(renderPlaybook(data), t0);
      setButtonState(false);

      if (store.currentUser && supaClient?.saveCloserUsage) {
        supaClient.saveCloserUsage({
          user_id: store.currentUser.id,
          framework: 'CloserElite',
          technique: 'Analysis',
          score: 85,
        }).catch(() => {});
      }
    } catch (err: any) {
      if (stopped) { return; }
      setButtonState(false);
      if (err.name !== 'AbortError') { alert('Error al analizar. Intenta de nuevo.'); }
      thinkingEl?.remove();
      currentThinking = null;
    }
  };
}

function renderPlaybook(data: any): string {
  const corta = data.respuesta_corta || '';
  const media = data.respuesta_media || '';
  const preguntas: string[] = Array.isArray(data.preguntas_calibradas) ? data.preguntas_calibradas : [];
  const killer = data.playbook?.paso4?.frase_killer || '';

  return `
    <div class="closer-analysis closer-conversation">

      <p class="closer-conv-p">${md(`Esa es probablemente la objeción más común en ventas. La buena noticia es que, la mayoría de las veces, **"es caro" no significa un "no" definitivo**. Suele significar una de dos cosas: *"aún no veo el valor suficiente que justifique ese precio"* o *"no tengo el flujo de caja ahora mismo"*.`)}</p>

      <!-- Respuesta corta (2 líneas) -->
      <div class="closer-version closer-version-short">
        <span class="closer-version-tag">Respuesta rápida · 2 líneas</span>
        <p class="closer-version-text">${md(corta || `Entiendo la preocupación por el precio: es una decisión importante. Permíteme mostrarte cómo otros clientes ya recuperaron esta inversión.`)}</p>
      </div>

      <!-- Respuesta completa (4 líneas) -->
      <div class="closer-version closer-version-full">
        <span class="closer-version-tag">Respuesta profesional · 4 líneas</span>
        <p class="closer-version-text">${md(media || `Es totalmente razonable evaluar el precio antes de decidir. La mayoría de nuestros mejores clientes sintió lo mismo al inicio, pero tras implementarlo descubrieron que el producto se paga solo en pocos meses. Hoy el costo real es seguir sin resolver el problema que ya te está costando dinero y tiempo.`)}</p>
      </div>

      <div class="closer-divider"></div>

      <div class="closer-playbook-title">
        <span class="closer-playbook-mark">ESTRATEGIAS</span>
        <span class="closer-playbook-name">PROFESIONALES</span>
      </div>

      <ol class="closer-strategies">
        <li class="closer-strategy">
          <h4 class="closer-strategy-title">Empatiza y aísla la objeción</h4>
          <p class="closer-strategy-text">Nunca discutas ni te pongas a la defensiva. Valida su preocupación y averigua si el precio es el único problema.</p>
          <blockquote class="closer-script"><span class="closer-script-label">Tú</span><p>"Entiendo completamente. La inversión siempre es un factor importante a considerar. Solo por curiosidad, dejando el precio a un lado, ¿siente que este producto es exactamente lo que necesita para resolver su problema?"</p></blockquote>
          <blockquote class="closer-script"><span class="closer-script-label">Si dicen que NO</span><p>Entonces el problema no es el precio, es que no has demostrado cómo tu producto soluciona su problema.</p></blockquote>
          <blockquote class="closer-script"><span class="closer-script-label">Si dicen que SÍ</span><p>Puedes avanzar a negociar cómo hacerlo accesible.</p></blockquote>
        </li>

        <li class="closer-strategy">
          <h4 class="closer-strategy-title">Cambia el enfoque de "precio" a "costo de inacción"</h4>
          <p class="closer-strategy-text">Ayúdale a ver que no hacer nada (o elegir lo más barato e ineficiente) le saldrá más caro a largo plazo.</p>
          <blockquote class="closer-script"><span class="closer-script-label">Tú</span><p>"Tiene razón, no es la opción más barata del mercado. Pero dígame algo, ¿cuánto le está costando actualmente seguir lidiando con su problema? A veces, la opción más económica termina siendo la más cara si no resuelve el problema de raíz."</p></blockquote>
        </li>

        <li class="closer-strategy">
          <h4 class="closer-strategy-title">La técnica "Sentía, Sintieron, Descubrieron"</h4>
          <p class="closer-strategy-text">Técnica clásica de ventas que genera mucha confianza porque usa prueba social.</p>
          <blockquote class="closer-script"><span class="closer-script-label">Tú</span><p>"Entiendo perfectamente cómo se siente. De hecho, varios de nuestros mejores clientes sintieron exactamente lo mismo cuando vieron la propuesta por primera vez. Sin embargo, lo que descubrieron después de implementarlo fue que el producto se pagó solo en pocos meses gracias a sus resultados."</p></blockquote>
        </li>

        <li class="closer-strategy">
          <h4 class="closer-strategy-title">Divide y minimiza (reducción al absurdo)</h4>
          <p class="closer-strategy-text">Divide el costo total en meses, semanas o días para que el cerebro del cliente lo procese como algo menor.</p>
          <blockquote class="closer-script"><span class="closer-script-label">Tú</span><p>"Sé que el monto de golpe suena a mucho. Pero este producto está diseñado para durar años. Si lo dividimos, estamos hablando de menos de lo que cuesta un café al día. ¿Cree que valdría la pena esa inversión diaria para dejar de preocuparse por su problema?"</p></blockquote>
        </li>
      </ol>

      ${killer ? `
      <div class="closer-divider"></div>

      <div class="closer-playbook-title">
        <span class="closer-playbook-mark">FRASE</span>
        <span class="closer-playbook-name">KILLER</span>
      </div>
      <blockquote class="closer-script closer-script-killer"><span class="closer-script-label">Tú</span><p>"${killer}"</p></blockquote>` : ''}

      ${preguntas.length ? `
      <div class="closer-divider"></div>

      <div class="closer-playbook-title">
        <span class="closer-playbook-mark">PREGUNTAS</span>
        <span class="closer-playbook-name">CALIBRADAS</span>
      </div>
      <p class="closer-strategy-text closer-calibrated-hint">Preguntas abiertas estilo Chris Voss para desarmar la objeción sin confrontar y avanzar la venta.</p>
      <ul class="closer-calibrated">
        ${preguntas.map((q, i) => `<li class="closer-calibrated-item"><span class="closer-calibrated-num">Q${i + 1}</span><span>${md(q)}</span></li>`).join('')}
      </ul>` : ''}

      <div class="closer-divider"></div>

      <div class="closer-conv-p closer-conv-closing">
        <p>${md('**¿De qué trata tu producto o servicio?** Si me das un poco más de contexto, puedo armarte un guion exacto y adaptado a lo que vendes.')}</p>
      </div>
    </div>`;
}

/* Mini-renderizador de Markdown (negritas, itálicas, saltos de línea) */
function md(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}