# PulseClass - Guía para Videos de Ayuda

## Descripción General

Este documento describe cada sección del sistema PulseClass para servir como pauta en la creación de guiones de videos de ayuda orientados a los usuarios. Cada sección incluye elementos específicos para que herramientas como Gemini puedan generar guiones completos.

---

## Información General del Proyecto

- **Nombre del sistema:** PulseClass
- **Propósito:** Sistema de satisfacción estudiantil para evaluar clases
- **Plataforma:** Aplicación web responsive (desktop y móvil)
- **Tecnologías visuales:** Material Design 3, Tailwind CSS
- **URL de producción:** [URL del despliegue]

---

## 1. Inicio de Sesión y Registro

### Sección
Página de autenticación (`/login`)

### Público objetivo
- Nuevos usuarios que necesitan crear una cuenta
- Usuarios existentes que desean iniciar sesión
- Usuarios que olvidaron su contraseña

### Duración estimada
2-3 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Crear una nueva cuenta en el sistema
- Iniciar sesión con credenciales o redes sociales
- Recuperar una contraseña olvidada

### Qué incluye
- Formulario de inicio de sesión (email + contraseña)
- Formulario de registro de nuevos usuarios
- Botones de inicio de sesión rápido con Google y GitHub
- Enlace "¿Olvidaste tu contraseña?" para recuperación

### Elementos en pantalla
- **Campos de entrada:** email, contraseña, nombre (registro)
- **Botones:** "Iniciar sesión", "Registrarse", "Google", "GitHub"
- **Enlaces:** "¿Olvidaste tu contraseña?", "Crear cuenta"
- **Iconos:** logo de Google, logo de GitHub, icono de candado

### Narración sugerida
"Bienvenido a PulseClass. Para comenzar a utilizar el sistema, puedes crear una cuenta haciendo clic en 'Registrarse'. Ingresa tu nombre, email y contraseña. También puedes iniciar sesión rápidamente con tu cuenta de Google o GitHub. Si olvidaste tu contraseña, haz clic en '¿Olvidaste tu contraseña?' y sigue los pasos para recuperarla."

### Acciones del usuario
1. Hacer clic en "Registrarse"
2. Completar formulario de registro
3. Hacer clic en "Crear cuenta"
4. Verificar email (opcional)
5. Iniciar sesión con nuevas credenciales

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

### Errores comunes
- **Email ya registrado:** Mostrar mensaje de error y sugerir iniciar sesión
- **Contraseña débil:** Explicar requisitos mínimos (8 caracteres)
- **Código de verificación expirado:** Explicar cómo reenviar el código
- **Error de red:** Mostrar cómo verificar conexión a internet

### Ejemplo práctico
Crear una cuenta con el email "estudiante@ejemplo.com" y contraseña "MiPassword123", luego iniciar sesión y verificar que se accede al panel principal.

### Transiciones
- **Inicio:** "Bienvenido a PulseClass"
- **Cierre:** "Ahora que tienes tu cuenta, veamos el panel principal"

### Notas para el guion
- El registro crea el usuario pero no le asigna cursos automáticamente
- Los roles son: administrador, profesor, estudiante
- Un administrador debe agregar al usuario a cursos después del registro

---

## 2. Panel Principal (Dashboard)

### Sección
Página principal (`/`)

### Público objetivo
- Todos los usuarios autenticados (admin, profesor, estudiante)

### Duración estimada
1-2 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Navegar por el panel principal
- Acceder a sus cursos rápidamente
- Entender la información mostrada en cada tarjeta

### Qué incluye
- Tarjetas de cursos del usuario con:
  - Nombre del curso
  - Badge de sesiones disponibles
  - Badge de miembros del curso
- Acceso rápido a cada curso

### Elementos en pantalla
- **Tarjetas de cursos:** con nombre, badges de sesiones y miembros
- **Iconos:** icono de libro (curso), icono de calendario (sesiones), icono de personas (miembros)
- **Mensaje vacío:** "No tienes cursos asignados" (si aplica)

### Narración sugerida
"Este es tu panel principal. Aquí verás todos los cursos a los que perteneces. Cada tarjeta muestra el nombre del curso, el número de sesiones disponibles y la cantidad de miembros. Para acceder a un curso, simplemente haz clic en su tarjeta."

