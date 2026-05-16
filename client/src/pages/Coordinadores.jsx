import { useState, useEffect } from 'react'
import XLSX from 'xlsx-js-style'
import CoordinadoresTable from '../components/CoordinadoresTable'
import CoordinadorModal from '../components/CoordinadorModal'
import ImportModal from '../components/ImportModal'

export default function Coordinadores() {
  const [coordinadores, setCoordinadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [sort, setSort] = useState('nombre')
  const [countryFilter, setCountryFilter] = useState(null)
  const [editTarget, setEditTarget] = useState(null)   // null = closed, {} = new, {...} = editing
  const [showImport, setShowImport] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')
  const [exporting, setExporting] = useState(false)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function load() {
    try {
      const res = await fetch('/api/coordinadores')
      const data = await res.json()
      setCoordinadores(Array.isArray(data) ? data : [])
    } catch {
      setCoordinadores([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleSave(saved) {
    setCoordinadores(prev => {
      const exists = prev.find(c => c.id === saved.id)
      return exists
        ? prev.map(c => c.id === saved.id ? saved : c)
        : [...prev, saved]
    })
    setEditTarget(null)
    showToast(saved.id ? '✓ Coordinador actualizado' : '✓ Coordinador agregado')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/coordinadores/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setCoordinadores(prev => prev.filter(c => c.id !== deleteTarget.id))
      showToast('✓ Coordinador eliminado')
    }
    setDeleteTarget(null)
    setDeleting(false)
  }

  async function handleDotClick(coordinador, countryKey) {
    const cycle = { 0: 50, 50: 100, 100: 0 }
    const current = coordinador[countryKey] ?? 0
    const next = cycle[current]
    const updated = { ...coordinador, [countryKey]: next }
    const res = await fetch(`/api/coordinadores/${coordinador.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    if (res.ok) {
      const saved = await res.json()
      setCoordinadores(prev => prev.map(c => c.id === saved.id ? saved : c))
    }
  }

  function handleImported(count) {
    setShowImport(false)
    load()
    showToast(`✓ ${count} coordinadores importados`)
  }

  const COUNTRIES = [
    { key: 'argentina', label: 'Argentina', flag: '🇦🇷' },
    { key: 'chile',     label: 'Chile',     flag: '🇨🇱' },
    { key: 'ecuador',   label: 'Ecuador',   flag: '🇪🇨' },
    { key: 'peru',      label: 'Perú',      flag: '🇵🇪' },
    { key: 'bolivia',   label: 'Bolivia',   flag: '🇧🇴' },
    { key: 'paraguay',  label: 'Paraguay',  flag: '🇵🇾' },
    { key: 'uruguay',   label: 'Uruguay',   flag: '🇺🇾' },
  ]
  const KEYS = COUNTRIES.map(c => c.key)
  const avg = c => Math.round(KEYS.reduce((a, k) => a + (c[k] || 0), 0) / KEYS.length)

  const filtered = coordinadores
    .filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()))
    .filter(c => {
      if (filter === 'completos')   return avg(c) === 100
      if (filter === 'en_proceso')  return avg(c) > 0 && avg(c) < 100
      if (filter === 'sin_iniciar') return avg(c) === 0
      return true
    })
    .filter(c => countryFilter === null || c[countryFilter] === 100)
    .sort((a, b) => {
      if (sort === 'mayor') return avg(b) - avg(a)
      return a.nombre.localeCompare(b.nombre)
    })

  function handleCountryClick(key) {
    setCountryFilter(prev => prev === key ? null : key)
  }

  const handleExportExcel = () => {
    // 1. Preparar encabezados con estilo
    const headerStyle = {
      fill: { fgColor: { rgb: "4F46E5" } }, // Indigo-600
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center" }
    }

    const header = [
      { v: 'Nombre', s: headerStyle },
      { v: 'Argentina %', s: headerStyle },
      { v: 'Chile %', s: headerStyle },
      { v: 'Ecuador %', s: headerStyle },
      { v: 'Perú %', s: headerStyle },
      { v: 'Bolivia %', s: headerStyle },
      { v: 'Paraguay %', s: headerStyle },
      { v: 'Uruguay %', s: headerStyle },
      { v: 'Promedio %', s: headerStyle }
    ]

    // 2. Función para dar estilo a las celdas según el valor
    const getCellWithStyle = (val, isName = false) => {
      if (isName) return { v: val, s: { font: { bold: true } } }
      
      let color = "FFFFFF" // Blanco
      if (val === 100) color = "DCFCE7" // Verde (bg-green-100)
      else if (val === 50) color = "FEF9C3" // Amarillo (bg-yellow-100)
      else if (val === 0) color = "F3F4F6" // Gris (bg-gray-100)

      return {
        v: val,
        s: {
          fill: { fgColor: { rgb: color } },
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin", color: { rgb: "E5E7EB" } },
            bottom: { style: "thin", color: { rgb: "E5E7EB" } },
            left: { style: "thin", color: { rgb: "E5E7EB" } },
            right: { style: "thin", color: { rgb: "E5E7EB" } }
          }
        }
      }
    }

    // 3. Preparar datos
    const dataRows = filtered.map(c => [
      getCellWithStyle(c.nombre, true),
      getCellWithStyle(c.argentina || 0),
      getCellWithStyle(c.chile || 0),
      getCellWithStyle(c.ecuador || 0),
      getCellWithStyle(c.peru || 0),
      getCellWithStyle(c.bolivia || 0),
      getCellWithStyle(c.paraguay || 0),
      getCellWithStyle(c.uruguay || 0),
      getCellWithStyle(avg(c))
    ])

    // 4. Crear el libro y la hoja
    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Coordinadores')

    // Ajustar anchos
    ws['!cols'] = [
      { wch: 30 }, // Nombre
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, // Países
      { wch: 15 }  // Promedio
    ]
    
    XLSX.writeFile(wb, `Coordinadores_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast('✓ Excel con diseño generado')
  }

  const handleExportSheets = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/coordinadores/export/sheets', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        window.open(data.url, '_blank')
        showToast(`✓ Exportado a Sheets: ${data.sheetTitle}`)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Coordinadores</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {coordinadores.length} registros · Matriz Radar Sur 2026
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>📊</span> Excel
          </button>
          <button
            onClick={handleExportSheets}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <span>📈</span> {exporting ? 'Exportando...' : 'Sheets'}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-200 bg-indigo-50 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <span>↓</span> Importar
          </button>
          <button
            onClick={() => setEditTarget({})}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <span>+</span> Agregar
          </button>
        </div>
      </div>

      {/* Search + Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar coordinador..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56"
        />
        <div className="flex gap-1">
          {[
            { key: 'todos',       label: 'Todos',        count: coordinadores.length },
            { key: 'completos',   label: '✓ Completos',  count: coordinadores.filter(c => avg(c) === 100).length },
            { key: 'en_proceso',  label: '◑ En proceso', count: coordinadores.filter(c => avg(c) > 0 && avg(c) < 100).length },
            { key: 'sin_iniciar', label: '○ Sin iniciar',count: coordinadores.filter(c => avg(c) === 0).length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {label} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {/* Ordenar */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-400 font-medium">Ordenar:</span>
          {[
            { key: 'nombre', label: 'A–Z' },
            { key: 'mayor',  label: '↓ Mayor %' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sort === key
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por país */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="text-xs text-gray-400 font-medium mr-1">País:</span>
        <button
          onClick={() => setCountryFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            countryFilter === null
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
          }`}
        >
          Todos los países
        </button>
        {COUNTRIES.map(({ key, flag, label }) => {
          const count = coordinadores.filter(c => c[key] === 100).length
          return (
            <button
              key={key}
              onClick={() => setCountryFilter(countryFilter === key ? null : key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                countryFilter === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {flag} {label} <span className="opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Leyenda de estados */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-gray-500">
        <span className="font-medium">Estado:</span>
        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold">100</span>
          Capacitado
        </span>
        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 text-white text-[10px] font-bold">50</span>
          En proceso
        </span>
        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold">0</span>
          Sin capacitar
        </span>
        <span className="text-gray-400 ml-1">· Click en un estado para ciclarlo</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!loading && (
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center gap-2">
            <span>Mostrando <strong className="text-gray-700">{filtered.length}</strong> coordinadores</span>
            <span className="text-gray-300">·</span>
            <span>Promedio general: <strong className="text-gray-700">{filtered.length > 0 ? Math.round(filtered.reduce((sum, c) => sum + avg(c), 0) / filtered.length) : 0}%</strong></span>
          </div>
        )}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando...</div>
        ) : (
          <CoordinadoresTable
            coordinadores={filtered}
            onEdit={c => setEditTarget(c)}
            onDelete={c => setDeleteTarget(c)}
            onDotClick={handleDotClick}
            onCountryClick={handleCountryClick}
          />
        )}
      </div>

      {/* Modals */}
      {editTarget !== null && (
        <CoordinadorModal
          coordinador={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar coordinador</h3>
            <p className="text-gray-600 text-sm mb-6">
              ¿Seguro que querés eliminar a <strong>{deleteTarget.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium z-50 animate-pulse">
          {toast}
        </div>
      )}
    </div>
  )
}
