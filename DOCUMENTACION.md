# PulseClass - Sistema de Satisfacción Estudiantil

## Descripción General

PulseClass es una aplicación web diseñada para evaluar la satisfacción de los estudiantes al finalizar cada clase. Permite a los profesores crear cursos y sesiones, y a los estudiantes calificar su experiencia con un sistema de puntuación del 1 al 10, comentarios y sugerencias.

## Arquitectura del Sistema

### Stack Tecnológico
- **Frontend:** React 19 + TypeScript + Vite 6
- **Estilos:** Tailwind CSS v4 con diseño Material Design 3
- **Backend:** InsForge (Supabase-compatible) con autenticación y base de datos PostgreSQL
- **Gráficos:** Recharts para estadísticas
- **Despliegue:** Vercel

### Estructura de Base de Datos

#### Tablas Principales

1. **profiles** - Perfiles de usuario extendidos
   - `user_id` (UUID, FK a auth.users)
   - `name` (TEXT)
   - `role` (TEXT: 'admin', 'teacher', 'student')
   - `avatar_url` (TEXT, opcional)
   - `theme` (TEXT, opcional)

2. **courses** - Cursos
   - `name` (TEXT)
   - `description` (TEXT)
   - `created_by` (UUID, FK a auth.users)
   - `is_active` (BOOLEAN)

3. **course_members** - Membresías de cursos
   - `course_id` (UUID, FK a courses)
   - `user_id` (UUID, FK a auth.users)

4. **sessions** - Sesiones de clase
   - `course_id` (UUID, FK a courses)
   - `title` (TEXT)
   - `date` (DATE)
   - `created_by` (UUID, FK a auth.users)

5. **ratings** - Calificaciones de estudiantes
   - `session_id` (UUID, FK a sessions)
   - `student_id` (UUID, FK a auth.users)
   - `score` (INTEGER, 1-10)
   - `comment` (TEXT, opcional)
   - `suggestion` (TEXT, opcional)

6. **suggestions** - Sugerencias generales
   - `user_id` (UUID, FK a profiles)
   - `type` (TEXT: 'mejora', 'nuevo', 'problema', 'contenido')
   - `description` (TEXT)
   - `status` (TEXT: 'recibida', 'revision', 'aprobada', 'rechazada', 'implementada')
   - `images` (JSONB)

7. **rating_votes** - Votos like/dislike
   - `rating_id` (UUID, FK a ratings)
   - `user_id` (UUID, FK a auth.users)
   - `vote_type` (TEXT: 'like', 'dislike')

8. **course_stats** - Estadísticas cacheadas de cursos
   - `course_id` (UUID, FK a courses, PRIMARY KEY)
   - `session_count` (INTEGER, default 0)
   - `member_count` (INTEGER, default 0)
   - `updated_at` (TIMESTAMPTZ)
   - Actualizado automáticamente por triggers al insertar/eliminar sesiones y miembros

## Funcionalidades Principales

### 1. Sistema de Autenticación

**Commits:** `a90c5cd`, `79f6c47`, `29251e7`, `29690ea`

- Registro e inicio de sesión con email/contraseña
- OAuth con Google y GitHub
- Persistencia de sesión en localStorage
- Perfil de usuario con edición de nombre, email y contraseña
- Subida de avatar de perfil

**Pasos para implementar:**
1. Configurar InsForge con autenticación habilitada
2. Crear tabla `profiles` con trigger automático al crear usuario
3. Implementar `LoginPage.tsx` con formularios de login/registro
4. Crear hook `useAuth.tsx` para manejar estado de autenticación
5. Implementar persistencia de sesión

### 2. Gestión de Cursos

**Commits:** `ff3a48a`, `6aa8167`, `f96cafb`, `26a1d3d`, `c398bd0`, `e029e4e`

- CRUD completo de cursos (crear, editar, eliminar)
- Activar/desactivar cursos
- Barra de resumen con cantidades (activos/inactivos/total)
- Filtro por estado y búsqueda
- Filtro por docente (solo administradores) con búsqueda
- Badges con cantidad de sesiones y miembros en cada curso
- Tabla `course_stats` con triggers para caché de estadísticas
- Paginación con selector de elementos por página

