# AGENTS.md

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **pulseclassbackend** (API base `https://vph97w7w.us-west.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->

## Project Overview

**PulseClass** es una aplicación web educativa para gestionar sesiones de clase, cursos, miembros, calificaciones y sugerencias. Construida con React + TypeScript + Vite + Tailwind CSS v4 + InsForge.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, React Router v7
- **Styling:** Tailwind CSS v4 (configuración en `src/index.css` via `@theme`, NO hay `tailwind.config.js`)
- **Backend:** InsForge (Postgres, Auth, Edge Functions, Storage)
- **Icons:** Material Symbols Outlined (clase `material-symbols-outlined`)
- **Auth:** InsForge Auth con perfiles en tabla `profiles`

## Project Structure

```
src/
├── App.tsx                    # Router, providers (Auth → Impersonation → Theme → Routes)
├── main.tsx                   # Entry point
├── index.css                  # Tailwind v4 config: @theme tokens + .dark overrides
├── components/
│   ├── ImpersonationBanner.tsx  # Banner fijo cuando se impersona un rol
│   ├── Layout.tsx               # Sidebar, top bar, bottom nav móvil, nav items
│   └── Pagination.tsx           # Componente paginación reutilizable
├── hooks/
│   ├── useAuth.tsx              # Auth context, profile, role
│   ├── useImpersonation.tsx     # Contexto "Ver como" (override de rol)
│   ├── useRatingVotes.ts        # Hook para votos de calificación
│   └── useTheme.tsx             # Tema dark/light, persiste en DB
├── lib/
│   └── insforge.ts              # Cliente InsForge SDK
└── pages/
    ├── AdminPage.tsx            # Gestión usuarios + "Ver como" dropdown
    ├── CoursesPage.tsx          # Lista de cursos
    ├── CourseMembersPage.tsx    # Miembros de un curso
    ├── DashboardPage.tsx        # Dashboard principal
    ├── ForgotPasswordPage.tsx   # Recuperar contraseña
    ├── HelpAdminPage.tsx        # Ayuda para admins
    ├── HelpPage.tsx             # Ayuda general
    ├── LoginPage.tsx            # Login
    ├── ProfilePage.tsx          # Perfil + toggle tema
    ├── RateSessionPage.tsx      # Calificar sesión (incluye campo sugerencia)
    ├── SessionDetailPage.tsx    # Detalle de sesión (tabs: info, ratings, suggestions)
    ├── SessionsPage.tsx         # Lista de sesiones
    ├── StatisticsPage.tsx       # Estadísticas (tabs incluye sugerencias)
    ├── StatisticsPage.tsx       # Estadísticas con tab de sugerencias
    └── SuggestionsPage.tsx      # CRUD completo de sugerencias
functions/
└── suggest.ts                  # Edge function: create/update/delete suggestions
migrations/                     # 29 archivos SQL de migraciones
```

## Design System (Material Design 3)

### Colores — Tokens en `src/index.css`

Todos los colores se definen como CSS custom properties dentro de `@theme { }` (Tailwind v4) y se sobreescriben en `.dark { }`.

**Tokens principales:**
| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `primary` | `#9e001f` | `#ffb3b1` | Botones principales, links |
| `on-primary` | `#ffffff` | `#5a0010` | Texto sobre primary |
| `surface` | `#f6faff` | `#141d23` | Fondo principal |
| `on-surface` | `#141d23` | `#e1e2e3` | Texto principal |
| `surface-container` | `#e6eff8` | `#1e272e` | Cards, contenedores |
| `surface-container-high` | `#e0e9f2` | `#1e272e` | Dropdowns, modales |
| `error` | `#ba1a1a` | `#ffb4ab` | Errores |
| `error-container` | `#ffdad6` | `#93000a` | Fondos de error |
| `success` | `#2e7d32` | `#81c784` | Éxito |
| `success-container` | `#c8e6c9` | `#1b5e20` | Fondos de éxito (toasts) |
| `tertiary-container` | `#626566` | `#474746` | Botones secundarios |
| `secondary-container` | `#e2dfde` | `#474746` | Hover states |

**Spacing:** `xs(0.25rem)`, `sm(0.5rem)`, `md(1rem)`, `lg(1.5rem)`, `xl(2rem)`, `2xl(3rem)`
**Border radius:** `sm(0.125rem)`, `lg(0.5rem)`, `xl(0.75rem)`, `2xl(1rem)`, `full(9999px)`

### Convenciones de clases Tailwind

- **Colores:** Siempre usar tokens del tema (`text-on-surface`, `bg-surface-container`, etc.) NUNCA colores hardcoded
- **Tipografía:** Usar `font-headline-lg`, `font-body-md`, `font-label-md` etc. (definidos en @theme)
- **Espaciado:** Usar tokens de spacing (`gap-sm`, `p-md`, `mb-xl`)
- **Responsive:** Prefijo `md:` para desktop. Mobile-first design
- **Iconos:** `<span className="material-symbols-outlined">nombre_icono</span>`
- **Hover states:** `hover:opacity-90`, `hover:bg-secondary-container`, `transition-colors`

### Patrón de Toast (notificaciones)

No hay componente compartido. Cada página implementa su propio toast inline:

```tsx
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  setToast({ message, type })
  setTimeout(() => setToast(null), 4000)
}

// UI:
{toast && (
  <div className={`fixed bottom-20 md:bottom-lg left-1/2 -translate-x-1/2 z-50 ... ${
    toast.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'
  }`}>
    {toast.message}
  </div>
)}
```

Archivos con toast: `SuggestionsPage`, `AdminPage`, `StatisticsPage`, `SessionsPage`, `SessionDetailPage`, `HelpPage`, `LoginPage`, `HelpAdminPage`.

### Patrón "Ver como" (impersonación de rol)

- **Hook:** `useImpersonation()` en `src/hooks/useImpersonation.tsx`
- **Estados:** `impersonatedRole`, `startImpersonation(role)`, `stopImpersonation()`, `isImpersonating`
- **Cada página calcula:** `const effectiveRole = isImpersonating && impersonatedRole ? impersonatedRole : profile?.role`
- **UI dropdown:** En `AdminPage.tsx` — botón "Ver como" con dropdown click-based (state `showVerComo`)
- **Banner:** `ImpersonationBanner.tsx` se muestra al impersonar, oculta nav items de admin
- **Provider:** `ImpersonationProvider` envuelve las rutas en `App.tsx`

### Patrón de permisos

```tsx
const isAdmin = effectiveRole === 'admin'
const canEditSuggestion = (userId: string) => {
  if (isAdmin) return true
  if (effectiveRole === 'teacher') { /* verificar cursos compartidos */ }
  return false
}
```

## Backend (InsForge)

### Edge Functions
- `functions/suggest.ts` — CRUD de sugerencias (`create`, `update`, `delete`)
- Acceso vía `insforge.functions.invoke('suggest', { body: { action, ... } })`

### Tablas principales
- `profiles` — id, user_id, name, email, role (admin/teacher/student), theme
- `courses` — id, name, teacher_id
- `course_members` — id, course_id, user_id
- `sessions` — id, course_id, title, description, date
- `ratings` — id, session_id, user_id, score, comment
- `suggestions` — id, user_id, text, status (recibida/revision/aprobada/rechazada/implementada)
- `rating_votes` — id, rating_id, user_id, vote

### RLS Policies
- Admin: acceso total
- Teacher: puede ver/editar cursos asignados y sugerencias de estudiantes en sus cursos
- Student: solo ve sus propios datos y sugerencias

## Convenciones de Código

- **Idioma:** UI en español, código en inglés
- **Componentes:** Functional components con hooks
- **Estado:** `useState` para estado local, context para global (auth, theme, impersonation)
- **Navegación:** `useNavigate()` de React Router
- **No agregar comentarios** a menos que se pida explícitamente
- **Mobile-first:** siempre diseñar para móvil primero, `md:` para desktop
- **Admin page:** `pb-28 md:pb-0` para compensar bottom nav en móvil
