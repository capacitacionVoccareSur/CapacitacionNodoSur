import { useState, useRef, useEffect } from 'react'

const BADGE_COLORS = {
  'Urgente':        'bg-red-600 text-white border-red-600',
  'Alta':           'bg-red-100 text-red-700 border-red-200',
  'Baja':           'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Solo documentación': 'bg-yellow-50 text-yellow-700 border-yellow-300',
  'Firmando':       'bg-purple-100 text-purple-700 border-purple-200',
  'Hecho':          'bg-green-100 text-green-700 border-green-200',
  'Pendiente':      'bg-orange-100 text-orange-700 border-orange-200',
  'En curso':       'bg-blue-100 text-blue-700 border-blue-200',
  '✅ Finalizado':  'bg-green-100 text-green-700 border-green-200',
  'SÍ':             'bg-green-100 text-green-700 border-green-200',
  'NO':             'bg-gray-100 text-gray-500 border-gray-200',
}

export default function InlineDropdown({ value, options, onSave, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [current, setCurrent] = useState(value)
  const [pos, setPos] = useState({ top: 0, left: 0, isUp: false })
  const btnRef = useRef(null)

  useEffect(() => {
    if (!saving) setCurrent(value)
  }, [value])

  function handleOpen() {
    if (disabled || saving) return
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = options.length * 32 + 8 // Estimado: 32px por item + padding
      
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        // No hay espacio abajo, pero sí arriba: abrir hacia arriba
        setPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left, isUp: true })
      } else {
        // Abrir hacia abajo (default)
        setPos({ top: rect.bottom + 4, left: rect.left, isUp: false })
      }
    }
    setOpen(o => !o)
  }

  async function handleSelect(newValue) {
    if (newValue === current) { setOpen(false); return }
    setOpen(false)
    const prev = current
    setCurrent(newValue)
    setSaving(true)
    try {
      await onSave(newValue)
    } catch {
      setCurrent(prev)
    } finally {
      setSaving(false)
    }
  }

  const colorClass = BADGE_COLORS[current] || 'bg-gray-100 text-gray-500 border-gray-200'

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={disabled || saving}
        className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-opacity whitespace-nowrap
          ${colorClass}
          ${saving ? 'opacity-40 cursor-default' : disabled ? 'cursor-default' : 'hover:opacity-75 cursor-pointer'}`}
      >
        {saving ? '...' : (current || '—')}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-max"
            style={pos.isUp 
              ? { bottom: pos.bottom, left: pos.left } 
              : { top: pos.top, left: pos.left }
            }
          >
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors
                  ${opt === current ? 'font-bold text-gray-900' : 'text-gray-700'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
