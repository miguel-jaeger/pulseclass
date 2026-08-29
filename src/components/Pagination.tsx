import { useState } from 'react'

interface PaginationProps {
  totalItems: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

const perPageOptions = [10, 20, 50, 100]

export function Pagination({ totalItems, page, perPage, onPageChange, onPerPageChange }: PaginationProps) {
  const totalPages = perPage === 0 ? 1 : Math.ceil(totalItems / perPage)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-md mt-lg pt-lg pb-md md:pb-0 border-t border-outline-variant">
      <div className="flex items-center gap-sm">
        <span className="font-body-sm text-body-sm text-on-surface-variant">Mostrar</span>
        <select
          value={perPage}
          onChange={(e) => {
            onPerPageChange(Number(e.target.value))
            onPageChange(1)
          }}
          className="border border-outline-variant rounded-lg px-sm py-1 bg-surface font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
        >
          <option value={0}>Todos</option>
          {perPageOptions.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          de <span className="font-bold text-on-surface">{totalItems}</span> registro{totalItems !== 1 ? 's' : ''}
        </span>
      </div>

      {perPage !== 0 && (
        <div className="flex items-center gap-sm">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <span className="font-body-sm text-body-sm text-on-surface min-w-[80px] text-center">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-secondary-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function usePagination(totalItems: number, initialPerPage = 20) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(initialPerPage)

  const startIdx = perPage === 0 ? 0 : (page - 1) * perPage
  const endIdx = perPage === 0 ? totalItems : startIdx + perPage
  const paginatedSlice = <T,>(items: T[]): T[] => items.slice(startIdx, endIdx)

  return { page, perPage, setPage, setPerPage, paginatedSlice, startIdx, endIdx }
}
