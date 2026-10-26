import './dashboard.css';
import './openai-theme.css';
import landingCSS from './main.css?raw';

function ensureLandingStyles() {
  if (!document.getElementById('landing-styles')) {
    const style = document.createElement('style');
    style.id = 'landing-styles';
    style.textContent = landingCSS;
    document.head.appendChild(style);
  }
}

function removeLandingStyles() {
  document.getElementById('landing-styles')?.remove();
}

import { supaClient } from './api/supa-client.js';
import { createAppRouter, setupSidebarNavigation, SIDEBAR_MAP } from './lib/router.js';
import { store } from './lib/store.js';
import * as Alfred from './views/Alfred.js';
import * as Trainer from './views/Trainer.js';
import * as Closer from './views/Closer.js';
import * as Knowledge from './views/Knowledge.js';
import * as Wellness from './views/Wellness.js';
import * as Copilot from './views/Copilot.js';
import * as Profile from './views/Profile.js';
import * as AdminUsers from './views/AdminUsers.js';
import * as AdminMetrics from './views/AdminMetrics.js';
import * as AdminAudit from './views/AdminAudit.js';
import * as AdminCompany from './views/AdminCompany.js';
import * as AdminInvitations from './views/AdminInvitations.js';
import * as AdminWhitelist from './views/AdminWhitelist.js';
import * as AdminKnowledge from './views/AdminKnowledge.js';
import * as Products from './views/Products.js';
import * as Clients from './views/Clients.js';
import { loadAdminData, getAdminData, setAdminTab, setAdminFilter } from './features/admin-data.js';
import { getDisplayName, adminInitials } from './lib/utils.js';
import { hasExpiredRecoveryLink, isPasswordRecoveryLocation, mapPasswordResetError } from './lib/passwordRecovery.js';
import { renderDashboardStats } from './components/StatCards.js';
import { renderWeeklyCalendarGrid, renderAdminWeeklyCalendarGrid } from './components/WeeklyCalendarGrid.js';
import * as TestLab from './views/TestLab.js';

// ── OpenAI White Theme (para /lab y toggle global) ──
function setOpenAITheme(on: boolean) {
  document.documentElement.classList.toggle('theme-openai', on);
  localStorage.setItem('gravity_openai_theme', on ? '1' : '0');
  // FIX: el dashboard interno sigue SIEMPRE al tema global (storage + evento para resync reactivo)
  localStorage.setItem('dashboard-theme', on ? 'light' : 'dark');
  window.dispatchEvent(new CustomEvent('gravity-theme-change', { detail: { on } }));
  const btn = document.getElementById('lab-theme-toggle');
  if (btn) { btn.textContent = on ? '◑ Gravity Dark' : '◐ OpenAI White'; }
}
function initOpenAITheme() {
  const saved = localStorage.getItem('gravity_openai_theme');
  // white por defecto en toda la app si no hay tema guardado
  const shouldOn = saved ? saved === '1' : true;
  setOpenAITheme(shouldOn);
  document.getElementById('lab-theme-toggle')?.addEventListener('click', () => {
    const isOn = document.documentElement.classList.contains('theme-openai');
    setOpenAITheme(!isOn);
  });
  // toggle global con ?theme=openai o ?theme=dark
  const params = new URLSearchParams(window.location.search);
  if (params.get('theme') === 'openai') { setOpenAITheme(true); }
  if (params.get('theme') === 'dark') { setOpenAITheme(false); }
}
initOpenAITheme();

(window as any).setAdminTab = setAdminTab;
(window as any).setAdminFilter = setAdminFilter;

(window as any).doLogout = async (e?: Event) => {
  if (e) { e.preventDefault(); }
  try {
    await supaClient.signOut();
    localStorage.removeItem('sb-nqaiuixiryqlcszikwgb-auth-token');
  } catch (err) {
    console.error("Error al cerrar sesión", err);
  }
  const r = (window as any).__router;
  if (r) { r.navigate('/'); } else { window.location.href = '/'; }
};

// ── Landing page features ──
async function checkActiveSession() {
  try {
    const { session } = await supaClient.getCurrentSession();
    if (session?.user) {
      const loginButton = document.querySelector('.nav-login') as HTMLElement;
      if (loginButton) { loginButton.textContent = 'VER PLATAFORMA'; }
    }
  } catch (err) {
    console.warn("Error checking active session:", err);
  }
}
checkActiveSession();

// ── Landing subpages (privacy, terms, contact) ──
const LANDING_SUBPAGES = ['view-request-demo', 'view-privacy', 'view-terms', 'view-contact'];

function hideLandingSubpages() {
  LANDING_SUBPAGES.forEach(sp => {
    const el = document.getElementById(sp);
    if (el) { el.classList.add('hidden'); }
  });
}

function showLandingSubpageInRouter(id: string, setup?: () => void) {
  ensureLandingStyles();
  document.getElementById('view-landing')?.classList.remove('hidden');
  const landingMain = document.querySelector('#view-landing > main') as HTMLElement;
  if (landingMain) { landingMain.style.display = 'none'; }
  hideLandingSubpages();
  document.getElementById(id)?.classList.remove('hidden');
  if (setup) { setup(); }
}

// ── Request Demo ──
function setupDemoForm() {
  const demoForm = document.getElementById('demo-form') as HTMLFormElement;
  const demoSpanSuccess = document.getElementById('demo-success');
  if (!demoForm) { return; }

  demoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(demoForm);
    const entries: string[] = [];
    formData.forEach((val, key) => { entries.push(`${key}: ${val}`); });
    const body = entries.join('\n') + '\n\n---\nSolicitud desde gravitysymbiosis.com';
    const mailto = `mailto:contacto@gravitysymbiosis.com?subject=${encodeURIComponent('Solicitud de Demo - Gravity Symbiosis')}&body=${encodeURIComponent(body)}`;
    demoForm.classList.add('hidden');
    if (demoSpanSuccess) { demoSpanSuccess.classList.remove('hidden'); }
    window.open(mailto, '_blank');
  });
}

// ── Contact ──
function setupContactForm() {
  const form = document.getElementById('contact-form') as HTMLFormElement;
  const success = document.getElementById('contact-success');
  if (!form) { return; }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const entries: string[] = [];
    data.forEach((val, key) => { entries.push(`${key}: ${val}`); });
    const body = entries.join('\n') + '\n\n---\nContacto desde gravitysymbiosis.com';
    const mailto = `mailto:contacto@gravitysymbiosis.com?subject=${encodeURIComponent('Contacto - Gravity Symbiosis')}&body=${encodeURIComponent(body)}`;
    form.classList.add('hidden');
    if (success) { success.classList.remove('hidden'); }
    window.open(mailto, '_blank');
  });
}

document.querySelectorAll('.how-step').forEach((step, i, steps) => {
  const stepContent = [
    { num: '01', title: 'EVALUACIÓN\nALFRED', desc: 'Alfred realiza una evaluación profunda del vendedor: habilidades blandas, conocimiento de producto, manejo de objeciones e historial de resultados.' },
    { num: '02', title: 'PLAN\nPERSONALIZADO', desc: 'Basado en la evaluación, Alfred genera un roadmap semanal de entrenamiento con módulos específicos.' },
    { num: '03', title: 'SIMULACIONES\nDIARIAS', desc: 'El Entrenador genera escenarios de venta reales por voz cada día.' },
    { num: '04', title: 'EJECUCIÓN\nCON SHADOW', desc: 'En llamadas reales, Shadow escucha en tiempo real y susurra al vendedor.' },
    { num: '05', title: 'MEJORA\nCONTINUA', desc: 'Después de cada interacción, Gravity analiza qué funcionó y qué no.' },
  ];
  step.addEventListener('click', () => {
    steps.forEach(s => s.classList.remove('active'));
    step.classList.add('active');
    const c = stepContent[i];
    const visualTitle = document.querySelector('.how-visual-title');
    const visualDesc = document.querySelector('.how-visual-desc');
    const visualBg = document.querySelector('.how-visual-bg');
    if (visualTitle) { visualTitle.textContent = c.title; }
    if (visualDesc) { visualDesc.textContent = c.desc; }
    if (visualBg) { visualBg.textContent = c.num; }
  });
});

const _cursor = document.getElementById('cursor');
const _ring = document.getElementById('cursor-ring');
const _landing = document.getElementById('view-landing');
function cursorVisible() { return _landing && !_landing.classList.contains('hidden'); }
if (_cursor && _ring) {
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (cursorVisible()) { _cursor.style.transform = `translate(${mx - 6}px, ${my - 6}px)`; }
  });
  (function animRing() {
    if (cursorVisible()) {
      rx += (mx - rx - 18) * 0.12;
      ry += (my - ry - 18) * 0.12;
      _ring.style.transform = `translate(${rx}px, ${ry}px)`;
    }
    requestAnimationFrame(animRing);
  })();
}
const _canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
if (_canvas) {
  const _ctx = _canvas.getContext('2d')!;
  let W: number, H: number;
  const _particles: any[] = [];
  function resize() { W = _canvas.width = window.innerWidth; H = _canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  class Particle {
    x!: number; y!: number; vx!: number; vy!: number; r!: number; a!: number; color!: string;
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W; this.y = Math.random() * H;
      this.vx = (Math.random() - .5) * .3; this.vy = (Math.random() - .5) * .3;
      this.r = Math.random() * 1.5; this.a = Math.random() * .5 + .1;
      this.color = Math.random() > .7 ? '#7c3aed' : '#8b5cf6';
    }
    update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) { this.reset(); } }
    draw() { _ctx.beginPath(); _ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); _ctx.fillStyle = this.color; _ctx.globalAlpha = this.a; _ctx.fill(); }
  }
  for (let i = 0; i < 180; i++) { _particles.push(new Particle()); }
  function drawConnections() {
    for (let i = 0; i < _particles.length; i++) {
      for (let j = i + 1; j < _particles.length; j++) {
        const dx = _particles[i].x - _particles[j].x, dy = _particles[i].y - _particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) { _ctx.beginPath(); _ctx.moveTo(_particles[i].x, _particles[i].y); _ctx.lineTo(_particles[j].x, _particles[j].y); _ctx.strokeStyle = '#8b5cf6'; _ctx.globalAlpha = (1 - dist / 100) * 0.06; _ctx.lineWidth = .5; _ctx.stroke(); }
      }
    }
  }
  function animCanvas() {
    if (cursorVisible()) {
      _ctx.clearRect(0, 0, W, H); _ctx.globalAlpha = 1;
      const grad = _ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .8);
      grad.addColorStop(0, 'rgba(139,92,246,0.03)'); grad.addColorStop(1, 'rgba(2,4,8,0)');
      _ctx.fillStyle = grad; _ctx.fillRect(0, 0, W, H);
      drawConnections(); _particles.forEach(p => { p.update(); p.draw(); }); _ctx.globalAlpha = 1;
    }
    requestAnimationFrame(animCanvas);
  }
  animCanvas();
  const _reveals = document.querySelectorAll('.reveal');
  const _observer = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); _observer.unobserve(e.target); } }); }, { threshold: 0.12 });
  _reveals.forEach(el => _observer.observe(el));
}

