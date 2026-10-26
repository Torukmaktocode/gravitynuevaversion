export function getDisplayName(profile: any, fallbackEmail: string | null = null): string {
  if (!profile) {return fallbackEmail ? fallbackEmail.split('@')[0] : 'Agente';}
  if (profile.first_name && profile.last_name) {
    let firstNameWord = profile.first_name.trim().split(' ')[0];
    if (firstNameWord) {
      firstNameWord = firstNameWord.charAt(0).toUpperCase() + firstNameWord.slice(1).toLowerCase();
    }
    const lastNameInitial = profile.last_name.trim().charAt(0).toUpperCase();
    if (firstNameWord && lastNameInitial) {
      return `${firstNameWord} ${lastNameInitial}.`;
    }
  }
  return profile.nickname || profile.first_name || (profile.email ? profile.email.split('@')[0] : (fallbackEmail ? fallbackEmail.split('@')[0] : 'Agente'));
}

export function adminInitials(n: string): string { return n.replace('_', ' ').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(); }
export function adminPct(v: number, m: number): number { return Math.min(100, Math.round(v / m * 100)); }
export function adminBarColor(p: number): string { return p >= 100 ? '#8b5cf6' : p >= 70 ? '#ffaa00' : p >= 40 ? '#3399ff' : '#444466'; }
export function adminQuizColor(q: number): string { return q >= 80 ? '#8b5cf6' : q >= 60 ? '#ffaa00' : q >= 40 ? '#3399ff' : '#555566'; }
export function adminLvClass(l: string): string { return 'lv-' + l; }
export function adminLvLabel(l: string): string { return { master: 'MASTER', elite: 'ELITE', agente: 'AGENTE', novato: 'NOVATO' }[l] || ''; }
export function adminRankClass(i: number): string { return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''; }
export function adminStreakHTML(n: number): string {
  let h = '<div class="streak-wrap">';
  for (let i = 0; i < 7; i++) {h += `<div class="sdot ${i < Math.min(n, 7) ? 'on' : 'off'}"></div>`;}
  h += `<span class="snum">${n}d</span></div>`;
  return h;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function buildDateRange(view: string, offsetWeeks = 0): { start: Date; end: Date } {
  const now = new Date();
  let start: Date, end: Date;
  if (view === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(now.getFullYear(), now.getMonth(), diff + offsetWeeks * 7);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() + offsetWeeks, 1);
    end = new Date(now.getFullYear(), now.getMonth() + offsetWeeks + 1, 0);
  }
  return { start, end };
}

export function minuteColor(mins: number): string {
  if (!mins || mins === 0) {return '#ff3365';}
  if (mins < 20) {return '#ff6633';}
  if (mins < 40) {return '#ffaa00';}
  if (mins < 60) {return '#88dd00';}
  return '#8b5cf6';
}

export function cellOpacity(mins: number): number {
  if (!mins || mins === 0) {return 0.35;}
  if (mins < 10) {return 0.45;}
  if (mins < 20) {return 0.55;}
  if (mins < 40) {return 0.7;}
  return 0.9;
}
