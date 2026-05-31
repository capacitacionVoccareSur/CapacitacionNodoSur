const COUNTRIES = [
  { key: 'argentina', label: 'ARG', flag: '🇦🇷', color: '#5DADE2' },
  { key: 'chile',     label: 'CHL', flag: '🇨🇱', color: '#E57373' },
  { key: 'ecuador',   label: 'ECU', flag: '🇪🇨', color: '#C9A84C' },
  { key: 'peru',      label: 'PER', flag: '🇵🇪', color: '#7B1C2E' },
  { key: 'bolivia',   label: 'BOL', flag: '🇧🇴', color: '#2E7D4F' },
  { key: 'paraguay',  label: 'PRY', flag: '🇵🇾', color: '#1A3A5C' },
  { key: 'uruguay',   label: 'URY', flag: '🇺🇾', color: '#7F9BAD' },
]

// Celda heatmap — fondo de color completo, clickeable para ciclar 0→50→100→0
const CELL_CONFIG = {
  100: { bg: 'bg-green-100', text: 'text-green-700', label: '100%', title: 'Capacitado · Click para resetear a 0%' },
  50:  { bg: 'bg-amber-100',  text: 'text-amber-700',  label: '50%',  title: 'En proceso · Click para pasar a 100%' },
  0:   { bg: 'bg-gray-100',  text: 'text-gray-400',  label: '—',    title: 'Sin capacitar · Click para pasar a 50%' },
}

function HeatCell({ value, onClick }) {
  const cfg = CELL_CONFIG[value] ?? CELL_CONFIG[0]
  return (
    <div
      title={cfg.title}
      onClick={onClick}
      className={`${cfg.bg} ${cfg.text} rounded text-xs font-semibold text-center py-1.5 cursor-pointer hover:brightness-95 active:brightness-90 transition-all select-none`}
    >
      {cfg.label}
    </div>
  )
}

function OverallBar({ coordinador }) {
  const values = COUNTRIES.map(({ key }) => coordinador[key] || 0)
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  const complete = values.filter(v => v === 100).length
  const inProgress = values.filter(v => v === 50).length

  const barColor = avg >= 90 ? '#16a34a' : avg >= 45 ? '#f59e0b' : '#ef4444'

  return (
    <div className="min-w-[100px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold" style={{ color: barColor }}>{avg}%</span>
        <span className="text-xs text-gray-400">{complete}/7</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${avg}%`, backgroundColor: barColor }}
        />
      </div>
      {inProgress > 0 && (
        <div className="text-xs text-yellow-600 mt-0.5">{inProgress} en proceso</div>
      )}
    </div>
  )
}

export default function CoordinadoresTable({ coordinadores, onEdit, onDelete, onDotClick, onCountryClick }) {
  if (coordinadores.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">👥</div>
        <p className="font-medium">No hay coordinadores registrados</p>
        <p className="text-sm mt-1">Usá "Agregar" o "Importar desde Sheets" para comenzar</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide">Coordinador</th>
            {COUNTRIES.map(({ key, label, flag, color }) => (
              <th
                key={key}
                className="px-1.5 py-2 text-center cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => onCountryClick && onCountryClick(key)}
                title={`Filtrar por ${label}`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm group-hover:scale-110 transition-transform">{flag}</span>
                  <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
                </div>
              </th>
            ))}
            <th className="px-4 py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide text-center">Progreso</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {coordinadores.map((c) => {
            const values = COUNTRIES.map(({ key }) => c[key] || 0)
            const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
            const allDone = avg === 100
            const nonStarted = avg === 0

            return (
              <tr
                key={c.id}
                className={`hover:bg-indigo-50/40 transition-colors ${allDone ? 'bg-green-50' : ''}`}
              >
                {/* Nombre con indicador lateral */}
                <td className="px-4 py-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-6 rounded-full shrink-0"
                      style={{ backgroundColor: avg >= 90 ? '#16a34a' : avg >= 45 ? '#f59e0b' : '#ef4444' }}
                    />
                    <span className="font-semibold text-gray-900 whitespace-nowrap text-sm">{c.nombre.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())}</span>
                  </div>
                </td>

                {/* Celdas heatmap por país */}
                {COUNTRIES.map(({ key }) => (
                  <td key={key} className="px-1 py-1.5">
                    <HeatCell value={c[key] ?? 0} onClick={() => onDotClick(c, key)} />
                  </td>
                ))}

                {/* Barra de progreso */}
                <td className="px-4 py-1.5">
                  <OverallBar coordinador={c} />
                </td>

                {/* Acciones */}
                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(c)} className="text-indigo-500 hover:text-indigo-700 font-medium mr-2 text-xs">Editar</button>
                  <button onClick={() => onDelete(c)} className="text-red-400 hover:text-red-600 font-medium text-xs">Eliminar</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