**Pasos para implementar:**
1. Crear tabla `courses` con RLS
2. Crear tabla `course_stats` con triggers automáticos
3. Implementar `CoursesPage.tsx` con tarjetas de cursos y badges
4. Agregar modales para crear/editar cursos
5. Implementar filtros (búsqueda, estado, docente) y paginación
6. Configurar permisos por rol (admin: todo, teacher: propios cursos)

### 3. Gestión de Sesiones

**Commits:** `1df6408`, `d585ad3`, `1f3895a`, `6cb301a`, `9ccd058`

- Crear sesiones vinculadas a cursos
- Tabla desktop / tarjetas móviles
- Editar fecha de sesión (admin/profesor)
- Título automático basado en fecha
- Sesiones agrupadas por categorías colapsables: Esta semana, Próximamente, Pasadas
- Paginador único que respeta el orden de categorías
- Orden: sesiones de la semana actual primero, luego futuras, luego pasadas

**Pasos para implementar:**
1. Crear tabla `sessions` con RLS
2. Implementar `SessionsPage.tsx` con grupos colapsables
3. Agregar lógica de categorización por semana (actual/futura/pasada)
4. Implementar paginación con orden de categorías
5. Agregar botón de edición para admin/profesor
6. Implementar responsive design (tabla/tarjetas)

### 4. Sistema de Calificación

**Commits:** `d017a4d`, `9827b2c`, `ebc3207`

- Escala del 1 al 10 con caritas emocionales
- Colores semánticos (rojo-amarillo-verde)
- Comentarios y sugerencias opcionales
- Un voto por estudiante por sesión

**Pasos para implementar:**
1. Crear tabla `ratings` con restricción UNIQUE(session_id, student_id)
2. Implementar `RateSessionPage.tsx` con radio buttons visuales
3. Agregar iconos de caritas y colores
4. Validar que solo estudiantes en el curso puedan calificar

### 5. Estadísticas y Analíticas

**Commits:** `0a5f62b`, `4004a1a`, `7e259f0`, `43094a9`

- Dashboard con gráficos de barras y pie chart
- Filtros por curso, profesor y rango de fechas
- Resumen de calificaciones por sesión
- Lazy loading para optimizar rendimiento
- Formato de fechas dd/mm/YYYY

**Pasos para implementar:**
1. Implementar `StatisticsPage.tsx` con Recharts
2. Agregar filtros dinámicos (curso, profesor, fechas)
3. Implementar lazy loading con `React.lazy()`
4. Configurar formato de fechas sin desfase UTC

### 6. Sistema de Votación (Like/Dislike)

**Commits:** `74cac4e`, `4c9a5d5`, `90617a7`, `ae0b44e`

- Botones de like/dislike en comentarios y sugerencias
- Un voto por usuario (toggle entre like/dislike)
- Actualización optimista de UI
- Contadores de votos

**Pasos para implementar:**
1. Crear tabla `rating_votes` con RLS
2. Crear hook `useRatingVotes.ts` con manejo de estado
3. Agregar botones de voto en `StatisticsPage.tsx`
4. Implementar actualización optimista con `useRef`

### 7. Sistema de Sugerencias

**Commits:** `e9ffb5a`, `35cb1b7`, `64ace80`

- Crear sugerencias de tipo: mejora, nuevo, problema, contenido
- Estados: recibida, revisión, aprobada, rechazada, implementada
- Subida de imágenes (Cloudinary)
- CRUD con permisos por rol

**Pasos para implementar:**
1. Crear tabla `suggestions` con RLS
2. Implementar `SuggestionsPage.tsx`
3. Agregar modales para crear/editar
4. Implementar cambio de estado (admin)

### 8. Gestión de Usuarios (Admin)

**Commits:** `42da7af`, `5dbe6b9`, `6abb2c3`

- Listado de usuarios con búsqueda y filtro por rol
- Crear/editar/eliminar usuarios
- Eliminación múltiple con checkboxes
- Importar miembros desde CSV
- Cambio de contraseña de administrador

**Pasos para implementar:**
1. Implementar `AdminPage.tsx`
2. Agregar modales para crear/editar usuarios
3. Implementar eliminación múltiple
4. Crear edge function para importación CSV

### 9. Gestión de Miembros de Curso

