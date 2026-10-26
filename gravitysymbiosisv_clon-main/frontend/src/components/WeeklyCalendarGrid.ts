import { toDateStr } from '../lib/utils.js';

const DAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const bgMap: Record<string, string> = { zero: 'rgba(255,51,101,.14)', low: 'rgba(249,115,22,.14)', mid: 'rgba(245,178,26,.14)', good: 'rgba(34,198,111,.14)', high: 'rgba(47,128,237,.14)' };
const txtMap: Record<string, string> = { zero: '#ff3365', low: '#f97316', mid: '#c17b00', good: '#16a85a', high: '#1774dc' };

function getCellClass(value: number): string {
  if (value === 0) {return 'zero';}
  if (value < 10) {return 'low';}
  if (value < 20) {return 'mid';}
  if (value <= 30) {return 'good';}
  return 'high';
}

function computeValue(entry: any, mode: string): number {
  if (mode === 'training') {return entry.training_minutes || 0;}
  if (mode === 'closer') {return Math.floor((entry.closer_count || 0) * 0.5);}
  if (mode === 'quizz') {return Math.floor((entry.quiz_answers || 0) * 0.5);}
  // 'all': usar total_minutes de BD (ya incluye training + closer + quiz)
  // ponytail: != null filtra undefined Y null (a diferencia de !== null)
  if (entry.total_minutes !== null && entry.total_minutes !== undefined) {return entry.total_minutes || 0;}
  return (entry.training_minutes || 0) + Math.floor((entry.closer_count || 0) * 0.5) + Math.floor((entry.quiz_answers || 0) * 0.5);
}

export function renderWeeklyCalendarGrid(
  containerId: string,
  days: Date[],
  dataMap: Record<string, any>,
  mode: string,
  avgEl: string,
  userName: string,
  initials: string
) {
  const container = document.getElementById(containerId);
  if (!container) {return;}

  const todayStr = toDateStr(new Date());
  const numDays = Math.min(days.length, 7);
  const shownDays = days.slice(0, numDays);

  let html = `<div style="display:grid;grid-template-columns:100px repeat(${numDays},minmax(64px,1fr)) 110px;gap:6px;align-items:center;min-width:${210 + numDays * 76}px;">`;
  html += `<div></div>`;
  shownDays.forEach(d => {
    const isToday = toDateStr(d) === todayStr;
    html += `<div class="text-center text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-gray-500'}" style="padding-bottom:6px;">
      ${DAY_LABELS[d.getDay()]}<br>
      <span class="text-[9px] font-mono ${isToday ? 'text-primary' : 'text-gray-600'}">${String(d.getDate()).padStart(2, '0')}</span>
    </div>`;
  });
  html += `<div class="text-center text-[10px] font-bold uppercase tracking-wider text-gray-500" style="padding-bottom:6px;">Resumen</div>`;

  html += `
    <div style="display:flex;align-items:center;gap:6px;min-width:0;">
      <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#18233d,#e1794f);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0;">${initials}</div>
      <span style="font-size:11px;font-weight:700;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${userName}</span>
    </div>`;

  let total = 0;
  let count = 0;

  shownDays.forEach(day => {
    const ds = toDateStr(day);
    const entry = dataMap[ds] || {};
    const value = computeValue(entry, mode);
    total += value;
    count++;

    const cellClass = getCellClass(value);
    const ring = ds === todayStr ? `outline:2px solid rgba(57,255,20,0.4);outline-offset:2px;` : '';

    html += `
      <button type="button" 
        style="min-height:30px;border-radius:8px;display:grid;place-items:center;font-size:11px;font-weight:800;color:${txtMap[cellClass]};background:${bgMap[cellClass]};border:1px solid transparent;cursor:default;transition:transform .1s;${ring}"
        title="${ds}: ${value} min"
        onmouseenter="this.style.transform='scale(1.06)'"
        onmouseleave="this.style.transform='scale(1)'"
      >${value} min</button>`;
  });

  const trainingTotal = Object.values(dataMap).reduce((s: number, e: any) => s + (e.training_minutes || 0), 0);
  const closerTotal = Object.values(dataMap).reduce((s: number, e: any) => s + (e.closer_count || 0), 0);
  const quizzTotal = Object.values(dataMap).reduce((s: number, e: any) => s + (e.quiz_answers || 0), 0);

  html += `
    <div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:flex-end;align-items:center;min-height:30px;padding:2px 4px;">
      <span style="border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:1px 6px;font-size:9px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.04);white-space:nowrap;">Ent: <strong style="color:#e5e7eb;">${trainingTotal}m</strong></span>
      <span style="border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:1px 6px;font-size:9px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.04);white-space:nowrap;">Cl: <strong style="color:#e5e7eb;">${closerTotal}</strong></span>
      <span style="border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:1px 6px;font-size:9px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.04);white-space:nowrap;">Qz: <strong style="color:#e5e7eb;">${quizzTotal}</strong></span>
    </div>`;
  html += '</div>';
  container.innerHTML = html;

  if (avgEl) {
    const avgDomEl = document.getElementById(avgEl);
    if (avgDomEl) {
      const avg = count > 0 ? Math.round(total / count) : 0;
      avgDomEl.textContent = `${avg} min`;
    }
  }
}

