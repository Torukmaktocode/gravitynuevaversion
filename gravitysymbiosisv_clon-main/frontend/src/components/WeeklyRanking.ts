export function renderWeeklyRanking(
  containerId: string,
  dataMap: Record<string, any>,
  currentUserId: string,
  sellers: any[]
) {
  const container = document.getElementById(containerId);
  if (!container) {return;}

  const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
  const bgColors = ['bg-primary/10 border-primary/30', 'bg-white/5 border-white/10', 'bg-white/5 border-white/5'];

  const sorted = sellers.map((s: any) => {
    let totalMinutes = 0;
    const missedTrainingDays: string[] = [];
    const days = Object.keys(dataMap);
    days.forEach(dStr => {
      const dayData = dataMap[dStr] || { training_minutes: 0, closer_count: 0, quiz_answers: 0 };
      const total = dayData.total_minutes || 0;
      totalMinutes += total;
      if ((dayData.training_minutes || 0) === 0) {
        const dateObj = new Date(dStr + 'T00:00:00');
        const label = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"][dateObj.getDay()];
        missedTrainingDays.push(label);
      }
    });
    return { id: s.id, name: s.name || s.email?.split('@')[0] || 'Agente', totalMinutes: Math.floor(totalMinutes), missedTrainingDays };
  }).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes).slice(0, 10);

  if (sorted.length === 0) {
    container.innerHTML = `<div class="text-center p-6 text-gray-500 text-xs">Sin datos esta semana</div>`;
    return;
  }

  container.innerHTML = sorted.map((s: any, i: number) => `
    <div class="flex items-center gap-3 p-3 rounded-2xl mb-2 border ${bgColors[i] || 'bg-white/5 border-white/5'} ${s.id === currentUserId ? 'border-primary/40 bg-primary/5' : ''}">
      <div class="w-7 h-7 rounded-lg ${i === 0 ? 'bg-primary text-black' : 'bg-secondary/30 text-gray-300'} flex items-center justify-center font-black font-orbitron text-[11px]">${i + 1}</div>
      <div class="flex-1">
        <p class="text-xs font-bold text-white">${s.name}${s.id === currentUserId ? ' <span class="text-primary text-[9px]">(Tú)</span>' : ''}</p>
        <p class="text-[9px] text-gray-500 uppercase tracking-wider">${s.missedTrainingDays.length ? `Faltas: ${s.missedTrainingDays.join(', ')}` : 'Sin faltas'}</p>
      </div>
      <div class="text-right">
        <p class="text-[10px] font-bold ${rankColors[i] || 'text-gray-400'}">${s.totalMinutes} min</p>
        <p class="text-[9px] text-gray-600">${s.missedTrainingDays.length} ${s.missedTrainingDays.length === 1 ? 'día' : 'días'}</p>
      </div>
    </div>
  `).join('');
}