### Acciones del usuario
1. Observar las tarjetas de cursos
2. Hacer clic en una tarjeta de curso
3. Navegar a la página de sesiones del curso

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

### Errores comunes
- **No hay cursos:** Mostrar mensaje y explicar que un admin debe asignar cursos
- **Curso no aparece:** Verificar que el curso esté activo

### Ejemplo práctico
Ingresar al sistema y observar que aparecen 3 cursos: "Matemáticas", "Física", "Química". Hacer clic en "Matemáticas" para ver sus sesiones.

### Transiciones
- **Inicio:** "Una vez iniciada la sesión, verás tu panel principal"
- **Cierre:** "Ahora exploremos cómo gestionar cursos"

### Notas para el guion
- Si el usuario no tiene cursos, se muestra un mensaje indicándolo
- Los cursos inactivos no aparecen en el dashboard

---

## 3. Gestión de Cursos

### Sección
Página de cursos (`/courses`)

### Público objetivo
- Administradores: gestión completa de cursos
- Profesores: visualización de sus cursos

### Duración estimada
3-4 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Crear un nuevo curso
- Editar información de cursos
- Activar/desactivar cursos
- Buscar y filtrar cursos

### Qué incluye
- Barra de resumen: cursos activos, inactivos y total
- Filtros: búsqueda por nombre, filtro por estado (activo/inactivo), filtro por docente (solo admin)
- Tarjetas de cursos con badges de sesiones y miembros
- Paginación con selector de elementos por página
- Botón para crear nuevo curso

### Elementos en pantalla
- **Barra de resumen:** contadores de cursos activos, inactivos, total
- **Filtros:** campo de búsqueda, selector de estado, selector de docente
- **Tarjetas:** nombre, descripción, badges, estado, botones de acción
- **Botones:** "Crear curso", "Editar", "Activar/Desactivar", "Eliminar"
- **Paginación:** selector de elementos por página, botones de navegación

### Narración sugerida
"En la página de cursos, verás una barra de resumen con el número de cursos activos, inactivos y el total. Puedes buscar cursos por nombre, filtrar por estado o por docente. Cada tarjeta muestra información del curso y sus badges. Para crear un nuevo curso, haz clic en 'Crear curso'."

### Acciones del usuario
1. Observar la barra de resumen
2. Usar el filtro de búsqueda
3. Usar el filtro de estado
4. Hacer clic en "Crear curso"
5. Completar formulario y guardar
6. Editar un curso existente
7. Activar/desactivar un curso
8. Eliminar un curso

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

### Errores comunes
- **No se puede crear curso:** Verificar permisos de administrador
- **Curso no se activa:** Verificar que tenga sesiones programadas
- **Error al eliminar:** Verificar que no tenga dependencias

### Ejemplo práctico
Crear un curso llamado "Programación Web" con descripción "Curso de desarrollo web con React", luego buscarlo por nombre, editarlo y activarlo.

### Transiciones
- **Inicio:** "Los cursos son la base del sistema"
- **Cierre:** "Ahora que sabes cómo gestionar cursos, veamos las sesiones"

### Notas para el guion
- Solo administradores pueden crear, editar y eliminar cursos
- Los profesores pueden ver sus cursos pero no crear nuevos
- Los cursos inactivos no aparecen en el dashboard principal
- Al eliminar un curso se eliminan todas las sesiones y miembros asociados

---

## 4. Gestión de Sesiones

### Sección
Página de sesiones (`/courses/:courseId/sessions`)

### Público objetivo
- Administradores y profesores: gestión de sesiones
- Estudiantes: visualización de sesiones

### Duración estimada
2-3 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Crear nuevas sesiones
- Editar fechas de sesiones
- Entender la agrupación por categorías

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

### Elementos en pantalla
- **Categorías colapsables:** "Esta semana", "Próximamente", "Pasadas"
- **Tarjetas de sesión:** título, fecha, promedio, número de calificaciones
- **Botones:** "Crear sesión", "Editar fecha"
- **Iconos:** calendario, estrella (calificación), lápiz (editar)

### Narración sugerida
"Las sesiones se organizan automáticamente en tres categorías: esta semana, próximamente y pasadas. Cada sesión muestra su título, fecha y estadísticas de calificación. Para crear una nueva sesión, haz clic en 'Crear sesión' y selecciona la fecha del calendario."

