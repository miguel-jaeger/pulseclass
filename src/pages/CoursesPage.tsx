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
}

interface CourseMember {
  id: string
  course_id: string
  user_id: string
  profiles: {
    name: string
    email: string
  }
}

interface UserProfile {
  user_id: string
  name: string
  email: string
}

export function CoursesPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCourse, setNewCourse] = useState({ name: '', description: '' })
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [courseMembers, setCourseMembers] = useState<CourseMember[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [showMembersModal, setShowMembersModal] = useState(false)

  useEffect(() => {
    fetchCourses()
    fetchAllUsers()
  }, [])

  const fetchCourses = async () => {
    const { data, error } = await insforge.database
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCourses(data as Course[])
    }
    setLoading(false)
  }

  const fetchAllUsers = async () => {
    const { data, error } = await insforge.database
      .from('profiles')
      .select('user_id, name, email')

    if (!error && data) {
      setAllUsers(data as UserProfile[])
    }
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

  const deleteCourse = async (courseId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este curso?')) return

    const { error } = await insforge.database
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (!error) {
      fetchCourses()
    }
  }

  const fetchCourseMembers = async (courseId: string) => {
    const { data, error } = await insforge.database
      .from('course_members')
      .select('*, profiles:user_id(name, email)')
      .eq('course_id', courseId)

    if (!error && data) {
      setCourseMembers(data as CourseMember[])
    }
  }

  const addMember = async (courseId: string, userId: string) => {
    const { error } = await insforge.database
      .from('course_members')
      .insert([{ course_id: courseId, user_id: userId }])

    if (!error) {
      fetchCourseMembers(courseId)
    }
  }

  const removeMember = async (memberId: string, courseId: string) => {
    const { error } = await insforge.database
      .from('course_members')
      .delete()
      .eq('id', memberId)

    if (!error) {
      fetchCourseMembers(courseId)
    }
  }

  const openMembersModal = async (course: Course) => {
    setSelectedCourse(course)
    await fetchCourseMembers(course.id)
    setShowMembersModal(true)
  }

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
        {courses.map((course) => (
          <article key={course.id} className="bg-surface border border-outline-variant border-t-[3px] border-t-primary rounded-xl p-lg flex flex-col hover:shadow-sm hover:scale-[1.01] transition-all duration-200">
            <div className="flex justify-between items-start mb-md">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">{course.name}</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{course.description}</p>
              </div>
              <div className="bg-surface-container rounded-full p-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">menu_book</span>
              </div>
            </div>
            <div className="mt-auto flex gap-sm">
              <Link
                to={`/courses/${course.id}/sessions`}
                className="flex-1 text-center bg-surface-container border border-primary text-primary font-bold py-2 rounded-full font-label-md text-label-md hover:bg-primary-container transition-colors"
              >
                Sesiones
              </Link>
              <button
                onClick={() => openMembersModal(course)}
                className="flex-1 text-center bg-surface-container border border-outline-variant text-on-surface-variant font-bold py-2 rounded-full font-label-md text-label-md hover:bg-secondary-container transition-colors"
              >
                Miembros
              </button>
              {(profile?.role === 'admin' || course.created_by === profile?.user_id) && (
                <button
                  onClick={() => deleteCourse(course.id)}
                  className="text-center bg-surface-container border border-error text-error font-bold py-2 px-3 rounded-full font-label-md text-label-md hover:bg-error-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-xl">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-md block">school</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No hay cursos creados aún.</p>
        </div>
      )}

      {/* Create Course Modal */}
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

      {/* Members Modal */}
      {showMembersModal && selectedCourse && (
        <div className="fixed inset-0 bg-scrim/60 flex items-center justify-center z-50 p-margin-mobile">
          <div className="bg-surface-container-lowest rounded-xl p-lg w-full max-w-md max-h-[80vh] overflow-y-auto border border-outline-variant">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg">
              Miembros de {selectedCourse.name}
            </h3>

            <div className="mb-lg">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addMember(selectedCourse.id, e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">Agregar estudiante...</option>
                {allUsers
                  .filter(u => !courseMembers.some(m => m.user_id === u.user_id))
                  .map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-sm">
              {courseMembers.map((member) => (
                <div key={member.id} className="flex justify-between items-center p-sm bg-surface-container-low rounded-xl">
                  <span className="font-body-sm text-body-sm text-on-surface">{member.profiles?.name}</span>
                  <button
                    onClick={() => removeMember(member.id, selectedCourse.id)}
                    className="text-error font-label-sm text-label-sm hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-lg flex justify-end">
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-lg py-2 text-on-surface-variant font-label-md text-label-md hover:bg-secondary-container rounded-full transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
