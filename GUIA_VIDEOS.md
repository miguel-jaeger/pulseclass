# PulseClass - Guía para Videos de Ayuda

## Descripción General

Este documento describe cada sección del sistema PulseClass para servir como pauta en la creación de guiones de videos de ayuda orientados a los usuarios.

---

## 1. Inicio de Sesión y Registro

### Sección
Página de autenticación (`/login`)

### Qué incluye
- Formulario de inicio de sesión (email + contraseña)
- Formulario de registro de nuevos usuarios
- Botones de inicio de sesión rápido con Google y GitHub
- Enlace "¿Olvidaste tu contraseña?" para recuperación

### Flujo del video
1. Mostrar la pantalla de inicio de sesión
2. Explicar los campos de email y contraseña
3. Demostrar el registro de un nuevo usuario con nombre, email y contraseña
4. Mostrar las opciones de login rápido con Google/GitHub
5. Explicar el proceso de recuperación de contraseña:
   - Ingresar email
   - Recibir código de verificación
   - Ingresar código (con countdown de 60 segundos)
   - Establecer nueva contraseña
6. Explicar que al registrarse, el usuario debe ser asignado a un rol por un administrador

### Notas para el guion
- El registro crea el usuario pero no le asigna cursos automáticamente
- Los roles son: administrador, profesor, estudiante
- Un administrador debe agregar al usuario a cursos después del registro

---

## 2. Panel Principal (Dashboard)

### Sección
Página principal (`/`)

### Qué incluye
- Tarjetas de cursos del usuario con:
  - Nombre del curso
  - Badge de sesiones disponibles
  - Badge de miembros del curso
- Acceso rápido a cada curso

### Flujo del video
1. Mostrar el panel principal después del inicio de sesión
2. Explicar que cada tarjeta representa un curso al que pertenece el usuario
3. Explicar los badges:
  - Número de sesiones creadas en el curso
  - Número de miembros (estudiantes y profesores)
4. Demostrar el acceso a un curso haciendo clic en la tarjeta
5. Explicar que el contenido varía según el rol:
   - **Administrador:** ve todos los cursos
   - **Profesor:** ve cursos que creó o le asignaron
   - **Estudiante:** ve cursos en los que está matriculado

### Notas para el guion
- Si el usuario no tiene cursos, se muestra un mensaje indicándolo
- Los cursos inactivos no aparecen en el dashboard

---

## 3. Gestión de Cursos

### Sección
Página de cursos (`/courses`)

### Qué incluye
- Barra de resumen: cursos activos, inactivos y total
- Filtros: búsqueda por nombre, filtro por estado (activo/inactivo), filtro por docente (solo admin)
- Tarjetas de cursos con badges de sesiones y miembros
- Paginación con selector de elementos por página
- Botón para crear nuevo curso

### Flujo del video
1. Mostrar la página de cursos
2. Explicar la barra de resumen en la parte superior
3. Demostrar los filtros:
   - Búsqueda por nombre del curso
   - Filtro por estado (activo/inactivo)
   - Filtro por docente (solo visible para administradores)
4. Explicar las tarjetas de cursos:
   - Nombre del curso
   - Descripción
   - Badges de sesiones y miembros
   - Indicador de estado (activo/inactivo)
5. Demostrar la creación de un nuevo curso:
   - Ingresar nombre
   - Ingresar descripción
   - Guardar
6. Demostrar la edición de un curso
7. Demostrar activar/desactivar un curso
8. Demostrar la eliminación de un curso
9. Explicar la paginación

### Notas para el guion
- Solo administradores pueden crear, editar y eliminar cursos
- Los profesores pueden ver sus cursos pero no crear nuevos
- Los cursos inactivos no aparecen en el dashboard principal
- Al eliminar un curso se eliminan todas las sesiones y miembros asociados

---

## 4. Gestión de Sesiones

### Sección
Página de sesiones (`/courses/:courseId/sessions`)

### Qué incluye
- Lista de sesiones agrupadas por categorías:
  - **Esta semana:** sesiones de la semana actual
  - **Próximamente:** sesiones futuras
  - **Pasadas:** sesiones anteriores a la semana actual
- Cada sesión muestra:
  - Título (basado en la fecha)
  - Fecha de la sesión
  - Promedio de calificación
  - Número de calificaciones
- Botón para crear nueva sesión
- Opción de editar fecha de sesión (admin/profesor)

### Flujo del video
1. Mostrar la página de sesiones de un curso
2. Explicar la agrupación por categorías
3. Demostrar la creación de una nueva sesión:
   - Seleccionar fecha del calendario
   - El título se genera automáticamente con la fecha
   - Guardar
