import { toDateStr } from '../lib/utils.js';
import { IconPlay, IconBolt, IconBook, IconTarget } from './Icons.js';

function getBars(series: number[]): number[] {
  if (series.length === 0) {return [];}
  const max = Math.max(...series, 1);
  return series.map(v => Math.max(8, Math.round((v / max) * 100)));
}

export function renderDashboardStats(
  containerId: string,
  dataMap: Record<string, any>,
  days: Date[] = [],
  activeMode = 'all',
  numSellers = 1
) {
  const container = document.getElementById(containerId);
  if (!container) {return;}

  const totalMins = Object.values(dataMap).reduce((s: number, e: any) => s + (e.training_minutes || 0), 0);
  const totalCloser = Object.values(dataMap).reduce((s: number, e: any) => s + (e.closer_count || 0), 0);
  const totalQuiz = Object.values(dataMap).reduce((s: number, e: any) => s + (e.quiz_answers || 0), 0);

  const dayStrings = days.map(d => toDateStr(d));
  const trainingSeries = dayStrings.map(ds => (dataMap[ds]?.training_minutes || 0));
  const closerSeries = dayStrings.map(ds => (dataMap[ds]?.closer_count || 0));
  const quizSeries = dayStrings.map(ds => (dataMap[ds]?.quiz_answers || 0));

  let avgLabel = 'Promedio All';
  let avgTrend = 'promedio general';

  if (activeMode === 'training') {avgLabel = 'Promedio Entrenamiento'; avgTrend = 'promedio de entrenamiento';}
  else if (activeMode === 'closer') {avgLabel = 'Promedio Closer'; avgTrend = 'promedio de closer';}
  else if (activeMode === 'quizz') {avgLabel = 'Promedio Quiz'; avgTrend = 'promedio de quiz';}

  const dailyAvgSeries = dayStrings.map((_, i) => {
    const t = trainingSeries[i] || 0;
    const c = Math.floor((closerSeries[i] || 0) * 0.5);
    const q = Math.floor((quizSeries[i] || 0) * 0.5);
    return (t + c + q) / Math.max(numSellers, 1);
  });

  const totalActiveMins = dailyAvgSeries.reduce((a: number, b: number) => a + b, 0);
  const avgValue = (totalActiveMins / Math.max(numSellers * days.length, 1)).toFixed(1);

  const stats = [
    { label: 'Entrenamiento', value: `${totalMins}`, unit: 'MIN', color: 'text-primary', accent: '#7c3aed', accentLight: '#c4b5fd', icon: IconPlay(), trend: 'minutos totales', bars: getBars(trainingSeries), rawValues: trainingSeries },
    { label: 'Consultas Closer', value: `${Math.floor(totalCloser * 0.5)}`, unit: 'MIN', color: 'text-primary', accent: '#7c3aed', accentLight: '#a78bfa', icon: IconBolt(), trend: 'consultas totales', bars: getBars(closerSeries), rawValues: closerSeries },
    { label: 'Quizz Resueltos', value: `${Math.floor(totalQuiz * 0.5)}`, unit: 'MIN', color: 'text-primary', accent: '#7c3aed', accentLight: '#a78bfa', icon: IconBook(), trend: 'respuestas totales', bars: getBars(quizSeries), rawValues: quizSeries },
    { label: avgLabel, value: `${avgValue}`, unit: 'MIN', color: 'text-primary', accent: '#7c3aed', accentLight: '#a78bfa', icon: IconTarget(), trend: avgTrend, bars: getBars(dailyAvgSeries), rawValues: dailyAvgSeries },
  ];

  container.innerHTML = stats.map(s => `
    <div class="card p-5 bg-secondary/10 border border-white/5 hover:bg-secondary/20 transition-all flex flex-col justify-between h-44 relative overflow-hidden group">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">${s.label}</p>
          <p class="text-2xl font-black font-rajdhani text-white">${s.value} <span class="text-xs text-gray-400 font-normal">${s.unit}</span></p>
        </div>
        <div class="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-lg ${s.color} group-hover:scale-110 transition-transform duration-300">${s.icon}</div>
      </div>
      <p class="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><span class="${s.color}">▲</span> ${s.trend}</p>
      <div class="flex items-end gap-1 h-12 mt-3">
        ${s.bars.map((h: number, i: number) => `
          <span class="flex-1 rounded-t-sm transition-all duration-300 opacity-75 hover:opacity-100" 
                style="height: ${h}%; background: linear-gradient(180deg, ${s.accentLight}, ${s.accent});" 
                title="Día ${i + 1}: ${s.rawValues[i]}"></span>
        `).join('')}
      </div>
    </div>
  `).join('');
}
