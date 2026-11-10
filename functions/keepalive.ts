const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-keepalive-source'
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const baseUrl = Deno.env.get('INSFORGE_BASE_URL')
  const apiKey = Deno.env.get('API_KEY')
  const started = Date.now()
  const url = new URL(req.url)
  const source = (
    url.searchParams.get('source') ||
    req.headers.get('x-keepalive-source') ||
    'external'
  ).trim().slice(0, 50) || 'external'

  if (!baseUrl || !apiKey) {
    return json({ status: 'error', error: 'Configuración incompleta' }, 500)
  }

  let status: 'ok' | 'error' = 'ok'
  let httpStatus: number | null = null
  let message = ''

  try {
    const res = await fetch(`${baseUrl}/api/database/records/profiles?select=id&limit=1`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`
      }
    })

    httpStatus = res.status
    if (!res.ok) {
      status = 'error'
      message = `La base de datos respondió HTTP ${res.status}`
    }
  } catch (error) {
    status = 'error'
    message = error instanceof Error ? error.message : 'Error interno'
  }

  const duration = Date.now() - started

  try {
    await fetch(`${baseUrl}/api/database/records/keepalive_runs`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify([{
        source,
        status,
        http_status: httpStatus,
        message: message || null,
        duration_ms: duration
      }])
    })
  } catch {
    // El log no debe alterar la respuesta del keepalive.
  }

  if (status !== 'ok') {
    return json({
      status,
      db: httpStatus,
      error: message || 'Error de base de datos',
      source,
      duration_ms: duration
    }, 503)
  }

  return json({
    status: 'ok',
    db: 'ok',
    service: 'pulseclass-keepalive',
    source,
    duration_ms: duration,
    timestamp: new Date().toISOString()
  }, 200)
}
