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
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Body JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const { courseId, users } = body as {
      courseId: string
      users: { name: string; email: string }[]
    }

    if (!courseId || !users || !Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: 'courseId y users son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL')
    const apiKey = Deno.env.get('API_KEY')

    if (!baseUrl || !apiKey) {
      console.error('Missing env:', { hasBaseUrl: !!baseUrl, hasApiKey: !!apiKey })
      return new Response(JSON.stringify({ error: 'Error de configuración del servidor' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

    const client = createClient({ baseUrl: normalizedBaseUrl, accessToken: userToken })

    let userData: { user?: { id: string } } | null = null
    try {
      const res = await client.auth.getCurrentUser()
      userData = res.data as typeof userData
      if (res.error) throw res.error
    } catch (e) {
      console.error('getCurrentUser error:', e)
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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

    if (!profileData || !['admin', 'Administrador', 'teacher', 'Profesor'].includes((profileData as { role: string }).role)) {
      return new Response(JSON.stringify({ error: 'No tienes permisos para importar usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient({ baseUrl: normalizedBaseUrl, accessToken: apiKey })

    const { data: existingProfiles, error: profilesErr } = await adminClient.database
      .from('profiles')
      .select('user_id, email')
    if (profilesErr) console.error('profiles fetch error:', profilesErr)

    const emailToUserId = new Map(
      ((existingProfiles as { user_id: string; email: string }[] | null) || []).map(p => [p.email?.toLowerCase(), p.user_id])
    )

    const { data: existingMembers, error: membersErr } = await adminClient.database
      .from('course_members')
      .select('user_id')
      .eq('course_id', courseId)
    if (membersErr) console.error('members fetch error:', membersErr)

    const memberUserIds = new Set(((existingMembers as { user_id: string }[] | null) || []).map(m => m.user_id))

    let imported = 0
    const skipped: { name: string; email: string; reason?: string }[] = []

    for (const { name, email: rawEmail } of users) {
      const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
      const cleanName = typeof name === 'string' ? name.trim() : ''
      if (!cleanName || !email || !email.includes('@')) {
        skipped.push({ name: cleanName || '(vacío)', email: email || '(vacío)', reason: 'datos inválidos' })
        continue
      }

      let userId = emailToUserId.get(email)

      if (userId) {
        if (!memberUserIds.has(userId)) {
          const { error: insertErr } = await adminClient.database
            .from('course_members')
            .insert([{ course_id: courseId, user_id: userId }])
          if (insertErr) {
            const msg = (insertErr as { message?: string })?.message || ''
            if (msg.includes('duplicate') || msg.includes('Unique')) {
              memberUserIds.add(userId)
              imported++
              continue
            }
            console.error('Error adding existing user:', insertErr)
            skipped.push({ name: cleanName, email, reason: 'error al agregar al curso' })
            continue
          }
          memberUserIds.add(userId)
        }
        imported++
        continue
      }

      let createBody: Record<string, unknown> = {}
      let createStatus = 0
      try {
        const createRes = await fetch(`${normalizedBaseUrl}/api/auth/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ email, password: '12345678', data: { name: cleanName } })
        })
        createStatus = createRes.status
        const text = await createRes.text()
        try { createBody = text ? JSON.parse(text) : {} } catch { createBody = { raw: text } }
        console.log('Signup response:', createStatus, JSON.stringify(createBody).substring(0, 300))
        if (!createRes.ok) {
          const errMsg = (createBody as { error?: string; message?: string })?.error || (createBody as { message?: string })?.message || `status ${createStatus}`
          if (createStatus === 409 || errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('exists')) {
            const { data: retryProfiles } = await adminClient.database.from('profiles').select('user_id').eq('email', email).single()
            const retryId = (retryProfiles as { user_id: string } | null)?.user_id
            if (retryId) {
              emailToUserId.set(email, retryId)
              if (!memberUserIds.has(retryId)) {
                const { error: retryErr } = await adminClient.database.from('course_members').insert([{ course_id: courseId, user_id: retryId }])
                if (!retryErr) {
                  memberUserIds.add(retryId)
                  imported++
                  continue
                }
              } else {
                imported++
                continue
              }
            }
          }
          skipped.push({ name: cleanName, email, reason: errMsg.substring(0, 80) })
          continue
        }
      } catch (fetchErr) {
        console.error('fetch signup error:', fetchErr)
        skipped.push({ name: cleanName, email, reason: 'error de red al crear usuario' })
        continue
      }

      const newUserId = (createBody as { user?: { id: string } })?.user?.id || (createBody as { id?: string })?.id
      if (!newUserId || typeof newUserId !== 'string') {
        skipped.push({ name: cleanName, email, reason: 'no se pudo crear usuario' })
        continue
      }

      emailToUserId.set(email, newUserId)

      try {
        await adminClient.database.from('profiles').update({ role: 'Estudiante', name: cleanName }).eq('user_id', newUserId)
      } catch (e) {
        console.error('profile update error:', e)
      }

      const { error: memberErr } = await adminClient.database
        .from('course_members')
        .insert([{ course_id: courseId, user_id: newUserId }])
      if (memberErr) {
        const msg = (memberErr as { message?: string })?.message || ''
        if (msg.includes('duplicate') || msg.includes('Unique')) {
          imported++
          memberUserIds.add(newUserId)
          continue
        }
        console.error('Error adding new user to course:', memberErr)
        skipped.push({ name: cleanName, email, reason: 'creado pero no agregado al curso' })
        continue
      }

      memberUserIds.add(newUserId)
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
