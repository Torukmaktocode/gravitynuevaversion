/**
 * TestLab — clon de login + interior sin permisos
 * Solo para pruebas locales de diseño/UX. No toca el flujo real.
 * Rutas: /lab y /lab/*
 */
import { store } from '../lib/store.js';

export const MOCK_USER = {
  id: 'lab-user-001',
  email: 'tester@lab.local',
  user_metadata: { email: 'tester@lab.local' },
  aud: 'authenticated',
  role: 'authenticated',
};

export const MOCK_PROFILE = {
  id: 'lab-user-001',
  email: 'tester@lab.local',
  role: 'user',
  company_id: null,
  nickname: 'Tester Lab',
  training_level: 'Lab Mode',
  blockages: 'Ninguno — modo prueba',
};

export function isLabPath(path: string): boolean {
  return path === '/lab' || path.startsWith('/lab/');
}

export function getLabView(path: string): string {
  // /lab -> login, /lab/app o /lab/dashboard -> dashboard, etc.
  if (path === '/lab' || path === '/lab/login') {return 'view-test-login';}
  const map: Record<string, string> = {
    '/lab/dashboard': 'view-dashboard',
    '/lab/app': 'view-dashboard',
    '/lab/alfred-ai': 'view-alfred',
    '/lab/entrenador': 'view-trainer',
    '/lab/closer-elite': 'view-closer',
    '/lab/base-conocimiento': 'view-knowledge',
    '/lab/shadow': 'view-copilot',
    '/lab/bienestar': 'view-wellness',
    '/lab/perfil': 'view-profile',
    '/lab/clients': 'view-clients',
    '/lab/products': 'view-products',
  };
  return map[path] || 'view-dashboard';
}

export function enterLab(router: any) {
  // guarda flag para que recargas sigan en modo lab
  localStorage.setItem('gravity_lab_mode', '1');
  store.currentUser = MOCK_USER as any;
  store.currentProfile = MOCK_PROFILE as any;
  router.navigate('/lab/dashboard');
}

export function exitLab(router: any) {
  localStorage.removeItem('gravity_lab_mode');
  store.currentUser = null as any;
  store.currentProfile = null as any;
  router.navigate('/lab');
}

export function setupTestLogin(router: any) {
  const btn = document.getElementById('test-login-enter');
  const logoutBtn = document.getElementById('test-login-back');
  if (btn && !btn.dataset['bound']) {
    btn.dataset['bound'] = '1';
    btn.addEventListener('click', () => enterLab(router));
  }
  if (logoutBtn && !logoutBtn.dataset['bound']) {
    logoutBtn.dataset['bound'] = '1';
    logoutBtn.addEventListener('click', () => router.navigate('/'));
  }
}
