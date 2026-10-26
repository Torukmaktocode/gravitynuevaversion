import { supaClient } from '../api/supa-client.js';
import { getDisplayName, adminInitials } from '../lib/utils.js';

let ADMIN_SELLERS: any[] = [];
let ADMIN_DAILY_METRICS: any[] = [];

const ADMIN_META = {
  d: { tr: 60, cl: 20 },
  w: { tr: 300, cl: 100 },
  m: { tr: 1200, cl: 400 }
};

export const adminStore = {
  get sellers() { return ADMIN_SELLERS; },
  set sellers(v) { ADMIN_SELLERS = v; },
  get dailyMetrics() { return ADMIN_DAILY_METRICS; },
  set dailyMetrics(v) { ADMIN_DAILY_METRICS = v; },
  meta: ADMIN_META
};

let adminTab = 'd';
let adminFilter = 'all';

function adminStreakHTML(n: number): string {
  let h = '<div class="streak-wrap">';
  for (let i = 0; i < 7; i++) {h += `<div class="sdot ${i < Math.min(n, 7) ? 'on' : 'off'}"></div>`;}
  h += `<span class="snum">${n}d</span></div>`;
  return h;
}

function adminPct(v: number, m: number): number { return Math.min(100, Math.round(v / m * 100)); }

function adminBarColor(p: number): string { return p >= 100 ? '#8b5cf6' : p >= 70 ? '#ffaa00' : p >= 40 ? '#3399ff' : '#444466'; }

function adminQuizColor(q: number): string { return q >= 80 ? '#8b5cf6' : q >= 60 ? '#ffaa00' : q >= 40 ? '#3399ff' : '#555566'; }

function adminLvClass(l: string): string { return 'lv-' + l; }

function adminLvLabel(l: string): string { return { master: 'MASTER', elite: 'ELITE', agente: 'AGENTE', novato: 'NOVATO' }[l] || ''; }

function adminRankClass(i: number): string { return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''; }

export async function loadAdminData(overrideCompanyId?: string) {
  const companyId = overrideCompanyId || await (async () => {
    const company = await supaClient.getMyCompany();
    return company?.id;
  })();
  if (!companyId) {ADMIN_SELLERS = []; ADMIN_DAILY_METRICS = []; return;}

  const profiles = await supaClient.getCompanyUsers(companyId);
  const metrics = await supaClient.getCompanyDailyMetrics(companyId, 5000);
  ADMIN_DAILY_METRICS = metrics;
  const allKnowledge = await supaClient.getAllKnowledgeProgress();
  const companyUserIds = new Set(profiles.map((p: any) => p.id));
  const knowledge = allKnowledge.filter((k: any) => companyUserIds.has(k.user_id));

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const last7Days = new Date(today);
  last7Days.setDate(today.getDate() - 7);
  const last30Days = new Date(today);
  last30Days.setDate(today.getDate() - 30);

  const sellersMap: Record<string, any> = {};
  profiles.forEach((p: any) => {
    sellersMap[p.id] = {
      id: p.id,
      name: getDisplayName(p, p.email) || 'Agente',
      role: p.role,
      lv: 'novato',
      color: '#888899',
      bg: '#111115',
      pts: { d: 0, w: 0, m: 0 },
      tr: { d: 0, w: 0, m: 0 },
      cl: { d: 0, w: 0, m: 0 },
      quiz: 0,
      streak: 0,
      activeDays: [] as string[]
    };
  });

  const knowledgeSum: Record<string, number> = {};
  const knowledgeCount: Record<string, number> = {};
  knowledge.forEach((k: any) => {
    if (!knowledgeSum[k.user_id]) { knowledgeSum[k.user_id] = 0; knowledgeCount[k.user_id] = 0; }
    knowledgeSum[k.user_id] += k.progress_percent || 0;
    knowledgeCount[k.user_id]++;
  });
  Object.keys(knowledgeSum).forEach(uid => {
    if (sellersMap[uid]) {
      sellersMap[uid].quiz = Math.round(knowledgeSum[uid] / knowledgeCount[uid]);
    }
  });

  metrics.forEach((m: any) => {
    if (!sellersMap[m.user_id]) {return;}
    const s = sellersMap[m.user_id];
    const mDate = new Date(m.day + 'T00:00:00');
    const tr = m.training_minutes || 0;
    const cl = m.closer_count || 0;
    const qz = m.quiz_answers || 0;
    const pts = tr + Math.floor(cl * 0.5) + Math.floor(qz * 0.5);

    if (tr > 0 || cl > 0 || qz > 0) {s.activeDays.push(m.day);}

    if (mDate >= last30Days) {
      s.tr.m += tr;
      s.cl.m += cl;
      s.pts.m += pts;
    }

    if (mDate >= last7Days) {
      s.tr.w += tr;
      s.cl.w += cl;
      s.pts.w += pts;
    }

    if (m.day === todayStr) {
      s.tr.d += tr;
      s.cl.d += cl;
      s.pts.d += pts;
    }
  });

  ADMIN_SELLERS = Object.values(sellersMap).map((s: any) => {
    let currentStreak = 0;
    const uniqueDates = [...new Set(s.activeDays)].sort().reverse();
    if (uniqueDates.length > 0) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const prev = new Date(uniqueDates[i - 1] + 'T00:00:00');
          const curr = new Date(uniqueDates[i] + 'T00:00:00');
          const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
          if (diffDays === 1) {currentStreak++;}
          else {break;}
        }
      }
    }
    s.streak = currentStreak;

    if (s.pts.m >= 2000) { s.lv = 'master'; s.color = '#cc44ff'; s.bg = '#1a003a'; }
    else if (s.pts.m >= 1000) { s.lv = 'elite'; s.color = '#00cc44'; s.bg = '#001a09'; }
    else if (s.pts.m >= 500) { s.lv = 'agente'; s.color = '#3399ff'; s.bg = '#001028'; }

    return s;
  });
}

