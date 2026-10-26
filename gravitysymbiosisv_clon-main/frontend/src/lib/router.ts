export class Router {
  routes: any[] = []
  currentRoute: any = null
  defaultRoute: string
  onRouteChange: ((route: any) => void) | null
  private _boundHandler: () => void
  private _boundClickHandler: (e: MouseEvent) => void
  // ponytail: nav token para detectar operaciones async obsoletas
  navToken: number = 0
  constructor(options: { default?: string; onRouteChange?: (route: any) => void } = {}) {
    this.defaultRoute = options.default || '/dashboard'
    this.onRouteChange = options.onRouteChange || null
    this._boundHandler = this._handlePopState.bind(this)
    this._boundClickHandler = this._handleLinkClick.bind(this)

    window.addEventListener('popstate', this._boundHandler)
    window.addEventListener('load', this._boundHandler)
    document.addEventListener('click', this._boundClickHandler)
  }

  add(pattern: string, config: any) {
    const keys: string[] = []
    const regexStr = pattern.replace(/:([^/]+)/g, (_: string, key: string) => {
      keys.push(key)
      return '([^/]+)'
    })
    this.routes.push({
      pattern,
      regex: new RegExp(`^${regexStr}$`),
      keys,
      config
    })
    return this
  }

  navigate(path: string) {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path)
      this._handlePopState()
    }
  }

  refresh() {
    this._handlePopState()
  }

  getPath(): string {
    let path = window.location.pathname
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1)
    }
    if (!path) {return this.defaultRoute}
    return path
  }

  resolve(path: string): { route: any; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const match = path.match(route.regex)
      if (match) {
        const params: Record<string, string> = {}
        route.keys.forEach((key: string, i: number) => {
          params[key] = decodeURIComponent(match[i + 1])
        })
        return { route, params }
      }
    }
    return null
  }

  async _handlePopState() {
    const path = this.getPath()
    const resolved = this.resolve(path)
    if (!resolved) {
      console.warn(`Ruta no encontrada: "${path}", redirigiendo a ${this.defaultRoute}`)
      this.navigate(this.defaultRoute)
      return
    }
    const { route, params } = resolved
    if (route.config.guard) {
      const allowed = route.config.guard(params)
      if (!allowed) {
        console.warn(`Guard denegó acceso a "${path}"`)
        this.navigate(this.defaultRoute)
        return
      }
    }
    this.navToken++
    // ponytail: capturar el token ANTES del await para que cada llamada async use su propio snapshot
    const token = this.navToken
    this.currentRoute = { path, ...route.config, params }
    this._showView(route.config.view)
    if (this.onRouteChange) { await this.onRouteChange(this.currentRoute) }
    // Si el token cambió durante el await (otra navegación ocurrió), no llamar el init
    if (this.navToken !== token) { return }
    if (route.config.init) { route.config.init(params, token) }
  }

  /** Devuelve true si el token dado sigue siendo el de la navegación actual. */
  isCurrentNav(token: number): boolean {
    return this.navToken === token
  }

  private _showView(viewId: string) {
    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.add('hidden')
    })
    const targetEl = document.getElementById(viewId)
    if (targetEl) {targetEl.classList.remove('hidden')}
    const appContainer = document.getElementById('app-container')
    if (viewId === 'view-landing') {
      if (appContainer) { appContainer.classList.add('hidden') }
    }
  }

  private _handleLinkClick(e: MouseEvent) {
    const target = (e.target as HTMLElement).closest('a')
    if (target && target.hasAttribute('href') && target.getAttribute('href')!.startsWith('/')) {
      e.preventDefault()
      this.navigate(target.getAttribute('href')!)
    }
  }

  destroy() {
    window.removeEventListener('popstate', this._boundHandler)
    document.removeEventListener('click', this._boundClickHandler)
  }
}