export function renderAdminWeeklyCalendarGrid(
  containerId: string,
  days: Date[],
  sellerDataMaps: any[],
  mode: string,
  avgEl: string
) {
  const container = document.getElementById(containerId);
  if (!container) {return;}

  const todayStr = toDateStr(new Date());
  const numDays = Math.min(days.length, 7);
  const shownDays = days.slice(0, numDays);

  let html = `<div style="display:grid;grid-template-columns:100px repeat(${numDays},minmax(64px,1fr)) 110px;gap:6px;align-items:center;min-width:${210 + numDays * 76}px;">`;
  html += `<div></div>`;
  shownDays.forEach(d => {
    const isToday = toDateStr(d) === todayStr;
    html += `<div class="text-center text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-gray-500'}" style="padding-bottom:6px;">
      ${DAY_LABELS[d.getDay()]}<br>
      <span class="text-[9px] font-mono ${isToday ? 'text-primary' : 'text-gray-600'}">${String(d.getDate()).padStart(2, '0')}</span>
    </div>`;
  });
  html += `<div class="text-center text-[10px] font-bold uppercase tracking-wider text-gray-500" style="padding-bottom:6px;">Resumen</div>`;

  let grandTotal = 0;
  let grandCount = 0;

  sellerDataMaps.forEach(({ seller, dataMap }: any) => {
    const initials = seller.name.replace('_', ' ').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
    html += `
      <div style="display:flex;align-items:center;gap:6px;min-width:0;">
        <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#18233d,#e1794f);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0;">${initials}</div>
        <span style="font-size:11px;font-weight:700;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${seller.name}</span>
      </div>`;

    shownDays.forEach(day => {
      const ds = toDateStr(day);
      const entry = dataMap[ds] || {};
      const value = computeValue(entry, mode);
      grandTotal += value;
      grandCount++;

      const cellClass = getCellClass(value);
      const ring = ds === todayStr ? `outline:2px solid rgba(57,255,20,0.4);outline-offset:2px;` : '';

      html += `
        <button type="button" 
          style="min-height:30px;border-radius:8px;display:grid;place-items:center;font-size:11px;font-weight:800;color:${txtMap[cellClass]};background:${bgMap[cellClass]};border:1px solid transparent;cursor:default;transition:transform .1s;${ring}"
          title="${ds}: ${value} min"
          onmouseenter="this.style.transform='scale(1.06)'"
          onmouseleave="this.style.transform='scale(1)'"
        >${value} min</button>`;
    });

    const trainingTotal = Object.values(dataMap).reduce((s: number, e: any) => s + (e.training_minutes || 0), 0);
    const closerTotal = Object.values(dataMap).reduce((s: number, e: any) => s + (e.closer_count || 0), 0);
    const quizzTotal = Object.values(dataMap).reduce((s: number, e: any) => s + (e.quiz_answers || 0), 0);

    html += `
      <div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:flex-end;align-items:center;min-height:30px;padding:2px 4px;">
        <span style="border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:1px 6px;font-size:9px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.04);white-space:nowrap;">Ent: <strong style="color:#e5e7eb;">${trainingTotal}m</strong></span>
        <span style="border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:1px 6px;font-size:9px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.04);white-space:nowrap;">Cl: <strong style="color:#e5e7eb;">${closerTotal}</strong></span>
        <span style="border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:1px 6px;font-size:9px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.04);white-space:nowrap;">Qz: <strong style="color:#e5e7eb;">${quizzTotal}</strong></span>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;

  if (avgEl) {
    const avgDomEl = document.getElementById(avgEl);
    if (avgDomEl) {
      const avg = grandCount > 0 ? Math.round(grandTotal / grandCount) : 0;
      avgDomEl.textContent = `${avg} min`;
    }
  }
}
