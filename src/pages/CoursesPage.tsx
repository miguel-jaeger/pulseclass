import { useState, useEffect } from 'react'
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
    return <div className="p-8">Cargando...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Cursos</h2>
        {(profile?.role === 'admin' || profile?.role === 'teacher') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Crear Curso
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">{course.name}</h3>
            <p className="text-gray-600 mb-4">{course.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => openMembersModal(course)}
                className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
              >
                Miembros
              </button>
              {(profile?.role === 'admin' || course.created_by === profile?.user_id) && (
                <button
                  onClick={() => deleteCourse(course.id)}
                  className="text-sm text-red-600 px-3 py-1 rounded hover:bg-red-50"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Crear Curso</h3>
            <input
              type="text"
              placeholder="Nombre del curso"
              value={newCourse.name}
              onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <textarea
              placeholder="Descripción"
              value={newCourse.description}
              onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={createCourse}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Miembros de {selectedCourse.name}
            </h3>

            <div className="mb-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addMember(selectedCourse.id, e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full border rounded px-3 py-2"
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

            <div className="space-y-2">
              {courseMembers.map((member) => (
                <div key={member.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>{member.profiles?.name}</span>
                  <button
                    onClick={() => removeMember(member.id, selectedCourse.id)}
                    className="text-red-600 text-sm hover:text-red-800"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
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