### Acciones del usuario
1. Observar las categorías de sesiones
2. Colapsar/expandir categorías
3. Hacer clic en "Crear sesión"
4. Seleccionar fecha del calendario
5. Guardar la sesión
6. Editar la fecha de una sesión existente

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

### Errores comunes
- **No se puede crear sesión:** Verificar permisos de profesor/admin
- **Fecha no disponible:** Verificar que no haya otra sesión en la misma fecha
- **No se puede editar:** Verificar que sea el propietario del curso

### Ejemplo práctico
Crear una sesión para el día 15 de agosto, observar que aparece en "Esta semana" o "Próximamente" según la fecha actual, y editar su fecha al día 20.

### Transiciones
- **Inicio:** "Las sesiones representan cada clase del curso"
- **Cierre:** "Ahora veamos cómo los estudiantes pueden calificar estas sesiones"

### Notas para el guion
- El título de la sesión es "Clase del [fecha]"
- Las sesiones se ordenan automáticamente por categoría
- Solo administradores y profesores del curso pueden crear/editar/eliminar sesiones
- Los estudiantes solo pueden ver las sesiones y calificarlas

---

## 5. Calificación de Sesiones

### Sección
Página de calificación (`/sessions/:sessionId/rate`)

### Público objetivo
- Estudiantes: realizar calificaciones

### Duración estimada
2-3 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Calificar una sesión del 1 al 10
- Agregar comentarios y sugerencias
- Entender el significado de los colores

### Qué incluye
- Escala del 1 al 10 con caritas emocionales
- Colores semánticos:
  - 1-4: Rojo (malo)
  - 5-6: Amarillo (regular)
  - 7-10: Verde (bueno)
- Campo de comentario (opcional)
- Campo de sugerencia (opcional)
- Botón para enviar calificación

### Elementos en pantalla
- **Escala numérica:** botones del 1 al 10 con caritas
- **Colores:** rojo, amarillo, verde según calificación
- **Campos de texto:** comentario (opcional), sugerencia (opcional)
- **Botón:** "Enviar calificación"
- **Indicador:** "Ya calificaste esta sesión" (si aplica)

### Narración sugerida
"Para calificar una sesión, selecciona un número del 1 al 10. Los colores te ayudan a entender la escala: rojo es malo, amarillo es regular y verde es bueno. Puedes agregar un comentario y sugerencia opcionales. Cuando termines, haz clic en 'Enviar calificación'."

### Acciones del usuario
1. Seleccionar una calificación (1-10)
2. Escribir un comentario (opcional)
3. Escribir una sugerencia (opcional)
4. Hacer clic en "Enviar calificación"
5. Ver confirmación de envío

### Flujo del video
1. Mostrar la página de calificación
2. Explicar que solo los estudiantes del curso pueden calificar
3. Demostrar la selección de una calificación (1-10)
4. Explicar el significado de cada rango con colores
5. Demostrar la escritura de un comentario (opcional)
6. Demostrar la escritura de una sugerencia (opcional)
7. Enviar la calificación
8. Explicar que un estudiante solo puede calificar una vez por sesión

### Errores comunes
- **Ya calificaste:** Mostrar mensaje de que solo se puede calificar una vez
- **No eres estudiante:** Explicar que solo estudiantes pueden calificar
- **Error de red:** Explicar que se puede reintentar

### Ejemplo práctico
Calificar una sesión con un 8 (verde), agregar comentario "Muy buena explicación" y sugerencia "Incluir más ejemplos prácticos", luego enviar y ver la confirmación.

### Transiciones
- **Inicio:** "Ahora veamos cómo los estudiantes califican las sesiones"
- **Cierre:** "Las calificaciones se pueden ver en las estadísticas del curso"

### Notas para el guion
- La calificación es única por estudiante por sesión
- Los comentarios y sugerencias son opcionales
- Después de calificar, el estudiante puede ver su calificación pero no modificarla
- Los profesores y administradores pueden ver las calificaciones en las estadísticas

---

## 6. Estadísticas y Analíticas

### Sección
Página de estadísticas (`/statistics`)

### Público objetivo
- Administradores: análisis completo del sistema
- Profesores: análisis de sus cursos

### Duración estimada
4-5 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Usar filtros para analizar datos
- Interpretar gráficos de calificaciones
- Gestionar comentarios y sugerencias

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