**Commits:** `42bdf9e`, `676fb39`, `92b2b12`, `2b3bfbf`

- Agregar/eliminar miembros de cursos
- Agregación múltiple con checkboxes
- Filtro por rol al agregar
- Búsqueda de usuarios

**Pasos para implementar:**
1. Crear tabla `course_members` con RLS
2. Implementar `CourseMembersPage.tsx`
3. Agregar selección múltiple
4. Implementar filtro por rol

### 10. Tema Claro/Oscuro

**Commits:** `3dfd099`

- Toggle en página de perfil
- Persistencia en base de datos
- Variables CSS para light/dark
- Transiciones suaves

**Pasos para implementar:**
1. Agregar columna `theme` a tabla `profiles`
2. Crear hook `useTheme.tsx`
3. Definir variables CSS en `index.css`
4. Implementar toggle en `ProfilePage.tsx`

### 11. Layout Responsive

**Commits:** `1fe12f8`, `a14c346`, `74a3504`

- Sidebar en desktop, bottom nav en móvil
- Navegación con iconos (sin labels en móvil)
- AppBar fijo en móvil
- Padding responsive

**Pasos para implementar:**
1. Crear componente `Layout.tsx`
2. Implementar sidebar desktop y bottom nav móvil
3. Configurar rutas protegidas
4. Agregar padding responsive con Tailwind

## Pasos Generales para Replicar el Sistema

### 1. Configuración Inicial
```bash
# Crear proyecto con Vite
npm create vite@latest pulseclass -- --template react-ts
cd pulseclass

# Instalar dependencias
npm install @insforge/sdk react-router-dom recharts
npm install -D tailwindcss @tailwindcss/vite
```

### 2. Configurar InsForge
1. Crear proyecto en InsForge
2. Configurar `.env.local` con credenciales
3. Habilitar autenticación (email/password + OAuth)

### 3. Base de Datos
1. Ejecutar migración inicial: `migrations/20260822173117_create-schema.sql`
2. Ejecutar migraciones adicionales en orden cronológico
3. Ejecutar migración de course_stats: `migrations/20260825110000_create-course-stats.sql`
4. Configurar RLS policies

### 4. Desarrollo Frontend
1. Implementar autenticación (`useAuth.tsx`, `LoginPage.tsx`)
2. Crear layout base (`Layout.tsx`)
3. Desarrollar páginas principales
4. Agregar componentes reutilizables (Pagination, etc.)

### 5. Personalización
1. Configurar colores Material Design 3 en `index.css`
2. Agregar fuentes (Inter, Material Symbols)
3. Implementar tema claro/oscuro

### 6. Despliegue
1. Configurar `vercel.json` para SPA routing
2. Ejecutar `npm run build`
3. Desplegar en Vercel

## Estructura de Archivos

```
pulseclass/
├── src/
│   ├── components/
│   │   └── Layout.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   ├── useRatingVotes.ts
│   │   └── useTheme.tsx
│   ├── lib/
│   │   └── insforge.ts
│   ├── pages/
│   │   ├── AdminPage.tsx
│   │   ├── CourseMembersPage.tsx
│   │   ├── CoursesPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── RateSessionPage.tsx
│   │   ├── SessionDetailPage.tsx
│   │   ├── SessionsPage.tsx
│   │   ├── StatisticsPage.tsx
│   │   └── SuggestionsPage.tsx
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── migrations/
│   └── *.sql
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Notas Importantes

### Seguridad (RLS)
- Todas las tablas tienen Row Level Security habilitado
- Los permisos se verifican por rol (admin, teacher, student)
- Los profesores solo acceden a sus cursos
- Los estudiantes solo ven cursos donde están inscritos

### Performance
- Lazy loading de `StatisticsPage` para reducir bundle inicial
- Paginación en todas las vistas con listados grandes
- Actualización optimista en votaciones

### Accesibilidad
- IDs únicos en todos los campos de formulario
- Labels asociados con `htmlFor`
- Atributos `aria-label` en campos sin label visible
- Navegación por teclado soportada

### Responsive Design
- Mobile-first con breakpoints md: y lg:
- Sidebar colapsable en móvil
- Bottom navigation en móvil
- Tablas que se convierten en tarjetas en móvil
