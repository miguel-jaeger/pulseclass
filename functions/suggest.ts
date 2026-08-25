import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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

    const recordsUrl = `${baseUrl}/api/database/records/suggestions`

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
      return new Response(JSON.stringify(body), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update' && id) {
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
