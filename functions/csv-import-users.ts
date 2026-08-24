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
    const { courseId, users } = await req.json() as {
      courseId: string
      users: { name: string; email: string }[]
    }

    if (!courseId || !users || users.length === 0) {
      return new Response(JSON.stringify({ error: 'courseId y users son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL')
    const apiKey = Deno.env.get('API_KEY')

    const client = createClient({ baseUrl, accessToken: userToken })

    const { data: userData } = await client.auth.getCurrentUser()
    if (!userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: profileData } = await client.database
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single()

    if (!profileData || !['admin', 'Administrador', 'teacher', 'Profesor'].includes(profileData.role)) {
      return new Response(JSON.stringify({ error: 'No tienes permisos para importar usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient({ baseUrl, accessToken: apiKey })

    const { data: existingProfiles } = await adminClient.database
      .from('profiles')
      .select('user_id, email')
    const emailToUserId = new Map(
      (existingProfiles as { user_id: string; email: string }[] || []).map(p => [p.email?.toLowerCase(), p.user_id])
    )

    const { data: existingMembers } = await adminClient.database
      .from('course_members')
      .select('user_id')
      .eq('course_id', courseId)
    const memberUserIds = new Set((existingMembers as { user_id: string }[] || []).map(m => m.user_id))

    let imported = 0
    const skipped: { name: string; email: string }[] = []

    for (const { name, email: rawEmail } of users) {
      const email = rawEmail.trim().toLowerCase()
      if (!name || !email) {
        skipped.push({ name: name || '(vacío)', email: email || '(vacío)' })
        continue
      }

      let userId = emailToUserId.get(email)

      if (userId) {
        if (!memberUserIds.has(userId)) {
          const { error: insertErr } = await adminClient.database
            .from('course_members')
            .insert([{ course_id: courseId, user_id: userId }])
          if (insertErr) {
            console.error('Error adding existing user:', insertErr)
            skipped.push({ name, email })
            continue
          }
          memberUserIds.add(userId)
        }
        imported++
        continue
      }

      const createRes = await fetch(`${baseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey!,
        },
        body: JSON.stringify({ email, password: '12345678', data: { name } })
      })

      const createBody = await createRes.json()
      console.log('Signup response:', createRes.status, JSON.stringify(createBody).substring(0, 200))

      if (!createRes.ok || !createBody?.user?.id) {
        skipped.push({ name, email })
        continue
      }

      const newUserId = createBody.user.id

      await adminClient.database
        .from('profiles')
        .update({ role: 'Estudiante', name })
        .eq('user_id', newUserId)

      const { error: memberErr } = await adminClient.database
        .from('course_members')
        .insert([{ course_id: courseId, user_id: newUserId }])
      if (memberErr) {
        console.error('Error adding new user to course:', memberErr)
        skipped.push({ name, email })
        continue
      }

      imported++
    }

    return new Response(JSON.stringify({ imported, skipped }), {
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