4. Demostrar la edición de la fecha de una sesión
5. Explicar que los profesores solo pueden editar sesiones de sus cursos
6. Demostrar el acceso a los detalles de una sesión
7. Explicar la paginación

### Notas para el guion
- El título de la sesión es "Clase del [fecha]"
- Las sesiones se ordenan automáticamente por categoría
- Solo administradores y profesores del curso pueden crear/editar/eliminar sesiones
- Los estudiantes solo pueden ver las sesiones y calificarlas

---

## 5. Calificación de Sesiones

### Sección
Página de calificación (`/sessions/:sessionId/rate`)

### Qué incluye
- Escala del 1 al 10 con caritas emocionales
- Colores semánticos:
  - 1-4: Rojo (malo)
  - 5-6: Amarillo (regular)
  - 7-10: Verde (bueno)
- Campo de comentario (opcional)
- Campo de sugerencia (opcional)
- Botón para enviar calificación

### Flujo del video
1. Mostrar la página de calificación
2. Explicar que solo los estudiantes del curso pueden calificar
3. Demostrar la selección de una calificación (1-10)
4. Explicar el significado de cada rango con colores
5. Demostrar la escritura de un comentario (opcional)
6. Demostrar la escritura de una sugerencia (opcional)
7. Enviar la calificación
8. Explicar que un estudiante solo puede calificar una vez por sesión

### Notas para el guion
- La calificación es única por estudiante por sesión
- Los comentarios y sugerencias son opcionales
- Después de calificar, el estudiante puede ver su calificación pero no modificarla
- Los profesores y administradores pueden ver las calificaciones en las estadísticas

---

## 6. Estadísticas y Analíticas

### Sección
Página de estadísticas (`/statistics`)

### Qué incluye
- Filtros:
  - Rango de fechas (inicio y fin)
  - Selección de curso
  - Búsqueda de docente (solo admin)
- Pestañas:
  - **Resumen:** gráficos de barras y pie chart
  - **Comentarios:** lista de comentarios con votos
  - **Sugerencias:** lista de sugerencias
- Gráficos:
  - Distribución de calificaciones por sesión
  - Promedio de calificaciones por sesión
  - Distribución de calificaciones por curso
- Comentarios y sugerencias con:
  - Sistema de votos (like/dislike)
  - Respuestas a comentarios
  - Opción de editar/eliminar (propietario o admin)

### Flujo del video
1. Mostrar la página de estadísticas
2. Explicar los filtros:
   - Rango de fechas para filtrar por período
   - Selección de curso específico
   - Búsqueda de docente (solo para administradores)
3. Demostrar la pestaña de resumen:
   - Explicar los gráficos de barras
   - Explicar el pie chart de distribución
4. Demostrar la pestaña de comentarios:
   - Explicar que muestra todos los comentarios de las sesiones filtradas
   - Demostrar el sistema de votos (like/dislike)
   - Demostrar las respuestas a comentarios
   - Demostrar la edición de comentarios (propietario o admin)
   - Demostrar la eliminación de comentarios
5. Demostrar la pestaña de sugerencias:
   - Explicar las sugerencias de los usuarios
   - Demostrar el cambio de estado (solo admin)
6. Explicar que los estudiantes no acceden a esta sección

### Notas para el guion
- Solo administradores y profesores pueden ver las estadísticas
- Los profesores solo ven estadísticas de sus cursos
- Los estudiantes no tienen acceso a esta sección
- Los filtros se aplican a todas las pestañas

---

## 7. Gestión de Sugerencias

### Sección
Página de sugerencias (`/suggestions`)

### Qué incluye
- Filtros por tipo:
  - Mejora
  - Nuevo
  - Problema
  - Contenido
- Filtros por estado:
  - Recibida
  - Revisión
  - Aprobada
  - Rechazada
  - Implementada
- Tarjetas de sugerencias con:
  - Título
  - Descripción
  - Tipo
  - Estado
  - Fecha
  - Imágenes (opcional)
- Botón para crear nueva sugerencia
- Sistema de votos (like/dislike)

### Flujo del video
1. Mostrar la página de sugerencias
2. Explicar los filtros de tipo y estado
3. Demostrar la creación de una nueva sugerencia:
   - Seleccionar tipo (mejora, nuevo, problema, contenido)
   - Escribir descripción
   - Subir imágenes (opcional)
   - Guardar
4. Demostrar los filtros de estado (solo admin):
   - Cambiar estado de una sugerencia
5. Demostrar el sistema de votos
6. Explicar que cualquier usuario puede crear sugerencias

