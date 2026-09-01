import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { useImpersonation } from '../hooks/useImpersonation'
import { Pagination, usePagination } from '../components/Pagination'
import { normalizeRole, roleLabel, ROLE_FILTER_OPTIONS } from '../lib/roles'

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

interface ImportResult {
  imported: number
  skipped: { name: string; email: string }[]
}

export function CourseMembersPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile } = useAuth()
  const { impersonatedRole, isImpersonating } = useImpersonation()
  const effectiveRole = isImpersonating && impersonatedRole ? impersonatedRole : profile?.role

  const [course, setCourse] = useState<Course | null>(null)
  const [members, setMembers] = useState<CourseMember[]>([])
  const [allProfiles, setAllProfiles] = useState<MemberProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [addSearchQuery, setAddSearchQuery] = useState('')
  const [addRoleFilter, setAddRoleFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [showImportModal, setShowImportModal] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canManage = effectiveRole === 'admin' || effectiveRole === 'teacher'

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

    const BATCH = 30
    const allProfilesBatch: MemberProfile[] = []
    for (let i = 0; i < uniqueIds.length; i += BATCH) {
      const chunk = uniqueIds.slice(i, i + BATCH)
      const { data: profiles } = await insforge.database
        .from('profiles')
        .select('user_id, name, email, role')
        .in('user_id', chunk)
      if (profiles) allProfilesBatch.push(...(profiles as MemberProfile[]))
    }

    const profileMap = new Map(
      allProfilesBatch.map((p) => [p.user_id, p])
    )

    const merged = rows.map((r: CourseMemberRow) => ({
      ...r,
      name: profileMap.get(r.user_id)?.name || '',
      email: profileMap.get(r.user_id)?.email || '',
      role: normalizeRole(profileMap.get(r.user_id)?.role),
    }))

    setMembers(merged)
  }

  const fetchAllProfiles = async () => {
    const { data, error } = await insforge.database
      .from('profiles')
      .select('user_id, name, email, role')
      .order('name')

    if (!error && data) {
      setAllProfiles((data as MemberProfile[]).map(p => ({ ...p, role: normalizeRole(p.role) })))
    }
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
    const { error } = await insforge.database
      .from('course_members')
      .delete()
      .eq('id', memberId)

    if (!error) await loadAll()
  }

  const removeSelectedMembers = async () => {
    if (selectedMembers.size === 0) return
    const ids = Array.from(selectedMembers)
    const BATCH = 50
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH)
      await insforge.database.from('course_members').delete().in('id', chunk)
    }
    await loadAll()
    setSelectedMembers(new Set())
  }

  const toggleSelectMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  const toggleSelectAllMembers = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)))
    }
  }

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',' || ch === ';' || ch === '\t') {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    result.push(current.trim())
    return result
  }

  const handleCsvImport = async (file: File) => {
    setImportLoading(true)
    setImportResult(null)
    try {
      const rawText = await file.text()
      const text = rawText.replace(/^\uFEFF/, '')
      const lines = text.split(/\r\n|\r|\n/).filter(l => l.trim())
      if (lines.length < 2) {
        setImportResult({ imported: 0, skipped: [{ name: '', email: '' }] })
        return
      }

      const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/^\uFEFF/, '').replace(/"/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())
      const nameIdx = headers.findIndex(h => h === 'alumnos' || h === 'nombre' || h === 'name')
      const emailIdx = headers.findIndex(h => h === 'correo' || h === 'email' || h === 'e-mail')

      if (nameIdx === -1 || emailIdx === -1) {
        setImportResult({ imported: 0, skipped: [{ name: '', email: '' }] })
        return
      }

      const parsedUsers: { name: string; email: string }[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]).map(c => c.replace(/"/g, '').trim())
        let name = (cols[nameIdx] || '').trim()
        let email = (cols[emailIdx] || '').trim().toLowerCase()
        if (name.includes('@') && email.includes('@')) {
          const m = lines[i].match(/[\w.+-]+@[\w.-]+\.\w+/)
          if (m) {
            email = m[0].toLowerCase()
            const rest = lines[i].replace(m[0], '').replace(/[,;\t]+/g, ' ').replace(/"/g, '').trim()
            if (rest && !rest.includes('@')) name = rest
          }
        }
        if (!name && email) {
          const rest = lines[i].replace(email, '').replace(/[,;\t]+/g, ' ').replace(/"/g, '').trim()
          if (rest && !rest.includes('@')) name = rest
        }
        if (name || email) parsedUsers.push({ name, email })
      }

      const CHUNK_SIZE = 15
      let totalImported = 0
      const allSkipped: { name: string; email: string }[] = []
      for (let i = 0; i < parsedUsers.length; i += CHUNK_SIZE) {
        const chunk = parsedUsers.slice(i, i + CHUNK_SIZE)
        const { data, error } = await insforge.functions.invoke('csv-import-users', {
          method: 'POST',
          body: { courseId, users: chunk }
        })
        if (error) {
          console.error('Import function error:', error)
          allSkipped.push(...chunk)
          continue
        }
        totalImported += data.imported || 0
        if (data.skipped) allSkipped.push(...data.skipped)
      }
      setImportResult({ imported: totalImported, skipped: allSkipped })
      if (totalImported > 0) {
        await loadAll()
      }
    } catch {
        setImportResult({ imported: 0, skipped: [{ name: '', email: '' }] })
    } finally {
      setImportLoading(false)
    }
  }

  const filteredMembers = members.filter((m) =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const { page: membersPage, perPage: membersPerPage, setPage: setMembersPage, setPerPage: setMembersPerPage, paginatedSlice: membersPaginate } = usePagination(filteredMembers.length, 10)
  const paginatedMembers = membersPaginate(filteredMembers)

  const availableUsers = allProfiles
    .filter(u => !members.some(m => m.user_id === u.user_id))
    .filter(u =>
      u.name?.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(addSearchQuery.toLowerCase())
    )
    .filter(u => addRoleFilter === 'all' || u.role === addRoleFilter)

  if (loading) {
    return (
      <div>
        <div className="mb-lg">
          <div className="h-4 w-32 bg-surface-container animate-pulse rounded" />
        </div>
        <div className="mb-xl">
          <div className="h-8 w-24 bg-surface-container animate-pulse rounded mb-sm" />
          <div className="h-4 w-40 bg-surface-container animate-pulse rounded" />
        </div>
        <div className="flex gap-md mb-lg">
          <div className="flex-1 h-10 bg-surface-container animate-pulse rounded-xl" />
          <div className="h-10 w-10 bg-surface-container animate-pulse rounded-full" />
          <div className="h-10 w-10 bg-surface-container animate-pulse rounded-full" />
        </div>
        <div className="space-y-sm">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between items-center bg-surface border border-outline-variant rounded-xl p-md">
              <div className="flex items-center gap-md">
                <div className="h-4 w-4 bg-surface-container animate-pulse rounded" />
                <div className="h-10 w-10 bg-surface-container animate-pulse rounded-full" />
                <div>
                  <div className="flex items-center gap-sm mb-1">
                    <div className="h-4 w-28 bg-surface-container animate-pulse rounded" />
                    <div className="h-5 w-16 bg-surface-container animate-pulse rounded-full" />
                  </div>
                  <div className="h-3 w-40 bg-surface-container animate-pulse rounded" />
                </div>
              </div>
              <div className="h-4 w-14 bg-surface-container animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    )
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
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">Miembros</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Administra los participantes del curso {course?.name}.</p>
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
          <div className="flex items-center gap-sm">
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="bg-primary text-on-primary font-bold py-2 px-3 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
              title="Agregar miembro"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
            </button>
            <button
              onClick={() => { setShowImportModal(true); setImportResult(null) }}
              className="bg-secondary-container text-on-surface font-bold py-2 px-3 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
              title="Importar miembros desde CSV"
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
            </button>
            <a
              href="https://res.cloudinary.com/dhecags26/raw/upload/v1787804153/example-import_geijtw.csv"
              download
              className="bg-secondary-container text-on-surface font-bold py-2 px-3 rounded-full hover:opacity-90 transition-opacity flex items-center justify-center"
              title="Descargar plantilla de ejemplo"
            >
              <span className="material-symbols-outlined text-lg">download</span>
            </a>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="mb-lg bg-surface-container-low border border-outline-variant rounded-xl p-lg">
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">Agregar miembro</h3>
          <div className="flex flex-col md:flex-row gap-md mb-md">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                className="w-full border border-outline-variant rounded-xl pl-10 pr-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <select
              value={addRoleFilter}
              onChange={(e) => setAddRoleFilter(e.target.value)}
              className="border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary appearance-none pr-10"
            >
              {ROLE_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
                      <div className="flex items-center gap-sm">
                        <span className="font-body-sm text-body-sm text-primary font-bold">{user.name}</span>
                        <span className={`inline-flex items-center px-xs py-[2px] rounded-full font-label-sm text-label-sm ${
                          user.role === 'admin' ? 'bg-primary-container text-on-primary-container' :
                          user.role === 'teacher' ? 'bg-surface-container-high text-on-surface' :
                          'bg-secondary-container text-on-secondary-container'
                        }`}>
                          <span className="material-symbols-outlined text-xs mr-[2px]">
                            {user.role === 'admin' ? 'admin_panel_settings' : user.role === 'teacher' ? 'school' : 'person'}
                          </span>
                          {roleLabel(user.role)}
                        </span>
                      </div>
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
                Agregar
              </button>
            )}
            <button
              onClick={() => { setShowAdd(false); setAddSearchQuery(''); setAddRoleFilter('all'); setSelectedUsers(new Set()) }}
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
          <>
            {canManage && (
              <label className="flex items-center gap-sm mb-sm pb-sm border-b border-outline-variant cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                  onChange={toggleSelectAllMembers}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Seleccionar todos ({filteredMembers.length})
                </span>
                {selectedMembers.size > 0 && (
                  <span className="ml-auto font-label-sm text-label-sm text-primary">
                    {selectedMembers.size} seleccionados
                  </span>
                )}
              </label>
            )}

            {selectedMembers.size > 0 && canManage && (
              <div className="flex justify-end mb-sm">
                <button
                  onClick={removeSelectedMembers}
                  className="bg-error text-on-error font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-lg">group_remove</span>
                  Quitar
                </button>
              </div>
            )}

            {paginatedMembers.map((member) => (
              <div key={member.id} className="flex justify-between items-center bg-surface border border-outline-variant rounded-xl p-md hover:shadow-sm transition-all">
                <div className="flex items-center gap-md">
                  {canManage && (
                    <input
                      type="checkbox"
                      checked={selectedMembers.has(member.id)}
                      onChange={() => toggleSelectMember(member.id)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  )}
                  <div className="bg-surface-container rounded-full p-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant">person</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-sm">
                      <span className="font-body-md text-body-md text-primary font-bold">{member.name || 'Sin nombre'}</span>
                        <span className={`inline-flex items-center px-xs py-[2px] rounded-full font-label-sm text-label-sm ${
                          member.role === 'admin' ? 'bg-primary-container text-on-primary-container' :
                          member.role === 'teacher' ? 'bg-surface-container-high text-on-surface' :
                          'bg-secondary-container text-on-secondary-container'
                        }`}>
                          <span className="material-symbols-outlined text-xs mr-[2px]">
                            {member.role === 'admin' ? 'admin_panel_settings' : member.role === 'teacher' ? 'school' : 'person'}
                          </span>
                          {roleLabel(member.role)}
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
            ))}
          </>
        )}
      </div>

      <Pagination
        totalItems={filteredMembers.length}
        page={membersPage}
        perPage={membersPerPage}
        onPageChange={setMembersPage}
        onPerPageChange={setMembersPerPage}
      />

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Importar miembros desde CSV</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
              El archivo CSV debe tener columnas <strong>nombre</strong> y <strong>correo</strong>. La primera fila se omitirá (encabezados). La contraseña para todos será <strong>12345678</strong>.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCsvImport(file)
              }}
              className="hidden"
            />
            {importLoading ? (
              <div className="flex items-center justify-center gap-sm py-lg">
                <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Importando usuarios...</span>
              </div>
            ) : importResult ? (
              <div className="space-y-md">
                <div className={`p-md rounded-xl ${importResult.imported > 0 ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}`}>
                  <div className="flex items-center gap-sm mb-xs">
                    <span className="material-symbols-outlined text-lg">
                      {importResult.imported > 0 ? 'check_circle' : 'info'}
                    </span>
                    <span className="font-label-md text-label-md">
                      {importResult.imported} usuario(s) importado(s)
                    </span>
                  </div>
                  {importResult.skipped.length > 0 && (
                    <span className="font-body-sm text-body-sm">
                      {importResult.skipped.length} omitido(s)
                    </span>
                  )}
                </div>
                {importResult.skipped.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-outline-variant">
                          <th className="px-sm py-2 text-left font-label-sm text-label-sm text-on-surface-variant">Nombre</th>
                          <th className="px-sm py-2 text-left font-label-sm text-label-sm text-on-surface-variant">Correo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.skipped.map((s, i) => (
                          <tr key={i} className="border-b border-outline-variant last:border-0">
                            <td className="px-sm py-2 font-body-sm text-body-sm text-primary font-bold">{s.name}</td>
                            <td className="px-sm py-2 font-body-sm text-body-sm text-on-surface-variant">{s.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-outline-variant rounded-xl py-lg flex flex-col items-center gap-sm hover:border-primary hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[32px]">upload_file</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Seleccionar archivo CSV</span>
              </button>
            )}
            <div className="flex justify-end gap-sm mt-lg">
              <button
                onClick={() => { setShowImportModal(false); setImportResult(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                {importResult ? 'Cerrar' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
