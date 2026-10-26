# GRAVITY SYMBIOSIS — Design System Completo

> Documentación técnica del sistema de diseño de la plataforma Gravity Symbiosis.
> Última actualización: Septiembre 2026.

---

## Índice

1. [Paleta de Colores](#1-paleta-de-colores)
2. [Tipografía](#2-tipografía)
3. [Espaciado y Layout](#3-espaciado-y-layout)
4. [Componentes](#4-componentes)
5. [Efectos y Animaciones](#5-efectos-y-animaciones)
6. [Especiales de Fondo](#6-especiales-de-fondo)
7. [Cursor Personalizado](#7-cursor-personalizado)
8. [Elementos Interactivos](#8-elementos-interactivos)
9. [Modo Claro / Oscuro](#9-modo-claro--oscuro)
10. [Sistema de Iconos](#10-sistema-de-iconos)
11. [Breakpoints Responsivos](#11-breakpoints-responsivos)
12. [Escala de Border Radius](#12-escala-de-border-radius)
13. [Escala de Box Shadow](#13-escala-de-box-shadow)
14. [Z-Index Scale](#14-z-index-scale)
15. [Paleta del Admin Dashboard](#15-paleta-del-admin-dashboard)
16. [Colores de Calendario Heat-Map](#16-colores-de-calendario-heat-map)
17. [Tokens de Tailwind](#17-tokens-de-tailwind)

---

## 1. Paleta de Colores

### 1.1 Variables CSS — Landing Page (`main.css`)

| Token | Valor | Descripción |
|-------|-------|-------------|
| `--void` | `#020408` | Fondo principal, casi negro con tono azulado profundo |
| `--deep` | `#040d1a` | Fondo secundario, azul marino muy oscuro |
| `--plasma` | `#2ccd70` | Verde primario, color accent principal |
| `--fire` | `#28D20F` | Verde neón, hover / acento activo |
| `--gold` | `#00FF66` | Verde brillante, acento terciario / badges |
| `--white` | `#e8eef8` | Texto principal, blanco con tinte azul frío |
| `--dim` | `rgba(232, 238, 248, 0.45)` | Texto secundario / deshabilitado |
| `--grid` | `rgba(44, 205, 112, 0.06)` | Color de las líneas de la grid overlay |
| `--glow-c` | `rgba(44, 205, 112, 0.18)` | Glow del color plasma |
| `--glow-f` | `rgba(40, 210, 15, 0.18)` | Glow del color fire |

### 1.2 Variables CSS — Dashboard (`dashboard.css`)

| Token | Valor HSL | Descripción |
|-------|-----------|-------------|
| `--background` | `0 0% 0%` | Fondo puro negro |
| `--foreground` | `145 60% 90%` | Texto principal, verde esmeralda muy claro |
| `--card` | `0 0% 5%` | Fondo de tarjetas, gris ultra oscuro |
| `--card-foreground` | `145 60% 80%` | Texto de tarjetas |
| `--popover` | `0 0% 5%` | Fondo de popovers |
| `--popover-foreground` | `145 60% 90%` | Texto de popovers |
| `--primary` | `145 63% 49%` | Verde esmeralda `#2ecc70` — color principal |
| `--primary-foreground` | `0 0% 0%` | Texto sobre primary (negro) |
| `--secondary` | `0 0% 15%` | Gris oscuro para fondos secundarios |
| `--secondary-foreground` | `145 60% 70%` | Texto sobre secondary |
| `--muted` | `0 0% 20%` | Gris para estados muted |
| `--muted-foreground` | `145 40% 50%` | Texto muted, verde apagado |
| `--accent` | `0 0% 20%` | Accent oscuro |
| `--accent-foreground` | `145 60% 80%` | Texto sobre accent |
| `--destructive` | `0 100% 50%` | Rojo para errores / eliminar |
| `--destructive-foreground` | `0 0% 100%` | Texto sobre destructive (blanco) |
| `--border` | `145 63% 20%` | Bordes verdes oscuros |
| `--input` | `145 63% 10%` | Bordes de inputs |
| `--ring` | `145 63% 49%` | Focus ring, igual a primary |
| `--radius` | `0.5rem` | Radio de border base |
| `--sidebar-width` | `260px` | Ancho del sidebar |
| `--topbar-height` | `64px` | Altura del topbar |

### 1.3 Variables CSS — Admin Dashboard (scoped)

| Token | Valor | Descripción |
|-------|-------|-------------|
| `--green` | `#00ff88` | Verde admin primario |
| `--green-dim` | `#00ff2215` | Verde admin con opacidad baja |
| `--green-border` | `#00ff2240` | Bordes verdes admin |
| `--blue` | `#3399ff` | Azul informativo |
| `--purple` | `#aa44ff` | Púrpura para badges elite |
| `--amber` | `#ffaa00` | Ámbar / warning |
| `--red` | `#ff4455` | Rojo destructivo admin |
| `--bg` | `#0a0a0b` | Fondo admin |
| `--bg2` | `#111113` | Fondo secundario admin |
| `--bg3` | `#161618` | Fondo terciario admin |
| `--bg4` | `#1c1c1f` | Fondo cuaternario admin |
| `--border` | `#1e1e22` | Borde admin |
| `--border2` | `#2a2a2e` | Borde secundario admin |
| `--text` | `#e2e2e6` | Texto admin principal |
| `--text2` | `#8888a0` | Texto admin secundario |
| `--text3` | `#444455` | Texto admin terciario / deshabilitado |

### 1.4 Tailwind Config (index.html)

```js
colors: {
  background: 'hsl(0, 0%, 0%)',
  primary: 'hsl(145, 63%, 49%)',
  secondary: 'hsl(0, 0%, 10%)',
  accent: 'hsl(145, 63%, 25%)',
}
```

### 1.5 Modo Claro — Dashboard

| Token | Valor HSL |
|-------|-----------|
| `--background` | `0 0% 98%` |
| `--foreground` | `220 15% 10%` |
| `--card` | `0 0% 100%` |
| `--card-foreground` | `220 15% 15%` |
| `--border` | `220 15% 88%` |
| `--secondary` | `220 15% 94%` |
| `--muted` | `220 15% 90%` |
| `--muted-foreground` | `220 10% 40%` |
| `--input` | `220 15% 95%` |

---

## 2. Tipografía

### 2.1 Fuentes Importadas

| Fuente | Pesos | Uso Principal |
|--------|-------|---------------|
| **Inter** | 300, 400, 500, 600, 700 | Texto del dashboard, UI general |
| **Orbitron** | 400, 500, 700, 900 | Títulos de sección del dashboard, badges de nivel |
| **Rajdhani** | 400, 500, 600, 700 | Valores numéricos en stat cards |
| **Bebas Neue** | — | Títulos Hero, números grandes, títulos de sección landing |
| **Michroma** | — | Logo principal y sub-logo |
| **Syne** | 400, 700, 800 | Texto del body landing, títulos problema |
| **JetBrains Mono** | 300, 400 | Navegación, labels, texto mono, badges |

### 2.2 Font Families por Contexto

| Contexto | Familia | CSS |
|----------|---------|-----|
| Body landing | `'Syne', sans-serif` | `main.css:27` |
| Body dashboard | `'Inter', sans-serif` | `dashboard.css:50` |
| Logo principal | `'Michroma', sans-serif` | `main.css:125` |
| Logo sub | `'Michroma', sans-serif` | `main.css:136` |
| Nav links | `'JetBrains Mono', monospace` | `main.css:161` |
| Hero title | `'Bebas Neue', sans-serif` | `main.css:254` |
| Section tags | `'JetBrains Mono', monospace` | `main.css:426` |
| Section titles | `'Bebas Neue', sans-serif` | `main.css:437` |
| Module names | `'Bebas Neue', sans-serif` | `main.css:598` |
| Module labels | `'JetBrains Mono', monospace` | `main.css:584` |
| Buttons primary | `'JetBrains Mono', monospace` | `main.css:311` |
| Stat numbers | `'Bebas Neue', sans-serif` | `main.css:371` |
| Stat labels | `'JetBrains Mono', monospace` | `main.css:379` |
| Price values | `'Bebas Neue', sans-serif` | `main.css:1072` |
| Footer logo | `'Michroma', sans-serif` | `main.css:1219` |
| Dashboard titles | `'Orbitron', sans-serif` | Tailwind class `font-orbitron` |
| Stat values | `'Rajdhani', sans-serif` | `dashboard.css:291` |
| Admin stats | `'Barlow Condensed', sans-serif` | `--cond` admin |
| Admin mono | `'Share Tech Mono', monospace` | `--mono` admin |
| Admin sans | `'Barlow', sans-serif` | `--sans` admin |
| Dune Rise text | `'Orbitron', sans-serif` | `dashboard.css:448` |

### 2.3 Jerarquía de Tamaños — Landing

| Elemento | Tamaño | Peso | Letter-Spacing | Text Transform |
|----------|--------|------|----------------|----------------|
| Logo principal | `1.6rem` | 400 | `12px` | uppercase |
| Logo sub | `0.55rem` | — | `8px` | uppercase |
| Hero title | `clamp(5rem, 14vw, 14rem)` | — | `2px` | uppercase |
| Hero eyebrow | `0.7rem` | — | `6px` | uppercase |
| Hero subtitle | `clamp(1rem, 2vw, 1.35rem)` | 400 | — | — |
| Section tag | `0.65rem` | — | `5px` | uppercase |
| Section title | `clamp(3rem, 7vw, 7rem)` | — | `1px` | uppercase |
| Module label | `0.6rem` | — | `4px` | uppercase |
| Module name | `2.2rem` | — | `2px` | — |
| Module desc | `0.88rem` | — | — | — |
| Stat number | `3rem` | — | — | — |
| Stat label | `0.65rem` | — | `3px` | uppercase |
| Problem number | `5rem` | — | — | — |
| Problem title | `1.2rem` | 800 | — | — |
| Button primary | `0.8rem` | 700 | `3px` | uppercase |
| Button secondary | `0.8rem` | 400 | `3px` | uppercase |
| Nav link | `0.75rem` | — | `2px` | uppercase |
| Price value | `5rem` | — | — | — |
| Price period | `0.8rem` | — | — | — |
| Price features | `0.88rem` | — | — | — |
| Footer logo | `0.75rem` | — | `6px` | uppercase |
| Footer copy | `0.65rem` | — | `2px` | — |
| Footer links | `0.65rem` | — | `2px` | uppercase |
| CTA title | `clamp(4rem, 10vw, 11rem)` | — | `1px` | uppercase |
| Symbiosis title | `clamp(3.5rem, 8vw, 9rem)` | — | `1px` | uppercase |
| Alfred title | `clamp(3rem, 5vw, 5rem)` | — | `2px` | — |
| Alfred badge | `0.65rem` | — | `4px` | uppercase |

### 2.4 Jerarquía de Tamaños — Dashboard

| Elemento | Tamaño | Peso | Font Family |
|----------|--------|------|-------------|
| Dashboard title (h1) | `1.875rem` (3xl) | 900 | Orbitron |
| Section header | `1.125rem` (lg) | 700 | Orbitron |
| Card title (h3) | `0.875rem` (sm) | 700 | Orbitron |
| Stat value | `2.5rem` | 700 | Rajdhani |
| Stat label | `0.875rem` | 500 | Inter |
| Nav item | `0.875rem` | 500 | Inter |
| Section tag | `9px` | 400 | Share Tech Mono |
| Section title admin | `13px` | 600 | Barlow Condensed |
| Table header | `9px` | 400 | Share Tech Mono |
| Table cell | `12px` | — | — |
| Level badge | `8px` | — | Share Tech Mono |
| Rank number | `11px` | — | Share Tech Mono |
| Progress bar label | `10px` | — | — |
| Sidebar label | `12px` | — | — |
| Topbar title | `1rem` | 600 | Inter |

### 2.5 Tailwind Font Families

```js
fontFamily: {
  sans: ['Inter', 'sans-serif'],
  orbitron: ['Orbitron', 'sans-serif'],
  rajdhani: ['Rajdhani', 'sans-serif'],
}
```

---

## 3. Espaciado y Layout

### 3.1 Contenedores Principales

| Elemento | Padding | Descripción |
|----------|---------|-------------|
| `nav` | `20px 60px` | Navegación landing |
| `#hero` | `140px 40px 80px` | Sección hero |
| `#problem` | `140px 60px` | Sección problema |
| `#modules` | `140px 60px` | Sección módulos |
| `#symbiosis` | `140px 60px` | Sección symbiosis |
| `#how` | `140px 60px` | Sección cómo funciona |
| `#pricing` | `140px 60px` | Sección pricing |
| `#cta` | `140px 60px` | Sección CTA |
| `footer` | `48px 60px` | Footer |
| `.content-area` | `2rem` | Área de contenido dashboard |
| `.card` (dashboard) | `1.5rem` | Tarjetas dashboard |
| `.sidebar-nav` | `1rem` | Navegación sidebar |
| `#view-trainer` | `1rem` | Vista entrenador |
| `#view-closer` | `1rem` | Vista closer |

### 3.2 Grids

| Grid | Columnas | Gap | Uso |
|------|----------|-----|-----|
| `.problem-grid` | `1fr 1fr 1fr` | `2px` | Tarjetas de problema |
| `.modules-grid` | `repeat(3, 1fr)` | `2px` | Tarjetas de módulos |
| `.modules-header` | `1fr 1fr` | `80px` | Header de módulos |
| `.symbiosis-metrics` | `repeat(3, 1fr)` | `2px` | Métricas de symbiosis |
| `.pricing-cards` | `repeat(2, 1fr)` | `2px` | Tarjetas de precio |
| `.how-grid` | `1fr 2fr` | `80px` | Cómo funciona |
| Dashboard main | `1fr 12fr` (lg) | `8px` | Layout principal |
| Stats grid | `repeat(auto-fit, minmax(240px, 1fr))` | `1.5rem` | Stat cards |
| `.stats-grid` | `repeat(2, 1fr)` | `0.75rem` | Stats móvil |
| `.orbit-center` | — | — | Centro orbital symbiosis |
| `.symbiosis-orbit` | `420px x 420px` | — | Orbital animation |

### 3.3 Flexbox

| Contexto | Dirección | Gap | Alineación |
|----------|-----------|-----|------------|
| `nav` | row | — | `space-between` |
| `.nav-links` | row | `40px` | — |
| `.nav-actions` | row | `16px` | `center` |
| `.hero-actions` | row | `20px` | — |
| `.hero-stats` | row | `60px` | — |
| `.alfred-features` | column | `16px` | — |
| `.footer-links` | row | `32px` | — |
| Sidebar nav items | column | `0.25rem` | — |
| Topbar | row | — | `space-between` |
| Calendar mode buttons | row | `1px` | — |
| Activity mode pills | row | `1px` | — |

### 3.4 Anchos Máximos

| Elemento | Max-Width |
|----------|-----------|
| Hero subtitle | `640px` |
| Symbiosis subtitle | `600px` |
| Symbiosis metrics | `900px` |
| Pricing cards | `700px` |
| CTA subtitle | `520px` |
| Alfred features | — |
| How visual | `500px` (text) |
| Alfred quiz container | `48rem` (768px) |
| Dashboard content | `100%` |
| Closer Elite X input | `48rem` |
| Knowledge grid | `72rem` (max-w-6xl) |

---

## 4. Componentes

### 4.1 Botones

#### `.btn-primary` (Landing)
```css
font-family: 'JetBrains Mono', monospace;
font-size: 0.8rem;
letter-spacing: 3px;
text-transform: uppercase;
font-weight: 700;
color: var(--void);
background: var(--plasma);
border: none;
padding: 18px 44px;
cursor: none;
clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
/* Hover */
background: var(--fire);
box-shadow: 0 0 50px var(--fire), 0 0 100px rgba(40, 210, 15, 0.3);
transform: translateY(-3px) scale(1.03);
```

#### `.btn-secondary` (Landing)
```css
font-family: 'JetBrains Mono', monospace;
font-size: 0.8rem;
letter-spacing: 3px;
text-transform: uppercase;
font-weight: 400;
color: var(--plasma);
background: transparent;
border: 1px solid rgba(44, 205, 112, 0.3);
padding: 18px 44px;
cursor: none;
clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
/* Hover */
background: rgba(44, 205, 112, 0.08);
border-color: var(--plasma);
box-shadow: 0 0 30px var(--glow-c);
```

#### `.btn-primary` (Dashboard)
```css
background-color: hsl(var(--primary));
color: hsl(var(--primary-foreground));
font-family: inherit;
letter-spacing: normal;
text-transform: none;
clip-path: none;
cursor: pointer;
/* Hover */
background-color: hsl(var(--primary) / 0.9);
box-shadow: 0 0 15px hsl(var(--primary) / 0.4);
```

#### `.btn-secondary` (Dashboard)
```css
background-color: hsl(var(--secondary));
color: hsl(var(--secondary-foreground));
/* Hover */
background-color: hsl(var(--secondary) / 0.8);
```

#### `.btn-ghost` (Dashboard)
```css
background-color: transparent;
color: hsl(var(--foreground));
/* Hover */
background-color: hsl(var(--muted));
```

#### `.nav-cta` (Landing nav)
```css
font-family: 'JetBrains Mono', monospace;
font-size: 0.75rem;
letter-spacing: 2px;
text-transform: uppercase;
color: var(--void);
background: var(--plasma);
border: none;
padding: 12px 28px;
cursor: none;
font-weight: 700;
clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
/* Hover */
background: var(--fire);
box-shadow: 0 0 30px var(--fire);
transform: translateY(-2px);
```

#### `.nav-login` (Landing nav)
```css
font-family: 'JetBrains Mono', monospace;
font-size: 0.75rem;
letter-spacing: 2px;
text-transform: uppercase;
color: var(--plasma);
background: rgba(44, 205, 112, 0.15);
border: none;
padding: 12px 28px;
font-weight: 700;
clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
/* Hover */
background: rgba(44, 205, 112, 0.25);
box-shadow: 0 0 15px var(--glow-c);
transform: translateY(-2px);
```

#### `.price-btn` (Pricing)
```css
font-family: 'JetBrains Mono', monospace;
font-size: 0.7rem;
letter-spacing: 3px;
text-transform: uppercase;
font-weight: 700;
color: var(--plasma);
border: 1px solid rgba(44, 205, 112, 0.3);
padding: 14px 28px;
clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
/* Hover / .featured */
background: var(--plasma);
color: var(--void);
border-color: var(--plasma);
box-shadow: 0 0 30px var(--glow-c);
```

#### Nota: `clip-path` en Landing
Todos los botones de landing usan `clip-path: polygon()` para crear un corte diagonal en las esquinas:
- Botones grandes: `polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)`
- Botones medianos: `polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)`
- Botones pequeños: `polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)`

Los botones del dashboard **NO** usan clip-path (son redondeados normales).

### 4.2 Tarjetas

#### `.card` (Dashboard)
```css
background-color: hsl(var(--card));
color: hsl(var(--card-foreground));
border: 1px solid hsl(var(--border));
border-radius: var(--radius); /* 0.5rem */
padding: 1.5rem;
box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
transition: transform 0.2s ease, box-shadow 0.2s ease;
/* Hover */
transform: translateY(-2px);
box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
border-color: hsl(var(--primary) / 0.5);
```

#### Glassmorphism (Dashboard Cards)
```css
.view-section#view-dashboard .card {
  background: hsla(var(--card), 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid hsla(var(--border), 0.3);
}
```

#### `.problem-card` (Landing)
```css
background: rgba(40, 210, 15, 0.04);
border: 1px solid rgba(40, 210, 15, 0.15);
padding: 48px 40px;
/* Hover */
background: rgba(40, 210, 15, 0.08);
```
- Pseudo-elemento `::before`: línea gradiente horizontal superior con `opacity: 0` → `1` en hover.

#### `.module-card` (Landing)
```css
background: rgba(44, 205, 112, 0.02);
border: 1px solid rgba(44, 205, 112, 0.08);
padding: 48px 40px;
transition: all .5s cubic-bezier(.25, .46, .45, .94);
/* Hover */
border-color: rgba(44, 205, 112, 0.3);
transform: translateY(-4px);
background: rgba(44, 205, 112, 0.04);
```
- Pseudo-elemento `::after`: radial-gradient desde arriba con `opacity: 0` → `1`.

#### `.price-card` (Landing)
```css
padding: 56px 40px;
border: 1px solid rgba(44, 205, 112, 0.08);
background: rgba(44, 205, 112, 0.02);
/* Featured */
border-color: rgba(44, 205, 112, 0.3);
background: rgba(44, 205, 112, 0.05);
/* Hover */
border-color: rgba(44, 205, 112, 0.25);
transform: translateY(-4px);
```

#### `.metric` (Symbiosis)
```css
padding: 48px 32px;
border: 1px solid rgba(44, 205, 112, 0.08);
background: rgba(44, 205, 112, 0.02);
/* Hover */
background: rgba(44, 205, 112, 0.05);
```
- Pseudo-elemento `::before`: línea gradiente inferior con `opacity: 0` → `1`.

### 4.3 Inputs

#### `.input` (Dashboard)
```css
width: 100%;
padding: 0.75rem;
border-radius: var(--radius);
background-color: hsl(var(--background));
border: 1px solid hsl(var(--input));
color: hsl(var(--foreground));
margin-bottom: 1rem;
/* Focus */
border-color: hsl(var(--primary));
outline: none;
box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
```

#### `.demo-input` (Landing forms)
```css
width: 100%;
background: rgba(0,0,0,0.6);
border: 1px solid rgba(44,205,112,0.15);
color: var(--white);
padding: 14px 16px;
font-family: 'Syne', sans-serif;
font-size: 0.9rem;
border-radius: 8px;
outline: none;
/* Focus */
border-color: var(--plasma);
box-shadow: 0 0 20px rgba(44,205,112,0.1), inset 0 0 20px rgba(44,205,112,0.03);
background: rgba(0,0,0,0.8);
```

### 4.4 Navegación

#### Sidebar (Dashboard)
```css
width: var(--sidebar-width); /* 260px */
background-color: hsla(var(--card), 0.15);
backdrop-filter: blur(20px);
border-right: 1px solid hsl(var(--border) / 0.3);
position: fixed;
transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease;
```
- **Colapsado**: `width: 80px` — oculta labels y texto.
- **Móvil**: `transform: translateX(-100%)` — se oculta completamente.
- **Móvil abierto**: `transform: translateX(0)`.

#### `.nav-item` (Sidebar)
```css
display: flex;
align-items: center;
gap: 0.75rem;
padding: 0.75rem 1rem;
border-radius: var(--radius);
color: hsl(var(--muted-foreground));
font-weight: 500;
margin-bottom: 0.25rem;
/* Hover / Active */
background-color: hsl(var(--primary) / 0.1);
color: hsl(var(--primary));
```

#### Topbar (Dashboard)
```css
height: var(--topbar-height); /* 64px */
background-color: hsla(var(--background), 0.8);
backdrop-filter: blur(8px);
border-bottom: 1px solid hsl(var(--border));
padding: 0 1.5rem;
position: sticky;
top: 0;
```

#### Nav (Landing)
```css
position: fixed;
top: 0;
display: flex;
align-items: center;
justify-content: space-between;
padding: 20px 60px;
border-bottom: 1px solid rgba(44, 205, 112, 0.08);
backdrop-filter: blur(20px);
background: rgba(2, 4, 8, 0.6);
```

### 4.5 Badges

#### `.role-badge`
```css
padding: 2px 8px;
border-radius: 12px;
font-size: 0.7rem;
text-transform: uppercase;
font-weight: bold;
```
- `.admin`: `background: hsl(var(--destructive)); color: white`
- `.user`: `background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground))`

#### Level Badges (Admin Dashboard)
```css
.lv-master: background: #1a003a; color: #cc44ff; border: 1px solid #8822cc55
.lv-elite:  background: #001a08; color: #00cc44; border: 1px solid #009933aa
.lv-agente: background: #001233; color: #3399ff; border: 1px solid #1166cc88
.lv-novato: background: #111;     color: #555;    border: 1px solid #222
```

#### `.section-tag` (Landing)
```css
font-family: 'JetBrains Mono', monospace;
font-size: 0.65rem;
letter-spacing: 5px;
text-transform: uppercase;
color: var(--fire);
display: block;
```

#### `.nav-badge` (Admin)
```css
font-family: var(--mono);
font-size: 9px;
letter-spacing: 2px;
padding: 3px 10px;
border: 1px solid var(--green-border);
background: var(--green-dim);
color: var(--green);
```

#### `.pilot-badge` (Landing CTA)
```css
display: inline-flex;
align-items: center;
gap: 12px;
border: 1px solid rgba(0, 255, 102, 0.3);
background: rgba(0, 255, 102, 0.04);
padding: 12px 24px;
font-family: 'JetBrains Mono', monospace;
font-size: 0.7rem;
letter-spacing: 2px;
color: var(--gold);
```

### 4.6 Módulo Iconos

```css
.module-icon {
  width: 52px;
  height: 52px;
  border: 1px solid rgba(44, 205, 112, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(44, 205, 112, 0.06);
  font-size: 1.3rem;
  clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.module-icon.fire {
  border-color: rgba(40, 210, 15, 0.3);
  background: rgba(40, 210, 15, 0.06);
}
```

### 4.7 Progress Bars

#### Dashboard Progress Bar
```css
/* Container */
w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden border border-white/5
/* Fill */
h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500 ease-out
  shadow-[0_0_10px_rgba(46,204,112,0.3)]
```

#### Admin Bar Fill
```css
.bar-track {
  flex: 1;
  min-width: 55px;
  height: 3px;
  background: var(--bg4);
  border-radius: 2px;
}
.bar-fill {
  height: 3px;
  border-radius: 2px;
  transition: width .4s ease;
}
```

### 4.8 Calendar Heat-Map Cells

```css
.weekly-cell {
  transition: opacity 0.2s ease, transform 0.1s ease;
  border-radius: 3px;
  cursor: pointer;
}
.weekly-cell:hover {
  opacity: 1 !important;
  transform: scale(1.12);
  box-shadow: 0 0 8px currentColor;
}
```

### 4.9 Scrollbar Custom

```css
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsla(var(--primary), 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsla(var(--primary), 0.4);
}
```

### 4.10 Auth Modal

```css
#auth-modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
```

---

## 5. Efectos y Animaciones

### 5.1 Keyframes

#### `fadeUp`
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
**Uso**: Hero elements con delays progresivos (0.3s, 0.5s, 0.7s, 0.9s, 1.1s).

#### `fadeIn`
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```
**Uso**: Scroll hint con delay 2s.

#### `spin`
```css
@keyframes spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}
```
**Uso**: Orbit rings de symbiosis y loader spinner.

#### `scrollPulse`
```css
@keyframes scrollPulse {
  0%, 100% { opacity: .3; transform: scaleY(1); }
  50%      { opacity: 1; transform: scaleY(1.2); }
}
```
**Uso**: Línea de scroll indicator en hero.

#### `pulse`
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: .4; transform: scale(0.8); }
}
```
**Uso**: Live dot admin, dot de pilot badge, loading dots.

#### `float`
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}
```
**Uso**: Elementos flotantes decorativos.

#### `scanline`
```css
@keyframes scanline {
  0%   { top: -2px; }
  100% { top: 100%; }
}
```
**Uso**: Efecto de línea de escaneo en `.scanline-wrap`.

#### `sweep` (Dashboard)
```css
@keyframes sweep {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```
**Uso**: Radar sweep en dashboard visual.

#### `bounce-in` (Dashboard)
```css
@keyframes bounce-in {
  0%   { transform: scale(0.9); opacity: 0; }
  70%  { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
```
**Uso**: `.animate-bounce-in` para Alfred question options.

### 5.2 Scroll Reveal

```css
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: all .8s cubic-bezier(.25, .46, .45, .94);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```
Activado por `IntersectionObserver` con `threshold: 0.12`.

### 5.3 Transiciones Base

| Contexto | Transición |
|----------|------------|
| Nav links hover | `color .3s` |
| Buttons hover | `all .3s` |
| Module card hover | `all .5s cubic-bezier(.25, .46, .45, .94)` |
| Problem card hover | `all .4s` |
| Card hover (dashboard) | `transform 0.2s ease, box-shadow 0.2s ease` |
| Nav item hover | `all 0.2s ease` |
| Sidebar collapse | `width 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease` |
| Topbar | `all 0.4s ease` |
| Content area | `padding 0.4s ease` |
| Alfred option hover | `all duration-300` |
| Training progress bar | `all duration-1000` |
| Orb glow | `all duration-1000` |
| Cursor ring | `transform .35s cubic-bezier(.25, .46, .45, .94)` |
| Cursor dot | `transform .15s ease, opacity .15s ease` |
| Weekly cell hover | `opacity 0.2s ease, transform 0.1s ease` |
| Calendario range buttons | `all .15s` |

### 5.4 Hover States Especiales

#### Card hover elevación
```css
transform: translateY(-2px);
box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
border-color: hsl(var(--primary) / 0.5);
```

#### Button primary hover glow
```css
box-shadow: 0 0 50px var(--fire), 0 0 100px rgba(40, 210, 15, 0.3);
transform: translateY(-3px) scale(1.03);
```

#### Button CTA hover
```css
box-shadow: 0 0 30px var(--fire);
transform: translateY(-2px);
```

#### Module card hover
```css
border-color: rgba(44, 205, 112, 0.3);
transform: translateY(-4px);
background: rgba(44, 205, 112, 0.04);
```

#### Alfred option button hover
```css
/* Scale down on active */
active:scale-[0.98]
/* Inner circle glow */
.group-hover:border-primary/50
.group-hover:bg-primary/20
```

#### Training timer start button
```css
hover:scale-105 active:scale-95
```

---

## 6. Especiales de Fondo

### 6.1 Canvas de Partículas (Landing)

- **Archivo**: `app.ts` (líneas 169-213)
- **Cantidad**: 180 partículas
- **Colores**: `#28D20F` (30%) y `#2ccd70` (70%)
- **Velocidad**: `(random - 0.5) * 0.3` en ambos ejes
- **Radio**: `random * 1.5`
- **Opacidad**: `random * 0.5 + 0.1`
- **Conexiones**: Líneas entre partículas a menos de 100px de distancia
- **Color de conexión**: `#2ccd70` con opacidad `(1 - dist/100) * 0.06`
- **Gradient de fondo**: Radial desde centro, `rgba(44,205,112,0.03)` → transparente

### 6.2 Grid Overlay

```css
.grid-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}
```

### 6.3 Noise Texture

```css
.noise {
  position: fixed;
  inset: 0;
  z-index: 2;
  opacity: 0.03;
  pointer-events: none;
  background-image: url("data:image/svg+xml,..."); /* SVG feTurbulence fractalNoise */
  background-size: 200px 200px;
}
```

### 6.4 Background Canvas

```css
#bg-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  opacity: 0.7;
  pointer-events: none;
}
```

### 6.5 Scanline Effect

```css
.scanline-wrap::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(44, 205, 112, 0.08);
  animation: scanline 4s linear infinite;
  pointer-events: none;
}
```

### 6.6 Orbital Animation (Symbiosis)

```css
.orbit-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(44, 205, 112, 0.1);
  border-radius: 50%;
  animation: spin linear infinite;
}
.ring-1 { width: 200px; height: 200px; animation-duration: 12s; }
.ring-2 { width: 300px; height: 300px; animation-duration: 18s; animation-direction: reverse; }
.ring-3 { width: 400px; height: 400px; animation-duration: 25s; border-style: dashed; }
```

### 6.7 Orbit Center

```css
.orbit-center {
  width: 120px;
  height: 120px;
  border: 1px solid rgba(44, 205, 112, 0.3);
  border-radius: 50%;
  background: rgba(44, 205, 112, 0.05);
  backdrop-filter: blur(10px);
  box-shadow: 0 0 60px rgba(44, 205, 112, 0.15);
}
```

### 6.8 Radar Sweep (Admin Dashboard)

```css
.radar-sweep {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50%;
  height: 2px;
  background: linear-gradient(90deg, hsl(var(--primary)), transparent);
  transform-origin: left center;
  animation: sweep 4s linear infinite;
  z-index: 5;
}
```

---

## 7. Cursor Personalizado

### 7.1 Cursor Dot

```css
#cursor {
  width: 12px;
  height: 12px;
  background: var(--plasma);
  border-radius: 50%;
  position: fixed;
  z-index: 9999;
  mix-blend-mode: screen;
  transition: transform .15s ease, opacity .15s ease;
  box-shadow: 0 0 20px var(--plasma), 0 0 40px var(--plasma);
}
```

### 7.2 Cursor Ring

```css
#cursor-ring {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(44, 205, 112, 0.5);
  border-radius: 50%;
  position: fixed;
  z-index: 9998;
  transition: transform .35s cubic-bezier(.25, .46, .45, .94);
}
```

### 7.3 Comportamiento JS

- El cursor sigue el mouse con `translate()`.
- El ring tiene un lag suave (interpolación lineal en `requestAnimationFrame`): `rx += (mx - rx - 18) * 0.12`.
- Solo visible en la landing page (`cursor: none` en body).
- En el dashboard se usa `cursor: auto`.

### 7.4 Body Cursor

```css
body { cursor: none; } /* Landing */
body { cursor: auto; } /* Dashboard */
```

---

## 8. Elementos Interactivos

### 8.1 Hold-to-Talk Microphone (Trainer)

- **Botón**: `#trainer-mic-btn` — circular, blanco, con glow blanco
- **Touch action**: `none` — previene scroll durante hold
- **User select**: `none` — previene selección de texto
- **Eventos**: `pointerdown` / `pointerup` / `pointercancel` / `lostpointercapture`
- **Pointer Capture**: Usa `setPointerCapture` para evitar `mouseleave` en Chrome/Windows
- **Timeslice**: 250ms para evitar audio vacío en Windows
- **Visual**: `filter: brightness(0.92)` en `:active`

```css
#trainer-mic-btn {
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  /* Clases Tailwind: */
  p-8 rounded-full bg-white text-black
  shadow-[0_0_40px_rgba(255,255,255,0.2)]
}
```

### 8.2 Particle Orb (Trainer)

- **Canvas**: `#trainer-orb-canvas` (400x400)
- **Clases**: `relative z-10 drop-shadow-[0_0_30px_rgba(46,204,112,0.4)]`
- **Estados**: `idle`, `listening`, `processing`, `speaking`
- **Glow exterior**: `#orb-glow-outer` — `bg-emerald-500/10 rounded-full blur-3xl scale-150 opacity-40`

### 8.3 Training Timer Overlay

```css
#training-timer-overlay {
  /* Transición de visibilidad */
  opacity-0 pointer-events-none scale-90 → opacity-100 scale-100
  /* Container */
  bg-black/80 border border-white/5 backdrop-blur-md
  px-6 py-4 rounded-3xl
  border-t-4 border-t-primary/50
  /* Clock */
  font-mono text-3xl font-black text-white tabular-nums tracking-tighter
  /* Start button */
  mt-2 w-full py-2 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-xl
}
```

### 8.4 Chat Drawer (Trainer)

```css
#chat-drawer {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 100%; /* Mobile */
  width: 24rem; /* Desktop: md:w-96 */
  bg-gray-950/95;
  border-left: 1px solid gray-800;
  backdrop-filter: blur-xl;
  transform: translateX-full; /* Oculto por defecto */
  transition: transform 0.3s ease-in-out;
  z-index: 30;
}
```

### 8.5 Alfred Questionnaire Button Ripple

```css
.alfred-opt-btn::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 0; height: 0;
  background: radial-gradient(circle, hsla(var(--primary), 0.2) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  transition: width 0.6s ease, height 0.6s ease;
  border-radius: 50%;
  z-index: 0;
}
.alfred-opt-btn:hover::after {
  width: 300px;
  height: 300px;
}
```

### 8.6 Achievement Toast

- Aparece con `animate-in` y desaparece con `animate-out fade-out slide-out-to-bottom-10` después de 5 segundos.
- Timing: `setTimeout(700ms)` para la animación de salida.

---

## 9. Modo Claro / Oscuro

### 9.1 Implementación

- **Toggle**: Botón `.theme-dashboard-toggle` en dashboard y dashboard-admin
- **Persistencia**: `localStorage.getItem('dashboard-theme')`
- **Clase**: `.light` se agrega a `#view-dashboard` y `#view-dashboard-admin`
- **Tokens**: Se reescriben las variables CSS con valores claros

### 9.2 Alcance

Solo aplica a las vistas de dashboard. El resto de la app (landing, trainer, closer, alfred, etc.) siempre es dark mode.

### 9.3 Forzado de estilos en modo claro

```css
#view-dashboard.light .card,
#view-dashboard-admin.light .card {
  background: hsl(var(--card)) !important;
  color: hsl(var(--card-foreground)) !important;
  border-color: hsl(var(--border)) !important;
}
```

Se aplican overrides con `!important` para:
- Fondos de cards, gradientes personalizados
- Textos (`.text-white`, `.text-gray-300`, `.text-gray-400`)
- Bordes de ranking
- Calendario
- Botones de toggle
- Selectores de rango
- Stat cards

---

## 10. Sistema de Iconos

### 10.1 Iconos SVG Inline

Los iconos se usan como SVG inline con las siguientes propiedades:
- `stroke="currentColor"` — hereda el color del padre
- `stroke-width="2"` o `"2.5"` — variación de grosor
- `stroke-linecap="round"` — terminaciones redondeadas
- `stroke-linejoin="round"` — uniones redondeadas

### 10.2 Iconos Exportados (`Icons.ts`)

| Función | Descripción | Tamaño |
|---------|-------------|--------|
| `IconPlay()` | Triángulo play | 20x20 |
| `IconBolt()` | Rayo | 20x20 |
| `IconBook()` | Libro | 20x20 |
| `IconTarget()` | Target | 20x20 |
| `IconStar()` | Estrella llena | 18x18 |
| `IconSun()` | Sol (modo claro) | 16x16 |
| `IconMoon()` | Luna (modo oscuro) | 16x16 |

### 10.3 Sidebar Icons

Todos los nav items usan SVG inline de 20x20 con `stroke-width="2"`.

---

## 11. Breakpoints Responsivos

### 11.1 Breakpoints CSS

| Breakpoint | Rango | Descripción |
|------------|-------|-------------|
| `max-width: 430px` | 0-430px | iPhone Pro Max — móvil completo |
| `min-width: 431px` y `max-width: 768px` | 431-768px | Tablet |
| `max-width: 768px` | 0-768px | Móvil — sidebar oculto |
| `min-width: 769px` | 769px+ | Desktop — sidebar visible |
| `max-width: 900px` | 0-900px | Landing mobile |
| `max-width: 932px` y `orientation: landscape` | — | Landscape mobile |

### 11.2 Cambios Principales por Breakpoint

#### Mobile (≤430px)
- `body { font-size: 14px; }`
- `h1 { font-size: 1.5rem !important; }`
- `h2 { font-size: 1.25rem !important; }`
- `h3 { font-size: 1rem !important; }`
- `.stat-value { font-size: 1.75rem !important; }`
- `#user-display-name { display: none; }`
- `.card { padding: 1rem !important; border-radius: 1.25rem !important; }`
- `.stats-grid { grid-template-columns: repeat(2, 1fr) !important; }`
- `#achievements-catalog-grid { grid-template-columns: repeat(3, 1fr) !important; }`
- `.trainer-orb-container { transform: scale(0.7); }`
- `.content-area { padding: 1rem !important; }`
- Sidebar se oculta con `transform: translateX(-100%)`
- `#sidebar-toggle` se muestra

#### Tablet (431-768px)
- `.content-area { padding: 1.5rem; }`
- `.stat-value { font-size: 2rem !important; }`
- `h1 { font-size: 1.75rem !important; }`
- `#achievements-catalog-grid { grid-template-columns: repeat(4, 1fr) !important; }`

#### Landing Mobile (≤900px)
- Nav links ocultos
- Todos los padding de secciones reducidos a `100px 24px`
- Grids de 3 columnas → 1 columna
- `.modules-header` → 1 columna
- `.how-grid` → 1 columna
- `.hero-stats { gap: 32px; }`
- Footer → columna con gap

#### Landscape Mobile (≤932px landscape)
- `.topbar { height: 48px; }`
- `.content-area { padding: 0.75rem !important; }`
- `#view-trainer { height: calc(100vh - 48px) !important; }`
- `.trainer-orb-container { transform: scale(0.6); }`

---

## 12. Escala de Border Radius

| Valor | Uso |
|-------|-----|
| `0` | Botones con clip-path (landing), celdas de admin |
| `0.5rem` (`var(--radius)`) | Cards, inputs, nav items, sidebar — default |
| `0.75rem` | Cards en móvil (override) |
| `1.25rem` | Cards en móvil (`border-radius: 1.25rem !important`) |
| `2px` | Bar tracks, admin table elements |
| `3px` | Weekly calendar cells |
| `6px` | Rank number badge |
| `8px` | Demo inputs, auth form inputs |
| `10px` | Scrollbar thumbs |
| `12px` | Admin nav, role badges |
| `16px` | Admin nav border-radius, stats cards |
| `20px` | Admin avatar |
| `xl` (0.75rem) | Buttons dashboard, nav items, selects |
| `2xl` (1rem) | Active buttons |
| `3xl` (1.5rem) | Alfred question card, closer result |
| `full` (9999px) | Avatars, badges, dots, rounded-full |

---

## 13. Escala de Box Shadow

### Landing

| Shadow | Valor |
|--------|-------|
| Cursor glow | `0 0 20px var(--plasma), 0 0 40px var(--plasma)` |
| Button primary hover | `0 0 50px var(--fire), 0 0 100px rgba(40, 210, 15, 0.3)` |
| Button CTA hover | `0 0 30px var(--fire)` |
| Button login hover | `0 0 15px var(--glow-c)` |
| Button secondary hover | `0 0 30px var(--glow-c)` |
| Stat number glow | `0 0 30px var(--plasma)` |
| Stat num symbiosis | `0 0 40px var(--plasma)` |
| Metric val glow | `0 0 40px var(--plasma)` |
| Price btn hover | `0 0 30px var(--glow-c)` |
| Problem num glow | `0 0 40px var(--fire)` |
| Orbit center | `0 0 60px rgba(44, 205, 112, 0.15)` |
| Orbit dot | `0 0 15px var(--plasma)` |
| Feature dot | `0 0 10px var(--gold)` |
| Pilot dot | `0 0 10px var(--gold)` |

### Dashboard

| Shadow | Valor |
|--------|-------|
| Card default | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` |
| Card hover | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` |
| Dashboard card hover | `0 10px 20px -10px rgba(0,0,0,0.1)` |
| Primary glow | `0 0 15px hsl(var(--primary) / 0.4)` |
| Progress bar glow | `0 0 10px rgba(46,204,112,0.5)` |
| Active pulse | `0 0 8px hsl(var(--primary))` |
| Training timer | `shadow-2xl` |
| Weekly cell hover | `0 0 8px currentColor` |

### Admin

| Shadow | Valor |
|--------|-------|
| Calendar day hover | `0 4px 12px rgba(0, 0, 0, 0.5)` |

---

## 14. Z-Index Scale

| Z-Index | Elemento |
|---------|----------|
| `0` | `#bg-canvas` |
| `1` | `.grid-overlay` |
| `2` | `.noise` |
| `5` | `.radar-sweep` |
| `10` | `main` (landing), landing subpages |
| `20` | Trainer controls, header, status text |
| `30` | Chat drawer |
| `40` | Topbar (`z-index: 40`) |
| `50` | Sidebar (`z-index: 50`) |
| `70` | Training finished message overlay |
| `100` | Auth modal, nav landing |
| `9998` | Cursor ring |
| `9999` | Cursor dot |

---

## 15. Paleta del Admin Dashboard

### Colores de Ranking

| Posición | Color | Valor |
|----------|-------|-------|
| 1° (Gold) | Dorado | `#ffd700` |
| 2° (Silver) | Plata | `#aaaacc` |
| 3° (Bronze) | Bronce | `#cd7f32` |

### Colores de Avatar

```css
background: linear-gradient(135deg, #18233d, #e1794f);
```

### Colores de Rangos (Admin Table)

| Rango | Background | Text | Border |
|-------|------------|------|--------|
| Master | `#1a003a` | `#cc44ff` | `#8822cc55` |
| Elite | `#001a08` | `#00cc44` | `#009933aa` |
| Agente | `#001233` | `#3399ff` | `#1166cc88` |
| Novato | `#111` | `#555` | `#222` |

### Colores de Bar Fill (Admin)

No se define color fijo en CSS; se asigna dinámicamente según el valor.

### Tab active

```css
color: var(--green);
border-bottom-color: var(--green);
background: var(--green-dim);
```

### Scrollbar Admin

```css
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg2); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
```

---

## 16. Colores de Calendario Heat-Map

| Rango | Color | Hex |
|-------|-------|-----|
| 0 min | Rojo | `#ff3365` |
| 1-9 min | Naranja | `#f97316` |
| 10-19 min | Amarillo | `#f5b21a` |
| 20-30 min | Verde | `#22c66f` |
| +30 min | Azul | `#2f80ed` |

---

## 17. Tokens de Tailwind

### 17.1 Clases Utilitarias Frecuentes

#### Texto
| Clase | Uso |
|-------|-----|
| `font-orbitron` | Títulos dashboard |
| `font-rajdhani` | Valores numéricos |
| `text-primary` | Color accent |
| `text-muted-foreground` | Texto secundario |
| `text-[10px]` | Labels admin |
| `text-[9px]` | Stats admin |
| `text-[8px]` | Badges level |
| `uppercase` | Todos los labels |
| `tracking-widest` | Labels (0.1em+) |
| `tracking-[0.2em]` | Alfred subtitle |
| `tracking-[0.3em]` | Training progress |
| `tracking-tighter` | Closer title |

#### Background
| Clase | Uso |
|-------|-----|
| `bg-primary` | Botones activos |
| `bg-primary/10` | Fondos sutiles |
| `bg-primary/20` | Hover states |
| `bg-primary/5` | Cards deshabilitadas |
| `bg-secondary/20` | Botones inactivos |
| `bg-secondary/30` | Contenedores de pills |
| `bg-black/80` | Overlays |
| `bg-[#0a0a0a]` | Cards admin |
| `bg-gradient-to-br` | Gradientes de card |

#### Border
| Clase | Uso |
|-------|-----|
| `border-white/5` | Bordes sutiles |
| `border-white/10` | Bordes medios |
| `border-primary/20` | Bordes accent |
| `border-primary/30` | Bordes accent fuertes |
| `border-gray-800` | Bordes sidebar |

#### Espaciado
| Clase | Uso |
|-------|-----|
| `p-6` | Cards principales |
| `p-8` | Cards grandes |
| `p-4` | Cards pequeños |
| `mb-8` | Separación de secciones |
| `mb-6` | Sub-secciones |
| `gap-2` | Grids compactos |
| `gap-4` | Grids normales |
| `gap-8` | Grids amplios |

#### Efectos
| Clase | Uso |
|-------|-----|
| `backdrop-blur-sm` | Overlays sutiles |
| `backdrop-blur-md` | Timer overlay |
| `backdrop-blur-xl` | Chat drawer, result cards |
| `backdrop-filter: blur(20px)` | Sidebar, nav |
| `drop-shadow-[0_0_30px_...]` | Orb canvas |
| `shadow-2xl` | Cards flotantes |
| `shadow-lg` | Botones principales |
| `rounded-3xl` | Tarjetas grandes |
| `rounded-2xl` | Tarjetas medianas |
| `rounded-xl` | Botones, badges |
| `rounded-full` | Avatars, dots, pills |

#### Animaciones
| Clase | Uso |
|-------|-----|
| `animate-pulse` | Live dots, loading |
| `animate-spin` | Loader, processing |
| `animate-in` | Entrada de vistas |
| `fade-in` | Fade de entrada |
| `slide-in-from-bottom-4` | Slide up |
| `slide-in-from-top-4` | Slide down (Alfred header) |
| `zoom-in-95` | Zoom sutil (Closer result) |
| `duration-300` | Transiciones normales |
| `duration-500` | Transiciones lentas |
| `duration-700` | Transiciones muy lentas |
| `duration-1000` | Transiciones de glow |

---

## Apéndice: Archivos del Sistema de Diseño

| Archivo | Contenido |
|---------|-----------|
| `frontend/src/main.css` | Estilos landing page (1418 líneas) |
| `frontend/src/dashboard.css` | Estilos dashboard + admin (1978 líneas) |
| `frontend/index.html` | Tailwind config inline + markup |
| `frontend/src/components/Icons.ts` | Iconos SVG exportados |
| `frontend/src/app.ts` | Lógica de cursor, partículas, scroll reveal, theme toggle |
| `frontend/src/views/Trainer.ts` | Particle Orb, hold-to-talk, chat drawer |
| `frontend/src/views/Alfred.ts` | Cuestionario, ripple effect, plan results |
| `frontend/src/components/StatCards.ts` | Stat cards rendering |
| `frontend/src/components/WeeklyCalendarGrid.ts` | Heat-map calendar |
| `frontend/src/components/WeeklyRanking.ts` | Ranking semanal |
