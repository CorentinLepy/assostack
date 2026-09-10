import type { ReactNode } from 'react'

type Column = {
  key: string
  label: string
  className?: string
  width?: string
}

type Row = {
  key: string
  cells: ReactNode[]
}

type Props = {
  columns: Column[]
  rows: Row[]
  ariaLabel: string
}

export const DataTable = ({ columns, rows, ariaLabel }: Props) => {
  const gridTemplateColumns = columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' ')

  return (
    <div aria-label={ariaLabel} className="assostack-data-table" role="table">
      <div className="assostack-data-table__head" role="rowgroup">
        <div className="assostack-data-table__row" role="row" style={{ gridTemplateColumns }}>
          {columns.map((column) => (
            <div
              className={`assostack-data-table__cell assostack-data-table__cell--head ${column.className ?? ''}`.trim()}
              key={column.key}
              role="columnheader"
            >
              {column.label}
            </div>
          ))}
        </div>
      </div>
      <div className="assostack-data-table__body" role="rowgroup">
        {rows.map((row) => (
          <div
            className="assostack-data-table__row"
            key={row.key}
            role="row"
            style={{ gridTemplateColumns }}
          >
            {row.cells.map((cell, index) => (
              <div className="assostack-data-table__cell" key={`${row.key}-${index}`} role="cell">
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
