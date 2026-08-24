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
    const { userId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
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

    const adminClient = createClient({ baseUrl, accessToken: apiKey })

    const { data: profileData, error: profileError } = await adminClient.database
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single()

    if (profileError || !profileData || profileData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden eliminar usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Try RPC first
    const { error: rpcError } = await adminClient.database.rpc('admin_delete_user', {
      p_user_id: userId
    })

    if (rpcError) {
      console.error('RPC error:', rpcError)

      // Fallback: direct SQL via REST
      const sqlRes = await fetch(`${baseUrl}/rest/v1/rpc/admin_delete_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey!,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ p_user_id: userId })
      })
      console.log('REST fallback:', sqlRes.status)

      if (!sqlRes.ok) {
        return new Response(JSON.stringify({ error: 'Error al eliminar usuario' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
