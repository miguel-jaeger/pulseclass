# Restauración del proyecto PulseClass (InsForge)

Guía ejecutable para que un agente de IA pueda recuperar y volver a desplegar el proyecto **PulseClass** si el backend de InsForge se pausa o es necesario recrearlo desde cero.

> **Proyecto InsForge:** `pulseclassbackend`
> **Org:** `b0522689-b96d-4e7b-b20f-ddaf3ebc1681`
> **Project ID:** `fe20a9f2-6130-4c9b-84db-c6f34a0133d1`
> **API base:** `https://vph97w7w.us-west.insforge.app`
> **Backup de datos:** `3de33be8-cd31-4a1c-98df-8821eb13a69b` (nombre: `pre-pausa-2026-09-24`)

---

## Qué hay guardado y dónde

| Recurso | Ubicación |
|---------|-----------|
| Código frontend (React + Vite + TS) | `src/` en este repo |
| Migraciones SQL (34, todo el esquema/RLS/triggers) | `migrations/*.sql` en este repo |
| Edge functions (6) | `functions/*.ts` en este repo |
| Configuración backend (auth, SMTP, storage) | `insforge.toml` en este repo |
| Variables de entorno del frontend | `.env.local` (NO subir a git) |
| Datos de la base de datos + storage (snapshot) | Backup `pre-pausa-2026-09-24` en InsForge |

**Secretos que NO están en el repo** (viven en el proyecto InsForge, se regeneran al crear proyecto nuevo):
`SMTP_PASSWORD`, `JWT_SECRET`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_KEY_ID`, `API_KEY`, `ANON_KEY`, `INSFORGE_BASE_URL`, `VERCEL_WEBHOOK_SECRET`.

> ⚠️ `.insforge/project.json` contiene la API key — está en `.gitignore` y **no** debe subirse ni compartirse.

---

## Escenario A: El proyecto InsForge se pausó (pero existe todavía)

Se "restaura" (reactiva) sin perder datos. No se recrea nada.

```bash
npx -y @insforge/cli login
npx -y @insforge/cli link --project-id fe20a9f2-6130-4c9b-84db-c6f34a0133d1 -y
npx -y @insforge/cli projects restore
```

Comprobar estado con:

```bash
npx -y @insforge/cli projects get --json
npx -y @insforge/cli diagnose
```

El frontend no necesita cambios: sigue apuntando a la misma URL.

---

## Escenario B: Hay que recrear el proyecto desde cero

### Paso 1 — Crear y vincular un proyecto nuevo

```bash
npx -y @insforge/cli login
npx -y @insforge/cli create --json   # guarda el nuevo project_id y appkey de la salida
npx -y @insforge/cli link --project-id <NUEVO_PROJECT_ID> --org-id b0522689-b96d-4e7b-b20f-ddaf3ebc1681 -y
```

Tomar nota del **nuevo** `appkey`, `region` y API base (ej. `https://XXXX.us-west.insforge.app`). Todo lo siguiente usa el proyecto recién creado.

### Paso 2 — Aplicar migraciones (esquema, RLS, triggers)

Las migraciones están ordenadas por nombre de archivo (timestamp creciente). Aplícalas en orden:

```bash
# Ver migraciones pendientes
npx -y @insforge/cli db migrations list --json

# Aplicar todas en orden
npx -y @insforge/cli db migrations up --all
```

Alternativa desde cero en un proyecto limpio, el binario en `npm` recorre `migrations/`:
el CLI `db migrations up --all` aplica los archivos de `migrations/` siguiendo el orden del timestamp.

### Paso 3 — Desplegar las edge functions

Cada archivo `functions/<slug>.ts` corresponde a una función con el mismo nombre (slug).

```bash
npx -y @insforge/cli functions deploy admin-change-password --file functions/admin-change-password.ts
npx -y @insforge/cli functions deploy change-password --file functions/change-password.ts
npx -y @insforge/cli functions deploy csv-import-users --file functions/csv-import-users.ts
npx -y @insforge/cli functions deploy delete-user --file functions/delete-user.ts
npx -y @insforge/cli functions deploy init-statistics-counts --file functions/init-statistics-counts.ts
npx -y @insforge/cli functions deploy suggest --file functions/suggest.ts
```

