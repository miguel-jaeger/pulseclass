import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

const STATUS_LABELS: Record<string, string> = {
  recibida: 'Recibida',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  implementada: 'Implementada'
}

const STATUS_MESSAGES: Record<string, string> = {
  recibida: 'Hemos recibido tu sugerencia y está en cola para ser revisada.',
  aprobada: '¡Buenas noticias! Tu sugerencia fue aprobada.',
  rechazada: 'Tu sugerencia fue revisada, pero por ahora no continuará adelante.',
  implementada: '¡Tu sugerencia fue implementada! Gracias por tu aporte.'
}

const TYPE_LABELS: Record<string, string> = {
  mejora: 'Mejora',
  nuevo: 'Nueva funcionalidad',
  problema: 'Problema',
  contenido: 'Contenido'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmail(title: string, intro: string, rows: { label: string; value: string }[]): string {
  const detailRows = rows
    .map(
      row => `<tr>
        <td style="padding:6px 0;color:#5c403f;font-size:13px;width:120px;vertical-align:top">${escapeHtml(row.label)}</td>
        <td style="padding:6px 0;color:#141d23;font-size:13px;font-weight:600">${escapeHtml(row.value)}</td>
      </tr>`
    )
    .join('')

  return `<div style="background:#f6faff;padding:24px;font-family:Inter,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5bdbb;border-radius:12px;overflow:hidden">
      <div style="background:#9e001f;padding:16px 24px">
        <span style="color:#ffffff;font-size:18px;font-weight:700">PulseClass</span>
      </div>
      <div style="padding:24px">
        <h1 style="margin:0 0 12px;color:#141d23;font-size:18px">${escapeHtml(title)}</h1>
        <p style="margin:0 0 16px;color:#141d23;font-size:14px;line-height:1.5">${escapeHtml(intro)}</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px">${detailRows}</table>
        <p style="margin:16px 0 0;color:#5c403f;font-size:12px;line-height:1.5">Este es un mensaje automático, no es necesario responder.</p>
      </div>
    </div>
  </div>`
}

async function getProfileEmail(
  recordsBaseUrl: string,
  apiKey: string,
  userId: string
): Promise<{ email: string; name: string } | null> {
  const res = await fetch(
    `${recordsBaseUrl}/profiles?user_id=eq.${userId}&select=email,name&limit=1`,
    { headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` } }
  )
  if (!res.ok) return null
  const rows = await res.json()
  if (!Array.isArray(rows) || rows.length === 0) return null
  return { email: rows[0].email, name: rows[0].name }
}

const adminHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  apikey: apiKey,
  Authorization: `Bearer ${apiKey}`
})

async function getRequesterRole(recordsBaseUrl: string, apiKey: string, userId: string): Promise<string | null> {
  const res = await fetch(
    `${recordsBaseUrl}/profiles?user_id=eq.${userId}&select=role&limit=1`,
    { headers: adminHeaders(apiKey) }
  )
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0 ? rows[0].role : null
}

async function sharesCourseWith(
  recordsBaseUrl: string,
  apiKey: string,
  requesterId: string,
  authorId: string
): Promise<boolean> {
  const mineRes = await fetch(
    `${recordsBaseUrl}/course_members?user_id=eq.${requesterId}&select=course_id`,
    { headers: adminHeaders(apiKey) }
  )
  if (!mineRes.ok) return false
  const mine = await mineRes.json()
  const courseIds = Array.isArray(mine)
    ? mine.map((row: { course_id: string }) => row.course_id).filter(Boolean)
    : []
  if (courseIds.length === 0) return false

  const res = await fetch(
    `${recordsBaseUrl}/course_members?user_id=eq.${authorId}&course_id=in.(${courseIds.join(',')})&select=user_id&limit=1`,
    { headers: adminHeaders(apiKey) }
  )
  if (!res.ok) return false
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0
}

interface SuggestionRow {
  id: string
  user_id: string
  status: string
  type: string
  description: string
  deleted_at: string | null
}

async function fetchSuggestion(
  recordsUrl: string,
  apiKey: string,
  id: string
): Promise<SuggestionRow | null> {
  const res = await fetch(
    `${recordsUrl}?id=eq.${id}&select=id,user_id,status,type,description,deleted_at&limit=1`,
    { headers: adminHeaders(apiKey) }
  )
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function encodeBase64Utf8(value: string): string {
  return toBase64(new TextEncoder().encode(value))
}

function readSmtpResponse(conn: Deno.Conn, state: { buffer: string }): Promise<string> {
  const decoder = new TextDecoder()
  const bytes = new Uint8Array(4096)
  return (async () => {
    while (true) {
      const lines = state.buffer.split('\r\n')
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          const response = lines.slice(0, i + 1).join('\r\n')
          state.buffer = lines.slice(i + 1).join('\r\n')
          return response
        }
      }
      const read = await conn.read(bytes)
      if (read === null) return state.buffer
      state.buffer += decoder.decode(bytes.subarray(0, read), { stream: true })
    }
  })()
}

interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
}

async function sendViaSmtp(config: SmtpConfig, to: string, subject: string, html: string): Promise<void> {
  const conn = await Deno.connectTls({ hostname: config.host, port: config.port })
  const encoder = new TextEncoder()
  const state = { buffer: '' }
  const write = (text: string) => conn.write(encoder.encode(text))

  try {
    await readSmtpResponse(conn, state)
    await write('EHLO pulseclass\r\n')
    await readSmtpResponse(conn, state)
    await write('AUTH LOGIN\r\n')
    await readSmtpResponse(conn, state)
    await write(`${encodeBase64Utf8(config.user)}\r\n`)
    await readSmtpResponse(conn, state)
    await write(`${encodeBase64Utf8(config.password)}\r\n`)
    const auth = await readSmtpResponse(conn, state)
    if (!auth.startsWith('235')) throw new Error(`SMTP auth rechazada: ${auth}`)

    await write(`MAIL FROM:<${config.user}>\r\n`)
    await readSmtpResponse(conn, state)
    await write(`RCPT TO:<${to}>\r\n`)
    await readSmtpResponse(conn, state)
    await write('DATA\r\n')
    await readSmtpResponse(conn, state)

    const wrappedBody = encodeBase64Utf8(html).replace(/(.{76})/g, '$1\r\n')
    const message = [
      `From: "PulseClass" <${config.user}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${encodeBase64Utf8(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      wrappedBody
    ].join('\r\n')

    await write(`${message}\r\n.\r\n`)
    const sent = await readSmtpResponse(conn, state)
    if (!sent.startsWith('250')) throw new Error(`SMTP envío rechazado: ${sent}`)

    await write('QUIT\r\n')
    try { await readSmtpResponse(conn, state) } catch { /* ignore */ }
  } finally {
    try { conn.close() } catch { /* ignore */ }
  }
}

async function sendMail(
  env: { baseUrl: string; anonKey?: string; smtp?: SmtpConfig },
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (env.smtp && env.smtp.user && env.smtp.password) {
    await sendViaSmtp(env.smtp, to, subject, html)
    return
  }
  if (env.anonKey) {
    const emailClient = createClient({ baseUrl: env.baseUrl, anonKey: env.anonKey })
    const { error } = await emailClient.emails.send({ to, subject, html, from: 'PulseClass' })
    if (error) throw error
    return
  }
  throw new Error('No hay proveedor de correo configurado')
}

export default async function(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userToken = authHeader.replace('Bearer ', '')
    const { action, id, data } = await req.json() as {
      action: 'create' | 'update' | 'delete' | 'restore' | 'purge'
      id?: string
      data?: Record<string, unknown>
    }

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL')
    const apiKey = Deno.env.get('API_KEY')
    const anonKey = Deno.env.get('ANON_KEY')

    const smtpHost = Deno.env.get('SMTP_HOST')
    const smtpUser = Deno.env.get('SMTP_USER')
    const smtpPassword = Deno.env.get('SMTP_PASSWORD')
    const smtpPort = Number(Deno.env.get('SMTP_PORT') ?? '465')
    const smtp = smtpHost && smtpUser && smtpPassword
      ? { host: smtpHost, port: smtpPort, user: smtpUser, password: smtpPassword }
      : undefined
    const mailEnv = { baseUrl, anonKey: anonKey ?? undefined, smtp }
    const canEmail = Boolean(smtp) || Boolean(anonKey)

    const userClient = createClient({ baseUrl, accessToken: userToken })
    const { data: userData } = await userClient.auth.getCurrentUser()
    if (!userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': apiKey!,
      'Authorization': `Bearer ${apiKey}`,
      'Prefer': 'return=representation'
    }

    const recordsBaseUrl = `${baseUrl}/api/database/records`
    const recordsUrl = `${recordsBaseUrl}/suggestions`

    const requesterId = userData.user.id
    const requesterRole = await getRequesterRole(recordsBaseUrl, apiKey!, requesterId)
    const isAdmin = requesterRole === 'admin'

    const canManage = async (suggestion: SuggestionRow | null): Promise<boolean> => {
      if (!suggestion) return false
      if (isAdmin || requesterRole === 'coordinator') return true
      if (suggestion.user_id === requesterId) return true
      if (requesterRole === 'teacher') {
        return await sharesCourseWith(recordsBaseUrl, apiKey!, requesterId, suggestion.user_id)
      }
      return false
    }

    const sanitize = (payload?: Record<string, unknown>) => {
      const clean = { ...(payload ?? {}) }
      delete clean.deleted_at
      delete clean.deleted_by
      return clean
    }

    if (action === 'create') {
      const res = await fetch(recordsUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...sanitize(data), user_id: userData.user.id })
      })
      const body = await res.json()
      if (!res.ok) {
        return new Response(JSON.stringify(body), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (canEmail) {
        try {
          const profile = await getProfileEmail(recordsBaseUrl, apiKey!, userData.user.id)
          if (profile?.email) {
            const type = typeof data?.type === 'string' ? data.type : 'mejora'
            const description = typeof data?.description === 'string' ? data.description : ''
            const html = buildEmail(
              'Recibimos tu sugerencia',
              STATUS_MESSAGES.recibida,
              [
                { label: 'Tipo', value: TYPE_LABELS[type] || type },
                { label: 'Descripción', value: description },
                { label: 'Estado', value: STATUS_LABELS.recibida }
              ]
            )
            await sendMail(mailEnv, profile.email, 'Recibimos tu sugerencia', html)
          }
        } catch (emailError) {
          console.error('No se pudo notificar la creación de la sugerencia:', emailError)
        }
      }

      return new Response(JSON.stringify(body), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update' && id) {
      const previous = await fetchSuggestion(recordsUrl, apiKey!, id)
      if (!previous) {
        return new Response(JSON.stringify({ error: 'Sugerencia no encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (previous.deleted_at) {
        return new Response(JSON.stringify({ error: 'La sugerencia está en la papelera' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (!(await canManage(previous))) {
        return new Response(JSON.stringify({ error: 'No tienes permisos para modificar esta sugerencia' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const res = await fetch(`${recordsUrl}?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(sanitize(data))
      })
      const body = await res.json()
      if (!res.ok) {
        return new Response(JSON.stringify(body), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const newStatus = typeof data?.status === 'string' ? data.status : undefined
      if (canEmail && previous && newStatus && newStatus !== previous.status) {
        try {
          const profile = await getProfileEmail(recordsBaseUrl, apiKey!, previous.user_id)
          if (profile?.email) {
            const statusLabel = STATUS_LABELS[newStatus] || newStatus
            const detailRows = [
              { label: 'Descripción', value: previous.description || 'Sin descripción' },
              { label: 'Estado anterior', value: STATUS_LABELS[previous.status] || previous.status },
              { label: 'Nuevo estado', value: statusLabel }
            ]
            const rejectionReason = typeof data?.rejection_reason === 'string' ? data.rejection_reason.trim() : ''
            if (newStatus === 'rechazada' && rejectionReason) {
              detailRows.push({ label: 'Motivo del rechazo', value: rejectionReason })
            }
            const html = buildEmail(
              `Tu sugerencia fue actualizada`,
              STATUS_MESSAGES[newStatus] || `El estado de tu sugerencia cambió a ${statusLabel}.`,
              detailRows
            )
            await sendMail(mailEnv, profile.email, `Tu sugerencia ahora está: ${statusLabel}`, html)
          }
        } catch (emailError) {
          console.error('No se pudo notificar el cambio de estado:', emailError)
        }
      }

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'delete' && id) {
      const target = await fetchSuggestion(recordsUrl, apiKey!, id)
      if (!target) {
        return new Response(JSON.stringify({ error: 'Sugerencia no encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (!(await canManage(target))) {
        return new Response(JSON.stringify({ error: 'No tienes permisos para eliminar esta sugerencia' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (target.deleted_at) {
        return new Response(null, { status: 204, headers: corsHeaders })
      }

      const res = await fetch(`${recordsUrl}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ deleted_at: new Date().toISOString(), deleted_by: requesterId })
      })
      if (!res.ok) {
        const body = await res.json()
        return new Response(JSON.stringify(body), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (action === 'restore' && id) {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Solo los administradores pueden restaurar sugerencias' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const res = await fetch(`${recordsUrl}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ deleted_at: null, deleted_by: null })
      })
      if (!res.ok) {
        const body = await res.json()
        return new Response(JSON.stringify(body), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (action === 'purge' && id) {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Solo los administradores pueden eliminar sugerencias definitivamente' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const res = await fetch(`${recordsUrl}?id=eq.${id}`, {
        method: 'DELETE',
        headers: { ...headers, 'Prefer': 'return=minimal' }
      })
      if (!res.ok) {
        const body = await res.json()
        return new Response(JSON.stringify(body), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: 'Acción inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
