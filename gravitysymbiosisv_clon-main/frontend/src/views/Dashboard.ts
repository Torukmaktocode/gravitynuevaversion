import { store } from '../lib/store.js';
import { supaClient } from '../api/supa-client.js';
import { getDisplayName, toDateStr, daysInRange, buildDateRange, minuteColor, cellOpacity } from '../lib/utils.js';

const calState: any = { view: 'week', offsetWeeks: 0, mode: 'training', simulated: false };
let ADMIN_SELLERS: any[] = [];
let ADMIN_DAILY_METRICS: any[] = [];

export async function loadDashboardStats(ctx: any) {
  let activeDays: number[] = [];
  let minutes = 0;
  let sessions = 0;
  let score = 0;

  if (store.currentUser) {
    try {
      const { data: convs } = await supaClient.client
        .from('conversations')
        .select('created_at')
        .eq('user_id', store.currentUser.id);

      if (convs) {
        sessions = convs.length;
        minutes = sessions * 10;
        score = Math.min(100, Math.floor(sessions * 5) + 50);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        activeDays = convs
          .map((c: any) => new Date(c.created_at))
          .filter((d: Date) => d.getMonth() === currentMonth && d.getFullYear() === currentYear)
          .map((d: Date) => d.getDate());
        activeDays = [...new Set(activeDays)];
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  const minutesEl = document.getElementById('stat-minutes');
  const sessionsEl = document.getElementById('stat-sessions');
  const scoreEl = document.getElementById('stat-score');
  if (minutesEl) {minutesEl.textContent = String(minutes);}
  if (sessionsEl) {sessionsEl.textContent = String(sessions);}
  if (scoreEl) {scoreEl.textContent = score + "%";}

  const hour = new Date().getHours();
  const greetingEl = document.getElementById('dashboard-greeting');
  if (greetingEl) {
    const { data: profile } = await supaClient.getProfile(store.currentUser.id);
    const name = getDisplayName(profile, store.currentUser?.email);
    if (hour < 12) {greetingEl.textContent = `Buenos días, ${name}`;}
    else if (hour < 18) {greetingEl.textContent = `Buenas tardes, ${name}`;}
    else {greetingEl.textContent = `Buenas noches, ${name}`;}
  }

  const dateEl = document.getElementById('dashboard-date');
  if (dateEl) {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('es-ES', options);
  }

  renderDashboardCalendar(activeDays);
  if (typeof ctx.updateDashboardInfo === 'function') {
    await ctx.updateDashboardInfo();
  }
}

function renderDashboardCalendar(activeDays: number[] = []) {
  const container = document.getElementById('calendar-days');
  if (!container) {return;}
  container.innerHTML = '';
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const startGrid = firstDay === 0 ? 6 : firstDay - 1;
  const today = now.getDate();

  for (let i = 0; i < startGrid; i++) {
    const el = document.createElement('div');
    el.className = "h-8 md:h-10 text-[10px] flex items-center justify-center text-gray-800";
    container.appendChild(el);
  }
  for (let d = 1; d <= totalDays; d++) {
    const el = document.createElement('div');
    const isToday = d === today;
    const hasEvent = activeDays.includes(d);
    el.className = `h-8 md:h-10 text-[10px] flex flex-col items-center justify-center rounded-lg border border-transparent transition-all cursor-default group relative ${isToday ? 'bg-primary text-black font-bold border-primary' : 'text-gray-400 hover:bg-white/5 hover:border-white/10'}`;
    el.innerHTML = `<span>${d}</span>${hasEvent ? '<span class="w-1 h-1 rounded-full bg-primary mt-0.5"></span>' : ''}`;
    container.appendChild(el);
  }
}

async function initUserWeeklyDashboard(_ctx: any) {
  const calendarEl = document.getElementById('weeklyCalendar');
  if (!calendarEl) {return;}

  const { start, end } = buildDateRange(calState.view, calState.offsetWeeks);
  const days = daysInRange(start, end);
  const startStr = toDateStr(start);
  const endStr = toDateStr(end);

  let dataMap: Record<string, any>;
  try {
    const rawMetrics = await supaClient.getDailyMetricsRange(store.currentUser?.id, 365);
    const filtered = rawMetrics.filter((m: any) => m.day >= startStr && m.day <= endStr);
    dataMap = buildDataMap(filtered);
  } catch (err) {
    console.warn('Error loading metrics:', err);
    dataMap = {};
  }

  renderWeeklyCalendarGrid(days, dataMap);
  renderDashboardStats(days, dataMap);

  try {
    const company = await supaClient.getMyCompany();
    const companyId = company?.id;
    const profiles = companyId ? await supaClient.getCompanyUsers(companyId) : await supaClient.getAllProfiles('user');
    const metrics = companyId ? await supaClient.getCompanyDailyMetrics(companyId, 5000) : await supaClient.getDailyMetricsRange(null, 5000);
    ADMIN_DAILY_METRICS = metrics;
    ADMIN_SELLERS = profiles;
    const allKnowledge = await supaClient.getAllKnowledgeProgress();
    const companyUserIds = new Set(profiles.map((p: any) => p.id));
    const knowledge = allKnowledge.filter((k: any) => companyUserIds.has(k.user_id));

    const sellersMap: Record<string, any> = {};
    ADMIN_SELLERS.forEach((p: any) => {
      sellersMap[p.id] = {
        id: p.id, name: getDisplayName(p, p.email) || 'Agente',
        role: p.role, lv: 'novato', color: '#888899', bg: '#111115',
        pts: { d: 0, w: 0, m: 0 }, tr: { d: 0, w: 0, m: 0 },
        cl: { d: 0, w: 0, m: 0 }, quiz: 0, streak: 0, activeDays: [] as string[]
      };
    });

    const kSum: Record<string, number> = {}, kCount: Record<string, number> = {};
    knowledge.forEach((k: any) => {
      if (!kSum[k.user_id]) { kSum[k.user_id] = 0; kCount[k.user_id] = 0; }
      kSum[k.user_id] += k.progress_percent || 0;
      kCount[k.user_id]++;
    });
    Object.keys(kSum).forEach(uid => {
      if (sellersMap[uid]) {sellersMap[uid].quiz = Math.round(kSum[uid] / kCount[uid]);}
    });

    const today = new Date();
    const todayStr = toDateStr(today);
    const last7Days = new Date(today); last7Days.setDate(today.getDate() - 7);
    const last30Days = new Date(today); last30Days.setDate(today.getDate() - 30);

    metrics.forEach((m: any) => {
      if (!sellersMap[m.user_id]) {return;}
      const s = sellersMap[m.user_id];
      const mDate = new Date(m.day + 'T00:00:00');
      const tr = m.training_minutes || 0;
      const cl = m.closer_count || 0;
      const qz = m.quiz_answers || 0;
      const pts = m.total_minutes || 0;
      if (tr > 0 || cl > 0 || qz > 0) {s.activeDays.push(m.day);}
      if (mDate >= last30Days) { s.tr.m += tr; s.cl.m += cl; s.pts.m += pts; s.quiz = qz; }
      if (mDate >= last7Days) { s.tr.w += tr; s.cl.w += cl; s.pts.w += pts; }
      if (m.day === todayStr) { s.tr.d += tr; s.cl.d += cl; s.pts.d += pts; }
    });

    ADMIN_SELLERS = Object.values(sellersMap).map((s: any) => {
      let streak = 0;
      const dates = [...new Set(s.activeDays)].sort().reverse();
      if (dates.length > 0) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = toDateStr(yesterday);
        if (dates[0] === todayStr || dates[0] === ys) {
          streak = 1;
          for (let i = 1; i < dates.length; i++) {
            const prev = new Date(dates[i - 1] + 'T00:00:00');
            const curr = new Date(dates[i] + 'T00:00:00');
            if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) {streak++;}
            else {break;}
          }
        }
      }
      s.streak = streak;
      if (s.pts.m >= 2000) { s.lv = 'master'; s.color = '#cc44ff'; s.bg = '#1a003a'; }
      else if (s.pts.m >= 1000) { s.lv = 'elite'; s.color = '#00cc44'; s.bg = '#001a09'; }
      else if (s.pts.m >= 500) { s.lv = 'agente'; s.color = '#3399ff'; s.bg = '#001028'; }
      return s;
    });

    const rankContainer = document.getElementById('ranking');
    if (rankContainer) {
      const rangeMetrics = ADMIN_DAILY_METRICS.filter((m: any) => m.day >= startStr && m.day <= endStr);
      const rankingData = getWeeklyRankingData(days, rangeMetrics);
      rankContainer.innerHTML = `<div class="rank-head"><span></span><span>Nombre</span><span>Minutos totales</span><span>Faltas</span></div>`
        + rankingData.slice(0, 10).map((s: any, i: number) => {
          const initials = s.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
          return `<div class="rank-row ${s.id === store.currentUser?.id ? 'bg-primary/5 border-primary/20' : ''}">
            <span class="rank-number">${i + 1}</span>
            <div class="seller"><span class="mini-avatar">${initials}</span><span>${s.name}${s.id === store.currentUser?.id ? ' <span class="text-primary text-[9px]">(Tú)</span>' : ''}</span></div>
            <span class="ranking-value">${s.totalMinutes} min</span>
            <span class="ranking-miss"><strong>${s.missedTrainingDays.length} ${s.missedTrainingDays.length === 1 ? 'día' : 'días'}</strong> ${s.missedTrainingDays.join(", ")}</span>
          </div>`;
        }).join("");
    }
  } catch (err) {
    console.warn('Ranking load error:', err);
  }
}

function buildDataMap(metrics: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  metrics.forEach(m => {
    map[m.day] = {
      training_minutes: m.training_minutes || 0,
      closer_count: m.closer_count || 0,
      quiz_answers: m.quiz_answers || 0,
      total_minutes: m.total_minutes || 0,
    };
  });
  return map;
}

function renderWeeklyCalendarGrid(days: Date[], dataMap: Record<string, any>) {
  const container = document.getElementById('weeklyCalendar');
  if (!container) {return;}
  const todayStr = toDateStr(new Date());
  const mode = calState.mode;
  const dayNames = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

  if (calState.view === 'week') {
    container.innerHTML = '<div class="cal-grid-week">';
    days.forEach(d => {
      const ds = toDateStr(d);
      const entry = dataMap[ds];
      let value = 0;
      if (mode === 'training') {value = entry?.training_minutes || 0;}
      else if (mode === 'closer') {value = Math.floor((entry?.closer_count || 0) * 0.5);}
      else if (mode === 'quizz') {value = Math.floor((entry?.quiz_answers || 0) * 0.5);}
      const ring = ds === todayStr ? 'outline:2px solid rgba(57,255,20,0.4);outline-offset:2px;' : '';
      const barWidth = Math.min(100, value);
      const barColor = minuteColor(value);
      const opacity = cellOpacity(value);

      container.innerHTML += `<div class="cal-cell" style="${ring}background:${barColor}${Math.round(opacity * 100)}">
        <span class="cal-label">${dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
        <span class="cal-val">${value}</span>
        <div class="cal-bar"><div class="cal-bar-fill" style="width:${barWidth}%;background:${barColor}"></div></div>
      </div>`;
    });
    container.innerHTML += '</div>';
  } else {
    container.innerHTML = '<div class="cal-grid-month">';
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    days.forEach(d => {
      currentWeek.push(d);
      if (d.getDay() === 0) { weeks.push(currentWeek); currentWeek = []; }
    });
    if (currentWeek.length > 0) {weeks.push(currentWeek);}

    weeks.forEach(week => {
      const weekTotal = week.reduce((acc, d) => {
        const ds = toDateStr(d);
        const entry = dataMap[ds];
        let v = 0;
        if (mode === 'training') {v = entry?.training_minutes || 0;}
        else if (mode === 'closer') {v = Math.floor((entry?.closer_count || 0) * 0.5);}
        else if (mode === 'quizz') {v = Math.floor((entry?.quiz_answers || 0) * 0.5);}
        return acc + v;
      }, 0);

      container.innerHTML += `<div class="cal-week-row">`;
      week.forEach(d => {
        const ds = toDateStr(d);
        const entry = dataMap[ds];
        let value = 0;
        if (mode === 'training') {value = entry?.training_minutes || 0;}
        else if (mode === 'closer') {value = Math.floor((entry?.closer_count || 0) * 0.5);}
        else if (mode === 'quizz') {value = Math.floor((entry?.quiz_answers || 0) * 0.5);}
        const ring = ds === todayStr ? 'outline:2px solid rgba(57,255,20,0.4);outline-offset:2px;' : '';
        container.innerHTML += `<div class="cal-cell" style="${ring}background:${minuteColor(value)}${Math.round(cellOpacity(value) * 100)}">
          <span class="cal-label">${d.getDate()}</span><span class="cal-val">${value}</span>
        </div>`;
      });
      container.innerHTML += `<div class="cal-week-total">${weekTotal}</div></div>`;
    });
    container.innerHTML += '</div>';
  }
}

function renderDashboardStats(days: Date[], dataMap: Record<string, any>) {
  const el = document.getElementById('stats');
  if (!el) {return;}
  const mode = calState.mode;
  const totals: Record<string, number> = { training: 0, closer: 0, quizz: 0 };
  const activeDaysSet = new Set<string>();

  Object.entries(dataMap).forEach(([day, entry]) => {
    const tr = entry.training_minutes || 0;
    const cl = entry.closer_count || 0;
    const qz = entry.quiz_answers || 0;
    totals.training += tr;
    totals.closer += cl;
    totals.quizz += qz;
    if (tr > 0 || cl > 0 || qz > 0) {activeDaysSet.add(day);}
  });

  const streak = activeDaysSet.size;
  const todayVal = dataMap[toDateStr(new Date())];
  const todayMode = mode === 'training' ? (todayVal?.training_minutes || 0)
    : mode === 'closer' ? Math.floor((todayVal?.closer_count || 0) * 0.5)
      : Math.floor((todayVal?.quiz_answers || 0) * 0.5);

  const avg = days.length > 0 ? Math.round(days.reduce((acc, d) => {
    const entry = dataMap[toDateStr(d)];
    let v = 0;
    if (mode === 'training') {v = entry?.training_minutes || 0;}
    else if (mode === 'closer') {v = Math.floor((entry?.closer_count || 0) * 0.5);}
    else if (mode === 'quizz') {v = Math.floor((entry?.quiz_answers || 0) * 0.5);}
    return acc + v;
  }, 0) / days.length) : 0;

  const totalDisplay = mode === 'training' ? totals.training
    : mode === 'closer' ? Math.floor(totals.closer * 0.5)
      : Math.floor(totals.quizz * 0.5);

  el.innerHTML = `
    <div class="stat-card"><span class="stat-label">Hoy</span><span class="stat-value">${todayMode}</span></div>
    <div class="stat-card"><span class="stat-label">Promedio</span><span class="stat-value">${avg}</span></div>
    <div class="stat-card"><span class="stat-label">Racha</span><span class="stat-value">${streak}d</span></div>
    <div class="stat-card"><span class="stat-label">Total</span><span class="stat-value">${totalDisplay}</span></div>`;
}

function getWeeklyRankingData(days: Date[], rangeMetrics: any[]): any[] {
  const userMap: Record<string, any> = {};
  ADMIN_SELLERS.forEach((s: any) => {
    userMap[s.id] = { ...s, totalMinutes: 0, missedTrainingDays: [] as string[] };
  });

  rangeMetrics.forEach((m: any) => {
    if (userMap[m.user_id]) {userMap[m.user_id].totalMinutes += (m.total_minutes || 0);}
  });

  days.forEach(d => {
    const ds = toDateStr(d);
    ADMIN_SELLERS.forEach((s: any) => {
      const dayMetrics = rangeMetrics.filter((m: any) => m.user_id === s.id && m.day === ds);
      const training = dayMetrics.reduce((acc: number, m: any) => acc + (m.training_minutes || 0), 0);
      if (training === 0) {
        if (!userMap[s.id].missedTrainingDays) {userMap[s.id].missedTrainingDays = [];}
        if (!userMap[s.id].missedTrainingDays.includes(ds)) {
          userMap[s.id].missedTrainingDays.push(ds);
        }
      }
    });
  });

  return Object.values(userMap).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes);
}

export function init(ctx: any) {
  loadDashboardStats(ctx);
}

export function initWeekly(ctx: any) {
  initUserWeeklyDashboard(ctx);
}

export function initCalendar(ctx: any) {
  initUserWeeklyDashboard(ctx);
}
