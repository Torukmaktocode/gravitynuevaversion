import { supaClient } from '../api/supa-client.js';
import { getDisplayName } from '../lib/utils.js';

let closerChart: any = null;
let trainingChart: any = null;
let rawCloserData: any[] = [];
let rawTrainingData: any[] = [];

export async function init() {
  const filterUser = document.getElementById('admin-filter-user') as HTMLSelectElement;
  if (filterUser.children.length === 1) {
    const { data: users } = await supaClient.client
      .from('profiles')
      .select('id, email, nickname, first_name, last_name')
      .order('email');
    if (users) {
      users.forEach((u: any) => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = getDisplayName(u, u.email) || 'Agente sin nombre';
        filterUser.appendChild(opt);
      });
    }
  }
  filterUser.onchange = () => updateDashboard(filterUser.value);
  updateDashboard('all');
}

document.getElementById('closer-chart-period')?.addEventListener('change', () => renderCloserChart(rawCloserData));
document.getElementById('training-chart-period')?.addEventListener('change', () => renderTrainingChart(rawTrainingData));

async function updateDashboard(userId: string) {
  const isAll = userId === 'all';
  const targetUserId = isAll ? null : userId;

  let salesQuery = supaClient.client.from('sales').select('id, created_at, sale_items(price)');
  let clientsQuery = supaClient.client.from('clients').select('id, sales(id)');
  let objectionsQuery = supaClient.client.from('objections').select('status');

  if (!isAll) {
    salesQuery = salesQuery.eq('user_id', userId);
    clientsQuery = clientsQuery.eq('user_id', userId);
    objectionsQuery = objectionsQuery.eq('user_id', userId);
  }

  const [salesRes, clientsRes, objectionsRes, dailyMetricsData] = await Promise.all([
    salesQuery, clientsQuery, objectionsQuery,
    supaClient.getDailyMetricsRange(targetUserId, 90)
  ]);

  const totalSales = salesRes.data?.length || 0;
  const totalVolume = salesRes.data?.reduce((acc: number, s: any) => acc + s.sale_items.reduce((accI: number, i: any) => accI + i.price, 0), 0) || 0;
  const totalClients = clientsRes.data?.length || 0;
  const closedClients = clientsRes.data?.filter((c: any) => c.sales.length > 0).length || 0;
  const closingRate = totalClients > 0 ? (closedClients / totalClients * 100) : 0;
  const avgTicket = totalSales > 0 ? (totalVolume / totalSales) : 0;
  const resolvedObjections = objectionsRes.data?.filter((o: any) => o.status === 'resolved').length || 0;
  const totalObjections = objectionsRes.data?.length || 0;
  const objectionRate = totalObjections > 0 ? (resolvedObjections / totalObjections * 100) : 0;
  const totalTrainingHours = dailyMetricsData.reduce((acc: number, r: any) => acc + (r.training_minutes || 0), 0) / 60;
  const totalCloserConsultas = dailyMetricsData.reduce((acc: number, r: any) => acc + (r.closer_count || 0), 0);

  document.getElementById('metric-total-sales')!.textContent = String(totalSales);
  document.getElementById('metric-total-volume')!.textContent = `$${totalVolume.toLocaleString()}`;
  const closedEl = document.getElementById('metric-closed-clients');
  if (closedEl) {closedEl.textContent = String(closedClients);}
  document.getElementById('metric-closing-rate')!.textContent = `${closingRate.toFixed(1)}%`;
  document.getElementById('metric-avg-ticket')!.textContent = `$${avgTicket.toLocaleString()}`;
  document.getElementById('metric-resolved-objections')!.textContent = String(resolvedObjections);
  document.getElementById('metric-objection-rate')!.textContent = `${objectionRate.toFixed(1)}%`;
  document.getElementById('metric-objection-bar')!.style.width = `${objectionRate}%`;
  const metricTrainHoursEl = document.getElementById('metric-total-training-hours');
  if (metricTrainHoursEl) {metricTrainHoursEl.textContent = totalTrainingHours.toFixed(1);}
  const metricCloserTotalEl = document.getElementById('metric-total-closer-consultas');
  if (metricCloserTotalEl) {metricCloserTotalEl.textContent = String(totalCloserConsultas);}

  rawCloserData = dailyMetricsData;
  rawTrainingData = dailyMetricsData;
  renderCloserChart(rawCloserData);
  renderTrainingChart(rawTrainingData);
}

function getGroupingKey(dateStr: string, period: string): string {
  const d = new Date(dateStr);
  if (period === 'week') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } else if (period === 'month') {
    return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  } else if (period === 'year') {
    return d.getFullYear().toString();
  }
  return d.toLocaleDateString();
}

function renderCloserChart(data: any[]) {
  const ctx = (document.getElementById('closerUsageChart') as HTMLCanvasElement)?.getContext('2d');
  if (!ctx) {return;}
  if (closerChart) {closerChart.destroy();}
  if (!data || data.length === 0) {
    closerChart = new (window as any).Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Consultas Closer', data: [], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', fill: true, tension: 0.4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666' } }, x: { grid: { display: false }, ticks: { color: '#666' } } } }
    });
    return;
  }
  const period = (document.getElementById('closer-chart-period') as HTMLSelectElement)?.value || 'week';
  const sorted = [...data].sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
  const counts: Record<string, number> = {};
  sorted.forEach(row => { const key = getGroupingKey(row.day, period); counts[key] = (counts[key] || 0) + (row.closer_count || 0); });
  const labels = Object.keys(counts);
  const values = labels.map(l => counts[l]);
  closerChart = new (window as any).Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Consultas Closer', data: values, borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', fill: true, tension: 0.4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666' } }, x: { grid: { display: false }, ticks: { color: '#666' } } } }
  });
}

function renderTrainingChart(data: any[]) {
  const ctx = (document.getElementById('trainingUsageChart') as HTMLCanvasElement)?.getContext('2d');
  if (!ctx) {return;}
  if (trainingChart) {trainingChart.destroy();}
  if (!data || data.length === 0) {
    trainingChart = new (window as any).Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Horas Entrenamiento', data: [], backgroundColor: '#3b82f6', borderRadius: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666' } }, x: { grid: { display: false }, ticks: { color: '#666' } } } }
    });
    return;
  }
  const period = (document.getElementById('training-chart-period') as HTMLSelectElement)?.value || 'week';
  const sorted = [...data].sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
  const hours: Record<string, number> = {};
  sorted.forEach(row => { const key = getGroupingKey(row.day, period); hours[key] = (hours[key] || 0) + ((row.training_minutes || 0) / 60); });
  const labels = Object.keys(hours);
  const values = labels.map(l => parseFloat(hours[l].toFixed(2)));
  trainingChart = new (window as any).Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Horas Entrenamiento', data: values, backgroundColor: '#3b82f6', borderRadius: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666' } }, x: { grid: { display: false }, ticks: { color: '#666' } } } }
  });
}