### Notas para el guion
- Todos los usuarios pueden crear y ver sugerencias
- Solo administradores pueden cambiar el estado de las sugerencias
- Las imágenes se suben a Cloudinary
- Las sugerencias tienen estados para seguimiento

---

## 8. Gestión de Usuarios (Administración)

### Sección
Página de administración (`/admin`)

### Qué incluye
- Tabla de usuarios con:
  - Nombre
  - Email
  - Rol
  - Fecha de creación
- Búsqueda por nombre o email
- Filtro por rol
- Botones de acción:
  - Editar usuario
  - Eliminar usuario
  - Eliminar múltiples usuarios
- Botón para importar usuarios desde CSV
- Botón para descargar plantilla CSV de ejemplo

### Flujo del video
1. Mostrar la página de administración
2. Explicar que solo los administradores tienen acceso
3. Demostrar la búsqueda de usuarios
4. Demostrar el filtro por rol
5. Demostrar la creación de un nuevo usuario:
   - Ingresar nombre
   - Ingresar email
   - Seleccionar rol
   - Establecer contraseña
   - Guardar
6. Demostrar la edición de un usuario
7. Demostrar la eliminación de un usuario
8. Demostrar la eliminación múltiple:
   - Seleccionar usuarios con checkboxes
   - Confirmar eliminación
9. Demostrar la importación desde CSV:
   - Descargar plantilla de ejemplo
   - Llenar la plantilla con datos
   - Subir archivo CSV
   - Ver resultados de importación

### Notas para el guion
- Solo los administradores pueden acceder a esta sección
- La importación CSV crea usuarios y los asigna a cursos automáticamente
- La plantilla CSV tiene columns: email, name, role, course_name
- Los usuarios importados reciben un email de bienvenida

---

## 9. Gestión de Miembros de Curso

### Sección
Página de miembros del curso (`/courses/:courseId/members`)

### Qué incluye
- Lista de miembros actuales del curso
- Botón para agregar miembros
- Botón para eliminar miembros
- Búsqueda de usuarios
- Filtro por rol
- Importación masiva desde CSV

### Flujo del video
1. Mostrar la página de miembros del curso
2. Explicar la lista de miembros actuales
3. Demostrar la búsqueda de usuarios para agregar
4. Demostrar la selección de múltiples usuarios
5. Demostrar la agregación de miembros seleccionados
6. Demostrar la eliminación de un miembro
7. Demostrar la importación masiva desde CSV
8. Explicar que solo administradores y profesores del curso pueden gestionar miembros

### Notas para el guion
- Los miembros pueden ser estudiantes o profesores
- Un curso puede tener múltiples profesores
- La importación CSV sigue el mismo formato que la de usuarios
- Los miembros eliminados pierden acceso al curso

---

## 10. Perfil de Usuario

### Sección
Página de perfil (`/profile`)

### Qué incluye
- Información del usuario:
  - Nombre
  - Email
  - Rol
  - Avatar
- Edición de perfil:
  - Cambiar nombre
  - Cambiar email
  - Cambiar contraseña
  - Subir avatar
- Toggle de tema claro/oscuro

### Flujo del video
1. Mostrar la página de perfil
2. Demostrar la edición del nombre
3. Demostrar el cambio de email
4. Demostrar el cambio de contraseña
5. Demostrar la subida de avatar
6. Demostrar el toggle de tema claro/oscuro
7. Explicar que los cambios se guardan automáticamente

### Notas para el guion
- El avatar se sube a Cloudinary
- El tema se guarda en la base de datos
- El cambio de email requiere verificación
- El cambio de contraseña requiere la contraseña actual

---

## 11. Navegación y Layout

### Sección
Componente de diseño (`Layout.tsx`)

### Qué incluye
- **Desktop:** sidebar lateral izquierdo con:
  - Logo y nombre de la app
  - Enlaces de navegación
  - Iconos descriptivos
- **Móvil:** bottom navigation bar con:
  - Iconos de navegación
  - Barra de aplicación fija en la parte superior

### Flujo del video
1. Mostrar la navegación en desktop
2. Explicar cada enlace del sidebar
3. Mostrar la navegación en móvil
4. Explicar los iconos del bottom nav
5. Demostrar la navegación entre secciones
6. Explicar qué secciones están disponibles según el rol

### Notas para el guion
- El sidebar se oculta en móvil
- Los estudiantes no ven los enlaces de administración
- Los profesores no ven los enlaces de estadísticas (solo sus cursos)
- El layout es responsive y se adapta al tamaño de pantalla

---

## 12. Respuestas a Comentarios

