import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from '../hooks/useAuth'
import { useImpersonation } from '../hooks/useImpersonation'
import { Pagination, usePagination } from '../components/Pagination'
import { getErrorMessage } from '../lib/errorMessage'

interface KeepaliveRun {
  id: string
  source: string
  status: 'ok' | 'error'
  http_status: number | null
  message: string | null
  duration_ms: number
  created_at: string
}

const STATUS_LABELS: Record<'ok' | 'error', string> = {
  ok: 'OK',
  error: 'Error'
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

const timeAgo = (value: string) => {
  const diff = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'hace menos de 1 min'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.floor(hours / 24)} d`
}

function StatusChip({ status }: { status: 'ok' | 'error' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-sm py-0.5 rounded-full font-label-xs text-label-xs font-bold ${
      status === 'ok'
        ? 'bg-success-container text-on-success-container'
        : 'bg-error-container text-on-error-container'
    }`}>
      <span className="material-symbols-outlined text-sm">
        {status === 'ok' ? 'check_circle' : 'error'}
      </span>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function KeepalivePage() {
  const { profile } = useAuth()
  const { impersonatedRole, isImpersonating } = useImpersonation()
  const effectiveRole = isImpersonating && impersonatedRole ? impersonatedRole : profile?.role
  const isAdmin = effectiveRole === 'admin'

  const [runs, setRuns] = useState<KeepaliveRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'error'>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchRuns = async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error: fetchError } = await insforge.database
      .from('keepalive_runs')
      .select('id, source, status, http_status, message, duration_ms, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (fetchError) {
      setError(getErrorMessage(fetchError, 'No se pudo cargar el historial de ejecuciones.'))
      if (!silent) showToast(getErrorMessage(fetchError, 'No se pudo cargar el historial de ejecuciones.'), 'error')
    } else {
      setRuns((data || []) as KeepaliveRun[])
      setError('')
    }
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    fetchRuns()
    const timer = setInterval(() => fetchRuns(true), 60000)
    return () => clearInterval(timer)
  }, [])

  const sources = Array.from(new Set(runs.map(run => run.source))).sort()

  const filteredRuns = runs.filter(run => {
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter
    const matchesSource = sourceFilter === 'all' || run.source === sourceFilter
    return matchesStatus && matchesSource
  })

  const { page, perPage, setPage, setPerPage, paginatedSlice } = usePagination(filteredRuns.length, 20)
  const paginatedRuns = paginatedSlice(filteredRuns)

  const latest = runs[0]
  const okCount = runs.filter(run => run.status === 'ok').length
  const errorCount = runs.filter(run => run.status === 'error').length

  if (!isAdmin) {
    return (
      <div className="p-lg">
        <p className="font-body-md text-body-md text-error bg-error-container p-md rounded-xl">
          Acceso denegado. Solo administradores pueden ver esta página.
        </p>
      </div>
    )
  }

  return (
    <div className="pb-28 md:pb-0">
      <header className="mb-xl flex flex-col md:flex-row md:justify-between md:items-end gap-md">
        <div className="min-w-0">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">
            Estado del cron
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Historial de ejecuciones del keepalive que mantiene activo el proyecto.
          </p>
        </div>
        <div className="flex items-center gap-sm shrink-0 self-end md:self-auto">
          <button
            onClick={() => fetchRuns()}
            disabled={loading}
            className="bg-primary text-on-primary font-bold py-1 px-lg rounded-full font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm md:gap-md mb-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md">
          <p className="font-label-xs text-label-xs text-on-surface-variant">Última ejecución</p>
          <p className="font-body-sm text-body-sm text-on-surface font-bold mt-xs">
            {latest ? formatDateTime(latest.created_at) : '—'}
          </p>
          {latest && (
            <div className="flex items-center flex-wrap gap-xs mt-xs">
              <StatusChip status={latest.status} />
              <span className="font-body-xs text-body-xs text-on-surface-variant">{timeAgo(latest.created_at)}</span>
            </div>
          )}
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md">
          <p className="font-label-xs text-label-xs text-on-surface-variant">Ejecuciones</p>
          <p className="font-headline-sm text-headline-sm text-on-surface font-bold mt-xs">{runs.length}</p>
          <p className="font-body-xs text-body-xs text-on-surface-variant mt-xs">últimas registradas</p>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md">
          <p className="font-label-xs text-label-xs text-on-surface-variant">Correctas</p>
          <p className="font-headline-sm text-headline-sm text-success font-bold mt-xs">{okCount}</p>
          <p className="font-body-xs text-body-xs text-on-surface-variant mt-xs">sin errores</p>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md">
          <p className="font-label-xs text-label-xs text-on-surface-variant">Con error</p>
          <p className="font-headline-sm text-headline-sm text-error font-bold mt-xs">{errorCount}</p>
          <p className="font-body-xs text-body-xs text-on-surface-variant mt-xs">requieren revisión</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-sm mb-md">
        <select
          id="keepalive-status-filter"
          name="statusFilter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'ok' | 'error'); setPage(1) }}
          className="border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="all">Todos los estados</option>
          <option value="ok">Solo OK</option>
          <option value="error">Solo errores</option>
        </select>
        <select
          id="keepalive-source-filter"
          name="sourceFilter"
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
          className="border border-outline-variant rounded-xl px-md py-2 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="all">Todos los orígenes</option>
          {sources.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
        <p className="font-body-sm text-body-sm text-on-surface-variant self-center sm:ml-auto">
          Mostrando <span className="font-bold text-primary">{paginatedRuns.length}</span> de{' '}
          <span className="font-bold text-primary">{filteredRuns.length}</span> ejecuciones
        </p>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl px-md py-sm font-body-sm text-body-sm mb-md">
          {error}
        </div>
      )}

      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.6fr_1fr_0.8fr_2fr_0.7fr] gap-md px-md py-sm bg-surface-container-low border-b border-outline-variant font-label-xs text-label-xs text-on-surface-variant font-bold">
          <span>Fecha</span>
          <span>Origen</span>
          <span>Estado</span>
          <span>Detalle</span>
          <span className="text-right">Duración</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-xl">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : paginatedRuns.length === 0 ? (
          <div className="px-md py-xl text-center">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant">schedule</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-sm">
              No hay ejecuciones registradas con los filtros seleccionados.
            </p>
          </div>
        ) : (
          paginatedRuns.map(run => (
            <div
              key={run.id}
              className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_0.8fr_2fr_0.7fr] gap-xs md:gap-md px-md py-sm border-b border-outline-variant last:border-0"
            >
              <div>
                <span className="md:hidden font-label-xs text-label-xs text-on-surface-variant">Fecha</span>
                <p className="font-body-sm text-body-sm text-on-surface">{formatDateTime(run.created_at)}</p>
                <p className="font-body-xs text-body-xs text-on-surface-variant">{timeAgo(run.created_at)}</p>
              </div>
              <div>
                <span className="md:hidden font-label-xs text-label-xs text-on-surface-variant">Origen</span>
                <p className="font-body-sm text-body-sm text-on-surface break-words">{run.source}</p>
              </div>
              <div>
                <span className="md:hidden font-label-xs text-label-xs text-on-surface-variant">Estado</span>
                <StatusChip status={run.status} />
              </div>
              <div>
                <span className="md:hidden font-label-xs text-label-xs text-on-surface-variant">Detalle</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant break-words">
                  {run.message || (run.http_status ? `HTTP ${run.http_status}` : 'Sin detalle')}
                </p>
              </div>
              <div className="md:text-right">
                <span className="md:hidden font-label-xs text-label-xs text-on-surface-variant">Duración</span>
                <p className="font-body-sm text-body-sm text-on-surface font-medium">{run.duration_ms} ms</p>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination
        totalItems={filteredRuns.length}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />

      <p className="font-body-xs text-body-xs text-on-surface-variant mt-md">
        Se muestran hasta 500 ejecuciones. La página se actualiza automáticamente cada 60 segundos.
      </p>

      {toast && (
        <div className={`fixed bottom-20 md:bottom-lg left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] px-lg py-sm rounded-xl border shadow-lg font-body-sm text-body-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-opacity ${
          toast.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
