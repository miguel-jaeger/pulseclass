import { createAdminClient, createClient } from 'npm:@insforge/sdk'

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

    const { name, email: rawEmail, role } = await req.json()
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    const cleanName = typeof name === 'string' ? name.trim() : ''
    if (!cleanName || !email || !email.includes('@') || !['admin', 'coordinator', 'teacher', 'student'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Nombre, correo y rol válido son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL')
    const apiKey = Deno.env.get('API_KEY')
    if (!baseUrl || !apiKey) {
      return new Response(JSON.stringify({ error: 'Configuración de administración incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userClient = createClient({
      baseUrl,
      accessToken: authHeader.replace('Bearer ', '')
    })
    const { data: userData } = await userClient.auth.getCurrentUser()
    if (!userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createAdminClient({ baseUrl, apiKey })
    const { data: adminProfile } = await adminClient.database
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single()
    const requesterRole = adminProfile?.role
    const isAdmin = requesterRole === 'admin'
    const isCoordinator = requesterRole === 'coordinator'
    if (!isAdmin && !isCoordinator) {
      return new Response(JSON.stringify({ error: 'Solo administradores y coordinadores pueden crear usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (isCoordinator && role === 'admin') {
      return new Response(JSON.stringify({ error: 'Los coordinadores no pueden crear administradores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const createResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/api/auth/users?client_type=server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ email, password: '12345678', name: cleanName })
    })
    const responseText = await createResponse.text()
    let responseData: { user?: { id?: string } } = {}
    try {
      responseData = responseText ? JSON.parse(responseText) : {}
    } catch {
      responseData = {}
    }

    if (!createResponse.ok) {
      const error = createResponse.status === 409
        ? 'Ya existe un usuario con ese correo.'
        : 'No se pudo crear el usuario.'
      return new Response(JSON.stringify({ error }), {
        status: createResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = responseData.user?.id
    if (!userId) {
      return new Response(JSON.stringify({ error: 'El servidor no devolvió el ID del usuario creado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: profileError } = await adminClient.database
      .from('profiles')
      .update({ name: cleanName, role })
      .eq('user_id', userId)
    if (profileError) {
      console.error('Could not set profile role for newly created user')
      return new Response(JSON.stringify({ error: 'El usuario se creó, pero no se pudo asignar su rol.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch {
    console.error('Admin user creation failed')
    return new Response(JSON.stringify({ error: 'Error interno al crear el usuario.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
