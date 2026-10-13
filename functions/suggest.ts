import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

const STATUS_LABELS: Record<string, string> = {
  recibida: 'Recibida',
  revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  implementada: 'Implementada'
}

const STATUS_MESSAGES: Record<string, string> = {
  recibida: 'Hemos recibido tu sugerencia y está en cola para ser revisada.',
  revision: 'Tu sugerencia está siendo revisada por el equipo.',
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

async function sendNotification(
  baseUrl: string,
  anonKey: string,
  to: string,
  subject: string,
  html: string
) {
  const emailClient = createClient({ baseUrl, anonKey })
  const { error } = await emailClient.emails.send({ to, subject, html, from: 'PulseClass' })
  if (error) throw error
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
      action: 'create' | 'update' | 'delete'
      id?: string
      data?: Record<string, unknown>
    }

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL')
    const apiKey = Deno.env.get('API_KEY')
    const anonKey = Deno.env.get('ANON_KEY')

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

    if (action === 'create') {
      const res = await fetch(recordsUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, user_id: userData.user.id })
      })
      const body = await res.json()
      if (!res.ok) {
        return new Response(JSON.stringify(body), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (anonKey) {
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
            await sendNotification(baseUrl, anonKey, profile.email, 'Recibimos tu sugerencia', html)
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
      let previous: { user_id: string; status: string; description: string; type: string } | null = null
      try {
        const currentRes = await fetch(
          `${recordsUrl}?id=eq.${id}&select=user_id,status,description,type&limit=1`,
          { headers }
        )
        if (currentRes.ok) {
          const rows = await currentRes.json()
          if (Array.isArray(rows) && rows.length > 0) previous = rows[0]
        }
      } catch (fetchError) {
        console.error('No se pudo leer la sugerencia previa:', fetchError)
      }

      const res = await fetch(`${recordsUrl}?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data)
      })
      const body = await res.json()
      if (!res.ok) {
        return new Response(JSON.stringify(body), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const newStatus = typeof data?.status === 'string' ? data.status : undefined
      if (anonKey && previous && newStatus && newStatus !== previous.status) {
        try {
          const profile = await getProfileEmail(recordsBaseUrl, apiKey!, previous.user_id)
          if (profile?.email) {
            const statusLabel = STATUS_LABELS[newStatus] || newStatus
            const html = buildEmail(
              `Tu sugerencia fue actualizada`,
              STATUS_MESSAGES[newStatus] || `El estado de tu sugerencia cambió a ${statusLabel}.`,
              [
                { label: 'Descripción', value: previous.description || 'Sin descripción' },
                { label: 'Estado anterior', value: STATUS_LABELS[previous.status] || previous.status },
                { label: 'Nuevo estado', value: statusLabel }
              ]
            )
            await sendNotification(baseUrl, anonKey, profile.email, `Tu sugerencia ahora está: ${statusLabel}`, html)
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
