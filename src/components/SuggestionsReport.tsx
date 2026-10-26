import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../hooks/useTheme'
import {
  STATUS_ORDER,
  TYPE_ORDER,
  statusLabels,
  typeLabels,
  type Suggestion,
  type SuggestionStatus,
  isSuggestionStatus,
} from '../lib/suggestions'

const DAY_MS = 24 * 60 * 60 * 1000

const STATUS_COLORS: Record<string, { light: string; dark: string }> = {
  recibida: { light: '#546e7a', dark: '#90a4ae' },
  revision: { light: '#ef6c00', dark: '#ffb74d' },
  aprobada: { light: '#1565c0', dark: '#64b5f6' },
  implementada: { light: '#2e7d32', dark: '#81c784' },
  rechazada: { light: '#c62828', dark: '#ffb4ab' },
}

const TYPE_COLORS: Record<string, { light: string; dark: string }> = {
  mejora: { light: '#9e001f', dark: '#ffb3b1' },
  nuevo: { light: '#6a3fb5', dark: '#b39ddb' },
  problema: { light: '#d84315', dark: '#ffab91' },
  contenido: { light: '#00796b', dark: '#80cbc4' },
}

type Range = 'all' | '30' | '90'

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
]

function emptyCounts(): Record<SuggestionStatus, number> {
  return { recibida: 0, revision: 0, aprobada: 0, implementada: 0, rechazada: 0 }
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function SuggestionsReport({ suggestions }: { suggestions: Suggestion[] }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [range, setRange] = useState<Range>('all')

  const palette = isDark
    ? { grid: '#534342', axis: '#e0bdbb', primary: '#ffb3b1', primarySoft: 'rgba(255,179,177,0.35)', surface: '#1e272e' }
    : { grid: '#f0d8d6', axis: '#5c403f', primary: '#9e001f', primarySoft: 'rgba(158,0,31,0.15)', surface: '#ffffff' }

  const statusColor = (status: string) => STATUS_COLORS[status]?.[isDark ? 'dark' : 'light'] ?? palette.axis
  const typeColor = (type: string) => TYPE_COLORS[type]?.[isDark ? 'dark' : 'light'] ?? palette.primary

  const scoped = useMemo(() => {
    if (range === 'all') return suggestions
    const days = range === '30' ? 30 : 90
    const cutoff = Date.now() - days * DAY_MS
    return suggestions.filter(s => new Date(s.created_at).getTime() >= cutoff)
  }, [suggestions, range])

  const metrics = useMemo(() => {
    const byStatus = emptyCounts()
    let withImages = 0
    let resolvedDays = 0
    let resolvedCount = 0

    for (const suggestion of scoped) {
      if (isSuggestionStatus(suggestion.status)) byStatus[suggestion.status]++
      if ((suggestion.images?.length ?? 0) > 0) withImages++
      if (suggestion.status === 'implementada' || suggestion.status === 'rechazada') {
        const days = (new Date(suggestion.updated_at).getTime() - new Date(suggestion.created_at).getTime()) / DAY_MS
        if (Number.isFinite(days) && days >= 0) {
          resolvedDays += days
          resolvedCount++
        }
      }
    }

    const total = scoped.length
    const implemented = byStatus.implementada
    return {
      total,
      byStatus,
      implemented,
      inProgress: byStatus.recibida + byStatus.revision + byStatus.aprobada,
      rejected: byStatus.rechazada,
      withImages,
      implementationRate: total > 0 ? Math.round((implemented / total) * 100) : 0,
      avgResolutionDays: resolvedCount > 0 ? resolvedDays / resolvedCount : null,
    }
  }, [scoped])

  const statusData = STATUS_ORDER
    .map(status => ({ status, name: statusLabels[status], value: metrics.byStatus[status] }))
    .filter(item => item.value > 0)

  const typeData = useMemo(() => {
    return TYPE_ORDER.map(type => {
      const items = scoped.filter(suggestion => suggestion.type === type)
      const counts = emptyCounts()
      for (const item of items) {
        if (isSuggestionStatus(item.status)) counts[item.status]++
      }
      return { type, name: typeLabels[type] ?? type, total: items.length, ...counts }
    })
  }, [scoped])

  const monthlyData = useMemo(() => {
    const months = new Map<string, { key: string; label: string; fullLabel: string } & Record<string, string | number>>()

    for (const suggestion of scoped) {
      const date = new Date(suggestion.created_at)
      const key = monthKey(date)
      let row = months.get(key)
      if (!row) {
        row = {
          key,
          label: date.toLocaleDateString('es-PE', { month: 'short' }),
          fullLabel: date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
          ...emptyCounts(),
        }
        months.set(key, row)
      }
      const status = suggestion.status
      if (typeof row[status] === 'number') row[status] += 1
    }

    return Array.from(months.values()).sort((a, b) => String(a.key).localeCompare(String(b.key)))
  }, [scoped])

  const tooltipStyle = {
    backgroundColor: palette.surface,
    border: 'none',
    borderRadius: 12,
    fontSize: 12,
    color: palette.axis,
  }

  const kpis = [
    {
      label: 'Total de sugerencias',
      value: String(metrics.total),
      hint: `${metrics.withImages} con imágenes adjuntas`,
      icon: 'lightbulb',
      tone: 'text-primary',
    },
    {
      label: 'Implementadas',
      value: String(metrics.implemented),
      hint: `${metrics.implementationRate}% del total`,
      icon: 'task_alt',
      tone: 'text-green',
    },
    {
      label: 'En proceso',
      value: String(metrics.inProgress),
      hint: `${metrics.byStatus.recibida} recibidas · ${metrics.byStatus.revision} en revisión · ${metrics.byStatus.aprobada} aprobadas`,
      icon: 'pending_actions',
      tone: 'text-tertiary',
    },
    {
      label: 'Tiempo medio de atención',
      value: metrics.avgResolutionDays === null ? '—' : `${metrics.avgResolutionDays.toFixed(1)} d`,
      hint: 'Sugerencias implementadas o rechazadas',
      icon: 'schedule',
      tone: 'text-primary',
    },
  ]

  return (
    <section>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-sm mb-lg">
        <div>
          <h2 className="text-lg font-bold text-on-surface">Reporte general</h2>
          <p className="text-sm text-on-surface-variant">
            {metrics.total === 0
              ? 'Sin sugerencias en el periodo seleccionado.'
              : `${metrics.total} sugerencia${metrics.total === 1 ? '' : 's'} · ${metrics.implementationRate}% implementadas · ${metrics.rejected} rechazadas`}
          </p>
        </div>
        <div className="flex gap-sm shrink-0">
          {RANGE_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              className={`px-md py-1 rounded-full text-sm transition-colors ${
                range === option.value
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {metrics.total === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-xl text-center border border-outline-variant">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-md block">insights</span>
          <p className="text-sm text-on-surface-variant">Todavía no hay sugerencias en este periodo para analizar.</p>
        </div>
      ) : (
        <div className="space-y-lg">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
            {kpis.map(kpi => (
              <div key={kpi.label} className="bg-surface border border-outline-variant rounded-xl p-md md:p-lg">
                <span className={`material-symbols-outlined text-2xl ${kpi.tone}`}>{kpi.icon}</span>
                <p className="text-2xl md:text-3xl font-bold text-on-surface tabular-nums mt-xs">{kpi.value}</p>
                <p className="text-sm font-semibold text-on-surface">{kpi.label}</p>
                <p className="text-xs text-on-surface-variant mt-[2px]">{kpi.hint}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-md bg-surface-container-lowest border border-outline-variant rounded-xl px-md py-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Estados</span>
            {STATUS_ORDER.map(status => (
              <span key={status} className="flex items-center gap-xs text-xs text-on-surface">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor(status) }} />
                {statusLabels[status]}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <h3 className="text-base font-bold text-on-surface">Distribución por estado</h3>
              <p className="text-xs text-on-surface-variant mb-lg">Reparto de las sugerencias según su situación actual</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {statusData.map(item => (
                      <Cell key={item.status} fill={statusColor(item.status)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: palette.axis }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-md space-y-2">
                {STATUS_ORDER.map(status => {
                  const value = metrics.byStatus[status]
                  const percent = metrics.total > 0 ? Math.round((value / metrics.total) * 100) : 0
                  return (
                    <div key={status} className="flex items-center gap-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColor(status) }} />
                      <span className="text-sm text-on-surface flex-1">{statusLabels[status]}</span>
                      <span className="text-sm font-semibold text-on-surface tabular-nums">{value}</span>
                      <span className="text-xs text-on-surface-variant tabular-nums w-10 text-right">{percent}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <h3 className="text-base font-bold text-on-surface">Evolución mensual</h3>
              <p className="text-xs text-on-surface-variant mb-lg">Sugerencias recibidas por mes y estado</p>
              <ResponsiveContainer width="100%" height={264}>
                <BarChart data={monthlyData} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="label" stroke={palette.axis} tickLine={false} axisLine={{ stroke: palette.grid }} fontSize={11} />
                  <YAxis stroke={palette.axis} tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: palette.primarySoft }}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: palette.axis }}
                    labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
                  />
                  {STATUS_ORDER.map(status => (
                    <Bar key={status} dataKey={status} stackId="mes" fill={statusColor(status)} maxBarSize={44} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <h3 className="text-base font-bold text-on-surface">Sugerencias por tipo</h3>
              <p className="text-xs text-on-surface-variant mb-lg">Volumen según la categoría elegida por el autor</p>
              <ResponsiveContainer width="100%" height={264}>
                <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} horizontal={false} />
                  <XAxis type="number" stroke={palette.axis} tickLine={false} axisLine={{ stroke: palette.grid }} fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke={palette.axis} tickLine={false} axisLine={false} fontSize={12} width={84} />
                  <Tooltip
                    cursor={{ fill: palette.primarySoft }}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: palette.axis }}
                    formatter={(value: number) => [value, 'Sugerencias']}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={26}>
                    {typeData.map(item => (
                      <Cell key={item.type} fill={typeColor(item.type)} />
                    ))}
                    <LabelList dataKey="total" position="right" fill={palette.axis} fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface border border-outline-variant rounded-xl p-lg">
              <h3 className="text-base font-bold text-on-surface">Estado por tipo</h3>
              <p className="text-xs text-on-surface-variant mb-lg">Cómo avanza cada categoría de sugerencia</p>
              <ResponsiveContainer width="100%" height={264}>
                <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} horizontal={false} />
                  <XAxis type="number" stroke={palette.axis} tickLine={false} axisLine={{ stroke: palette.grid }} fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke={palette.axis} tickLine={false} axisLine={false} fontSize={12} width={84} />
                  <Tooltip
                    cursor={{ fill: palette.primarySoft }}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: palette.axis }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  {STATUS_ORDER.map(status => (
                    <Bar key={status} dataKey={status} stackId="tipo" fill={statusColor(status)} maxBarSize={26} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
            <h3 className="text-base font-bold text-on-surface mb-sm">Resumen por estado</h3>
            <p className="text-xs text-on-surface-variant mb-md">
              {metrics.withImages} de {metrics.total} sugerencias incluyen imágenes adjuntas.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr className="text-left border-b border-outline-variant">
                    <th className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant pb-xs">Estado</th>
                    <th className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant pb-xs text-right">Cantidad</th>
                    <th className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant pb-xs text-right">Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_ORDER.map(status => {
                    const value = metrics.byStatus[status]
                    const percent = metrics.total > 0 ? Math.round((value / metrics.total) * 100) : 0
                    return (
                      <tr key={status} className="border-b border-outline-variant/60 last:border-0">
                        <td className="py-2">
                          <span className="flex items-center gap-sm text-sm text-on-surface">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor(status) }} />
                            {statusLabels[status]}
                          </span>
                        </td>
                        <td className="py-2 text-right text-sm font-semibold text-on-surface tabular-nums">{value}</td>
                        <td className="py-2 text-right text-xs text-on-surface-variant tabular-nums">{percent}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default SuggestionsReport