### Elementos en pantalla
- **Filtros:** campos de fecha, selector de curso, búsqueda de docente
- **Pestañas:** "Resumen", "Comentarios", "Sugerencias"
- **Gráficos:** barras, pie chart, líneas
- **Lista de comentarios:** texto, votos, respuestas
- **Lista de sugerencias:** tipo, estado, votos

### Narración sugerida
"En estadísticas puedes analizar la satisfacción de tus cursos. Usa los filtros para seleccionar un período, curso o docente específico. En la pestaña de resumen verás gráficos que muestran la distribución de calificaciones. En comentarios y sugerencias puedes ver las opiniones de los estudiantes y responderles."

### Acciones del usuario
1. Seleccionar rango de fechas
2. Seleccionar un curso específico
3. Buscar un docente (admin)
4. Cambiar entre pestañas
5. Votar comentarios (like/dislike)
6. Responder a comentarios
7. Editar/eliminar comentarios (propietario/admin)
8. Cambiar estado de sugerencias (admin)

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

### Errores comunes
- **No hay datos:** Verificar que haya sesiones con calificaciones en el período seleccionado
- **Gráfico vacío:** Ajustar filtros para mostrar más datos
- **No se puede editar:** Verificar que sea propietario o admin

### Ejemplo práctico
Filtrar estadísticas por el curso "Matemáticas" en el último mes, observar el promedio de calificaciones, votar un comentario y responder a una sugerencia.

### Transiciones
- **Inicio:** "Las estadísticas te ayudan a tomar decisiones basadas en datos"
- **Cierre:** "Ahora veamos cómo los estudiantes pueden crear sugerencias"

### Notas para el guion
- Solo administradores y profesores pueden ver las estadísticas
- Los profesores solo ven estadísticas de sus cursos
- Los estudiantes no tienen acceso a esta sección
- Los filtros se aplican a todas las pestañas

---

## 7. Gestión de Sugerencias

### Sección
Página de sugerencias (`/suggestions`)

### Público objetivo
- Todos los usuarios: crear y ver sugerencias
- Administradores: gestionar estados

### Duración estimada
2-3 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Crear nuevas sugerencias
- Filtrar sugerencias por tipo y estado
- Votar sugerencias
- Cambiar estados (admin)

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

### Elementos en pantalla
- **Filtros:** selector de tipo, selector de estado
- **Tarjetas:** tipo, estado, descripción, fecha, imágenes, votos
- **Botones:** "Crear sugerencia", "Votar", "Cambiar estado"
- **Formulario:** tipo, descripción, imágenes

### Narración sugerida
"En sugerencias puedes proponer mejoras al sistema. Selecciona el tipo de sugerencia, escribe una descripción detallada y opcionalmente sube imágenes. Puedes filtrar sugerencias por tipo o estado. Los administradores pueden cambiar el estado para dar seguimiento."

### Acciones del usuario
1. Hacer clic en "Crear sugerencia"
2. Seleccionar tipo (mejora, nuevo, problema, contenido)
3. Escribir descripción
4. Subir imágenes (opcional)
5. Guardar
6. Filtrar por tipo o estado
7. Votar sugerencias (like/dislike)
8. Cambiar estado (admin)

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

### Errores comunes
- **No se sube imagen:** Verificar formato y tamaño máximo
- **No se puede cambiar estado:** Verificar permisos de administrador
- **Sugerencia duplicada:** Buscar sugerencias existentes antes de crear

### Ejemplo práctico
Crear una sugerencia de tipo "Mejora" con descripción "Agregar modo oscuro a la aplicación", subir una imagen de ejemplo y votar a favor de otra sugerencia.

### Transiciones
- **Inicio:** "Las sugerencias nos ayudan a mejorar el sistema"
- **Cierre:** "Ahora veamos cómo los administradores gestionan usuarios"

### Notas para el guion
- Todos los usuarios pueden crear y ver sugerencias
- Solo administradores pueden cambiar el estado de las sugerencias
- Las imágenes se suben a Cloudinary
- Las sugerencias tienen estados para seguimiento

---

## 8. Gestión de Usuarios (Administración)

### Sección
Página de administración (`/admin`)

### Público objetivo
- Administradores: gestión completa de usuarios

### Duración estimada
3-4 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Crear nuevos usuarios
- Editar información de usuarios
- Eliminar usuarios
- Importar usuarios masivamente

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