// ── Auth / Dashboard ──
document.addEventListener('DOMContentLoaded', async () => {
  // FIX: el dashboard interno sigue al tema global de la app. Antes arrancaba
  // 'dark' fijo y en tema claro los pills/inputs usaban superficies oscuras
  // translúcidas = gris sucio sobre blanco. El storage es escrito por
  // setOpenAITheme (incluye ?theme=... y el toggle del lab).
  // El botón "MODO OSCURO" del dashboard se eliminó (2026-10-14): era redundante.
  const dashboardTheme = localStorage.getItem('dashboard-theme') || 'light';
  const viewDashboard = document.getElementById('view-dashboard');
  const viewDashboardAdmin = document.getElementById('view-dashboard-admin');

  function updateDashboardThemeUI(isLight: boolean) {
    if (viewDashboard) { viewDashboard.classList.toggle('light', isLight); }
    if (viewDashboardAdmin) { viewDashboardAdmin.classList.toggle('light', isLight); }
  }

  updateDashboardThemeUI(dashboardTheme === 'light');

  window.addEventListener('gravity-theme-change', (e) => {
    updateDashboardThemeUI((e as CustomEvent).detail?.on !== false);
  });

  supaClient.startAuthListener();

  const authModal = document.getElementById('auth-modal')!;
  const appContainer = document.getElementById('app-container')!;
  const navItems = document.querySelectorAll('.nav-item');
  let currentUser: any = null;
  let currentProfile: any = null;

  const href = window.location.href;

  // RECOVERY (hash implicit, PKCE ?code=, or token_hash)
  if (isPasswordRecoveryLocation(href) && !hasExpiredRecoveryLink(href)) {
    document.getElementById("auth-modal")!.classList.remove("hidden");
    document.getElementById("login-panel")!.classList.add("hidden");
    document.getElementById("signup-panel")!.classList.add("hidden");
    document.getElementById("recovery-password-panel")!.classList.add("hidden");
    document.getElementById("reset-password-panel")!.classList.remove("hidden");
  }

  // OTP EXPIRED (hash implicit or query PKCE)
  if (hasExpiredRecoveryLink(href)) {
    const errorDiv = document.getElementById("recovery-password-error");
    if (errorDiv) {
      errorDiv.textContent = "El enlace expiró o no es válido. Solicita uno nuevo y ábrelo en el mismo navegador.";
      errorDiv.classList.remove("hidden");
    }
    window.history.replaceState(null, "", "/recovery-password");
  }

  // 1. LOGIN
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      const originalText = btn.textContent;
      btn.textContent = "Verificando...";
      btn.disabled = true;

      const email = (document.getElementById('login-email') as HTMLInputElement).value.trim().toLowerCase();
      const password = (document.getElementById('login-password') as HTMLInputElement).value;
      const errorDiv = document.getElementById('login-error')!;
      errorDiv.classList.add('hidden');

      try {
        const { data, error } = await supaClient.signIn(email, password);
        if (error) {
          errorDiv.textContent = error.message;
          errorDiv.classList.remove('hidden');
          if (error.message && (error.message.includes("Invalid login") || error.message.includes("not found"))) {
            errorDiv.innerHTML += '<br><div class="mt-2 text-sm">¿No tienes cuenta? <button type="button" class="text-primary hover:underline font-bold" onclick="document.getElementById(\'show-signup-link\').click()">Regístrate aquí</button></div>';
          }
          btn.textContent = originalText;
          btn.disabled = false;
        } else {
          handleSessionSuccess(data.session);
        }
      } catch (err) {
        console.error(err);
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  // 2. SIGNUP
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = signupForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      const originalText = btn.textContent;
      btn.textContent = "Creando Agente...";
      btn.disabled = true;

      const name = (document.getElementById('signup-name') as HTMLInputElement).value;
      const email = (document.getElementById('signup-email') as HTMLInputElement).value.trim().toLowerCase();
      const password = (document.getElementById('signup-password') as HTMLInputElement).value;
      const passwordConfirm = (document.getElementById('signup-password-confirm') as HTMLInputElement).value;

      const errorDiv = document.getElementById('signup-error')!;
      const successDiv = document.getElementById('signup-success')!;
      errorDiv.classList.add('hidden');
      successDiv.classList.add('hidden');

      if (password !== passwordConfirm) {
        errorDiv.textContent = "Las contraseñas no coinciden";
        errorDiv.classList.remove('hidden');
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      try {
        const { error } = await supaClient.signUp(email, password, name);
        if (error) { throw error; }
        successDiv.textContent = 'Te hemos enviado un correo de verificación al email que ingresaste.';
        successDiv.classList.remove('hidden');
        btn.textContent = originalText;
        btn.disabled = false;
      } catch (error: any) {
        console.error("Error signup:", error);
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  // 3. RECOVERY PASSWORD
  const recoveryPasswordForm = document.getElementById('recovery-password-form');
  if (recoveryPasswordForm) {
    recoveryPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = recoveryPasswordForm.querySelector('button[type="submit"]') as HTMLButtonElement;
      const originalText = btn.textContent;
      btn.textContent = "Enviando...";
      btn.disabled = true;
      const email = (document.getElementById('recovery-password-email') as HTMLInputElement).value.trim().toLowerCase();
      const errorDiv = document.getElementById('recovery-password-error')!;
      const successDiv = document.getElementById('recovery-password-success')!;
      errorDiv.classList.add('hidden');
      successDiv.classList.add('hidden');
      try {
        const { error } = await supaClient.sendPasswordResetEmail(email);
        if (error) { throw error; }
        successDiv.textContent = "Te enviamos un correo con instrucciones para restablecer tu contraseña.";
        successDiv.classList.remove('hidden');
      } catch (error: any) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  // 3. RESET PASSWORD
  let recoverySessionReady = false;
  const resetForm = document.getElementById("reset-password-form");
  const resetSubmitBtn = resetForm?.querySelector('button[type="submit"]') as HTMLButtonElement | null;

  async function prepareResetPassword() {
    showResetPasswordPanel();
    const errorDiv = document.getElementById("reset-password-error")!;
    const successDiv = document.getElementById("reset-password-success")!;
    errorDiv.classList.add("hidden");
    successDiv.classList.add("hidden");
    recoverySessionReady = false;
    if (resetSubmitBtn) {
      resetSubmitBtn.disabled = true;
      resetSubmitBtn.textContent = "Verificando enlace...";
    }
    const { session, error } = await supaClient.establishRecoverySession();
    if (!session) {
      errorDiv.textContent = mapPasswordResetError(error?.message || "Auth session missing");
      errorDiv.classList.remove("hidden");
      if (resetSubmitBtn) {
        resetSubmitBtn.disabled = true;
        resetSubmitBtn.textContent = "CAMBIAR CONTRASEÑA";
      }
      return;
    }
    recoverySessionReady = true;
    if (resetSubmitBtn) {
      resetSubmitBtn.disabled = false;
      resetSubmitBtn.textContent = "CAMBIAR CONTRASEÑA";
    }
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorDiv = document.getElementById("reset-password-error")!;
      const successDiv = document.getElementById("reset-password-success")!;
      errorDiv.classList.add("hidden");
      successDiv.classList.add("hidden");

      if (!recoverySessionReady) {
        await prepareResetPassword();
        if (!recoverySessionReady) { return; }
      }

      const password = (document.getElementById("reset-password-input") as HTMLInputElement).value;
      if (resetSubmitBtn) {
        resetSubmitBtn.disabled = true;
        resetSubmitBtn.textContent = "Guardando...";
      }
      const { error } = await supaClient.updatePassword(password);
      if (error) {
        errorDiv.textContent = mapPasswordResetError(error.message);
        errorDiv.classList.remove("hidden");
        if (resetSubmitBtn) {
          resetSubmitBtn.disabled = false;
          resetSubmitBtn.textContent = "CAMBIAR CONTRASEÑA";
        }
        return;
      }
      successDiv.textContent = "Contraseña actualizada correctamente. Redirigiendo al inicio de sesión...";
      successDiv.classList.remove("hidden");
      await supaClient.signOut();
      window.setTimeout(() => {
        window.history.replaceState(null, "", "/login");
        updateAuthPanelFromPath();
      }, 1500);
    });
  }

  // 5. LOGOUT
  document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await supaClient.signOut();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
    const r = (window as any).__router;
    if (r) { r.navigate('/'); } else { window.location.href = '/'; }
  });

  // 6. TUTORIAL MODAL
  document.addEventListener('click', (e) => {
    const tutorialBtn = (e.target as HTMLElement).closest('#tutorial-btn');
    const closeTutorialBtn = (e.target as HTMLElement).closest('#close-tutorial-modal');
    const tutorialModal = document.getElementById('tutorial-modal');
    const tutorialIframe = document.getElementById('tutorial-video') as HTMLIFrameElement;

    if (tutorialBtn && tutorialModal) {
      tutorialModal.classList.remove('hidden');
      tutorialModal.classList.add('flex');
    }

    if (closeTutorialBtn && tutorialModal) {
      tutorialModal.classList.add('hidden');
      tutorialModal.classList.remove('flex');
      if (tutorialIframe) {
        const src = tutorialIframe.src;
        tutorialIframe.src = '';
        tutorialIframe.src = src;
      }
    }
  });

  document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.addEventListener("click", () => {
      const wrapper = (btn as HTMLElement).closest(".relative")!;
      const input = wrapper.querySelector(".input") as HTMLInputElement;
      const openIcon = wrapper.querySelector(".eye-open") as HTMLElement;
      const closedIcon = wrapper.querySelector(".eye-closed") as HTMLElement;
      if (input.type === "password") {
        input.type = "text";
        openIcon.classList.remove("hidden");
        closedIcon.classList.add("hidden");
      } else {
        input.type = "password";
        openIcon.classList.add("hidden");
        closedIcon.classList.remove("hidden");
      }
    });
  });

  const signupToggle = document.getElementById('show-signup-link');
  const loginToggle = document.getElementById('show-login-link');
  const recoveryLoginToggle = document.getElementById('show-recovery-login-link');
  const recovyPasswordToggle = document.getElementById('show-recovery-password-link');
  const resetRecoveryToggle = document.getElementById('show-reset-recovery-link');

  function navigateAuth(path: string) {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
      updateAuthPanelFromPath();
    }
  }

  if (signupToggle) { signupToggle.addEventListener('click', (e) => { e.preventDefault(); navigateAuth('/register'); }); }
  if (recovyPasswordToggle) { recovyPasswordToggle.addEventListener('click', (e) => { e.preventDefault(); navigateAuth('/recovery-password'); }); }
  if (loginToggle) { loginToggle.addEventListener('click', (e) => { e.preventDefault(); navigateAuth('/login'); }); }
  if (recoveryLoginToggle) { recoveryLoginToggle.addEventListener('click', (e) => { e.preventDefault(); navigateAuth('/login'); }); }
  if (resetRecoveryToggle) { resetRecoveryToggle.addEventListener('click', (e) => { e.preventDefault(); navigateAuth('/recovery-password'); }); }

  function updateAuthPanelFromPath() {
    if (currentUser) { return; }
    const path = window.location.pathname;
    const loginPanel = document.getElementById('login-panel');
    const signupPanel = document.getElementById('signup-panel');
    const recoveryPanel = document.getElementById('recovery-password-panel');
    const resetPanel = document.getElementById('reset-password-panel');
    if (!loginPanel || !signupPanel || !recoveryPanel || !resetPanel) { return; }
    loginPanel.classList.add('hidden');
    signupPanel.classList.add('hidden');
    recoveryPanel.classList.add('hidden');
    resetPanel.classList.add('hidden');
    if (isPasswordRecoveryLocation(window.location.href) && !hasExpiredRecoveryLink(window.location.href)) { resetPanel.classList.remove('hidden'); }
    else if (path === '/register') { signupPanel.classList.remove('hidden'); }
    else if (path === '/recovery-password') { recoveryPanel.classList.remove('hidden'); }
    else if (path === '/reset-password') { resetPanel.classList.remove('hidden'); }
    else { loginPanel.classList.remove('hidden'); }
  }

  window.addEventListener('popstate', updateAuthPanelFromPath);
  await initApp();

  async function initApp() {
    const loader = document.getElementById("app-loader")!;
    const path = window.location.pathname;
    // ── LAB: bypass total de auth si es /lab/* ──
    if (TestLab.isLabPath(path)) {
      // mock session para que el interior no pida login
      store.currentUser = TestLab.MOCK_USER as any;
      store.currentProfile = TestLab.MOCK_PROFILE as any;
      currentUser = TestLab.MOCK_USER as any;
      currentProfile = TestLab.MOCK_PROFILE as any;
      await handleTestSession(path);
      loader.style.display = "none";
      return;
    }
    const isLanding = path === '/' || path === '';
    const isAuthPath = ['/login', '/register', '/recovery-password', '/reset-password'].includes(path);

    const SUBPAGE_MAP: Record<string, { id: string; setup?: () => void }> = {
      '/request-demo': { id: 'view-request-demo', setup: setupDemoForm },
      '/privacy': { id: 'view-privacy' },
      '/terms': { id: 'view-terms' },
      '/contact': { id: 'view-contact', setup: setupContactForm },
    };

    function showSubpage(subpath: string) {
      const entry = SUBPAGE_MAP[subpath];
      if (!entry) { return; }
      ensureLandingStyles();
      document.getElementById('view-landing')?.classList.remove('hidden');
      const landingMain = document.querySelector('#view-landing > main') as HTMLElement;
      if (landingMain) { landingMain.style.display = 'none'; }
      hideLandingSubpages();
      document.getElementById(entry.id)?.classList.remove('hidden');
      authModal.classList.add('hidden');
      appContainer.classList.add('hidden');
      if (entry.setup) { entry.setup(); }
    }

    try {
      const isRecovery = isPasswordRecoveryLocation(window.location.href) && !hasExpiredRecoveryLink(window.location.href);
      const { session } = await supaClient.getCurrentSession();
      if (SUBPAGE_MAP[path]) {
        showSubpage(path);
      } else if (isRecovery || path === '/reset-password') { await prepareResetPassword(); }
      else if (isLanding && !session) {
        ensureLandingStyles();
        document.getElementById('view-landing')?.classList.remove('hidden');
        hideLandingSubpages();
        const landingMain = document.querySelector('#view-landing > main') as HTMLElement;
        if (landingMain) { landingMain.style.display = ''; }
        authModal.classList.add('hidden');
        appContainer.classList.add('hidden');
      } else if (session && !isAuthPath) { handleSessionSuccess(session); }
      else { showAuthModal(); }
    } catch (err) {
      console.warn("Error de conexión inicial:", err);
      if (SUBPAGE_MAP[path]) {
        showSubpage(path);
      } else if (isLanding) {
        ensureLandingStyles();
        document.getElementById('view-landing')?.classList.remove('hidden');
        hideLandingSubpages();
        const landingMain = document.querySelector('#view-landing > main') as HTMLElement;
        if (landingMain) { landingMain.style.display = ''; }
        authModal.classList.add('hidden');
        appContainer.classList.add('hidden');
      } else { showAuthModal(); }
    }
    loader.style.display = "none";
  }

  function showResetPasswordPanel() {
    removeLandingStyles();
    document.getElementById('view-landing')?.classList.add('hidden');
    hideLandingSubpages();
    appContainer.classList.add('hidden');
    authModal.classList.remove('hidden');
    document.getElementById('login-panel')!.classList.add('hidden');
    document.getElementById('signup-panel')!.classList.add('hidden');
    document.getElementById('recovery-password-panel')!.classList.add('hidden');
    document.getElementById('reset-password-panel')!.classList.remove('hidden');
  }

  async function handleTestSession(initialPath: string) {
    const viewCtx = {
      store, supaClient,
      startTrainingTimer, stopTrainingTimer, finishTrainingSession: stopTrainingTimer,
      recordInteractionStart, recordInteractionEnd, updateDashboardInfo,
    };
    const banner = document.getElementById('lab-banner');
    const showBanner = (show: boolean) => { if (banner) {banner.classList.toggle('hidden', !show);} };

    const router = createAppRouter({
      defaultRoute: '/lab/dashboard',
      async onRouteChange(route: any) {
        // lab login
        if (route.path === '/lab' || route.path === '/lab/login') {
          removeLandingStyles();
          document.getElementById('view-landing')?.classList.add('hidden');
          hideLandingSubpages();
          authModal.classList.add('hidden');
          appContainer.classList.add('hidden');
          showBanner(false);
          TestLab.setupTestLogin(router);
          return;
        }
        // lab interior -> muestra app-container con vistas reales pero sin auth
        if (route.path.startsWith('/lab/')) {
          removeLandingStyles();
          document.getElementById('view-landing')?.classList.add('hidden');
          hideLandingSubpages();
          authModal.classList.add('hidden');
          appContainer.classList.remove('hidden');
          showBanner(true);
          // activa item del sidebar mapeando /lab/* a ruta real
          navItems.forEach(nav => nav.classList.remove('active'));
          const realPath = route.path.replace('/lab', '') || '/dashboard';
          const entry = Object.entries(SIDEBAR_MAP).find(([, v]) => v === realPath);
          if (entry) {document.querySelector(`.nav-item[data-target="${entry[0]}"]`)?.classList.add('active');}
          if (route.path !== '/lab/entrenador' && typeof stopTrainingTimer === 'function') { await stopTrainingTimer(); }
          Wellness.cleanup();
          if (window.innerWidth <= 768) {document.querySelector('.sidebar')?.classList.remove('open');}
          return;
        }
        // fallback normal
        removeLandingStyles();
        appContainer.classList.remove('hidden');
        authModal.classList.add('hidden');
        showBanner(false);
      },
      onTestLogin() { TestLab.setupTestLogin(router); },
      onTestDashboard() {
        // mock dashboard sin llamar supabase
        document.getElementById('view-dashboard')?.classList.remove('hidden');
        document.getElementById('view-dashboard-admin')?.classList.add('hidden');
        // intenta init real pero con mock data
        try { initUserWeeklyDashboard(); } catch { /* lab sin datos */ }
      },
      onTestTrainer() { startTrainingTimer(); Trainer.init(viewCtx); },
      onTestCloser() { Closer.init(); },
      onTestKnowledge() { Knowledge.init(); },
      onTestCopilot() { Copilot.init(); },
      onTestWellness() { Wellness.init(); },
      onTestProfile() { Profile.init(); },
      onTestClients() { Clients.init(); },
      onTestProducts() { Products.init(); },
      // stubs para que no falle el dashboard
      onLanding() {}, onDashboard() {}, onAlfred() { Alfred.init(); }, onTrainer() { startTrainingTimer(); Trainer.init(viewCtx); },
      onCloser() { Closer.init(); }, onClients() { Clients.init(); }, onProducts() { Products.init(); },
      onKnowledge() { Knowledge.init(); }, onCopilot() { Copilot.init(); }, onWellness() { Wellness.init(); },
      onProfile() { Profile.init(); }, onResetPassword() {}, onAdminDashboard() {}, onAdminUsers() {}, onAdminMetrics() {},
      onAdminAudit() {}, onAdminCompany() {}, onAdminInvitations() {}, onAdminWhitelist() {}, onAdminKnowledge() {},
      onRequestDemo() { showLandingSubpageInRouter('view-request-demo', setupDemoForm); },
      onPrivacy() { showLandingSubpageInRouter('view-privacy'); },
      onTerms() { showLandingSubpageInRouter('view-terms'); },
      onContact() { showLandingSubpageInRouter('view-contact', setupContactForm); },
    });
    (window as any).__router = router;
    setupSidebarNavigation(router);
    // intercepta clicks del sidebar para que /dashboard vaya a /lab/dashboard cuando está en lab
    document.querySelectorAll('.nav-item[data-target]').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!window.location.pathname.startsWith('/lab')) {return;}
        e.preventDefault(); e.stopImmediatePropagation();
        const target = (item as HTMLElement).dataset.target;
        const real = SIDEBAR_MAP[target!];
        if (real) {router.navigate('/lab' + real);}
      }, true);
    });
    removeLandingStyles();
    document.getElementById('view-landing')?.classList.add('hidden');
    hideLandingSubpages();
    authModal.classList.add('hidden');
    // hidrata UI con mock
    updateUserProfileUI(TestLab.MOCK_PROFILE as any);
    const labNameEl = document.getElementById('user-display-name');
    if (labNameEl) { labNameEl.textContent = 'Tester Lab (sin permisos)'; }
    const labRoleEl = document.getElementById('user-role-badge');
    if (labRoleEl) { labRoleEl.textContent = 'MODO LABORATORIO'; }
    if (initialPath === '/lab' || initialPath === '/lab/login') {
      appContainer.classList.add('hidden');
      showBanner(false);
    } else {
      appContainer.classList.remove('hidden');
      showBanner(true);
    }
    router.refresh();
  }

  async function handleSessionSuccess(session: any) {
    if (!session?.user) { return; }
    currentUser = session.user;
    store.currentUser = currentUser;

    const { data: profile, error } = await supaClient.getProfile(currentUser.id);
    if (error) { console.error("Error obteniendo perfil:", error); }
    currentProfile = profile || { email: currentUser.email, role: "user" };
    store.currentProfile = currentProfile;

    const viewCtx: {
      store: typeof store;
      supaClient: typeof supaClient;
      startTrainingTimer: () => void;
      stopTrainingTimer: () => Promise<void>;
      finishTrainingSession: () => Promise<void>;
      recordInteractionStart: () => void;
      recordInteractionEnd: () => void;
      updateDashboardInfo: () => Promise<void>;
    } = {
      store, supaClient,
      startTrainingTimer, stopTrainingTimer, finishTrainingSession: stopTrainingTimer,
      recordInteractionStart, recordInteractionEnd, updateDashboardInfo,
    };

    const router = createAppRouter({
      defaultRoute: '/dashboard',
      async onRouteChange(route: any) {
        const authRoutes = ['/login', '/register', '/recovery-password', '/reset-password'];
        navItems.forEach(nav => nav.classList.remove('active'));
        if (route.path === '/') {
          ensureLandingStyles();
          document.getElementById('view-landing')?.classList.remove('hidden');
          hideLandingSubpages();
          const landingMain = document.querySelector('#view-landing > main') as HTMLElement;
          if (landingMain) { landingMain.style.display = ''; }
          authModal.classList.add('hidden');
          appContainer.classList.add('hidden');
          const hash = window.location.hash;
          if (hash) {
            setTimeout(() => {
              const el = document.querySelector(hash);
              if (el) { el.scrollIntoView({ behavior: 'smooth' }); }
            }, 100);
          }
          const dashboardBtn = document.getElementById('landing-dashboard-btn');
          if (dashboardBtn) {
            dashboardBtn.classList.toggle('hidden', !currentUser);
            const loginLink = document.querySelector('.nav-login:not(#landing-dashboard-btn)');
            if (loginLink) { loginLink.classList.toggle('hidden', !!currentUser); }
          }
          return;
        }
        if (authRoutes.includes(route.path)) {
          ensureLandingStyles();
          document.getElementById('view-landing')?.classList.remove('hidden');
          authModal.classList.remove('hidden');
          appContainer.classList.add('hidden');
          updateAuthPanelFromPath();
          return;
        }
        const landingSubpages = ['/request-demo', '/privacy', '/terms', '/contact'];
        if (landingSubpages.includes(route.path)) {
          ensureLandingStyles();
          return;
        }
        removeLandingStyles();
        appContainer.classList.remove('hidden');
        authModal.classList.add('hidden');
        const entry = Object.entries(SIDEBAR_MAP).find(([, v]) => v === route.path);
        if (entry) {
          const navItem = document.querySelector(`.nav-item[data-target="${entry[0]}"]`);
          if (navItem) { navItem.classList.add('active'); }
        }
        if (route.path !== '/entrenador' && typeof stopTrainingTimer === 'function') { await stopTrainingTimer(); }
        Wellness.cleanup();
        if (window.innerWidth <= 768) { document.querySelector('.sidebar')?.classList.remove('open'); }
      },
      onLanding() { },
      onDashboard(_: any, navToken?: number) {
        const isAdmin = currentProfile && ['admin', 'super_admin'].includes(currentProfile.role);
        if (isAdmin) {
          document.getElementById('view-dashboard')?.classList.add('hidden');
          document.getElementById('view-dashboard-admin')?.classList.remove('hidden');
          initAdminWeeklyDashboard(navToken);
        } else {
          initUserWeeklyDashboard(navToken);
        }
      },
      onAlfred() { Alfred.init(); },
      onTrainer() { startTrainingTimer(); Trainer.init(viewCtx); },
      onCloser() { Closer.init(); },
      onClients() { Clients.init(); },
      onProducts() { Products.init(); },
      onKnowledge() { Knowledge.init(); },
      onCopilot() { Copilot.init(); },
      onWellness() { Wellness.init(); },
      onProfile() { Profile.init(); },
      onResetPassword() {
        void prepareResetPassword();
      },
      onAdminDashboard() { AdminMetrics.init(); },
      onAdminUsers() { AdminUsers.init(); },
      onAdminMetrics() { AdminMetrics.init(); },
      onAdminAudit() { AdminAudit.init(); },
      onAdminCompany() { AdminCompany.init(); },
      onAdminInvitations() { AdminInvitations.init(); },
      onAdminWhitelist() { AdminWhitelist.init(); },
      onAdminKnowledge() { AdminKnowledge.init(); },
      onRequestDemo() { showLandingSubpageInRouter('view-request-demo', setupDemoForm); },
      onPrivacy() { showLandingSubpageInRouter('view-privacy'); },
      onTerms() { showLandingSubpageInRouter('view-terms'); },
      onContact() { showLandingSubpageInRouter('view-contact', setupContactForm); },
    });
    (window as any).__router = router;
    setupSidebarNavigation(router);

    removeLandingStyles();
    document.getElementById('view-landing')?.classList.add('hidden');
    hideLandingSubpages();
    authModal.classList.add("hidden");

    const currentPath = window.location.pathname;
    const isSubpage = ['/request-demo', '/privacy', '/terms', '/contact'].includes(currentPath);
    if (!isSubpage) {
      appContainer.classList.remove("hidden");
    }

    if (['/login', '/signup', '/register', '/recover-password', '/reset-password', '/recovery-password'].includes(currentPath)) {
      router.navigate('/dashboard');
    } else {
      router.refresh();
    }

    updateUserProfileUI(currentProfile);
    supaClient.recordDailyLogin(currentUser.id).catch(console.error);
  }

  function updateUserProfileUI(profile: any) {
    const name = profile.email || currentUser.email;
    const isAdmin = ['admin', 'super_admin'].includes(profile.role);
    const role = isAdmin ? 'ADMINISTRADOR' : 'AGENTE';
    const initial = name.charAt(0).toUpperCase();

    const nameEl = document.getElementById('user-display-name');
    if (nameEl) { nameEl.textContent = name; }
    const roleEl = document.getElementById('user-role-badge');
    if (roleEl) { roleEl.textContent = role; }
    const initialEl = document.getElementById('user-avatar-initial');
    if (initialEl) { initialEl.textContent = initial; }

    const avatarImg = document.getElementById('user-avatar-img') as HTMLImageElement;
    if (profile.avatar_url && avatarImg) {
      avatarImg.src = profile.avatar_url;
      avatarImg.classList.remove('hidden');
      if (initialEl) { initialEl.classList.add('hidden'); }
    }

    if (isAdmin) {
      document.getElementById('admin-nav-section')!.classList.remove('hidden');
    }

    if (profile.role === 'super_admin') {
      // Super admin: show dedicated super-admin section, hide regular admin section
      document.getElementById('admin-nav-section')!.classList.add('hidden');
      document.getElementById('superadmin-nav-section')!.classList.remove('hidden');

      // Hide all training/sales modules — super_admin only manages the platform
      const targetsToHide = ['alfred', 'trainer', 'closer', 'knowledge', 'copilot', 'wellness'];
      targetsToHide.forEach(target => {
        const item = document.querySelector(`.nav-item[data-target="${target}"]`);
        if (item) { item.classList.add('hidden'); }
      });
    }
  }

  function showAuthModal() {
    removeLandingStyles();
    document.getElementById('view-landing')?.classList.add('hidden');
    hideLandingSubpages();
    appContainer.classList.add('hidden');
    authModal.classList.remove('hidden');
    const path = window.location.pathname;
    if (!path || path === '/' || path === '' || path === '/dashboard' || path === '/dashboard/') {
      window.history.pushState(null, '', '/login');
      updateAuthPanelFromPath();
    } else { updateAuthPanelFromPath(); }
  }

  // Sidebar Toggle — fluido, no estático, con icono que rota (topbar + header + colapsado)
  const sidebarToggleBtn = document.getElementById('sidebar-toggle') as HTMLButtonElement | null;
  const sidebarHeaderBtn = document.getElementById('sidebar-toggle-header') as HTMLButtonElement | null;
  const sidebarCollapsedBtn = document.getElementById('sidebar-toggle-collapsed') as HTMLButtonElement | null;
  const sidebarEl = document.querySelector('.sidebar') as HTMLElement | null;
  const allToggleBtns = [sidebarToggleBtn, sidebarHeaderBtn, sidebarCollapsedBtn].filter(Boolean) as HTMLButtonElement[];
  if (sidebarEl && allToggleBtns.length) {
    // restaura estado guardado
    const savedCollapsed = localStorage.getItem('gravity_sidebar_collapsed') === '1';
    if (savedCollapsed && window.innerWidth > 768) {
      sidebarEl.classList.add('collapsed');
      allToggleBtns.forEach(b => b.classList.add('is-collapsed'));
    }
    // click + touch
    const toggleSidebar = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        sidebarEl.classList.toggle('open');
      } else {
        const isCollapsed = sidebarEl.classList.toggle('collapsed');
        allToggleBtns.forEach(b => b.classList.toggle('is-collapsed', isCollapsed));
        localStorage.setItem('gravity_sidebar_collapsed', isCollapsed ? '1' : '0');
        // fuerza reflow para que la transición no se sienta estática
        sidebarEl.getBoundingClientRect();
      }
    };
    allToggleBtns.forEach(btn => {
      btn.addEventListener('click', toggleSidebar);
      btn.addEventListener('touchend', toggleSidebar, { passive: false });
    });
    // FIX: limpia/reaplica .collapsed al cambiar entre desktop y móvil (rotación o resize de ventana)
    window.addEventListener('resize', () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        sidebarEl.classList.remove('open');
        sidebarEl.classList.remove('collapsed');
        allToggleBtns.forEach(b => b.classList.remove('is-collapsed'));
      } else if (localStorage.getItem('gravity_sidebar_collapsed') === '1') {
        sidebarEl.classList.add('collapsed');
        allToggleBtns.forEach(b => b.classList.add('is-collapsed'));
      }
    });
    // también permite cerrar con click fuera en móvil
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebarEl.classList.contains('open')) {
        const target = e.target as HTMLElement;
        const isToggle = allToggleBtns.some(b => b.contains(target));
        if (!sidebarEl.contains(target) && !isToggle) {
          sidebarEl.classList.remove('open');
        }
      }
    });
  } else {
    console.warn('sidebar o toggle no encontrado');
  }

  document.getElementById('sidebar-close')?.addEventListener('click', () => {
    document.querySelector('.sidebar')!.classList.remove('open');
  });

  const viewToggleBtn = document.getElementById('view-toggle-btn');
  if (viewToggleBtn) {
    viewToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileView();
    });
  }

  function toggleMobileView() {
    const isMobile = document.body.classList.toggle('is-mobile-view');
    const toggleText = document.getElementById('view-toggle-text');
    const mobileIcon = document.getElementById('toggle-icon-mobile');
    const desktopIcon = document.getElementById('toggle-icon-desktop');
    if (toggleText) { toggleText.textContent = isMobile ? "Switch to Desktop" : "Switch to Mobile"; }
    if (mobileIcon) {
      if (isMobile) { mobileIcon.classList.add('opacity-0'); } else { mobileIcon.classList.remove('opacity-0'); }
    }
    if (desktopIcon) {
      if (isMobile) { desktopIcon.classList.remove('opacity-0'); } else { desktopIcon.classList.add('opacity-0'); }
    }
    document.querySelector('.sidebar')?.classList.remove('open');
    window.dispatchEvent(new Event('resize'));
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('is-mobile-view')) { toggleMobileView(); }
  });

  window.addEventListener('click', (e) => {
    if (document.body.classList.contains('is-mobile-view') && e.target === document.body) { toggleMobileView(); }
  });

  // Heartbeat timer
  let hbInterval: number | null = null;
  let hbCount = 60;
  const hbStartBtn = document.getElementById('heartbeat-start-btn') as HTMLButtonElement;
  if (hbStartBtn) {
    hbStartBtn.addEventListener('click', () => {
      if (hbInterval) { clearInterval(hbInterval); }
      hbCount = 60;
      updateHb(hbCount);
      hbStartBtn.disabled = true;
      hbInterval = window.setInterval(() => {
        hbCount--;
        updateHb(hbCount);
        if (hbCount <= 0) {
          clearInterval(hbInterval!);
          hbStartBtn.disabled = false;
          alert("Tiempo completado.");
        }
      }, 1000);
    });
    document.getElementById('heartbeat-reset-btn')!.addEventListener('click', () => {
      clearInterval(hbInterval!);
      hbCount = 60;
      updateHb(hbCount);
      hbStartBtn.disabled = false;
    });
  }
  function updateHb(val: number) {
    const el = document.getElementById('heartbeat-timer');
    if (el) { el.textContent = String(val); }
  }

  // ACHIEVEMENTS
  const ACHIEVEMENTS_CATALOG = [
    { id: 'first_training', name: 'ZONA DE INICIO', desc: 'Completaste tu primer entrenamiento.', icon: '⚡', points: 60, type: 'all-time' },
    { id: 'closer_novice', name: 'OJO DE HALCÓN', desc: 'Realizaste 5 análisis en Closer Elite.', icon: '🎯', points: 100, type: 'all-time' },
    { id: 'streak_3', name: 'CONSISTENCIA BRONCE', desc: 'Manten una racha de 3 días.', icon: '🥉', points: 150, type: 'personal' },
    { id: 'zen_master', name: 'ZEN MASTER', desc: 'Completaste una sesión de respiración.', icon: '🧘', points: 50, type: 'personal' },
    { id: 'voss_disciple', name: 'DISCÍPULO DE VOSS', desc: 'Dominaste el módulo de Chris Voss.', icon: '👤', points: 200, type: 'annual' },
    { id: 'wolf_path', name: 'CAMINO DEL LOBO', desc: 'Completaste 100% el módulo de Belfort.', icon: '🐺', points: 200, type: 'annual' },
    { id: 'power_lawyer', name: 'OPERADOR DE PODER', desc: 'Finalizaste las 48 Leyes del Poder.', icon: '👑', points: 300, type: 'annual' },
    { id: 'night_owl', name: 'OPERACIÓN NOCTURNA', desc: 'Entrenaste después de la medianoche.', icon: '🌙', points: 80, type: 'personal' }
  ];

  const unlockedAchievements: string[] = JSON.parse(localStorage.getItem('gravity_unlocked_achievements') || '[]');
  let trainingInterval: number | null = null;
  let totalTrainingSec = 0;
  let currentInteractionStart: number | null = null;
  let sessionStartedAt: string | null = null; // ponytail: hora real de inicio, no de cierre

  function initAchievements() {
    const grid = document.getElementById('achievements-catalog-grid');
    if (!grid) { return; }
    renderAchievements('all-time');
    document.getElementById('filter-all-time')?.addEventListener('click', () => renderAchievements('all-time'));
    document.getElementById('filter-annual')?.addEventListener('click', () => renderAchievements('annual'));
    document.getElementById('filter-personal')?.addEventListener('click', () => renderAchievements('personal'));
  }

  function renderAchievements(filterType: string) {
    const grid = document.getElementById('achievements-catalog-grid');
    if (!grid) { return; }
    ['filter-all-time', 'filter-annual', 'filter-personal'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) { return; }
      if (id.includes(filterType)) {
        btn.className = "px-5 py-2 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20";
      } else {
        btn.className = "px-5 py-2 rounded-full bg-transparent text-gray-300 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all";
      }
    });

    const filtered = ACHIEVEMENTS_CATALOG.filter(a => a.type === filterType);
    grid.innerHTML = filtered.map(item => {
      const isUnlocked = unlockedAchievements.includes(item.id);
      return `
        <div class="flex flex-col items-center justify-center p-6 border ${isUnlocked ? 'border-primary/40 bg-primary/5' : 'border-white/5 opacity-60 grayscale'} rounded-[2.5rem] transition-all hover:scale-105 group relative overflow-hidden">
          ${isUnlocked ? '<div class="absolute inset-0 bg-primary/5 animate-pulse"></div>' : ''}
          <div class="w-16 h-16 rounded-full ${isUnlocked ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400'} flex items-center justify-center text-3xl mb-4 relative z-10">
            ${item.icon}
          </div>
          <p class="text-[10px] font-black text-white text-center uppercase tracking-widest mb-1 relative z-10">${item.name}</p>
          <p class="text-[8px] text-gray-300 text-center uppercase font-bold relative z-10">${isUnlocked ? 'DESBLOQUEADO' : 'BLOQUEADO'}</p>
          ${isUnlocked ? `<div class="mt-3 px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-black text-primary relative z-10">+${item.points} PTS</div>` : ''}
        </div>`;
    }).join('');
  }

  function unlockAchievement(id: string) {
    if (unlockedAchievements.includes(id)) { return; }
    const achievement = ACHIEVEMENTS_CATALOG.find(a => a.id === id);
    if (!achievement) { return; }
    unlockedAchievements.push(id);
    localStorage.setItem('gravity_unlocked_achievements', JSON.stringify(unlockedAchievements));

    const toast = document.getElementById('achievement-toast')!;
    const name = document.getElementById('toast-achievement-name')!;
    const desc = document.getElementById('toast-achievement-desc')!;
    const pts = document.getElementById('toast-achievement-points')!;
    if (toast && name && desc && pts) {
      name.textContent = achievement.name;
      desc.textContent = achievement.desc;
      pts.textContent = `+${achievement.points} PTS`;
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-10');
        setTimeout(() => {
          toast.classList.add('hidden');
          toast.classList.remove('animate-out', 'fade-out', 'slide-out-to-bottom-10');
        }, 700);
      }, 5000);
    }
    updateDashboardInfo();
  }

  // TRAINING TIMER
  function updateClockDisplay() {
    const clock = document.getElementById('training-active-clock');
    if (!clock) { return; }
    const current = currentInteractionStart ? Math.floor((Date.now() - currentInteractionStart) / 1000) : 0;
    const total = totalTrainingSec + current;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (total >= 60) { unlockAchievement('first_training'); }
  }

  function startTrainingTimer() {
    if (trainingInterval) { return; }
    totalTrainingSec = 0;
    currentInteractionStart = null;
    sessionStartedAt = new Date().toISOString(); // capturar inicio real
    const overlay = document.getElementById('training-timer-overlay')!;
    const clock = document.getElementById('training-active-clock');
    const startBtn = document.getElementById('training-timer-start-btn') as HTMLButtonElement;
    const dot = document.getElementById('training-status-dot');

    if (overlay) {
      overlay.classList.remove('opacity-0', 'pointer-events-none', 'scale-90');
      overlay.classList.add('opacity-100', 'scale-100');
    }
    if (clock) { clock.textContent = "00:00:00"; }
    if (startBtn) { startBtn.classList.add('hidden'); }
    if (dot) { dot.classList.add('bg-red-500', 'animate-pulse'); }

    trainingInterval = window.setInterval(updateClockDisplay, 1000);
  }

  function recordInteractionStart() {
    if (!trainingInterval) { startTrainingTimer(); }
    if (currentInteractionStart) { return; }
    currentInteractionStart = Date.now();
    updateClockDisplay();
  }

  function recordInteractionEnd() {
    if (!currentInteractionStart) { return; }
    totalTrainingSec += Math.floor((Date.now() - currentInteractionStart) / 1000);
    currentInteractionStart = null;
    updateClockDisplay();

    localStorage.setItem('gravity_total_minutes', String(Math.floor(totalTrainingSec / 60)));
  }

  async function stopTrainingTimer() {
    if (trainingInterval) {
      clearInterval(trainingInterval);
      trainingInterval = null;
    }
    if (currentInteractionStart) {
      totalTrainingSec += Math.floor((Date.now() - currentInteractionStart) / 1000);
      currentInteractionStart = null;
    }

    if (currentUser && supaClient && supaClient.saveSession && totalTrainingSec > 0) {
      const durationSec = Math.max(60, totalTrainingSec);
      const endedAt = new Date().toISOString();
      try {
        await supaClient.saveSession({
          user_id: currentUser.id,
          started_at: sessionStartedAt || endedAt, // hora real de inicio
          ended_at: endedAt,
          duration_sec: durationSec
        });
      } catch (err) {
        console.error("Error guardando sesión de entrenamiento", err);
      }
      sessionStartedAt = null;
    }

    localStorage.setItem('gravity_total_minutes', String(Math.floor(totalTrainingSec / 60)));

    totalTrainingSec = 0;

    const overlay = document.getElementById('training-timer-overlay')!;
    const dot = document.getElementById('training-status-dot');
    if (overlay) {
      overlay.classList.remove('opacity-100', 'scale-100');
      overlay.classList.add('opacity-0', 'pointer-events-none', 'scale-90');
    }
    if (dot) { dot.classList.remove('bg-red-500', 'animate-pulse'); }
    await updateDashboardInfo();
  }

  window.addEventListener('pagehide', () => { void stopTrainingTimer(); });

  // DASHBOARD DATA SYNC
  async function updateDashboardInfo() {
    const totalPuntosEl = document.getElementById('dash-total-puntos');
    const currentStreakEl = document.getElementById('dash-current-streak');
    const maxStreakEl = document.getElementById('dash-max-streak');
    const rachaRecordEl = document.getElementById('pr-max-streak-val');
    const campanaDiaEl = document.getElementById('dash-campana-dia');
    const missionTrainVal = document.getElementById('mission-train-val');
    const missionTrainPerc = document.getElementById('mission-train-perc');
    const missionTrainBar = document.getElementById('mission-train-bar');
    const prMaxMinEl = document.getElementById('pr-max-daily-min');
    const prMaxCloserEl = document.getElementById('pr-max-daily-closer');

    if (currentUser) {
      try {
        const allMetrics = await supaClient.getDailyMetricsRange(currentUser.id, 1000);
        const globalTrainingMins = allMetrics.reduce((sum: number, row: any) => sum + (row.training_minutes || 0), 0);
        const globalCloserCount = allMetrics.reduce((sum: number, row: any) => sum + (row.closer_count || 0), 0);

        let mc = 0;
        try { mc = await supaClient.getKnowledgeAnsweredCount(currentUser.id); }
        catch (err) { console.warn('Error fetching knowledge answered count:', err); }

        const totalPoints = Math.max(0, globalTrainingMins + Math.floor(globalCloserCount * 0.5) + Math.floor(mc * 0.5));
        if (totalPuntosEl) { totalPuntosEl.textContent = totalPoints.toLocaleString(); }

        const rangoEl = document.getElementById('dash-rango');
        if (rangoEl) {
          if (totalPoints >= 2000) { rangoEl.textContent = 'ELITE'; }
          else if (totalPoints >= 1000) { rangoEl.textContent = 'AGENTE'; }
          else if (totalPoints >= 500) { rangoEl.textContent = 'ASPIRANTE'; }
          else { rangoEl.textContent = 'NOVATO'; }

          if (rangoEl.nextElementSibling) {
            if (totalPoints >= 2000) { rangoEl.nextElementSibling.textContent = 'Siguiente: N/A'; }
            else if (totalPoints >= 1000) { rangoEl.nextElementSibling.textContent = 'Siguiente: Elite'; }
            else if (totalPoints >= 500) { rangoEl.nextElementSibling.textContent = 'Siguiente: Agente'; }
            else { rangoEl.nextElementSibling.textContent = 'Siguiente: Aspirante'; }
          }
        }

        const todayMetrics = await supaClient.getTodayDailyMetrics(currentUser.id);
        const totalMins = todayMetrics?.training_minutes || 0;
        const totalAnalisis = todayMetrics?.closer_count || 0;

        if (missionTrainVal) { missionTrainVal.innerHTML = `${totalMins} <span class="text-xs text-gray-300 font-bold">MIN</span>`; }
        const trainPct = Math.min(100, Math.round((totalMins / 60) * 100));
        if (missionTrainPerc) { missionTrainPerc.textContent = `${trainPct}%`; }
        if (missionTrainBar) { missionTrainBar.style.width = `${trainPct}%`; }

        const missionCloserVal = document.getElementById('mission-closer-val');
        const missionCloserPerc = document.getElementById('mission-closer-perc');
        const missionCloserBar = document.getElementById('mission-closer-bar');
        if (missionCloserVal) { missionCloserVal.innerHTML = `${totalAnalisis} <span class="text-xs text-gray-300 font-bold">QTY</span>`; }
        const closerPct = Math.min(100, Math.round((totalAnalisis / 20) * 100));
        if (missionCloserPerc) { missionCloserPerc.textContent = `${closerPct}%`; }
        if (missionCloserBar) { missionCloserBar.style.width = `${closerPct}%`; }

        const { current: currentStreak, max: maxStreak } = await supaClient.getCurrentStreak(currentUser.id);
        if (currentStreakEl) { currentStreakEl.textContent = `${currentStreak} Días`; }
        if (maxStreakEl) { maxStreakEl.textContent = `Record: ${maxStreak}`; }

        const records = await supaClient.getPersonalRecords(currentUser.id);
        if (prMaxMinEl) { prMaxMinEl.innerHTML = `${records.maxDailyMin} <span class="text-xs text-primary font-bold ml-1">MIN</span>`; }
        if (prMaxCloserEl) { prMaxCloserEl.innerHTML = `${records.maxDailyCloser} <span class="text-xs text-blue-400 font-bold ml-1">QTY</span>`; }

        const loginStreak = await supaClient.getLoginStreak(currentUser.id);
        if (rachaRecordEl) { rachaRecordEl.innerHTML = `${loginStreak.max} <span class="text-xs text-purple-400 font-bold ml-1">DÍAS</span>`; }

        const campaignDay = await supaClient.getCampaignDay(currentUser.id);
        if (campanaDiaEl) { campanaDiaEl.textContent = `Día ${campaignDay}`; }
        const progressPercent = Math.min(100, Math.round((campaignDay / 60) * 100));
        if (campanaDiaEl && campanaDiaEl.nextElementSibling) {
          campanaDiaEl.nextElementSibling.textContent = `Progreso: ${progressPercent}%`;
        }
      } catch (err) {
        console.error('Error loading dashboard info from Supabase:', err);
        const totalMins = parseInt(localStorage.getItem('gravity_total_minutes') || '0');
        const totalAnalisis = parseInt(localStorage.getItem('gravity_total_analysis') || '0');
        if (missionTrainVal) { missionTrainVal.innerHTML = `${totalMins} <span class="text-xs text-gray-300 font-bold">MIN</span>`; }
        const trainPct = Math.min(100, Math.round((totalMins / 60) * 100));
        if (missionTrainPerc) { missionTrainPerc.textContent = `${trainPct}%`; }
        if (missionTrainBar) { missionTrainBar.style.width = `${trainPct}%`; }
        const missionCloserVal = document.getElementById('mission-closer-val');
        const missionCloserPerc = document.getElementById('mission-closer-perc');
        const missionCloserBar = document.getElementById('mission-closer-bar');
        if (missionCloserVal) { missionCloserVal.innerHTML = `${totalAnalisis} <span class="text-xs text-gray-300 font-bold">QTY</span>`; }
        const closerPct = Math.min(100, Math.round((totalAnalisis / 20) * 100));
        if (missionCloserPerc) { missionCloserPerc.textContent = `${closerPct}%`; }
        if (missionCloserBar) { missionCloserBar.style.width = `${closerPct}%`; }
        if (currentStreakEl) { currentStreakEl.textContent = '0 Días'; }
        if (maxStreakEl) { maxStreakEl.textContent = 'Record: 0'; }
        if (campanaDiaEl) { campanaDiaEl.textContent = 'Día 1'; }
      }

      try {
        const mc = await supaClient.getKnowledgeAnsweredCount(currentUser.id);
        const GRAND_TOTAL = 168;
        const globalPct = Math.min(100, Math.round((mc / GRAND_TOTAL) * 100));
        const missionKnowVal = document.getElementById('mission-know-val');
        const missionKnowPerc = document.getElementById('mission-know-perc');
        const missionKnowBar = document.getElementById('mission-know-bar');
        if (missionKnowVal) { missionKnowVal.innerHTML = `${mc} <span class="text-[10px] text-gray-300 font-bold">/ ${GRAND_TOTAL} QTY</span>`; }
        if (missionKnowPerc) { missionKnowPerc.textContent = `${globalPct}%`; }
        if (missionKnowBar) { missionKnowBar.style.width = `${globalPct}%`; }
      } catch (err) {
        console.warn('No se pudo cargar knowledge_progress:', err);
        const mc = parseInt(localStorage.getItem('gravity_knowledge_correct_count') || '0');
        const GRAND_TOTAL = 168;
        const globalPct = Math.min(100, Math.round((mc / GRAND_TOTAL) * 100));
        const missionKnowVal = document.getElementById('mission-know-val');
        const missionKnowPerc = document.getElementById('mission-know-perc');
        const missionKnowBar = document.getElementById('mission-know-bar');
        if (missionKnowVal) { missionKnowVal.innerHTML = `${mc} <span class="text-[10px] text-gray-300 font-bold">/ ${GRAND_TOTAL} QTY</span>`; }
        if (missionKnowPerc) { missionKnowPerc.textContent = `${globalPct}%`; }
        if (missionKnowBar) { missionKnowBar.style.width = `${globalPct}%`; }
      }

      try {
        let leaderboardData = await supaClient.getWeeklyLeaderboard();
        const leaderboardListEl = document.getElementById('leaderboard-list');
        if (leaderboardListEl) {
          const hasOnlyCurrentUser = leaderboardData.length <= 1;
          if (hasOnlyCurrentUser) {
            const currentPoints = leaderboardData[0]?.points || 0;
            const mockUsers = [
              { user_id: 'mock-1', name: 'Shadow_Zero', points: 1240 },
              { user_id: 'mock-2', name: 'Voss_Protégé', points: 1085 },
              { user_id: 'mock-3', name: 'Elite_Seller', points: 940 },
              { user_id: 'mock-4', name: 'Alpha_Closer', points: 720 }
            ];
            const currentUserItem = {
              user_id: currentUser.id,
              name: getDisplayName(currentProfile, currentProfile?.email) || 'Tú (Agente)',
              points: currentPoints
            };
            leaderboardData = [currentUserItem, ...mockUsers].sort((a: any, b: any) => b.points - a.points);
          }

          if (leaderboardData && leaderboardData.length > 0) {
            leaderboardListEl.innerHTML = '';
            const top3 = leaderboardData.slice(0, 3);
            top3.forEach((user: any, index: number) => {
              const rank = index + 1;
              let bgClass = 'bg-white/5 border-white/5 hover:bg-white/10 opacity-80';
              let badgeClass = 'bg-gray-600';
              let pointsClass = 'text-gray-300';
              let starIconColor = 'text-gray-400';
              let customStyle = '';

              if (rank === 1) {
                bgClass = 'bg-primary/5 border-primary/20 relative overflow-hidden group/rank';
                badgeClass = 'bg-primary text-black shadow-[0_0_15px_rgba(46,204,112,0.5)] z-10';
                pointsClass = 'text-primary';
                starIconColor = 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)] z-10';
                customStyle = '<div class="absolute -right-4 -top-4 w-12 h-12 bg-primary/10 rounded-full blur-xl group-hover/rank:scale-150 transition-transform"></div>';
              } else if (rank === 2) {
                badgeClass = 'bg-gray-400 text-black';
                pointsClass = 'text-gray-200';
                starIconColor = 'text-gray-300';
              } else if (rank === 3) {
                badgeClass = 'bg-amber-800 text-black';
                pointsClass = 'text-amber-600';
                starIconColor = 'text-amber-700';
              }

              const itemHTML = `
                <div class="flex items-center gap-4 p-4 rounded-[1.5rem] ${bgClass} transition-all">
                  ${customStyle}
                  <div class="w-10 h-10 rounded-xl ${badgeClass} flex items-center justify-center font-black font-orbitron text-sm">
                    ${rank}
                  </div>
                  <div class="flex-1 z-10">
                    <p class="text-sm font-bold text-white">${user.name}</p>
                    <p class="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                      ${user.points.toLocaleString()} <span class="${pointsClass} font-bold">PTS</span>
                    </p>
                  </div>
                  <div class="${starIconColor} z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                </div>`;
              leaderboardListEl.innerHTML += itemHTML;
            });

            const userIndex = leaderboardData.findIndex((u: any) => u.user_id === currentUser.id);
            const userRankEl = document.getElementById('leaderboard-user-rank');
            if (userRankEl) {
              if (userIndex !== -1) {
                const userRank = userIndex + 1;
                userRankEl.innerHTML = `Tu posición: <span class="text-white">#${userRank}</span> <span class="text-primary italic ml-2">Subiendo</span>`;
              } else {
                userRankEl.innerHTML = `Tu posición: <span class="text-white">#--</span> <span class="text-gray-400 italic ml-2">Sin actividad</span>`;
              }
            }
          } else {
            leaderboardListEl.innerHTML = `<div class="text-center p-6 text-gray-400 text-xs font-medium">No hay datos registrados para esta semana.</div>`;
            const userRankEl = document.getElementById('leaderboard-user-rank');
            if (userRankEl) { userRankEl.innerHTML = `Tu posición: <span class="text-white">#--</span>`; }
          }
        }
      } catch (err) {
        console.warn('No se pudo cargar leaderboard semanal:', err);
      }
    }
    renderAchievements('all-time');
  }

  initAchievements();
  updateDashboardInfo();

  // WEEKLY CALENDAR DASHBOARD
  const calState: any = {
    view: 'week', mode: 'all', offsetWeeks: 0, simulated: false, data: [],
    customStart: null as string | null, customEnd: null as string | null
  };

  const adminCalState: any = {
    view: 'week', mode: 'all', offsetWeeks: 0, seller: 'all', simulated: false, data: [],
    customStart: null as string | null, customEnd: null as string | null
  };

  let latestUserRankingData: any[] = [];
  let latestAdminRankingData: any[] = [];

  function buildDateRange(view: string, offsetWeeks: number): { start: Date; end: Date } {
    const now = new Date();
    let start: Date, end: Date;
    if (view === 'day') {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetWeeks);
      start = end = new Date(d);
    } else if (view === 'week') {
      const startOfWeek = new Date(now);
      const day = now.getDay() || 7;
      startOfWeek.setDate(now.getDate() - day + 1 + offsetWeeks * 7);
      start = startOfWeek;
      end = new Date(startOfWeek);
      end.setDate(startOfWeek.getDate() + 6);
    } else {
      const yr = now.getFullYear();
      const mo = now.getMonth() + offsetWeeks;
      start = new Date(yr, mo, 1);
      end = new Date(yr, mo + 1, 0);
    }
    return { start, end };
  }

  function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function daysInRange(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }

  // Calendar grid, stat cards, and ranking components extracted to src/components/

  function buildDataMap(metrics: any[]): Record<string, any> {
    const map: Record<string, any> = {};
    metrics.forEach(m => {
      if (!map[m.day]) { map[m.day] = { training_minutes: 0, total_minutes: 0, closer_count: 0, quiz_answers: 0 }; }
      // ponytail: daily_metrics tiene PK (user_id, day) → 1 fila por día
      // Si hay múltiples (admin view), acumular correctamente
      map[m.day].training_minutes += m.training_minutes || 0;
      map[m.day].closer_count += m.closer_count || 0;
      map[m.day].quiz_answers += m.quiz_answers || 0;
      map[m.day].total_minutes += m.total_minutes || 0;
    });
    return map;
  }

  // Stat cards extracted to src/components/StatCards.ts

  function getWeeklyRankingData(days: Date[], rangeMetrics: any[]): any[] {
    const dayStrs = days.map(d => toDateStr(d));
    return getAdminData().sellers.map((seller: any) => {
      const sellerMetrics = rangeMetrics.filter((m: any) => m.user_id === seller.id);
      const dataMap = buildDataMap(sellerMetrics);
      let totalMinutes = 0;
      const missedTrainingDays: string[] = [];

      dayStrs.forEach((dStr: string) => {
        const dayData = dataMap[dStr] || { training_minutes: 0, closer_count: 0, quiz_answers: 0 };
        const training = dayData.training_minutes || 0;
        const closer = dayData.closer_count || 0;
        const quiz = dayData.quiz_answers || 0;
        const mins = training + (closer * 0.5) + (quiz * 0.5);
        totalMinutes += mins;
        if (training === 0) {
          const dateObj = days[dayStrs.indexOf(dStr)];
          const label = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"][dateObj.getDay()];
          missedTrainingDays.push(label);
        }
      });

      return { ...seller, totalMinutes: Math.round(totalMinutes), missedTrainingDays };
    }).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes);
  }

  // Weekly ranking extracted to src/components/WeeklyRanking.ts

  function generateSimulatedData(days: Date[]): Record<string, any> {
    const map: Record<string, any> = {};
    days.forEach(d => {
      const ds = toDateStr(d);
      if (Math.random() > 0.25) {
        map[ds] = { training_minutes: Math.floor(Math.random() * 90), closer_count: Math.floor(Math.random() * 30), quiz_answers: Math.floor(Math.random() * 20) };
      } else {
        map[ds] = { training_minutes: 0, closer_count: 0, quiz_answers: 0 };
      }
    });
    return map;
  }

  async function initUserWeeklyDashboard(navToken?: number) {
    const router = (window as any).__router;
    const isCurrent = () => !navToken || !router || router.isCurrentNav(navToken);
    const { start, end } = buildDateRange(calState.view, calState.offsetWeeks);
    const days = daysInRange(start, end);
    let dataMap: Record<string, any>;

    const nameEl = document.getElementById('user-name-lock');
    if (nameEl && currentProfile) { nameEl.textContent = getDisplayName(currentProfile, currentProfile.email) || 'Agente'; }
    const nameCalEl = document.getElementById('user-display-name-cal');
    if (nameCalEl && currentProfile) { nameCalEl.textContent = getDisplayName(currentProfile, currentProfile.email) || 'Agente'; }
    const avatarCalEl = document.getElementById('user-avatar-initial-cal');
    if (avatarCalEl && currentProfile) { avatarCalEl.textContent = (currentProfile.email || 'A').charAt(0).toUpperCase(); }

    if (calState.simulated) { dataMap = generateSimulatedData(days); }
    else {
      try {
        const metrics = await supaClient.getDailyMetricsRange(currentUser?.id, 365);
        // ponytail: abort si el usuario ya navegó a otra vista
        if (!isCurrent()) {return;}
        const startStr = toDateStr(start);
        const endStr = toDateStr(end);
        const filtered = metrics.filter((m: any) => m.day >= startStr && m.day <= endStr);
        dataMap = buildDataMap(filtered);
      } catch (err) {
        if (!isCurrent()) {return;}
        console.warn('Falling back to simulated data:', err);
        dataMap = generateSimulatedData(days);
      }
    }

    if (!isCurrent()) {return;}

    const userName = getDisplayName(currentProfile, currentProfile?.email) || 'Agente';
    const initials = userName.replace('_', ' ').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
    renderWeeklyCalendarGrid('weeklyCalendar', days, dataMap, calState.mode, 'weeklyAverage', userName, initials);
    renderDashboardStats('stats', dataMap, days, calState.mode, 1);

    const rankContainer = document.getElementById('ranking');
    if (rankContainer) { rankContainer.innerHTML = '<div class="text-center text-gray-500 py-4 text-xs">Cargando ranking...</div>'; }

    loadAdminData().then(() => {
      // ponytail: abort si el usuario ya navegó a otra vista
      if (!isCurrent()) {return;}
      try {
        if (calState.simulated) {
          const DEMO_SELLERS = getAdminData().sellers.length > 0
            ? getAdminData().sellers
            : [
              { id: 'demo1', name: 'Yoshira', role: 'user', lv: 'elite', color: '#00cc44', bg: '#001a09', pts: { d: 150, w: 900, m: 3500 }, tr: { d: 20, w: 120, m: 450 }, cl: { d: 2, w: 12, m: 40 }, quiz: 85, streak: 5, activeDays: [] },
              { id: 'demo2', name: 'Facundo', role: 'user', lv: 'master', color: '#cc44ff', bg: '#1a003a', pts: { d: 300, w: 1800, m: 7200 }, tr: { d: 40, w: 240, m: 960 }, cl: { d: 4, w: 24, m: 80 }, quiz: 95, streak: 12, activeDays: [] },
              { id: 'demo3', name: 'Santi', role: 'user', lv: 'agente', color: '#3399ff', bg: '#001028', pts: { d: 80, w: 450, m: 1800 }, tr: { d: 15, w: 80, m: 300 }, cl: { d: 1, w: 5, m: 20 }, quiz: 70, streak: 2, activeDays: [] }
            ];
          getAdminData().sellers = DEMO_SELLERS;
        }

        if (rankContainer && getAdminData().sellers.length > 0) {
          let rankingData: any[];
          if (calState.simulated) {
            rankingData = getAdminData().sellers.map((s: any) => {
              const totalMinutes = Math.floor(100 + Math.random() * 500);
              const labels = ["LUN", "MAR", "MIE", "JUE", "VIE"];
              const missedTrainingDays = labels.filter(() => Math.random() > 0.6);
              return { ...s, totalMinutes, missedTrainingDays };
            }).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes);
          } else {
            const startStr = toDateStr(start);
            const endStr = toDateStr(end);
            const rangeMetrics = getAdminData().dailyMetrics.filter((m: any) => m.day >= startStr && m.day <= endStr);
            rankingData = getWeeklyRankingData(days, rangeMetrics);
          }
          latestUserRankingData = rankingData;
          rankContainer.innerHTML = `
            <div class="rank-head">
              <span></span>
              <span>Nombre</span>
              <span>Minutos totales</span>
              <span>Faltas</span>
            </div>
          ` + rankingData.slice(0, 10).map((s: any, index: number) => {
            const initials = adminInitials(s.name);
            return `
              <div class="rank-row ${s.id === currentUser?.id ? 'bg-primary/5 border-primary/20' : ''}">
                <span class="rank-number">${index + 1}</span>
                <div class="seller">
                  <span class="mini-avatar">${initials}</span>
                  <span>${s.name}${s.id === currentUser?.id ? ' <span class="text-primary text-[9px]">(Tú)</span>' : ''}</span>
                </div>
                <span class="ranking-value">${s.totalMinutes} min</span>
                <span class="ranking-miss">
                  <strong>${s.missedTrainingDays.length} ${s.missedTrainingDays.length === 1 ? 'día' : 'días'}</strong>
                  ${s.missedTrainingDays.length ? s.missedTrainingDays.join(", ") : "Sin faltas"}
                </span>
              </div>`;
          }).join("");
        }
      } catch (err) {
        console.warn('Ranking render error:', err);
      }
    }).catch((err: any) => {
      console.warn('Ranking load error:', err);
    });
  }

  async function initAdminWeeklyDashboard(navToken?: number) {
    document.getElementById('downloadBtn')?.setAttribute('hidden', '');
    const router = (window as any).__router;
    const isCurrent = () => !navToken || !router || router.isCurrentNav(navToken);
    const isSuperAdmin = currentProfile && currentProfile.role === 'super_admin';
    const superAdminFilterEl = document.getElementById('superAdminCompanyFilter') as HTMLSelectElement;
    let overrideCompanyId: string | undefined = undefined;

    if (isSuperAdmin && superAdminFilterEl) {
      superAdminFilterEl.classList.remove('hidden');
      if (superAdminFilterEl.options.length <= 1) {
        const companies = await supaClient.getAllCompanies();
        if (!isCurrent()) {return;}
        companies.forEach((c: any) => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          superAdminFilterEl.appendChild(opt);
        });
      }
      if (superAdminFilterEl.value !== 'all') {
        overrideCompanyId = superAdminFilterEl.value;
      }
    }

    await loadAdminData(overrideCompanyId);
    if (!isCurrent()) {return;}

    const { start, end } = buildDateRange(adminCalState.view, adminCalState.offsetWeeks);
    const days = daysInRange(start, end);
    const startStr = toDateStr(start);
    const endStr = toDateStr(end);

    let dataMap: Record<string, any>;
    if (adminCalState.simulated) { dataMap = generateSimulatedData(days); }
    else {
      try {
        const metrics = overrideCompanyId 
          ? await supaClient.getCompanyDailyMetrics(overrideCompanyId, 5000)
          : await supaClient.getDailyMetricsRange(null, 5000); // this gets fallback metrics
        if (!isCurrent()) {return;}
        let filtered = metrics.filter((m: any) => m.day >= startStr && m.day <= endStr);
        if (adminCalState.seller !== 'all') { filtered = filtered.filter((m: any) => m.user_id === adminCalState.seller); }
        dataMap = buildDataMap(filtered);
      } catch {
        dataMap = generateSimulatedData(days);
      }
    }

    const sellerFilterEl = document.getElementById('sellerFilter') as HTMLSelectElement;
    if (sellerFilterEl && getAdminData().sellers.length > 0) {
      // Always reset seller filter options when switching companies
      sellerFilterEl.innerHTML = '<option value="all">Todos los vendedores</option>';
      getAdminData().sellers.forEach((s: any) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        sellerFilterEl.appendChild(opt);
      });
      // Keep previous selection if valid
      if (getAdminData().sellers.find((s:any) => s.id === adminCalState.seller)) {
        sellerFilterEl.value = adminCalState.seller;
      } else {
        adminCalState.seller = 'all';
      }
    }

    let sellerDataMaps: any[];
    if (adminCalState.simulated) {
      const DEMO_SELLERS = getAdminData().sellers.length > 0
        ? getAdminData().sellers
        : [
          { id: 'demo1', name: 'Yoshira', lv: 'elite', pts: { w: 1200, d: 80, m: 4000 }, tr: { w: 120, d: 0, m: 600 }, cl: { w: 30, d: 0, m: 120 }, quiz: 75, streak: 4 },
          { id: 'demo2', name: 'Carmen', lv: 'agente', pts: { w: 900, d: 60, m: 3200 }, tr: { w: 90, d: 0, m: 400 }, cl: { w: 25, d: 0, m: 80 }, quiz: 65, streak: 3 },
          { id: 'demo3', name: 'Mary', lv: 'agente', pts: { w: 750, d: 40, m: 2800 }, tr: { w: 75, d: 0, m: 340 }, cl: { w: 20, d: 0, m: 70 }, quiz: 60, streak: 2 },
          { id: 'demo4', name: 'Emilio', lv: 'novato', pts: { w: 450, d: 30, m: 1800 }, tr: { w: 45, d: 0, m: 220 }, cl: { w: 10, d: 0, m: 50 }, quiz: 40, streak: 1 },
          { id: 'demo5', name: 'Jessica', lv: 'novato', pts: { w: 300, d: 10, m: 1200 }, tr: { w: 30, d: 0, m: 160 }, cl: { w: 5, d: 0, m: 30 }, quiz: 35, streak: 0 },
          { id: 'demo6', name: 'Santiago', lv: 'agente', pts: { w: 820, d: 55, m: 3000 }, tr: { w: 80, d: 0, m: 360 }, cl: { w: 22, d: 0, m: 90 }, quiz: 68, streak: 5 },
        ];
      const sellersToShow = adminCalState.seller === 'all' ? DEMO_SELLERS : DEMO_SELLERS.filter((s: any) => s.id === adminCalState.seller);
      sellerDataMaps = sellersToShow.map((seller: any) => ({ seller, dataMap: generateSimulatedData(days) }));
    } else {
      try {
        const allMetrics = await supaClient.getDailyMetricsRange(null, 5000);
        const rangeMetrics = allMetrics.filter((m: any) => m.day >= startStr && m.day <= endStr);
        const sellersToShow = adminCalState.seller === 'all' ? getAdminData().sellers : getAdminData().sellers.filter((s: any) => s.id === adminCalState.seller);
        sellerDataMaps = sellersToShow.map((seller: any) => {
          const sellerMetrics = rangeMetrics.filter((m: any) => m.user_id === seller.id);
          return { seller, dataMap: buildDataMap(sellerMetrics) };
        });
        if (sellerDataMaps.length === 0) { sellerDataMaps = [{ seller: { name: 'Equipo' }, dataMap }]; }
      } catch {
        sellerDataMaps = [{ seller: { name: 'Equipo' }, dataMap }];
      }
    }

    if (sellerDataMaps && sellerDataMaps.length > 0) {
      renderAdminWeeklyCalendarGrid('adminWeeklyCalendar', days, sellerDataMaps, adminCalState.mode, 'adminWeeklyAverage');
    } else {
      renderWeeklyCalendarGrid('adminWeeklyCalendar', days, dataMap, adminCalState.mode, 'adminWeeklyAverage', 'Equipo', 'EQ');
    }

    dataMap = {};
    days.forEach(day => {
      const ds = toDateStr(day);
      dataMap[ds] = { training_minutes: 0, closer_count: 0, quiz_answers: 0 };
    });
    if (sellerDataMaps && sellerDataMaps.length > 0) {
      sellerDataMaps.forEach((sdm: any) => {
        Object.keys(sdm.dataMap).forEach(ds => {
          if (!dataMap[ds]) { dataMap[ds] = { training_minutes: 0, closer_count: 0, quiz_answers: 0 }; }
          dataMap[ds].training_minutes += sdm.dataMap[ds].training_minutes || 0;
          dataMap[ds].closer_count += sdm.dataMap[ds].closer_count || 0;
          dataMap[ds].quiz_answers += sdm.dataMap[ds].quiz_answers || 0;
        });
      });
    }

    const numSellers = (sellerDataMaps && sellerDataMaps.length > 0) ? sellerDataMaps.length : 1;
    renderDashboardStats('adminStats', dataMap, days, adminCalState.mode, numSellers);

    const adminRankEl = document.getElementById('adminRanking');
    if (adminRankEl && getAdminData().sellers.length > 0) {
      let rankingData: any[];
      if (adminCalState.simulated) {
        rankingData = getAdminData().sellers.map((s: any) => {
          const totalMinutes = Math.floor(100 + Math.random() * 500);
          const labels = ["LUN", "MAR", "MIE", "JUE", "VIE"];
          const missedTrainingDays = labels.filter(() => Math.random() > 0.6);
          return { ...s, totalMinutes, missedTrainingDays };
        }).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes);
      } else {
        const rangeMetrics = getAdminData().dailyMetrics.filter((m: any) => m.day >= startStr && m.day <= endStr);
        rankingData = getWeeklyRankingData(days, rangeMetrics);
      }
      latestAdminRankingData = rankingData;
      adminRankEl.innerHTML = `
        <div class="rank-head">
          <span></span>
          <span>Nombre</span>
          <span>Minutos totales</span>
          <span>Faltas</span>
        </div>
      ` + rankingData.slice(0, 10).map((s: any, index: number) => {
        const initials = adminInitials(s.name);
        return `
          <div class="rank-row">
            <span class="rank-number">${index + 1}</span>
            <div class="seller">
              <span class="mini-avatar">${initials}</span>
              <span>${s.name}</span>
            </div>
            <span class="ranking-value">${s.totalMinutes} min</span>
            <span class="ranking-miss">
              <strong>${s.missedTrainingDays.length} ${s.missedTrainingDays.length === 1 ? 'día' : 'días'}</strong>
              ${s.missedTrainingDays.length ? s.missedTrainingDays.join(", ") : "Sin faltas"}
            </span>
          </div>`;
      }).join("");
    }

    document.getElementById('downloadBtn')?.classList.remove('hidden');
  }

  // USER calendar control event listeners
  document.querySelectorAll('[data-activity-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      calState.mode = (btn as HTMLElement).dataset.activityMode;
      document.querySelectorAll('[data-activity-mode]').forEach(b => {
        b.classList.remove('active', 'bg-primary', 'text-black');
        b.classList.add('text-gray-300');
      });
      btn.classList.add('active', 'bg-primary', 'text-black');
      btn.classList.remove('text-gray-300');
      initUserWeeklyDashboard();
    });
  });

  document.querySelectorAll('[data-calendar-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      calState.view = (btn as HTMLElement).dataset.calendarView;
      calState.offsetWeeks = 0;
      document.querySelectorAll('[data-calendar-view], #todayWeek').forEach(b => {
        if (!b) { return; }
        b.classList.remove('active', 'border-primary/20', 'bg-primary/10', 'text-primary');
        b.classList.add('border-white/5', 'bg-secondary/20', 'text-gray-400', 'hover:text-white');
        const span = b.querySelector('span');
        if (span) { span.classList.remove('text-primary/70'); span.classList.add('text-gray-500'); }
      });
      btn.classList.add('active', 'border-primary/20', 'bg-primary/10', 'text-primary');
      btn.classList.remove('border-white/5', 'bg-secondary/20', 'text-gray-400', 'hover:text-white');
      const span = btn.querySelector('span');
      if (span) { span.classList.add('text-primary/70'); span.classList.remove('text-gray-500'); }
      initUserWeeklyDashboard();
    });
  });

  document.getElementById('prevRange')?.addEventListener('click', () => { calState.offsetWeeks--; initUserWeeklyDashboard(); });
  document.getElementById('nextRange')?.addEventListener('click', () => { calState.offsetWeeks++; initUserWeeklyDashboard(); });
  document.getElementById('todayWeek')?.addEventListener('click', (e) => {
    calState.offsetWeeks = 0;
    calState.customStart = null;
    calState.customEnd = null;
    if (document.getElementById('rangeStartInput')) { (document.getElementById('rangeStartInput') as HTMLInputElement).value = ''; }
    if (document.getElementById('rangeEndInput')) { (document.getElementById('rangeEndInput') as HTMLInputElement).value = ''; }
    document.querySelectorAll('[data-calendar-view]').forEach(b => {
      b.classList.remove('active', 'border-primary/20', 'bg-primary/10', 'text-primary');
      b.classList.add('border-white/5', 'bg-secondary/20', 'text-gray-400', 'hover:text-white');
      const span = b.querySelector('span');
      if (span) { span.classList.remove('text-primary/70'); span.classList.add('text-gray-500'); }
    });
    const btn = e.currentTarget as HTMLElement;
    btn.classList.add('active', 'border-primary/20', 'bg-primary/10', 'text-primary');
    btn.classList.remove('border-white/5', 'bg-secondary/20', 'text-gray-400', 'hover:text-white');
    const span = btn.querySelector('span');
    if (span) { span.classList.add('text-primary/70'); span.classList.remove('text-gray-500'); }
    calState.view = 'week'; // ponytail: 'week' muestra los 7 días con hoy resaltado, no 1 sola celda
    initUserWeeklyDashboard();
  });

  document.getElementById('rangeStartInput')?.addEventListener('change', (e) => { calState.customStart = (e.target as HTMLInputElement).value; initUserWeeklyDashboard(); });
  document.getElementById('rangeEndInput')?.addEventListener('change', (e) => { calState.customEnd = (e.target as HTMLInputElement).value; initUserWeeklyDashboard(); });

  // ADMIN calendar control event listeners
  document.querySelectorAll('[data-admin-activity-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      adminCalState.mode = (btn as HTMLElement).dataset.adminActivityMode;
      document.querySelectorAll('[data-admin-activity-mode]').forEach(b => {
        b.classList.remove('active', 'bg-primary', 'text-black');
        b.classList.add('text-gray-300');
      });
      btn.classList.add('active', 'bg-primary', 'text-black');
      btn.classList.remove('text-gray-300');
      initAdminWeeklyDashboard();
    });
  });

  document.querySelectorAll('[data-admin-calendar-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      adminCalState.view = (btn as HTMLElement).dataset.adminCalendarView;
      adminCalState.offsetWeeks = 0;
      document.querySelectorAll('[data-admin-calendar-view], #adminTodayWeek').forEach(b => {
        if (!b) { return; }
        b.classList.remove('active', 'border-primary/20', 'bg-primary/10', 'text-primary');
        b.classList.add('border-white/5', 'bg-secondary/20', 'text-gray-400', 'hover:text-white');
        const span = b.querySelector('span');
        if (span) { span.classList.remove('text-primary/70'); span.classList.add('text-gray-500'); }
      });
      btn.classList.add('active', 'border-primary/20', 'bg-primary/10', 'text-primary');
      btn.classList.remove('border-white/5', 'bg-secondary/20', 'text-gray-400', 'hover:text-white');
      const span = btn.querySelector('span');
      if (span) { span.classList.add('text-primary/70'); span.classList.remove('text-gray-500'); }
      initAdminWeeklyDashboard();
    });
  });

  document.getElementById('adminPrevRange')?.addEventListener('click', () => { adminCalState.offsetWeeks--; initAdminWeeklyDashboard(); });
  document.getElementById('adminNextRange')?.addEventListener('click', () => { adminCalState.offsetWeeks++; initAdminWeeklyDashboard(); });
  document.getElementById('adminTodayWeek')?.addEventListener('click', (e) => {
    adminCalState.offsetWeeks = 0;
    adminCalState.customStart = null;
    adminCalState.customEnd = null;
    if (document.getElementById('adminRangeStartInput')) { (document.getElementById('adminRangeStartInput') as HTMLInputElement).value = ''; }
    if (document.getElementById('adminRangeEndInput')) { (document.getElementById('adminRangeEndInput') as HTMLInputElement).value = ''; }
    document.querySelectorAll('[data-admin-calendar-view]').forEach(b => {
      b.classList.remove('active', 'border-primary/20', 'bg-primary/10', 'text-primary');
      b.classList.add('border-white/5', 'bg-secondary/20', 'text-gray-400', 'hover:text-white');
      const span = b.querySelector('span');
      if (span) { span.classList.remove('text-primary/70'); span.classList.add('text-gray-500'); }
    });
    const btn = e.currentTarget as HTMLElement;
    btn.classList.add('active', 'border-primary/20', 'bg-primary/10', 'text-primary');
    btn.classList.remove('border-white/5', 'bg-secondary/20', 'text-gray-400', 'hover:text-white');
    const span = btn.querySelector('span');
    if (span) { span.classList.add('text-primary/70'); span.classList.remove('text-gray-500'); }
    adminCalState.view = 'week'; // ponytail: semana completa con hoy resaltado
    initAdminWeeklyDashboard();
  });

  document.getElementById('sellerFilter')?.addEventListener('change', (e) => { adminCalState.seller = (e.target as HTMLSelectElement).value; initAdminWeeklyDashboard(); });
  document.getElementById('superAdminCompanyFilter')?.addEventListener('change', () => { 
    // Reset seller filter when switching company to prevent orphaned selections
    adminCalState.seller = 'all'; 
    initAdminWeeklyDashboard(); 
  });
  document.getElementById('adminRangeStartInput')?.addEventListener('change', (e) => { adminCalState.customStart = (e.target as HTMLInputElement).value; initAdminWeeklyDashboard(); });
  document.getElementById('adminRangeEndInput')?.addEventListener('change', (e) => { adminCalState.customEnd = (e.target as HTMLInputElement).value; initAdminWeeklyDashboard(); });

  document.getElementById('adminViewAllBtn')?.addEventListener('click', () => {
    const rankEl = document.getElementById('adminRanking');
    if (rankEl) { rankEl.style.maxHeight = rankEl.style.maxHeight ? '' : 'none'; }
  });

  document.getElementById('userReportDropdownBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userReportDropdownMenu')?.classList.toggle('hidden');
  });

  document.getElementById('adminReportDropdownBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('adminReportDropdownMenu')?.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    const userDropdown = document.getElementById('userReportDropdownMenu');
    const userBtn = document.getElementById('userReportDropdownBtn');
    if (userDropdown && userBtn && !userBtn.contains(e.target as Node) && !userDropdown.contains(e.target as Node)) { userDropdown.classList.add('hidden'); }
    const adminDropdown = document.getElementById('adminReportDropdownMenu');
    const adminBtn = document.getElementById('adminReportDropdownBtn');
    if (adminDropdown && adminBtn && !adminBtn.contains(e.target as Node) && !adminDropdown.contains(e.target as Node)) { adminDropdown.classList.add('hidden'); }
  });

  function exportXLSX(rows: any[], filename: string) {
    if (typeof (window as any).XLSX === 'undefined') {
      alert("La librería para exportar a Excel no se ha cargado. Por favor, comprueba tu conexión.");
      return;
    }
    const ws = (window as any).XLSX.utils.aoa_to_sheet(rows);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    (window as any).XLSX.writeFile(wb, filename);
  }

  function exportRanking(rankingData: any[], filename: string) {
    if (!rankingData || rankingData.length === 0) { alert("No hay datos de ranking disponibles para exportar."); return; }
    const rows = [['Nombre', 'Tiempo total entrenando', 'Número de faltas', 'Días sin entrenamiento']];
    rankingData.forEach((s: any) => {
      const name = s.name || 'Agente';
      const time = `${s.totalMinutes} min`;
      const misses = s.missedTrainingDays ? s.missedTrainingDays.length : 0;
      const missedDays = s.missedTrainingDays && s.missedTrainingDays.length > 0 ? s.missedTrainingDays.join(', ') : 'Sin faltas';
      rows.push([name, time, misses, missedDays]);
    });
    exportXLSX(rows, filename);
  }

  document.getElementById('userViewAllBtn')?.addEventListener('click', () => {
    const rankEl = document.getElementById('ranking');
    if (rankEl) { rankEl.style.maxHeight = rankEl.style.maxHeight ? '' : 'none'; }
  });

  document.getElementById('userDownloadRankingBtn')?.addEventListener('click', () => {
    exportRanking(latestUserRankingData, `ranking_vendedor_${toDateStr(new Date())}.xlsx`);
  });

  document.getElementById('adminDownloadRankingBtn')?.addEventListener('click', () => {
    exportRanking(latestAdminRankingData, `ranking_equipo_${toDateStr(new Date())}.xlsx`);
  });

  function formatExportDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  }

  document.getElementById('userDownloadBtn')?.addEventListener('click', async () => {
    let dataMap: Record<string, any>;
    const { start, end } = buildDateRange(calState.view, calState.offsetWeeks);
    const days = daysInRange(start, end);
    if (calState.simulated) { dataMap = generateSimulatedData(days); }
    else {
      try {
        const metrics = await supaClient.getDailyMetricsRange(currentUser?.id, 365);
        const startStr = toDateStr(start);
        const endStr = toDateStr(end);
        const filtered = metrics.filter((m: any) => m.day >= startStr && m.day <= endStr);
        dataMap = buildDataMap(filtered);
      } catch { dataMap = generateSimulatedData(days); }
    }

    const totalMins = Object.values(dataMap).reduce((s: number, e: any) => s + (e.training_minutes || 0), 0);
    const totalCloser = Object.values(dataMap).reduce((s: number, e: any) => s + (e.closer_count || 0), 0);
    const totalQuiz = Object.values(dataMap).reduce((s: number, e: any) => s + (e.quiz_answers || 0), 0);
    const activeDays = Object.values(dataMap).filter((e: any) => (e.training_minutes || 0) + (e.closer_count || 0) > 0).length;
    const weeklyAverageEl = document.getElementById('weeklyAverage');
    const weeklyAverageVal = weeklyAverageEl ? weeklyAverageEl.textContent : '0 min';

    const rows = [
      ['RESUMEN DE ENTRENAMIENTO - GRAVITY SYMBIOSIS'],
      ['Usuario', currentUser?.email || 'Agente'],
      ['Rango de Fechas', `${toDateStr(start)} a ${toDateStr(end)}`],
      ['Promedio Semanal', weeklyAverageVal],
      [],
      ['Métrica', 'Total Acumulado'],
      ['Entrenamiento', `${totalMins} MIN`],
      ['Consultas Closer', `${totalCloser} QTY`],
      ['Quizz Resueltos', `${totalQuiz} QTY`],
      ['Días Activos', `${activeDays} DÍAS`],
      [],
      [],
      ['DETALLE DIARIO POR ACTIVIDAD'],
      ['Fecha', 'Entrenamiento (min)', 'Consultas Closer', 'Quiz Resueltos', 'Activo']
    ];

    days.forEach(day => {
      const ds = toDateStr(day);
      const entry = dataMap[ds] || {};
      const active = (entry.training_minutes || 0) > 0 || (entry.closer_count || 0) > 0 ? 'SI' : 'NO';
      rows.push([ds, entry.training_minutes || 0, entry.closer_count || 0, entry.quiz_answers || 0, active]);
    });

    rows.push([], [], ['MÉTRICAS GLOBALES']);
    rows.push(['Total Entrenamiento', `${totalMins} MIN`]);
    rows.push(['Total Consultas Closer', `${totalCloser} QTY`]);
    rows.push(['Total Quizz Resueltos', `${totalQuiz} QTY`]);
    rows.push(['Días Activos', `${activeDays} DÍAS`]);
    if (currentProfile) {
      rows.push(['Nivel', getDisplayName(currentProfile, currentProfile?.email) || 'Agente']);
    }
    rows.push(['Fecha de Exportación', formatExportDate(new Date())]);

    exportXLSX(rows, `reporte_entrenamiento_${toDateStr(new Date())}.xlsx`);
  });

  document.getElementById('downloadBtn')?.addEventListener('click', async () => {
    const { start, end } = buildDateRange(adminCalState.view, adminCalState.offsetWeeks);
    const days = daysInRange(start, end);
    const startStr = toDateStr(start);
    const endStr = toDateStr(end);

    let dataMap: Record<string, any>;
    let sellerDataMaps: any[];

    if (adminCalState.simulated) {
      dataMap = generateSimulatedData(days);
      const DEMO_SELLERS_LIST = getAdminData().sellers.length > 0
        ? getAdminData().sellers
        : [
          { id: 'demo1', name: 'Yoshira' },
          { id: 'demo2', name: 'Carmen' },
          { id: 'demo3', name: 'Mary' },
          { id: 'demo4', name: 'Emilio' },
          { id: 'demo5', name: 'Jessica' },
          { id: 'demo6', name: 'Santiago' }
        ];
      const sellersToShow = adminCalState.seller === 'all'
        ? DEMO_SELLERS_LIST
        : DEMO_SELLERS_LIST.filter((s: any) => s.id === adminCalState.seller);
      sellerDataMaps = sellersToShow.map((seller: any) => ({
        seller,
        dataMap: generateSimulatedData(days)
      }));
    } else {
      try {
        const allMetrics = await supaClient.getDailyMetricsRange(null, 5000);
        let filtered = allMetrics.filter((m: any) => m.day >= startStr && m.day <= endStr);
        if (adminCalState.seller !== 'all') {
          filtered = filtered.filter((m: any) => m.user_id === adminCalState.seller);
        }
        dataMap = buildDataMap(filtered);

        const sellersToShow = adminCalState.seller === 'all'
          ? getAdminData().sellers
          : getAdminData().sellers.filter((s: any) => s.id === adminCalState.seller);

        sellerDataMaps = sellersToShow.map((seller: any) => {
          const sellerMetrics = allMetrics.filter((m: any) => m.user_id === seller.id && m.day >= startStr && m.day <= endStr);
          return { seller, dataMap: buildDataMap(sellerMetrics) };
        });
      } catch {
        dataMap = generateSimulatedData(days);
        sellerDataMaps = [{ seller: { name: 'Equipo' }, dataMap }];
      }
    }

    const totalMins = Object.values(dataMap).reduce((s: number, e: any) => s + (e.training_minutes || 0), 0);
    const totalCloser = Object.values(dataMap).reduce((s: number, e: any) => s + (e.closer_count || 0), 0);
    const totalQuiz = Object.values(dataMap).reduce((s: number, e: any) => s + (e.quiz_answers || 0), 0);
    const activeDays = Object.values(dataMap).filter((e: any) => (e.training_minutes || 0) + (e.closer_count || 0) > 0).length;
    const weeklyAverageEl = document.getElementById('adminWeeklyAverage');
    const weeklyAverageVal = weeklyAverageEl ? weeklyAverageEl.textContent : '0 min';

    const rows: any[] = [
      ['RESUMEN DE ENTRENAMIENTO - GRAVITY SYMBIOSIS'],
      ['Rango de Fechas', `${toDateStr(start)} a ${toDateStr(end)}`],
      ['Promedio Semanal', weeklyAverageVal],
      [],
      ['Métrica', 'Total Acumulado'],
      ['Entrenamiento', `${totalMins} MIN`],
      ['Consultas Closer', `${totalCloser} QTY`],
      ['Quizz Resueltos', `${totalQuiz} QTY`],
      ['Días Activos', `${activeDays} DÍAS`],
      [],
      [],
      ['DETALLE DIARIO POR ACTIVIDAD'],
      ['Fecha', 'Entrenamiento (min)', 'Consultas Closer', 'Quiz Resueltos', 'Activo']
    ];

    days.forEach(day => {
      const ds = toDateStr(day);
      const entry = dataMap[ds] || {};
      const active = (entry.training_minutes || 0) > 0 || (entry.closer_count || 0) > 0 ? 'SI' : 'NO';
      rows.push([ds, entry.training_minutes || 0, entry.closer_count || 0, entry.quiz_answers || 0, active]);
    });

    rows.push([], [], ['REPORTE DE ENTRENAMIENTO', '', '', '', '', 'TODOS']);
    rows.push(['Periodos:', `Fecha Inicio: ${startStr}`, '', '', '-', `Fecha Fin: ${endStr}`]);
    const numDays = days.length || 1;
    let overallEntM = 0, overallClM = 0, overallQzM = 0;
    sellerDataMaps.forEach((sdm: any) => {
      days.forEach(day => {
        const ds = toDateStr(day);
        const entry = sdm.dataMap[ds] || {};
        overallEntM += entry.training_minutes || 0;
        overallClM += (entry.closer_count || 0) * 0.5;
        overallQzM += (entry.quiz_answers || 0) * 0.5;
      });
    });
    const avgTimeAll = ((overallEntM + overallClM + overallQzM) / numDays).toFixed(2);
    rows.push(['Promedio del Periodo:', '', '', `${avgTimeAll} min`]);
    rows.push([]);

    const headerRow: any[] = ['Vendedor'];
    const subHeaderRow: any[] = [''];
    days.forEach(day => {
      headerRow.push(toDateStr(day), '', '');
      subHeaderRow.push('ENT', 'CL', 'QZ');
    });
    headerRow.push('TOTAL DEL PERIODO', '', '', 'PROMEDIO DEL PERIODO', '', '', 'Dias Activos', '', '', 'tiempo total', 'promedio total', 'dias Activos General');
    subHeaderRow.push('ENT', 'CL', 'QZ', 'ENT', 'CL', 'QZ', 'ENT', 'CL', 'QZ', '', '', '');
    rows.push(headerRow, subHeaderRow);

    const dailyTotals = days.map(() => ({ ent: 0, cl: 0, qz: 0 }));
    let grandTotalEnt = 0, grandTotalCl = 0, grandTotalQz = 0;
    let grandTotalTime = 0;

    sellerDataMaps.forEach((sdm: any) => {
      const row: any[] = [sdm.seller.name];
      let tEnt = 0, tCl = 0, tQz = 0, aEnt = 0, aCl = 0, aQz = 0, aGen = 0;

      days.forEach((day, idx) => {
        const ds = toDateStr(day);
        const entry = sdm.dataMap[ds] || {};
        const ent = entry.training_minutes || 0;
        const cl = (entry.closer_count || 0) * 0.5;
        const qz = (entry.quiz_answers || 0) * 0.5;

        tEnt += ent; tCl += cl; tQz += qz;
        if (ent > 0) { aEnt++; }
        if (cl > 0) { aCl++; }
        if (qz > 0) { aQz++; }
        if (ent > 0 || cl > 0 || qz > 0) { aGen++; }

        dailyTotals[idx].ent += ent; dailyTotals[idx].cl += cl; dailyTotals[idx].qz += qz;
        row.push(ent, cl, qz);
      });

      grandTotalEnt += tEnt; grandTotalCl += tCl; grandTotalQz += tQz;
      const totalTime = tEnt + tCl + tQz;
      grandTotalTime += totalTime;

      row.push(tEnt, tCl, tQz);
      row.push((tEnt / numDays).toFixed(2), (tCl / numDays).toFixed(2), (tQz / numDays).toFixed(2));
      row.push(aEnt, aCl, aQz);
      row.push(totalTime, (totalTime / numDays).toFixed(2), aGen);
      rows.push(row);
    });

    const totalRow: any[] = ['TOTAL del Dia'];
    days.forEach((day, idx) => {
      totalRow.push(dailyTotals[idx].ent, dailyTotals[idx].cl, dailyTotals[idx].qz);
    });
    totalRow.push(grandTotalEnt, grandTotalCl, grandTotalQz, '', '', '', '', '', '', grandTotalTime, (grandTotalTime / numDays).toFixed(2), '');
    rows.push(totalRow);

    const numSellers = sellerDataMaps.length || 1;
    const avgRow: any[] = ['Promedio del Dia'];
    days.forEach((day, idx) => {
      avgRow.push((dailyTotals[idx].ent / numSellers).toFixed(2), (dailyTotals[idx].cl / numSellers).toFixed(2), (dailyTotals[idx].qz / numSellers).toFixed(2));
    });
    rows.push(avgRow);

    rows.push([], [], ['MÉTRICAS GLOBALES']);
    rows.push(['Total Entrenamiento', `${totalMins} MIN`]);
    rows.push(['Total Consultas Closer', `${totalCloser} QTY`]);
    rows.push(['Total Quizz Resueltos', `${totalQuiz} QTY`]);
    rows.push(['Días Activos', `${activeDays} DÍAS`]);
    rows.push(['Fecha de Exportación', formatExportDate(new Date())]);

    exportXLSX(rows, `reporte_equipo_${toDateStr(new Date())}.xlsx`);
  });
});