Verificar:

```bash
npx -y @insforge/cli functions list --json
```

### Paso 4 — Aplicar la configuración del backend (`insforge.toml`)

```bash
npx -y @insforge/cli config plan
npx -y @insforge/cli config apply
```

> `insforge.toml` referencia `env(SMTP_PASSWORD)` para el SMTP. Define ese secreto:
> ```bash
> npx -y @insforge/cli secrets add SMTP_PASSWORD <valor-de-cuenta-gmail>
> ```
> (La cuenta SMTP usada es `miguel.jaeger@gmail.com`, host `smtp.gmail.com`, puerto 465.)

### Paso 5 — Restaurar los datos (base + storage)

Restaurar el backup creado en el proyecto nuevo. **OJO:** este comando sobrescribe la base y el storage actuales del proyecto con el snapshot.

```bash
npx -y @insforge/cli backups list --json                                   # confirmar el backup_id
npx -y @insforge/cli backups restore 3de33be8-cd31-4a1c-98df-8821eb13a69b --project <NUEVO_PROJECT_ID>
```

> Al restaurar en un proyecto **nuevo**, hazlo después de aplicar migraciones (Paso 2)
> para que el esquema exista. El restore repliega los datos encima del esquema restaurado.
>
> Si ocurren conflictos por identidades/sesiones ya insertadas tras aplicar migraciones,
> es preferible restaurar antes de desplegar funciones o usar `--wait` y verificar
> con `npx -y @insforge/cli db query "select count(*) from profiles"`.

### Paso 6 — Regenerar credenciales / secretos reservados

Al crear un proyecto nuevo, InsForge regenera automáticamente `API_KEY`, `ANON_KEY`,
`JWT_*` e `INSFORGE_BASE_URL`. Verificar:

```bash
npx -y @insforge/cli secrets list --all
```

### Paso 7 — Actualizar el frontend a la nueva URL/anón-key

Editar `.env.local` con los valores del **nuevo** proyecto:

```env
VITE_INSFORGE_URL=https://<NUEVO_APPKEY>.<NUEVA-REGION>.insforge.app
VITE_INSFORGE_ANON_KEY=anon_<nueva-key-anonima>
```

Desplegar el frontend (Vercel en este caso) o arrancar en local:

```bash
npm install
npm run dev                # local
npm run build              # build de producción
```

---

## Verificación post-restauración

```bash
npx -y @insforge/cli diagnose                          # salud general
npx -y @insforge/cli db query "select count(*) from profiles" --json
npx -y @insforge/cli db query "select count(*) from courses" --json
npx -y @insforge/cli functions list --json            # las 6 funciones activas
npx -y @insforge/cli secrets list --all               # secretos presentes
npx -y @insforge/cli config plan                      # config sin cambios pendientes
```

Comprobar en navegador:
- Login/registro funcionan.
- Login con Google (OAuth) redirige bien.
- Correos de verificación/reset llegan (SMTP).
- Las estadísticas y calificaciones muestran datos (hay datos restaurados).

---

## Resumen rápido (copiar/pegar para un agente)

```bash
# Escenario B: recrear todo
npx -y @insforge/cli login
npx -y @insforge/cli create --json
npx -y @insforge/cli link -y
npx -y @insforge/cli db migrations up --all
npx -y @insforge/cli functions deploy admin-change-password --file functions/admin-change-password.ts
npx -y @insforge/cli functions deploy change-password --file functions/change-password.ts
npx -y @insforge/cli functions deploy csv-import-users --file functions/csv-import-users.ts
npx -y @insforge/cli functions deploy delete-user --file functions/delete-user.ts
npx -y @insforge/cli functions deploy init-statistics-counts --file functions/init-statistics-counts.ts
npx -y @insforge/cli functions deploy suggest --file functions/suggest.ts
npx -y @insforge/cli config apply
npx -y @insforge/cli secrets add SMTP_PASSWORD <valor-gmail>
npx -y @insforge/cli backups restore 3de33be8-cd31-4a1c-98df-8821eb13a69b --project <NUEVO_PROJECT_ID>
```

> Actualizar `.env.local` con la nueva URL y anon key del proyecto recreado antes de desplegar el frontend.