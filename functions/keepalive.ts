const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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

  if (!baseUrl || !apiKey) {
    return json({ status: 'error', error: 'Configuración incompleta' }, 500)
  }

  try {
    const res = await fetch(`${baseUrl}/api/database/records/profiles?select=id&limit=1`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`
      }
    })

    if (!res.ok) {
      return json({ status: 'error', db: res.status }, 503)
    }

    return json({
      status: 'ok',
      db: 'ok',
      service: 'pulseclass-keepalive',
      timestamp: new Date().toISOString()
    }, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return json({ status: 'error', error: message }, 503)
  }
}