export function getAdminData() {
  return adminStore;
}

export function renderAdminStats() {
  let tm = 0, tc = 0, tq = 0;
  ADMIN_SELLERS.forEach((s: any) => { tm += s.tr.d; tc += s.cl.d; tq += s.quiz; });

  const totalSellers = ADMIN_SELLERS.length;
  const avgQuiz = totalSellers > 0 ? Math.round(tq / totalSellers) : 0;

  const elSellers = document.getElementById('sSellers');
  if (elSellers) {elSellers.textContent = String(totalSellers);}

  const elMin = document.getElementById('sMin');
  if (elMin) {elMin.textContent = String(tm);}

  const elCloser = document.getElementById('sCloser');
  if (elCloser) {elCloser.textContent = String(tc);}

  const elQuiz = document.getElementById('sQuiz');
  if (elQuiz) {elQuiz.textContent = avgQuiz + '%';}

  const footerDate = document.getElementById('adminFooterDate');
  if (footerDate) {
    const now = new Date();
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

    let earliestDay: string | null = null;
    ADMIN_SELLERS.forEach((s: any) => {
      if (s.activeDays) {
        s.activeDays.forEach((d: string) => {
          if (!earliestDay || d < earliestDay) {earliestDay = d;}
        });
      }
    });

    let campaignDay = 1;
    if (earliestDay) {
      const start = new Date(earliestDay + 'T00:00:00');
      campaignDay = Math.min(60, Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1));
    }

    footerDate.textContent = `${days[now.getDay()]}, ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()} · DÍA ${campaignDay} DE 60`;

    const progressEl = document.getElementById('adminCampaignProgress');
    if (progressEl) {progressEl.textContent = Math.round((campaignDay / 60) * 100) + '%';}
  }
}

export function renderAdminTable() {
  const meta = ADMIN_META[adminTab as keyof typeof ADMIN_META];
  let data = [...ADMIN_SELLERS];
  if (adminFilter === 'elite') {data = data.filter(s => s.lv === 'elite' || s.lv === 'master');}
  if (adminFilter === 'train') {data.sort((a, b) => b.tr[adminTab] - a.tr[adminTab]);}
  if (adminFilter === 'closer') {data.sort((a, b) => b.cl[adminTab] - a.cl[adminTab]);}
  if (adminFilter === 'quiz') {data.sort((a, b) => b.quiz - a.quiz);}

  let html = '';
  data.forEach((s: any, i: number) => {
    const tp = adminPct(s.tr[adminTab], meta.tr);
    const cp = adminPct(s.cl[adminTab], meta.cl);
    const tc = adminBarColor(tp), cc = adminBarColor(cp), qc = adminQuizColor(s.quiz);
    const ptsColor = s.lv === 'master' ? '#cc44ff' : s.lv === 'elite' ? '#00cc44' : s.lv === 'agente' ? '#3399ff' : '#555';
    html += `
<tr>
  <td><span class="rank ${adminRankClass(i)}">${i + 1}</span></td>
  <td>
    <div class="seller-cell">
      <div class="avatar" style="background:${s.bg};color:${s.color};border-color:${s.color}44">${adminInitials(s.name)}</div>
      <span class="sname">${s.name}</span>
    </div>
  </td>
  <td><span class="lvl ${adminLvClass(s.lv)}">${adminLvLabel(s.lv)}</span></td>
  <td><span class="pts-val" style="color:${ptsColor}">${s.pts[adminTab]}</span></td>
  <td>
    <div class="bar-wrap">
      <span class="bar-num">${s.tr[adminTab]}m</span>
      <div class="bar-track"><div class="bar-fill" style="width:${tp}%;background:${tc}"></div></div>
    </div>
  </td>
  <td><span class="bar-pct" style="color:${tc}">${tp}%</span></td>
  <td style="width:8px"></td>
  <td>
    <div class="bar-wrap">
      <span class="bar-num">${s.cl[adminTab]}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${cp}%;background:${cc}"></div></div>
    </div>
  </td>
  <td><span class="bar-pct" style="color:${cc}">${cp}%</span></td>
  <td style="width:8px"></td>
  <td>
    <div class="quiz-wrap">
      <div class="quiz-bar"><div class="quiz-fill" style="width:${s.quiz}%;background:${qc}"></div></div>
      <span class="quiz-pct" style="color:${qc}">${s.quiz}%</span>
    </div>
  </td>
  <td></td>
  <td>${adminStreakHTML(s.streak)}</td>
</tr>`;
  });
  const tbody = document.getElementById('tbody');
  if (tbody) {tbody.innerHTML = html;}
}

export function setAdminTab(t: string, el: HTMLElement) {
  adminTab = t;
  document.querySelectorAll('#view-dashboard-admin .tab').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  renderAdminTable();
}

export function setAdminFilter(f: string, el: HTMLElement) {
  adminFilter = f;
  document.querySelectorAll('#view-dashboard-admin .fbtn').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  renderAdminTable();
}
