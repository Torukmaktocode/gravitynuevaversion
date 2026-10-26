export const store = {
  currentUser: null as any | null,
  currentProfile: null as any | null,
  API_URL: '/api',
}

export const adminStore = {
  sellers: [] as any[],
  dailyMetrics: [] as any[],
  meta: { d: { tr: 60, cl: 20 }, w: { tr: 300, cl: 100 }, m: { tr: 1200, cl: 400 } },
  tab: 'd',
  filter: 'all',
}