### Elementos en pantalla
- **Tabla:** columnas de nombre, email, rol, fecha, acciones
- **Filtros:** campo de búsqueda, selector de rol
- **Botones:** "Crear usuario", "Importar", "Descargar plantilla"
- **Acciones por fila:** "Editar", "Eliminar"
- **Selección múltiple:** checkboxes para eliminación masiva

### Narración sugerida
"En administración puedes gestionar todos los usuarios del sistema. Usa la búsqueda para encontrar usuarios por nombre o email, o filtra por rol. Para crear un usuario, haz clic en 'Crear usuario' y completa el formulario. También puedes importar usuarios masivamente desde un archivo CSV."

### Acciones del usuario
1. Buscar usuarios por nombre o email
2. Filtrar por rol
3. Crear un nuevo usuario
4. Editar información de usuario
5. Eliminar un usuario
6. Seleccionar múltiples usuarios y eliminarlos
7. Descargar plantilla CSV
8. Importar usuarios desde CSV

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

### Errores comunes
- **Email ya registrado:** Verificar que el email no exista
- **Error en CSV:** Verificar formato de la plantilla
- **No se puede eliminar:** Verificar que no sea el último administrador

### Ejemplo práctico
Crear un usuario con rol "Profesor", importar 5 estudiantes desde CSV, editar el nombre de un usuario y eliminar un usuario inactivo.

### Transiciones
- **Inicio:** "Los administradores tienen acceso completo a la gestión de usuarios"
- **Cierre:** "Ahora veamos cómo gestionar miembros de cursos específicos"

### Notas para el guion
- Solo los administradores pueden acceder a esta sección
- La importación CSV crea usuarios y los asigna a cursos automáticamente
- La plantilla CSV tiene columns: email, name, role, course_name
- Los usuarios importados reciben un email de bienvenida

---

## 9. Gestión de Miembros de Curso

### Sección
Página de miembros del curso (`/courses/:courseId/members`)

### Público objetivo
- Administradores: gestión completa de miembros
- Profesores: gestión de miembros de sus cursos

### Duración estimada
2-3 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Agregar miembros a un curso
- Eliminar miembros de un curso
- Importar miembros masivamente

### Qué incluye
- Lista de miembros actuales del curso
- Botón para agregar miembros
- Botón para eliminar miembros
- Búsqueda de usuarios
- Filtro por rol
- Importación masiva desde CSV

### Elementos en pantalla
- **Lista de miembros:** nombre, email, rol, fecha de incorporación
- **Botones:** "Agregar miembro", "Eliminar", "Importar"
- **Búsqueda:** campo de búsqueda de usuarios
- **Filtro:** selector de rol (estudiante, profesor)
- **Selección múltiple:** checkboxes para agregar/eliminar

### Narración sugerida
"En la gestión de miembros puedes agregar o eliminar estudiantes y profesores del curso. Usa la búsqueda para encontrar usuarios existentes o importa múltiples miembros desde un archivo CSV. Selecciona los usuarios que deseas agregar y confirma la acción."

### Acciones del usuario
1. Ver lista de miembros actuales
2. Buscar usuarios para agregar
3. Seleccionar múltiples usuarios
4. Agregar miembros seleccionados
5. Eliminar un miembro
6. Importar miembros desde CSV

### Flujo del video
1. Mostrar la página de miembros del curso
2. Explicar la lista de miembros actuales
3. Demostrar la búsqueda de usuarios para agregar
4. Demostrar la selección de múltiples usuarios
5. Demostrar la agregación de miembros seleccionados
6. Demostrar la eliminación de un miembro
7. Demostrar la importación masiva desde CSV
8. Explicar que solo administradores y profesores del curso pueden gestionar miembros

### Errores comunes
- **Usuario ya es miembro:** Verificar que no esté en la lista
- **Error en CSV:** Verificar formato de la plantilla
- **No se puede eliminar:** Verificar permisos

### Ejemplo práctico
Agregar 3 estudiantes a un curso, eliminar uno que ya no participa e importar 10 miembros más desde CSV.

### Transiciones
- **Inicio:** "Los miembros son quienes participan en las sesiones de calificación"
- **Cierre:** "Ahora veamos cómo personalizar tu perfil"

### Notas para el guion
- Los miembros pueden ser estudiantes o profesores
- Un curso puede tener múltiples profesores
- La importación CSV sigue el mismo formato que la de usuarios
- Los miembros eliminados pierden acceso al curso