### Sección
Dentro de la pestaña de comentarios en estadísticas o detalles de sesión

### Qué incluye
- Lista de respuestas a cada comentario
- Botón para responder
- Textarea para escribir respuesta
- Botones de enviar y cancelar
- Respuestas con:
  - Nombre del autor
  - Fecha
  - Contenido
  - Botón de eliminar (propietario o admin)

### Flujo del video
1. Mostrar un comentario con respuestas
2. Explicar que cualquier miembro del curso puede responder
3. Demostrar la escritura de una respuesta
4. Demostrar el envío de la respuesta
5. Demostrar la eliminación de una respuesta
6. Explicar que las respuestas se muestran ordenadas por fecha

### Notas para el guion
- Las respuestas son visibles para todos los miembros del curso
- Solo el autor o un admin pueden eliminar una respuesta
- No hay límite de respuestas por comentario
- Las respuestas se muestran en orden cronológico

---

## 13. Recuperación de Contraseña

### Sección
Página de recuperación (`/forgot-password`)

### Qué incluye
- Input para email
- Input para código de verificación
- Countdown timer para reenvío de código
- Botón de reenviar código
- Input para nueva contraseña

### Flujo del video
1. Mostrar la pantalla de inicio de sesión
2. Hacer clic en "¿Olvidaste tu contraseña?"
3. Ingresar email y enviar
4. Explicar que se recibe un código por email
5. Ingresar el código de verificación
6. Explicar el countdown de 60 segundos
7. Establecer nueva contraseña
8. Confirmar el cambio
9. Iniciar sesión con la nueva contraseña

### Notas para el guion
- El código expira después de 60 segundos
- Se puede reenviar el código si no se recibió
- Los errores se muestran en español
- Si el código es incorrecto, se muestra un mensaje de error

---

## 14. Permisos por Rol

### Descripción general de permisos

| Acción | Administrador | Profesor | Estudiante |
|--------|---------------|----------|------------|
| Ver cursos | Todos | Propios cursos | Cursos asignados |
| Crear cursos | ✅ | ❌ | ❌ |
| Editar cursos | ✅ | ❌ | ❌ |
| Eliminar cursos | ✅ | ❌ | ❌ |
| Crear sesiones | ✅ | ✅ (propios cursos) | ❌ |
| Editar sesiones | ✅ | ✅ (propios cursos) | ❌ |
| Eliminar sesiones | ✅ | ✅ (propios cursos) | ❌ |
| Calificar sesiones | ❌ | ❌ | ✅ |
| Ver estadísticas | ✅ | ✅ (propios cursos) | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Gestionar miembros | ✅ | ✅ (propios cursos) | ❌ |
| Crear sugerencias | ✅ | ✅ | ✅ |
| Cambiar estado sugerencias | ✅ | ❌ | ❌ |

### Notas para el guion
- Los permisos se verifican tanto en el frontend como en el backend (RLS)
- Un usuario no puede realizar acciones que no tiene permitidas
- Si se intenta una acción no permitida, se muestra un mensaje de error

---

## Estructura Recomendada para los Videos

### Video 1: Introducción y Primeros Pasos
1. Bienvenida al sistema
2. Registro de usuario
3. Inicio de sesión
4. Tour por el panel principal
5. Explicación de roles

### Video 2: Gestión de Cursos y Sesiones (Administrador/Profesor)
1. Creación de cursos
2. Gestión de miembros
3. Creación de sesiones
4. Edición de sesiones

### Video 3: Calificación de Sesiones (Estudiante)
1. Acceso a sesiones
2. Proceso de calificación
3. Comentarios y sugerencias
4. Respuestas a comentarios

### Video 4: Estadísticas y Análisis (Administrador/Profesor)
1. Filtros de estadísticas
2. Gráficos y análisis
3. Gestión de comentarios
4. Gestión de sugerencias

### Video 5: Administración del Sistema (Administrador)
1. Gestión de usuarios
2. Importación masiva
3. Configuración del sistema
4. Recuperación de contraseña

---

## Consideraciones Generales

### Accesibilidad
- El sistema es responsive (desktop y móvil)
- Los colores tienen contraste suficiente
- Los botones tienen texto alternativo

### Rendimiento
- Los datos se cargan de forma lazy
- Se usan skeleton loaders durante la carga
- Las actualizaciones son optimistas

### Seguridad
- Las contraseñas se almacenan encriptadas
- Las sesiones se mantienen en localStorage
- Los permisos se verifican en el backend

### Soporte
- Los errores se muestran en español
- Se proporcionan mensajes descriptivos
- El sistema maneja errores de red