export function createAppRouter(options: any = {}) {
  const router = new Router({
    default: options.defaultRoute || '/dashboard',
    onRouteChange: options.onRouteChange
  })

  router.add('/', { view: 'view-landing', init: options.onLanding })
  router.add('/login', { view: 'view-landing', init: options.onLanding })
  router.add('/register', { view: 'view-landing', init: options.onLanding })
  router.add('/recovery-password', { view: 'view-landing', init: options.onLanding })
  router.add('/reset-password', { view: 'view-landing', init: options.onResetPassword })
  router.add('/dashboard', { view: 'view-dashboard', init: options.onDashboard })
  router.add('/alfred-ai', { view: 'view-alfred', init: options.onAlfred })
  router.add('/entrenador', { view: 'view-trainer', init: options.onTrainer })
  router.add('/closer-elite', { view: 'view-closer', init: options.onCloser })
  router.add('/clients', { view: 'view-clients', init: options.onClients })
  router.add('/products', { view: 'view-products', init: options.onProducts })
  router.add('/base-conocimiento', { view: 'view-knowledge', init: options.onKnowledge })
  router.add('/shadow', { view: 'view-copilot', init: options.onCopilot })
  router.add('/bienestar', { view: 'view-wellness', init: options.onWellness })
  router.add('/perfil', { view: 'view-profile', init: options.onProfile })
  router.add('/admin/dashboard', { view: 'view-dashboard-admin', init: options.onAdminDashboard })
  router.add('/admin/users', { view: 'view-admin-users', init: options.onAdminUsers })
  router.add('/admin/metrics', { view: 'view-admin-metrics', init: options.onAdminMetrics })
  router.add('/admin/audit', { view: 'view-admin-audit', init: options.onAdminAudit })
  router.add('/admin/company', { view: 'view-admin-company', init: options.onAdminCompany })
  router.add('/admin/company/invitations', { view: 'view-admin-invitations', init: options.onAdminInvitations })
  router.add('/admin/whitelist', { view: 'view-admin-whitelist', init: options.onAdminWhitelist })
  router.add('/admin/knowledge', { view: 'view-admin-knowledge', init: options.onAdminKnowledge })
  router.add('/knowledge-admin', { view: 'view-admin-knowledge', init: options.onAdminKnowledge })
  router.add('/admin-users', { view: 'view-admin-users', init: options.onAdminUsers })
  router.add('/admin-metrics', { view: 'view-admin-metrics', init: options.onAdminMetrics })
  router.add('/admin-audit', { view: 'view-admin-audit', init: options.onAdminAudit })
  router.add('/admin-company', { view: 'view-admin-company', init: options.onAdminCompany })
  router.add('/admin-invitations', { view: 'view-admin-invitations', init: options.onAdminInvitations })
  router.add('/request-demo', { view: 'view-landing', init: options.onRequestDemo })
  router.add('/privacy', { view: 'view-landing', init: options.onPrivacy })
  router.add('/terms', { view: 'view-landing', init: options.onTerms })
  router.add('/contact', { view: 'view-landing', init: options.onContact })

  // ── LAB — clones sin permisos (solo pruebas locales) ──
  router.add('/lab', { view: 'view-test-login', init: options.onTestLogin })
  router.add('/lab/login', { view: 'view-test-login', init: options.onTestLogin })
  router.add('/lab/dashboard', { view: 'view-dashboard', init: options.onTestDashboard })
  router.add('/lab/app', { view: 'view-dashboard', init: options.onTestDashboard })
  router.add('/lab/alfred-ai', { view: 'view-alfred', init: options.onTestTrainer })
  router.add('/lab/entrenador', { view: 'view-trainer', init: options.onTestTrainer })
  router.add('/lab/closer-elite', { view: 'view-closer', init: options.onTestCloser })
  router.add('/lab/base-conocimiento', { view: 'view-knowledge', init: options.onTestKnowledge })
  router.add('/lab/shadow', { view: 'view-copilot', init: options.onTestCopilot })
  router.add('/lab/bienestar', { view: 'view-wellness', init: options.onTestWellness })
  router.add('/lab/perfil', { view: 'view-profile', init: options.onTestProfile })
  router.add('/lab/clients', { view: 'view-clients', init: options.onTestClients })
  router.add('/lab/products', { view: 'view-products', init: options.onTestProducts })

  return router
}

export const SIDEBAR_MAP: Record<string, string> = {
  'dashboard': '/dashboard',
  'alfred': '/alfred-ai',
  'trainer': '/entrenador',
  'closer': '/closer-elite',
  'clients': '/clients',
  'products': '/products',
  'knowledge': '/base-conocimiento',
  'copilot': '/shadow',
  'wellness': '/bienestar',
  'profile': '/perfil',
  'admin-users': '/admin/users',
  'admin-metrics': '/admin/metrics',
  'admin-audit': '/admin/audit',
  'admin-company': '/admin/company',
  'admin-invitations': '/admin/company/invitations',
  'superadmin-companies': '/admin/company',
  'superadmin-users': '/admin/users',
  'superadmin-whitelist': '/admin/whitelist',
  'superadmin-knowledge': '/admin/knowledge',
  'knowledge-admin': '/knowledge-admin',
}

export function setupSidebarNavigation(router: Router) {
  document.querySelectorAll('.nav-item[data-target]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault()
      const target = (item as HTMLElement).dataset.target
      const route = SIDEBAR_MAP[target!]
      if (route) {router.navigate(route)}
    })
  })
}
