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
    const { userId, newPassword } = await req.json()

    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ error: 'ID de usuario y nueva contraseña son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }), {
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
      return new Response(JSON.stringify({ error: 'Solo administradores pueden cambiar contraseñas de otros usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: updateError } = await adminClient.database.rpc('admin_update_user_password', {
      p_user_id: userId,
      p_new_password: newPassword
    })

    if (updateError) {
      console.error('RPC error:', updateError)

      const sqlRes = await fetch(`${baseUrl}/rest/v1/rpc/admin_update_user_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey!,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ p_user_id: userId, p_new_password: newPassword })
      })

      if (!sqlRes.ok) {
        return new Response(JSON.stringify({ error: 'Error al cambiar la contraseña' }), {
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
