import { createAdminClient, createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

const ALLOWED_ROLES = ['admin', 'coordinator', 'teacher', 'student']

type AdminDatabase = ReturnType<typeof createAdminClient>['database']

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

const fail = (message: string, status: number) => json({ error: message, message }, status)

const findAuthUserByEmail = async (baseUrl: string, apiKey: string, email: string) => {
  try {
    const response = await fetch(`${baseUrl}/api/auth/users?search=${encodeURIComponent(email)}&limit=20`, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    })
    if (!response.ok) return null
    const payload = await response.json() as { data?: { id?: string; email?: string }[] }
    return (payload.data || []).find(user => user.email?.trim().toLowerCase() === email) ?? null
  } catch {
    return null
  }
}

const profileExists = async (adminClient: AdminDatabase, userId: string) => {
  const { data } = await adminClient
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  return Array.isArray(data) && data.length > 0
}

export default async function(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return fail('No autorizado', 401)
    }

    const { name, email: rawEmail, role } = await req.json()
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    const cleanName = typeof name === 'string' ? name.trim() : ''
    if (!cleanName || !email || !email.includes('@') || !ALLOWED_ROLES.includes(role)) {
      return fail('Nombre, correo y rol válido son requeridos', 400)
    }

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL')
    const apiKey = Deno.env.get('API_KEY')
    if (!baseUrl || !apiKey) {
      return fail('Configuración de administración incompleta', 500)
    }
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

    const userClient = createClient({
      baseUrl: normalizedBaseUrl,
      accessToken: authHeader.replace('Bearer ', '')
    })
    const { data: userData } = await userClient.auth.getCurrentUser()
    if (!userData?.user?.id) {
      return fail('No autorizado', 401)
    }

    const adminClient = createAdminClient({ baseUrl: normalizedBaseUrl, apiKey })
    const { data: adminProfile } = await adminClient.database
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single()
    const requesterRole = adminProfile?.role
    const isAdmin = requesterRole === 'admin'
    const isCoordinator = requesterRole === 'coordinator'
    if (!isAdmin && !isCoordinator) {
      return fail('Solo administradores y coordinadores pueden crear usuarios', 403)
    }
    if (isCoordinator && role === 'admin') {
      return fail('Los coordinadores no pueden crear administradores', 403)
    }

    const createResponse = await fetch(`${normalizedBaseUrl}/api/auth/users?client_type=server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ email, password: '12345678', name: cleanName })
    })
    const responseText = await createResponse.text()
    let responseData: { user?: { id?: string }; message?: string } = {}
    try {
      responseData = responseText ? JSON.parse(responseText) : {}
    } catch {
      responseData = {}
    }

    if (!createResponse.ok) {
      if (createResponse.status === 409) {
        const existingUser = await findAuthUserByEmail(normalizedBaseUrl, apiKey, email)
        if (existingUser?.id && !(await profileExists(adminClient.database, existingUser.id))) {
          const { error: insertError } = await adminClient.database
            .from('profiles')
            .insert([{ user_id: existingUser.id, name: cleanName, email, role }])
          if (!insertError) {
            return json({ success: true, userId: existingUser.id, reused: true }, 200)
          }
        }
        return fail('Ya existe un usuario con ese correo.', 409)
      }

      const upstreamMessage = typeof responseData.message === 'string' ? responseData.message.trim() : ''
      return fail(upstreamMessage || 'No se pudo crear el usuario.', createResponse.status)
    }

    const userId = responseData.user?.id
    if (!userId) {
      return fail('El servidor no devolvió el ID del usuario creado', 500)
    }

    if (await profileExists(adminClient.database, userId)) {
      const { error: profileError } = await adminClient.database
        .from('profiles')
        .update({ name: cleanName, role })
        .eq('user_id', userId)
      if (profileError) {
        console.error('Could not set profile role for newly created user')
        return fail('El usuario se creó, pero no se pudo asignar su rol.', 500)
      }
    } else {
      const { error: insertError } = await adminClient.database
        .from('profiles')
        .insert([{ user_id: userId, name: cleanName, email, role }])
      if (insertError) {
        console.error('Could not create profile for newly created user')
        return fail('El usuario se creó, pero no se pudo asignar su rol.', 500)
      }
    }

    return json({ success: true, userId }, 200)
  } catch {
    console.error('Admin user creation failed')
    return fail('Error interno al crear el usuario.', 500)
  }
}
