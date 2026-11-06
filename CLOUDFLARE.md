# Cloudflare en PulseClass

Guía de la integración de Cloudflare (proxy DNS + WAF) y Turnstile (protección del login) con el frontend en Vercel y el backend en InsForge.

---

## 1. Arquitectura

```
Navegador
  ├── https://tudominio.com            → Cloudflare (WAF, TLS, headers) → Vercel (SPA)
  └── https://vph97w7w.us-west.insforge.app  → InsForge (sin pasar por Cloudflare)
```

El proxy de Cloudflare protege el frontend. Las llamadas del SDK a InsForge van directo al backend, por eso el login con contraseña se enruta por la edge function `auth-guard`, que valida Turnstile antes de llamar a InsForge.

---

## 2. Variables de entorno

| Variable | Dónde | Valor |
|---|---|---|
| `VITE_TURNSTILE_SITE_KEY` | Vercel (y `.env.local` para desarrollo) | Site key pública del widget |
| `TURNSTILE_SECRET_KEY` | Secreto de InsForge (nunca en el frontend) | Secret key del widget |

Con `VITE_TURNSTILE_SITE_KEY` vacía o ausente, la app funciona como antes: no muestra el widget y usa el login directo del SDK.

> Orden importante: desplegar la función `auth-guard` **antes** de definir `VITE_TURNSTILE_SITE_KEY` en Vercel. Si la site key existe y la función no, el login por correo falla.

---

## 3. Crear el widget de Turnstile

1. Cloudflare Dashboard → **Turnstile** → **Add widget**.
2. Nombre: `PulseClass`.
3. Hostnames:
   - `tudominio.com`
   - `www.tudominio.com`
   - `localhost` (para desarrollo)
4. Widget Mode: **Managed**.
5. Copiar **Site Key** y **Secret Key**.

---

## 4. Desplegar la edge function

```powershell
npx -y @insforge/cli whoami
npx -y @insforge/cli current
npx -y @insforge/cli functions deploy auth-guard --file functions/auth-guard.ts
npx -y @insforge/cli secrets add TURNSTILE_SECRET_KEY "<secret-key>"
```

Verificar que el secreto quedó registrado (sin mostrar el valor):

```powershell
npx -y @insforge/cli secrets list
```

Probar la función (sin token debe responder 403 cuando el secreto está configurado):

```powershell
npx -y @insforge/cli functions invoke auth-guard --data '{\"action\":\"signIn\",\"email\":\"test@example.com\",\"password\":\"x\"}'
```

Cada vez que se modifique `functions/auth-guard.ts` hay que volver a desplegar.

---

## 5. Activar en el frontend

1. Vercel → Project → Settings → Environment Variables:
   - `VITE_TURNSTILE_SITE_KEY` = site key
   - Aplicar a Production, Preview y Development.
2. Redeploy (Vite inyecta la variable en build time).
3. En local, agregar la misma variable a `.env.local` y reiniciar `npm run dev`.

El widget aparece en `LoginPage` debajo de "Mantener sesión iniciada". Si el usuario intenta enviar el formulario sin completarlo, se muestra un toast y no se llama al backend.

> El botón **Continuar con Google** es un flujo OAuth por redirección y no pasa por Turnstile. Su protección depende de Google + los rate limits de InsForge.

---

## 6. DNS y TLS en Cloudflare

1. **Add a site** → dominio → plan Free.
2. Cambiar los nameservers en el registrador a los que indica Cloudflare.
3. Registros DNS:

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| CNAME | `@` | `cname.vercel-dns.com` | Proxied (naranja) |
| CNAME | `www` | `cname.vercel-dns.com` | Proxied (naranja) |
| TXT | `_vercel` | el que indique Vercel | DNS only |

4. **SSL/TLS → Overview**: **Full (strict)**. Nunca "Flexible".
5. **SSL/TLS → Edge Certificates**:
   - Always Use HTTPS: ON
   - Minimum TLS Version: 1.2
   - TLS 1.3: ON
6. **Speed → Optimization**: desactivar **Rocket Loader** y **Email Address Obfuscation**.
7. **Caching → Configuration**: mantener **Standard**. No activar "Cache Everything": `index.html` quedaría cacheado y tras un deploy apuntaría a assets con hash antiguo (pantalla en blanco).

El HSTS ya se envía desde `vercel.json`; no hace falta duplicarlo en Cloudflare.

---

## 7. WAF, bots y rate limiting

1. **Security → WAF → Managed rules**: activar Cloudflare Managed Ruleset + OWASP Core Ruleset (paranoia level 1). Empezar en *Log* y pasar a *Block* tras revisar eventos.
2. **Security → Bots**: activar **Bot Fight Mode**.
3. **Security → Rate limiting**: una regla para `/*` (por IP), por ejemplo 100 req/min, para frenar scraping y floods.
4. **Security → Settings**: Security Level Medium.

El brute-force contra el login lo limita InsForge (rate limit propio) y ahora también Turnstile. Cloudflare no ve ese tráfico porque va al dominio de InsForge.

---

## 8. Headers de seguridad

Se aplican desde `vercel.json` a todas las rutas:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `X-Permitted-Cross-Domain-Policies: none`

La CSP permite explícitamente:

- `challenges.cloudflare.com` (script + iframe de Turnstile)
- `fonts.googleapis.com` / `fonts.gstatic.com`
- `vph97w7w.us-west.insforge.app` (API, storage)
- `vph97w7w.function2.insforge.app` (edge functions)
- `api.cloudinary.com` / `res.cloudinary.com` (subida y visualización de avatares)
- `www.youtube.com` / `img.youtube.com` (tutoriales embebidos)

Si se cambia de proyecto InsForge hay que actualizar esos hosts en `vercel.json`.

Limitación conocida: `script-src` incluye `'unsafe-inline'` por el script de tema en `index.html`. Se puede endurecer más adelante con hashes o nonces.

---

## 9. Verificación

```powershell
curl -I https://tudominio.com
curl -s https://tudominio.com/cdn-cgi/trace
```

Comprobar:

- `server: cloudflare`
- `content-security-policy`, `strict-transport-security` y el resto de headers
- En **Security → Events**: sin falsos positivos sobre el callback de auth ni sobre Google OAuth

Flujo funcional esperado:

1. Login sin resolver el widget → toast "Completa la verificación de seguridad".
2. Login con widget resuelto → sesión iniciada y persistida igual que antes.
3. Login con contraseña incorrecta → mensaje de credenciales y widget reiniciado.
4. Si el token expira o se reutiliza → 403 de `auth-guard` y widget reiniciado.

---

## 10. Rollback

1. Quitar `VITE_TURNSTILE_SITE_KEY` de Vercel y redeploy → la app vuelve al login directo del SDK.
2. En Cloudflare, poner los registros DNS en **DNS only** (gris) para dejar de usar el proxy sin cambiar nameservers.