---

## 10. Perfil de Usuario

### Sección
Página de perfil (`/profile`)

### Público objetivo
- Todos los usuarios autenticados

### Duración estimada
2-3 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Editar su información personal
- Cambiar su contraseña
- Subir un avatar
- Cambiar el tema de la aplicación

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

### Elementos en pantalla
- **Información:** nombre, email, rol, avatar
- **Campos de edición:** nombre, email, contraseña
- **Avatar:** imagen de perfil actual, botón para cambiar
- **Toggle:** interruptor de tema claro/oscuro

### Narración sugerida
"En tu perfil puedes actualizar tu información personal. Cambia tu nombre, email o contraseña. También puedes subir una imagen de perfil y elegir entre el tema claro u oscuro de la aplicación."

### Acciones del usuario
1. Editar nombre
2. Cambiar email
3. Cambiar contraseña
4. Subir avatar
5. Cambiar tema (claro/oscuro)

### Flujo del video
1. Mostrar la página de perfil
2. Demostrar la edición del nombre
3. Demostrar el cambio de email
4. Demostrar el cambio de contraseña
5. Demostrar la subida de avatar
6. Demostrar el toggle de tema claro/oscuro
7. Explicar que los cambios se guardan automáticamente

### Errores comunes
- **Email ya en uso:** Verificar que el email no esté registrado
- **Contraseña incorrecta:** Verificar que sea la contraseña actual
- **Error al subir imagen:** Verificar formato y tamaño

### Ejemplo práctico
Cambiar el nombre a "Juan Pérez", subir una foto de perfil y activar el tema oscuro.

### Transiciones
- **Inicio:** "Tu perfil es tu identidad en el sistema"
- **Cierre:** "Ahora conozcas la navegación general del sistema"

### Notas para el guion
- El avatar se sube a Cloudinary
- El tema se guarda en la base de datos
- El cambio de email requiere verificación
- El cambio de contraseña requiere la contraseña actual

---

## 11. Navegación y Layout

### Sección
Componente de diseño (`Layout.tsx`)

### Público objetivo
- Todos los usuarios: orientación general

### Duración estimada
1-2 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Navegar entre secciones del sistema
- Entender la diferencia entre desktop y móvil
- Conocer las secciones disponibles por rol

### Qué incluye
- **Desktop:** sidebar lateral izquierdo con:
  - Logo y nombre de la app
  - Enlaces de navegación
  - Iconos descriptivos
- **Móvil:** bottom navigation bar con:
  - Iconos de navegación
  - Barra de aplicación fija en la parte superior

### Elementos en pantalla
- **Sidebar (desktop):** logo, enlaces con iconos
- **Bottom nav (móvil):** iconos de navegación
- **AppBar (móvil):** título de sección, botón de menú

### Narración sugerida
"El sistema se adapta a tu dispositivo. En desktop verás un menú lateral con todas las secciones. En móvil, los iconos de navegación aparecen en la parte inferior. Las secciones disponibles dependen de tu rol: administradores ven todo, profesores ven sus cursos, estudiantes ven sus cursos y calificaciones."

### Acciones del usuario
1. Navegar usando el sidebar (desktop)
2. Navegar usando el bottom nav (móvil)
3. Cambiar de sección

### Flujo del video
1. Mostrar la navegación en desktop
2. Explicar cada enlace del sidebar
3. Mostrar la navegación en móvil
4. Explicar los iconos del bottom nav
5. Demostrar la navegación entre secciones
6. Explicar qué secciones están disponibles según el rol

### Errores comunes
- **Sección no visible:** Verificar permisos de rol
- **Navegación no responde:** Verificar conexión a internet

### Ejemplo práctico
Navegar desde el dashboard a cursos, luego a estadísticas y finalmente al perfil, mostrando cómo funciona en desktop y móvil.

### Transiciones
- **Inicio:** "La navegación es intuitiva y se adapta a tu dispositivo"
- **Cierre:** "Ahora veamos cómo responder a comentarios"

### Notas para el guion
- El sidebar se oculta en móvil
- Los estudiantes no ven los enlaces de administración
- Los profesores no ven los enlaces de estadísticas (solo sus cursos)
- El layout es responsive y se adapta al tamaño de pantalla

---

## 12. Respuestas a Comentarios

