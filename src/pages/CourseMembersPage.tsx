import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

interface Course {
  id: string
  name: string
  description: string
}

interface CourseMemberRow {
  id: string
  course_id: string
  user_id: string
}

interface MemberProfile {
  user_id: string
  name: string
  email: string
  role: string
}

interface CourseMember extends CourseMemberRow {
  name: string
  email: string
  role: string
}

export function CourseMembersPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [members, setMembers] = useState<CourseMember[]>([])
  const [allProfiles, setAllProfiles] = useState<MemberProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [addSearchQuery, setAddSearchQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())

  const canManage = profile?.role === 'admin' || profile?.role === 'teacher'

  useEffect(() => {
    if (courseId) loadAll()
  }, [courseId])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([fetchCourse(), fetchMembers(), fetchAllProfiles()])
    setLoading(false)
  }

  const fetchCourse = async () => {
    const { data, error } = await insforge.database
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()
    if (!error && data) setCourse(data as Course)
  }

  const fetchMembers = async () => {
    const { data: rows, error: rowsErr } = await insforge.database
      .from('course_members')
      .select('id, course_id, user_id')
      .eq('course_id', courseId)

    if (rowsErr || !rows || rows.length === 0) {
      setMembers([])
      return
    }

    const userIds = rows.map((r: CourseMemberRow) => r.user_id)
    const uniqueIds = [...new Set(userIds)]

    const { data: profiles } = await insforge.database
      .from('profiles')
      .select('user_id, name, email, role')
      .in('user_id', uniqueIds)

    const profileMap = new Map(
      (profiles as MemberProfile[] || []).map((p) => [p.user_id, p])
    )

    const merged = rows.map((r: CourseMemberRow) => ({
      ...r,
      name: profileMap.get(r.user_id)?.name || '',
      email: profileMap.get(r.user_id)?.email || '',
      role: (profileMap.get(r.user_id)?.role || 'student') as 'admin' | 'teacher' | 'student',
    }))

    setMembers(merged)
  }

  const fetchAllProfiles = async () => {
    const { data, error } = await insforge.database
      .from('profiles')
      .select('user_id, name, email, role')
      .order('name')

    if (!error && data) setAllProfiles(data as MemberProfile[])
  }

  const addMember = async (userId: string) => {
    const { error } = await insforge.database
      .from('course_members')
      .insert([{ course_id: courseId, user_id: userId }])

    if (!error) {
      await loadAll()
      setAddSearchQuery('')
    }
  }

  const addSelectedMembers = async () => {
    if (selectedUsers.size === 0) return
    const rows = Array.from(selectedUsers).map(uid => ({ course_id: courseId, user_id: uid }))
    const { error } = await insforge.database
      .from('course_members')
      .insert(rows)

    if (!error) {
      await loadAll()
      setSelectedUsers(new Set())
      setAddSearchQuery('')
    }
  }

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedUsers.size === availableUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(availableUsers.map(u => u.user_id)))
    }
  }

  const removeMember = async (memberId: string) => {
    if (!confirm('¿Quitar este miembro del curso?')) return

    const { error } = await insforge.database
      .from('course_members')
      .delete()
      .eq('id', memberId)

    if (!error) await loadAll()
  }

  const filteredMembers = members.filter((m) =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const availableUsers = allProfiles
    .filter(u => !members.some(m => m.user_id === u.user_id))
    .filter(u =>
      u.name?.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(addSearchQuery.toLowerCase())
    )

  if (loading) {
    return <div className="p-lg font-body-md text-body-md text-on-surface-variant">Cargando...</div>
  }

  return (
    <div>
      <div className="mb-lg">
        <Link to="/courses" className="flex items-center gap-xs text-primary font-body-sm text-body-sm hover:underline mb-md">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver a cursos
        </Link>
      </div>

      <header className="mb-xl">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Miembros</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">{course?.name}</p>
      </header>

      <div className="flex flex-col md:flex-row gap-md mb-lg">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Buscar miembros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-outline-variant rounded-xl pl-10 pr-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-primary text-on-primary font-bold py-2 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Agregar
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-lg bg-surface-container-low border border-outline-variant rounded-xl p-lg">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">Agregar miembro</h3>
          <div className="relative mb-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={addSearchQuery}
              onChange={(e) => setAddSearchQuery(e.target.value)}
              className="w-full border border-outline-variant rounded-xl pl-10 pr-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {availableUsers.length > 0 && (
            <label className="flex items-center gap-sm mb-sm pb-sm border-b border-outline-variant cursor-pointer">
              <input
                type="checkbox"
                checked={selectedUsers.size === availableUsers.length && availableUsers.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Seleccionar todos ({availableUsers.length})
              </span>
              {selectedUsers.size > 0 && (
                <span className="ml-auto font-label-sm text-label-sm text-primary">
                  {selectedUsers.size} seleccionados
                </span>
              )}
            </label>
          )}

          <div className="space-y-sm max-h-60 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">No se encontraron usuarios disponibles.</p>
            ) : (
              availableUsers.map((user) => (
                <div key={user.user_id} className="flex justify-between items-center p-sm rounded-xl hover:bg-surface-container transition-colors">
                  <div className="flex items-center gap-sm">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.user_id)}
                      onChange={() => toggleSelectUser(user.user_id)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <div>
                      <div className="font-body-sm text-body-sm text-on-surface">{user.name}</div>
                      <div className="font-body-xs text-xs text-on-surface-variant">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => addMember(user.user_id)}
                    className="text-primary font-label-sm text-label-sm hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Agregar
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-md flex justify-end gap-sm">
            {selectedUsers.size > 0 && (
              <button
                onClick={addSelectedMembers}
                className="bg-primary text-on-primary font-bold py-2 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm"
              >
                <span className="material-symbols-outlined text-lg">group_add</span>
                Agregar {selectedUsers.size} seleccionados
              </button>
            )}
            <button
              onClick={() => { setShowAdd(false); setAddSearchQuery(''); setSelectedUsers(new Set()) }}
              className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
            >
              <span className="material-symbols-outlined text-lg">close</span>
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-sm">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-xl">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">group</span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {searchQuery ? 'No se encontraron miembros.' : 'No hay miembros en este curso.'}
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div key={member.id} className="flex justify-between items-center bg-surface border border-outline-variant rounded-xl p-md hover:shadow-sm transition-all">
              <div className="flex items-center gap-md">
                <div className="bg-surface-container rounded-full p-sm flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
                <div>
                  <div className="flex items-center gap-sm">
                    <span className="font-body-md text-body-md text-on-surface">{member.name || 'Sin nombre'}</span>
                    <span className={`inline-flex items-center px-xs py-[2px] rounded-full font-label-sm text-label-sm ${
                      member.role === 'admin' ? 'bg-primary-container text-on-primary-container' :
                      member.role === 'teacher' ? 'bg-surface-container-high text-on-surface' :
                      'bg-secondary-container text-on-secondary-container'
                    }`}>
                      <span className="material-symbols-outlined text-xs mr-[2px]">
                        {member.role === 'admin' ? 'admin_panel_settings' : member.role === 'teacher' ? 'school' : 'person'}
                      </span>
                      {member.role === 'admin' ? 'Admin' : member.role === 'teacher' ? 'Profesor' : 'Estudiante'}
                    </span>
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">{member.email}</div>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => removeMember(member.id)}
                  className="text-error font-label-sm text-label-sm hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">person_remove</span>
                  Quitar
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
