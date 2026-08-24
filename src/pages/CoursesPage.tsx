import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'

interface Course {
  id: string
  name: string
  description: string
  created_by: string
  created_at: string
  is_active: boolean
}

export function CoursesPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCourse, setNewCourse] = useState({ name: '', description: '' })
  const [searchQuery, setSearchQuery] = useState('')

  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', is_active: true })

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    if (profile?.role === 'admin') {
      const { data, error } = await insforge.database
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setCourses(data as Course[])
    } else if (profile?.role === 'teacher') {
      const { data: owned } = await insforge.database
        .from('courses')
        .select('*')
        .eq('created_by', profile.user_id)
      const { data: memberRows } = await insforge.database
        .from('course_members')
        .select('course_id')
        .eq('user_id', profile.user_id)
      const memberIds = (memberRows as { course_id: string }[] || []).map(r => r.course_id)
      let memberCourses: Course[] = []
      if (memberIds.length > 0) {
        const { data } = await insforge.database
          .from('courses')
          .select('*')
          .in('id', memberIds)
        memberCourses = (data as Course[]) || []
      }
      const all = [...(owned as Course[] || []), ...memberCourses]
      const unique = all.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)
      unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setCourses(unique)
    } else {
      const { data: memberRows } = await insforge.database
        .from('course_members')
        .select('course_id')
        .eq('user_id', profile?.user_id)
      const memberIds = (memberRows as { course_id: string }[] || []).map(r => r.course_id)
      if (memberIds.length > 0) {
        const { data } = await insforge.database
          .from('courses')
          .select('*')
          .in('id', memberIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        if (data) setCourses(data as Course[])
      } else {
        setCourses([])
      }
    }
    setLoading(false)
  }

  const createCourse = async () => {
    const { error } = await insforge.database
      .from('courses')
      .insert([{
        name: newCourse.name,
        description: newCourse.description,
        created_by: profile?.user_id
      }])

    if (!error) {
      setShowCreateModal(false)
      setNewCourse({ name: '', description: '' })
      fetchCourses()
    }
  }

  const openEdit = (course: Course) => {
    setEditingCourse(course)
    setEditForm({ name: course.name, description: course.description || '', is_active: course.is_active })
  }

  const saveEdit = async () => {
    if (!editingCourse) return
    const { error } = await insforge.database
      .from('courses')
      .update({ name: editForm.name, description: editForm.description, is_active: editForm.is_active })
      .eq('id', editingCourse.id)

    if (!error) {
      setEditingCourse(null)
      fetchCourses()
    }
  }

  const deleteCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`¿Eliminar "${courseName}" y todas sus sesiones? Esta acción no se puede deshacer.`)) return

    const { error } = await insforge.database
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (!error) {
      setEditingCourse(null)
      fetchCourses()
    }
  }

  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <div className="p-lg font-body-md text-body-md text-on-surface-variant">Cargando cursos...</div>
  }

  return (
    <div>
      <header className="mb-xl flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Cursos</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Gestiona tus cursos y estudiantes.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'teacher') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-on-primary font-bold py-2 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
          >
            Crear Curso
          </button>
        )}
      </header>

      <div className="relative mb-lg">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
        <input
          type="text"
          placeholder="Buscar cursos por nombre o descripción..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-outline-variant rounded-xl pl-10 pr-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
        />
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap items-center justify-center gap-md bg-surface border border-outline-variant rounded-xl px-md py-sm mb-lg">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-lg">menu_book</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Total:</span>
          <span className="font-body-sm text-body-sm text-on-surface font-bold">{courses.length}</span>
        </div>
        <div className="w-px h-4 bg-outline-variant"></div>
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Activos:</span>
          <span className="font-body-sm text-body-sm text-on-surface font-bold">{courses.filter(c => c.is_active).length}</span>
        </div>
        <div className="w-px h-4 bg-outline-variant"></div>
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">pause_circle</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Inactivos:</span>
          <span className="font-body-sm text-body-sm text-on-surface font-bold">{courses.filter(c => !c.is_active).length}</span>
        </div>
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
        Mostrando <span className="font-bold text-on-surface">{filteredCourses.length}</span> de <span className="font-bold text-on-surface">{courses.length}</span> cursos
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
        {filteredCourses.map((course) => (
          <article key={course.id} className={`bg-surface border rounded-xl p-lg flex flex-col hover:shadow-sm hover:scale-[1.01] transition-all duration-200 ${course.is_active ? 'border-outline-variant border-t-[3px] border-t-primary' : 'border-outline-variant border-t-[3px] border-t-outline-variant opacity-70'}`}>
            <div className="flex justify-between items-start mb-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm mb-1">
                  <h2 className="font-title-sm text-title-sm text-on-surface truncate" title={course.name}>{course.name}</h2>
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                    course.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {course.is_active ? 'check' : 'pause'}
                    </span>
                  </span>
                </div>
                <p className="font-body-xs text-body-xs text-on-surface-variant mt-1 line-clamp-2">{course.description}</p>
              </div>
              <div className="bg-surface-container rounded-full p-sm flex items-center justify-center shrink-0 ml-sm">
                <span className="material-symbols-outlined text-primary">menu_book</span>
              </div>
            </div>
            <div className="mt-auto flex justify-end gap-sm">
              <Link
                to={`/courses/${course.id}/sessions`}
                className="w-8 h-8 bg-surface-container border border-primary text-primary rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center"
                title="Adicionar sesión"
              >
                <span className="material-symbols-outlined text-lg">event</span>
              </Link>
              <Link
                to={`/courses/${course.id}/members`}
                className="w-8 h-8 bg-surface-container border border-outline-variant text-on-surface-variant rounded-full hover:bg-secondary-container hover:text-on-secondary-container transition-colors flex items-center justify-center"
                title="Adicionar miembros"
              >
                <span className="material-symbols-outlined text-lg">group</span>
              </Link>
              {(profile?.role === 'admin' || course.created_by === profile?.user_id) && (
                <button
                  onClick={() => openEdit(course)}
                  className="w-8 h-8 bg-surface-container border border-outline-variant text-on-surface-variant rounded-full hover:bg-secondary-container hover:text-on-secondary-container transition-colors flex items-center justify-center"
                  title="Editar curso"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-xl">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">school</span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {searchQuery ? 'No se encontraron cursos.' : 'No hay cursos creados aún.'}
          </p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Crear Curso</h3>
            <input
              type="text"
              placeholder="Nombre del curso"
              value={newCourse.name}
              onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <textarea
              placeholder="Descripción"
              value={newCourse.description}
              onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-lg bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              rows={3}
            />
            <div className="flex justify-end gap-sm">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createCourse}
                className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCourse && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Editar Curso</h3>

            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Nombre</label>
            <input
              type="text"
              placeholder="Nombre del curso"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />

            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-xs">Descripción</label>
            <textarea
              placeholder="Descripción"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full border border-outline-variant rounded-xl px-md py-2 mb-md bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              rows={3}
            />

            <div className="flex items-center justify-between bg-surface-container rounded-xl px-md py-3 mb-lg">
              <div>
                <div className="font-body-md text-body-md text-on-surface">Estado del curso</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  {editForm.is_active ? 'Visible para los estudiantes' : 'Oculto para los estudiantes'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  editForm.is_active ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-on-primary transition-transform shadow-sm ${
                  editForm.is_active ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => deleteCourse(editingCourse.id, editingCourse.name)}
                className="text-error font-label-md text-label-md hover:bg-error-container px-md py-2 rounded-full transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                Eliminar
              </button>
              <div className="flex gap-sm">
                <button
                  onClick={() => setEditingCourse(null)}
                  className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  className="bg-primary text-on-primary font-bold px-lg py-2 rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