### Sección
Dentro de la pestaña de comentarios en estadísticas o detalles de sesión

### Público objetivo
- Administradores y profesores: responder a comentarios
- Estudiantes: ver respuestas

### Duración estimada
1-2 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Responder a comentarios de estudiantes
- Ver respuestas de otros usuarios
- Eliminar respuestas (propietario/admin)

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

### Elementos en pantalla
- **Comentario original:** texto, autor, fecha
- **Respuestas:** lista de respuestas anidadas
- **Botón:** "Responder"
- **Textarea:** campo para escribir respuesta
- **Botones:** "Enviar", "Cancelar", "Eliminar"

### Narración sugerida
"Para responder a un comentario, haz clic en 'Responder' y escribe tu mensaje. Las respuestas se muestran debajo del comentario original. Solo tú puedes eliminar tus propias respuestas, o un administrador puede eliminar cualquier respuesta."

### Acciones del usuario
1. Hacer clic en "Responder" de un comentario
2. Escribir la respuesta en el textarea
3. Hacer clic en "Enviar"
4. Ver la respuesta agregada
5. Eliminar una respuesta (propietario/admin)

### Flujo del video
1. Mostrar un comentario con respuestas
2. Explicar que cualquier miembro del curso puede responder
3. Demostrar la escritura de una respuesta
4. Demostrar el envío de la respuesta
5. Demostrar la eliminación de una respuesta
6. Explicar que las respuestas se muestran ordenadas por fecha

### Errores comunes
- **No se puede eliminar:** Verificar que seas propietario o admin
- **Respuesta vacía:** El sistema requiere contenido

### Ejemplo práctico
Responder a un comentario de estudiante con "Gracias por tu retroalimentación, trabajaremos en mejorar eso", y luego eliminar una respuesta incorrecta.

### Transiciones
- **Inicio:** "Las respuestas fomentan la comunicación entre profesores y estudiantes"
- **Cierre:** "Ahora veamos cómo recuperar una contraseña olvidada"

### Notas para el guion
- Las respuestas son visibles para todos los miembros del curso
- Solo el autor o un admin pueden eliminar una respuesta
- No hay límite de respuestas por comentario
- Las respuestas se muestran en orden cronológico

---

## 13. Recuperación de Contraseña

### Sección
Página de recuperación (`/forgot-password`)

### Público objective
- Usuarios que olvidaron su contraseña

### Duración estimada
1-2 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Solicitar recuperación de contraseña
- Ingresar código de verificación
- Establecer una nueva contraseña

### Qué incluye
- Input para email
- Input para código de verificación
- Countdown timer para reenvío de código
- Botón de reenviar código
- Input para nueva contraseña

### Elementos en pantalla
- **Campo de email:** para solicitar recuperación
- **Campo de código:** para ingresar código de verificación
- **Countdown:** timer de 60 segundos
- **Campo de contraseña:** nueva contraseña
- **Botones:** "Enviar código", "Verificar", "Restablecer contraseña"

### Narración sugerida
"Si olvidaste tu contraseña, haz clic en '¿Olvidaste tu contraseña?' en la pantalla de inicio de sesión. Ingresa tu email y recibirás un código de verificación. Ingresa el código antes de que expire (60 segundos) y establece una nueva contraseña."

### Acciones del usuario
1. Hacer clic en "¿Olvidaste tu contraseña?"
2. Ingresar email
3. Hacer clic en "Enviar código"
4. Revisar email y obtener código
5. Ingresar código de verificación
6. Establecer nueva contraseña
7. Confirmar el cambio
8. Iniciar sesión con nueva contraseña

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

### Errores comunes
- **Código expirado:** Explicar cómo reenviar el código
- **Email no registrado:** Verificar que el email sea correcto
- **Contraseña débil:** Explicar requisitos mínimos

### Ejemplo práctico
Solicitar recuperación con email "usuario@ejemplo.com", recibir código "123456", ingresarlo y establecer nueva contraseña "NuevaPassword789".

### Transiciones
- **Inicio:** "Si olvidaste tu contraseña, no te preocupes"
- **Cierre:** "Ahora conocerás los permisos de cada rol"

### Notas para el guion
- El código expira después de 60 segundos
- Se puede reenviar el código si no se recibió
- Los errores se muestran en español
- Si el código es incorrecto, se muestra un mensaje de error

---

## 14. Permisos por Rol

