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

    if (!profileData || profileData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden eliminar usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Delete from auth.users using service key
    const deleteRes = await fetch(`${baseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey!,
        'Authorization': `Bearer ${apiKey}`
      }
    })

    console.log('Delete auth user response:', deleteRes.status)

    // If admin API doesn't exist, fall back to SQL
    if (!deleteRes.ok) {
      const connStr = Deno.env.get('DATABASE_URL') || Deno.env.get('POSTGRES_URL')
      if (connStr) {
        const sqlModule = await import('npm:pg')
        const Pool = sqlModule.default?.Pool || sqlModule.Pool
        const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } })
        try {
          await pool.query('DELETE FROM auth.users WHERE id = $1', [userId])
          console.log('Deleted user from auth.users via SQL')
        } catch (sqlErr) {
          console.error('SQL delete error:', sqlErr)
        } finally {
          await pool.end()
        }
      }
    }

    // Delete from profiles
    await client.database.from('profiles').delete().eq('user_id', userId)

    // Delete from course_members
    await client.database.from('course_members').delete().eq('user_id', userId)

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
