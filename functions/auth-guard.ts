import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

async function verifyTurnstile(secret: string, token: string, ip?: string): Promise<boolean> {
  const form = new URLSearchParams({ secret, response: token })
  if (ip) form.set('remoteip', ip)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form
  })
  if (!res.ok) return false

  const data = await res.json() as { success?: boolean }
  return data.success === true
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED', message: 'Método no permitido' }, 405)
  }

  try {
    const { action, email, password, name, turnstileToken } = await req.json() as {
      action?: 'signIn' | 'signUp'
      email?: string
      password?: string
      name?: string
      turnstileToken?: string
    }

    if ((action !== 'signIn' && action !== 'signUp') || !email || !password) {
      return json({ error: 'INVALID_INPUT', message: 'Datos incompletos' }, 400)
    }

    const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (secret) {
      if (!turnstileToken) {
        return json(
          { error: 'TURNSTILE_REQUIRED', message: 'Completa la verificación de seguridad' },
          403
        )
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      const valid = await verifyTurnstile(secret, turnstileToken, ip)
      if (!valid) {
        return json(
          {
            error: 'TURNSTILE_FAILED',
            message: 'La verificación de seguridad expiró o no es válida. Intenta de nuevo.'
          },
          403
        )
      }
    }

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL')
    const anonKey = Deno.env.get('ANON_KEY')
    if (!baseUrl || !anonKey) {
      return json({ error: 'CONFIG_ERROR', message: 'Configuración del servidor incompleta' }, 500)
    }

    const client = createClient({ baseUrl, anonKey })

    const { data, error } = action === 'signUp'
      ? await client.auth.signUp({ email, password, name: name || undefined })
      : await client.auth.signInWithPassword({ email, password })

    if (error) {
      const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 401
      return json(
        { error: 'AUTH_FAILED', message: error.message || 'No se pudo autenticar' },
        status
      )
    }

    if (!data?.accessToken || !data.user) {
      return json({ error: 'AUTH_FAILED', message: 'No se pudo autenticar' }, 401)
    }

    return json({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    })
  } catch (error) {
    return json({ error: 'INTERNAL_ERROR', message: String(error) }, 500)
  }
}