### Sección
Concepto general del sistema (no es una página específica)

### Público objetivo
- Todos los usuarios: comprender sus permisos
- Administradores: entender la estructura de permisos

### Duración estimada
2-3 minutos

### Objetivo de aprendizaje
Al ver este video, el usuario podrá:
- Entender qué puede hacer según su rol
- Conocer las diferencias entre administrador, profesor y estudiante
- Saber a quién pedir ayuda para acciones restringidas

### Qué incluye
Tabla de permisos por rol:

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

### Elementos en pantalla
- **Tabla de permisos:** filas de acciones, columnas de roles
- **Iconos:** ✅ (permitido), ❌ (no permitido)
- **Descripciones:** explicación de cada permiso

### Narración sugerida
"Cada rol tiene permisos diferentes. Los administradores tienen acceso completo: pueden crear cursos, gestionar usuarios y ver todas las estadísticas. Los profesores pueden gestionar sus propios cursos y sesiones, pero no crear cursos nuevos. Los estudiantes pueden calificar sesiones y crear sugerencias, pero no tienen acceso a estadísticas ni gestión de usuarios."

### Acciones del usuario
1. Observar la tabla de permisos
2. Entender qué puede hacer según su rol
3. Identificar a quién pedir ayuda

### Flujo del video
1. Mostrar la tabla de permisos
2. Explicar los permisos de administrador
3. Explicar los permisos de profesor
4. Explicar los permisos de estudiante
5. Dar ejemplos de acciones comunes por rol
6. Explicar que los permisos se verifican en el backend

### Errores comunes
- **Acceso denegado:** Explicar que no tiene permisos
- **No ve la sección:** Verificar que su rol tenga acceso

### Ejemplo práctico
Mostrar que un estudiante no puede crear cursos, un profesor puede crear sesiones pero no cursos, y un administrador puede hacer todo.

### Transiciones
- **Inicio:** "Los permisos son fundamentales para la seguridad del sistema"
- **Cierre:** "Con esta información, ya conoces todos los aspectos de PulseClass"

### Notas para el guion
- Los permisos se verifican tanto en el frontend como en el backend (RLS)
- Un usuario no puede realizar acciones que no tiene permitidas
- Si se intenta una acción no permitida, se muestra un mensaje de error

---

## Estructura Recomendada para los Videos

### Video 1: Introducción y Primeros Pasos (5-7 minutos)
1. Bienvenida al sistema
2. Registro de usuario
3. Inicio de sesión
4. Tour por el panel principal
5. Explicación de roles

### Video 2: Gestión de Cursos y Sesiones (6-8 minutos)
1. Creación de cursos (admin)
2. Gestión de miembros
3. Creación de sesiones
4. Edición de sesiones

### Video 3: Calificación de Sesiones (4-5 minutos)
1. Acceso a sesiones
2. Proceso de calificación
3. Comentarios y sugerencias
4. Respuestas a comentarios

### Video 4: Estadísticas y Análisis (5-6 minutos)
1. Filtros de estadísticas
2. Gráficos y análisis
3. Gestión de comentarios
4. Gestión de sugerencias

### Video 5: Administración del Sistema (6-8 minutos)
1. Gestión de usuarios
2. Importación masiva
3. Perfil de usuario
4. Recuperación de contraseña
5. Permisos por rol

---

## Consideraciones Generales

### Accesibilidad
- El sistema es responsive (desktop y móvil)
- Los colores tienen contraste suficiente
- Los botones tienen texto alternativo
- El sistema es navegable con teclado

### Rendimiento
- Los datos se cargan de forma lazy
- Se usan skeleton loaders durante la carga
- Las actualizaciones son optimistas
- El sistema maneja errores de red

### Seguridad
- Las contraseñas se almacenan encriptadas
- Las sesiones se mantienen en localStorage
- Los permisos se verifican en el backend
- Los tokens de recuperación expiran

### Soporte
- Los errores se muestran en español
- Se proporcionan mensajes descriptivos
- El sistema maneja errores de red
- Hay mensajes de ayuda en cada sección

### Estilo de los Videos
- **Tono:** Profesional pero amigable
- **Velocidad:** Moderada, con pausas para explicar
- **Visual:** Mostrar pantalla completa con resaltados
- **Audio:** Narración clara, sin ruido de fondo
- **Subtítulos:** Recomendados para accesibilidad
