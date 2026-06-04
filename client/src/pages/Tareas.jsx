import { useState, useEffect, useCallback, Fragment } from 'react'
import { DndContext, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import InlineDropdown from '../components/InlineDropdown'

const PAIS_OPTIONS     = ['Todos', 'General', 'Argentina', 'Bolivia', 'Chile', 'Ecuador', 'Paraguay', 'Peru', 'Uruguay']
const PRIORIDAD_FILTER = ['Todos', 'Urgente', 'Alta', 'Firmando', 'Baja', 'Hecho', 'Solo documentación']

const FIELD_OPTIONS = {
  prioridad:             ['Urgente', 'Alta', 'Firmando', 'Baja', 'Hecho', 'Solo documentación'],
  libreria_intranet:     ['Pendiente', 'Hecho'],
  documentacion_inicial: ['Pendiente', 'En curso', '✅ Finalizado'],
  finalizado:            ['SÍ', 'NO'],
}

const PRIORITY_ORDER = { 'Urgente': 0, 'Alta': 1, 'Firmando': 1.5, 'Baja': 2, 'Solo documentación': 2.5, 'Hecho': 3, '': 4 }

function isFullyCompleted(task) {
  return (
    task.prioridad             === 'Hecho' &&
    task.libreria_intranet     === 'Hecho' &&
    task.documentacion_inicial === '✅ Finalizado' &&
    task.finalizado            === 'SÍ'
  )
}

function rowHighlightClasses(prioridad) {
  if (prioridad === 'Urgente') return 'border-l-4 border-l-red-600'
  if (prioridad === 'Alta')    return 'border-l-4 border-l-red-300'
  if (prioridad === 'Baja')    return 'border-l-4 border-l-yellow-400'
  if (prioridad === 'Hecho')   return 'border-l-4 border-l-green-400'
  if (prioridad === 'Firmando') return 'border-l-4 border-l-purple-500'
  if (prioridad === 'Solo documentación') return 'border-l-4 border-l-yellow-300 bg-yellow-50/70'
  return 'border-l-4 border-l-transparent'
}

function groupTasks(tasks) {
  const groups = {}
  const ungrouped = []
  for (const t of tasks) {
    if (t.grupo) {
      groups[t.grupo] = groups[t.grupo] || []
      groups[t.grupo].push(t)
    } else {
      ungrouped.push(t)
    }
  }
  return { groups, ungrouped }
}

function DelayBadge({ dias }) {
  if (dias === null || dias === undefined) return <span className="text-gray-300 text-xs">—</span>
  if (dias <= 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">En fecha</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{dias}d</span>
}

function LinkCell({ url, title, icon }) {
  if (!url) return <span className="text-gray-200 text-xs">—</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={title}
       className="text-indigo-400 hover:text-indigo-600 transition-colors text-sm">
      {icon}
    </a>
  )
}

function ConfirmModal({ task, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-2xl mb-3 text-center">✅</div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">Tarea completada</h3>
        <p className="text-sm text-gray-600 text-center mb-1">
          Todos los campos están finalizados.
        </p>
        <p className="text-sm font-medium text-gray-800 text-center mb-5 px-2">
          "{task.tarea}"
        </p>
        <p className="text-sm text-gray-500 text-center mb-5">
          ¿Mover a <strong>Finalizados</strong>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Dejar aquí
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Mover a Finalizados
          </button>
        </div>
      </div>
    </div>
  )
}

function ReopenModal({ task, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-2xl mb-3 text-center">🔄</div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">Reabrir tarea</h3>
        <p className="text-sm text-gray-600 text-center mb-1">
          La tarea volverá a la lista de pendientes.
        </p>
        <p className="text-sm font-medium text-gray-800 text-center mb-5 px-2">
          "{task.tarea}"
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Mover a Pendientes
          </button>
        </div>
      </div>
    </div>
  )
}

const COUNTRY_COLORS = {
  'argentina': 'bg-blue-50 text-blue-700 border-blue-100',
  'bolivia':   'bg-green-50 text-green-700 border-green-100',
  'chile':     'bg-red-50 text-red-700 border-red-100',
  'ecuador':   'bg-yellow-50 text-yellow-700 border-yellow-100',
  'paraguay':  'bg-indigo-50 text-indigo-700 border-indigo-100',
  'peru':      'bg-red-50 text-red-800 border-red-200',
  'uruguay':   'bg-sky-50 text-sky-700 border-sky-100',
  'general':   'bg-gray-50 text-gray-700 border-gray-100',
  'colombia':  'bg-orange-50 text-orange-700 border-orange-100',
  'venezuela': 'bg-yellow-50 text-yellow-800 border-yellow-200',
}

function CountryBadge({ pais }) {
  if (!pais || pais === '—') return <span className="text-gray-300">—</span>
  const key = pais.toLowerCase()
  const colorClass = COUNTRY_COLORS[key] || 'bg-gray-50 text-gray-600 border-gray-100'
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${colorClass}`}>
      {pais}
    </span>
  )
}

// ─── Modal nombre de grupo ────────────────────────────────────────────────────

function NombreGrupoModal({ taskA, taskB, onConfirm, onCancel }) {
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const truncate = (s, n) => s.length > n ? s.substring(0, n) + '…' : s

  async function handleConfirm() {
    if (!nombre.trim()) return
    setSaving(true)
    await onConfirm(nombre.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Nombre del grupo</h3>
        <p className="text-xs text-gray-500 mb-4">
          Agrupa "{truncate(taskA.tarea, 35)}" y "{truncate(taskB.tarea, 35)}"
        </p>
        <input
          autoFocus
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && nombre.trim() && !saving && handleConfirm()}
          placeholder="Ej: Onboarding Ecuador"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!nombre.trim() || saving}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creando...' : 'Crear grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DnD Row Components ───────────────────────────────────────────────────────

function GroupHeaderRow({ nombre, tareas, collapsed, onToggle, colSpan }) {
  const { setNodeRef, isOver } = useDroppable({ id: `grupo:${nombre}` })
  const completed = tareas.filter(isFullyCompleted).length
  return (
    <tr ref={setNodeRef} className={`border-y-2 border-indigo-200 transition-colors ${isOver ? 'bg-indigo-100' : 'bg-indigo-50'}`}>
      <td colSpan={colSpan} className="px-3 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border font-semibold bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 transition-colors select-none"
          >
            Grupo
            <span className="text-[10px] opacity-80">{collapsed ? '▶' : '▼'}</span>
          </button>
          <span className="font-bold text-indigo-800 text-sm">{nombre}</span>
          <span className="text-xs text-indigo-400">{completed}/{tareas.length} completadas</span>
          {isOver && (
            <span className="ml-auto text-xs text-indigo-500 font-medium">Soltar aquí</span>
          )}
        </div>
      </td>
    </tr>
  )
}

function DraggableTaskRow({ task, children }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: String(task.rowIndex) })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: String(task.rowIndex) })
  const setRef = useCallback(node => { setDragRef(node); setDropRef(node) }, [setDragRef, setDropRef])

  return (
    <tr
      ref={setRef}
      {...attributes}
      {...listeners}
      className={`${rowHighlightClasses(task.prioridad)} hover:bg-gray-50/60 transition-colors text-xs cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-40' : ''}
        ${isOver && !isDragging ? 'outline outline-2 outline-indigo-400 bg-indigo-50/60' : ''}`}
    >
      <td className="px-1 py-1 text-center w-5 select-none">
        {isOver && !isDragging
          ? <span className="text-indigo-500 font-bold text-sm">⊕</span>
          : <span className="text-gray-300">⠿</span>
        }
      </td>
      {children}
    </tr>
  )
}

function UngroupedDropZone({ colSpan }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'ungrouped' })
  return (
    <tr ref={setNodeRef}>
      <td
        colSpan={colSpan}
        className={`px-4 py-2 border-2 border-dashed text-xs transition-colors ${
          isOver
            ? 'border-gray-400 bg-gray-100 text-gray-700 font-medium'
            : 'border-gray-200 text-gray-400'
        }`}
      >
        ↑ Soltar aquí para quitar del grupo
      </td>
    </tr>
  )
}

// ─── Tabla compartida ─────────────────────────────────────────────────────────

function TareasTable({
  tasks,
  groups,
  ungrouped,
  collapsedGroups,
  onToggleCollapse,
  onFieldChange,
  onReopen,
  onEdit,
  onDelete,
  isFinalizados = false,
  dndEnabled = false,
}) {
  const hasData = dndEnabled
    ? (ungrouped?.length > 0 || Object.keys(groups || {}).length > 0)
    : (tasks?.length > 0)

  if (!hasData) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">{isFinalizados ? '🎉' : '📋'}</div>
        <p className="font-medium">{isFinalizados ? 'No hay tareas finalizadas' : 'No hay tareas pendientes'}</p>
      </div>
    )
  }

  // drag(1) + #(1) + prioridad(1) + tarea(1) + pais(1) + fecha(1) + retraso(1) +
  // lib(1) + doc(1) + finalizado(1) + links(1) + acciones(1) [+ reabrir(1)]
  const colSpan = 12 + (isFinalizados ? 1 : 0)

  function renderCells(task, idx, indent = false) {
    return (
      <>
        <td className="px-2 py-1 text-center font-bold text-gray-300">
          {idx + 1}
        </td>

        <td className="px-2 py-1 text-center">
          {isFinalizados
            ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium whitespace-nowrap">{task.prioridad}</span>
            : <InlineDropdown
                value={task.prioridad}
                options={FIELD_OPTIONS.prioridad}
                onSave={v => onFieldChange(task, 'prioridad', v)}
              />
          }
        </td>

        <td className={`px-2 py-1 max-w-xs ${indent ? 'pl-6' : ''}`}>
          <span className="text-gray-800 font-medium text-sm leading-snug">{task.tarea}</span>
        </td>

        <td className="px-2 py-1 text-center">
          <CountryBadge pais={task.pais} />
        </td>

        <td className="px-3 py-2 text-center whitespace-nowrap">
          <span className="text-xs text-gray-500">{task.fecha_mail || '—'}</span>
        </td>

        <td className="px-2 py-1 text-center">
          <DelayBadge dias={task.dias_retraso} />
        </td>

        <td className="px-2 py-1 text-center">
          {isFinalizados
            ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">{task.libreria_intranet}</span>
            : <InlineDropdown
                value={task.libreria_intranet}
                options={FIELD_OPTIONS.libreria_intranet}
                onSave={v => onFieldChange(task, 'libreria_intranet', v)}
              />
          }
        </td>

        <td className="px-2 py-1 text-center">
          {isFinalizados
            ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium whitespace-nowrap">{task.documentacion_inicial}</span>
            : <InlineDropdown
                value={task.documentacion_inicial}
                options={FIELD_OPTIONS.documentacion_inicial}
                onSave={v => onFieldChange(task, 'documentacion_inicial', v)}
              />
          }
        </td>

        <td className="px-2 py-1 text-center">
          {isFinalizados
            ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">{task.finalizado}</span>
            : <InlineDropdown
                value={task.finalizado}
                options={FIELD_OPTIONS.finalizado}
                onSave={v => onFieldChange(task, 'finalizado', v)}
              />
          }
        </td>

        <td className="px-2 py-1">
          <div className="flex items-center gap-2 justify-center">
            <LinkCell url={task.mail}      title="Mail"          icon="✉️" />
            <LinkCell url={task.mail2}     title="Carpeta Drive" icon="📁" />
            <LinkCell url={task.documento} title="Documento"     icon="📄" />
          </div>
        </td>

        <td className="px-2 py-1 text-center whitespace-nowrap">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onEdit(task)}
              className="text-gray-300 hover:text-indigo-500 transition-colors text-base leading-none"
              title="Editar tarea"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(task)}
              className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
              title="Eliminar tarea"
            >
              🗑️
            </button>
          </div>
        </td>

        {isFinalizados && (
          <td className="px-2 py-1 text-right">
            <button
              onClick={() => onReopen(task)}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium whitespace-nowrap transition-colors"
            >
              Reabrir
            </button>
          </td>
        )}
      </>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="w-5"></th>
            <th className="px-2 py-1.5 text-center w-8 text-gray-400">#</th>
            <th className="text-left px-2 py-1.5 w-4"></th>
            <th className="text-left px-2 py-1.5">Tarea</th>
            <th className="px-2 py-1.5 text-center whitespace-nowrap">País</th>
            <th className="px-2 py-1.5 text-center whitespace-nowrap">Fecha</th>
            <th className="px-2 py-1.5 text-center whitespace-nowrap">Retraso</th>
            <th className="px-2 py-1.5 text-center whitespace-nowrap">Lib. Intranet</th>
            <th className="px-2 py-1.5 text-center whitespace-nowrap">Documentación</th>
            <th className="px-2 py-1.5 text-center whitespace-nowrap">Finalizado</th>
            <th className="px-2 py-1.5 text-center whitespace-nowrap">Links</th>
            <th className="px-2 py-1.5 w-6 text-center"></th>
            {isFinalizados && <th className="px-2 py-1.5"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {dndEnabled ? (
            <>
              {ungrouped.map((task, idx) => (
                <DraggableTaskRow key={task.rowIndex} task={task}>
                  {renderCells(task, idx)}
                </DraggableTaskRow>
              ))}
              {Object.keys(groups).length > 0 && (
                <UngroupedDropZone colSpan={colSpan} />
              )}
              {Object.entries(groups).map(([nombre, tareas]) => {
                const collapsed = collapsedGroups[nombre]
                return (
                  <Fragment key={nombre}>
                    <GroupHeaderRow
                      nombre={nombre}
                      tareas={tareas}
                      collapsed={collapsed}
                      onToggle={() => onToggleCollapse(nombre)}
                      colSpan={colSpan}
                    />
                    {!collapsed && tareas.map((task, idx) => (
                      <DraggableTaskRow key={task.rowIndex} task={task}>
                        {renderCells(task, idx, true)}
                      </DraggableTaskRow>
                    ))}
                  </Fragment>
                )
              })}
            </>
          ) : (
            tasks.map((task, idx) => (
              <tr
                key={task.rowIndex}
                className={`${rowHighlightClasses(task.prioridad)} hover:bg-gray-50/60 transition-colors text-xs
                  ${isFinalizados ? 'opacity-70' : ''}`}
              >
                <td className="w-5"></td>
                {renderCells(task, idx)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Modales de tarea ─────────────────────────────────────────────────────────

const PAIS_CREATE = ['', 'General', 'Argentina', 'Bolivia', 'Chile', 'Ecuador', 'Paraguay', 'Peru', 'Uruguay', 'Colombia', 'Venezuela']

function toSheetsDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function toInputDate(sheets) {
  if (!sheets) return ''
  const parts = sheets.split('/')
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
  return ''
}

function TareaFormModal({ title, initial = {}, onClose, onSave }) {
  const [tarea,     setTarea]     = useState(initial.tarea     || '')
  const [pais,      setPais]      = useState(initial.pais      || '')
  const [prioridad, setPrioridad] = useState(initial.prioridad || 'Alta')
  const [fecha,     setFecha]     = useState(toInputDate(initial.fecha_mail))
  const [mail,      setMail]      = useState(initial.mail      || '')
  const [mail2,     setMail2]     = useState(initial.mail2     || '')
  const [documento, setDocumento] = useState(initial.documento || '')
  const [grupo,     setGrupo]     = useState(initial.grupo     || '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function handleSave() {
    if (!tarea.trim()) { setError('La tarea es requerida'); return }
    setSaving(true); setError('')
    try {
      await onSave({
        tarea: tarea.trim(),
        pais,
        prioridad,
        fecha_mail: toSheetsDate(fecha),
        mail: mail.trim(),
        mail2: mail2.trim(),
        documento: documento.trim(),
        grupo: grupo.trim(),
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tarea <span className="text-red-400">*</span></label>
            <textarea
              autoFocus
              value={tarea}
              onChange={e => setTarea(e.target.value)}
              rows={2}
              placeholder="Descripción de la tarea..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {['Urgente','Alta','Firmando','Baja','Hecho','Solo documentación'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
              <select value={pais} onChange={e => setPais(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {PAIS_CREATE.map(p => <option key={p} value={p}>{p || '—'}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
            <input
              type="text"
              value={grupo}
              onChange={e => setGrupo(e.target.value)}
              placeholder="Nombre del grupo (opcional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Links (opcional)</p>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Email Link</label>
              <input type="url" value={mail} onChange={e => setMail(e.target.value)} placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Carpeta Drive</label>
              <input type="url" value={mail2} onChange={e => setMail2(e.target.value)} placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase">Documento</label>
              <input type="url" value={documento} onChange={e => setDocumento(e.target.value)} placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NuevaTareaModal({ onClose, onCreated }) {
  const [tarea,      setTarea]      = useState('')
  const [pais,       setPais]       = useState('')
  const [prioridad,  setPrioridad]  = useState('Alta')
  const [fecha,      setFecha]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  async function handleSave() {
    if (!tarea.trim()) { setError('La tarea es requerida'); return }
    setSaving(true)
    setError('')
    try {
      const fechaSheets = fecha ? fecha.split('-').reverse().join('/') : ''
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarea: tarea.trim(), pais, prioridad, fecha_mail: fechaSheets }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear')
      onCreated()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Nueva tarea</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tarea <span className="text-red-400">*</span></label>
            <textarea
              autoFocus
              value={tarea}
              onChange={e => setTarea(e.target.value)}
              rows={2}
              placeholder="Descripción de la tarea..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
              <select
                value={prioridad}
                onChange={e => setPrioridad(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {['Urgente', 'Alta', 'Firmando', 'Baja', 'Solo documentación'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
              <select
                value={pais}
                onChange={e => setPais(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {PAIS_CREATE.map(p => <option key={p} value={p}>{p || '—'}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Tareas() {
  const [tab, setTab]                   = useState('pendientes')
  const [pendientes, setPendientes]     = useState([])
  const [finalizados, setFinalizados]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [lastSync, setLastSync]         = useState(null)
  const [paisFilter, setPaisFilter]     = useState('Todos')
  const [prioFilter, setPrioFilter]     = useState('Todos')
  const [sortBy, setSortBy]             = useState('prioridad')
  const [archiveTask, setArchiveTask]   = useState(null)
  const [reopenTask, setReopenTask]     = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [automationLoading, setAutomationLoading] = useState(false)
  const [showNewTask, setShowNewTask]   = useState(false)
  const [editTask, setEditTask]         = useState(null)
  const [deleteTask, setDeleteTask]     = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Group state
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [pendingGroup, setPendingGroup]       = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pRes, fRes] = await Promise.all([
        fetch('/api/tareas'),
        fetch('/api/tareas/finalizados'),
      ])
      if (!pRes.ok || !fRes.ok) throw new Error('Error al conectar con Google Sheets')
      const [p, f] = await Promise.all([pRes.json(), fRes.json()])
      setPendientes(p)
      setFinalizados(f)
      setLastSync(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleRunAutomation() {
    if (automationLoading) return
    setAutomationLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tareas/automatizar', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar automatización')
      setTimeout(() => fetchAll(), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setAutomationLoading(false)
    }
  }

  async function handleFieldChange(task, field, value) {
    const res = await fetch(`/api/tareas/${task.rowIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar')
    setPendientes(prev => prev.map(t => t.rowIndex === task.rowIndex ? data.task : t))
    if (data.readyToArchive) setArchiveTask(data.task)
  }

  async function handleArchiveConfirm() {
    if (!archiveTask || actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tareas/${archiveTask.rowIndex}/archive`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
      setArchiveTask(null)
    }
  }

  async function handleReopenConfirm() {
    if (!reopenTask || actionLoading) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tareas/finalizados/${reopenTask.rowIndex}/reopen`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
      setReopenTask(null)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTask || actionLoading) return
    setActionLoading(true)
    try {
      const url = tab === 'pendientes'
        ? `/api/tareas/${deleteTask.rowIndex}`
        : `/api/tareas/finalizados/${deleteTask.rowIndex}`
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      await fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
      setDeleteTask(null)
    }
  }

  async function handleEdit({ tarea, pais, prioridad, fecha_mail, mail, mail2, documento, grupo }) {
    const res = await fetch(`/api/tareas/${editTask.rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarea, pais, prioridad, fecha_mail, mail, mail2, documento, grupo }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar')
    setPendientes(prev => prev.map(t => t.rowIndex === editTask.rowIndex ? data.task : t))
    setEditTask(null)
  }

  // ─── Group + sort handlers ────────────────────────────────────────────────────

  function toggleCollapse(nombre) {
    setCollapsedGroups(prev => ({ ...prev, [nombre]: !prev[nombre] }))
  }

  async function assignToGroup(task, grupoNombre) {
    try {
      const res = await fetch(`/api/tareas/${task.rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'grupo', value: grupoNombre }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setPendientes(prev => prev.map(t => t.rowIndex === task.rowIndex ? { ...t, grupo: grupoNombre } : t))
    } catch (err) {
      setError('Error al asignar grupo: ' + err.message)
    }
  }

  async function handleCreateGroup(grupoNombre) {
    const { taskA, taskB } = pendingGroup
    setPendingGroup(null)
    try {
      await Promise.all([
        fetch(`/api/tareas/${taskA.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'grupo', value: grupoNombre }),
        }),
        fetch(`/api/tareas/${taskB.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'grupo', value: grupoNombre }),
        }),
      ])
      setPendientes(prev => prev.map(t =>
        t.rowIndex === taskA.rowIndex || t.rowIndex === taskB.rowIndex
          ? { ...t, grupo: grupoNombre }
          : t
      ))
    } catch (err) {
      setError('Error al crear grupo: ' + err.message)
    }
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return

    const overId = String(over.id)
    const draggedTask = pendientes.find(t => String(t.rowIndex) === String(active.id))
    if (!draggedTask) return

    // Zona "sin grupo": quitar del grupo
    if (overId === 'ungrouped') {
      if (draggedTask.grupo) assignToGroup(draggedTask, '')
      return
    }

    // Encabezado de grupo: agregar/mover al grupo
    if (overId.startsWith('grupo:')) {
      const grupoNombre = overId.replace('grupo:', '')
      if (draggedTask.grupo !== grupoNombre) assignToGroup(draggedTask, grupoNombre)
      return
    }

    const targetTask = pendientes.find(t => String(t.rowIndex) === overId)
    if (!targetTask) return

    if (draggedTask.grupo && !targetTask.grupo) {
      // Tarea agrupada suelta sobre tarea libre → quitar del grupo
      assignToGroup(draggedTask, '')
    } else if (targetTask.grupo && draggedTask.grupo !== targetTask.grupo) {
      // Mover a otro grupo
      assignToGroup(draggedTask, targetTask.grupo)
    } else if (!draggedTask.grupo && !targetTask.grupo) {
      // Ambas sin grupo → crear grupo nuevo
      setPendingGroup({ taskA: draggedTask, taskB: targetTask })
    }
  }

  // ─── Filtered + grouped data ─────────────────────────────────────────────────

  const filteredPendientes = pendientes
    .filter(t => paisFilter === 'Todos' || t.pais === paisFilter)
    .filter(t => prioFilter === 'Todos' || t.prioridad === prioFilter)
    .sort((a, b) => {
      if (sortBy === 'fecha') {
        const parse = s => {
          if (!s) return Infinity
          const [d, m, y] = s.split('/').map(Number)
          return y > 1900 ? new Date(y, m - 1, d).getTime() : Infinity
        }
        return parse(a.fecha_mail) - parse(b.fecha_mail)
      }
      if (sortBy === 'retraso') {
        return (b.dias_retraso ?? -Infinity) - (a.dias_retraso ?? -Infinity)
      }
      const pa = PRIORITY_ORDER[a.prioridad] ?? 3
      const pb = PRIORITY_ORDER[b.prioridad] ?? 3
      if (pa !== pb) return pa - pb
      return (b.dias_retraso ?? -Infinity) - (a.dias_retraso ?? -Infinity)
    })

  const { groups, ungrouped } = groupTasks(filteredPendientes)

  const lastSyncText = lastSync
    ? lastSync.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="p-3 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tareas pendientes</h2>
          {lastSyncText && (
            <p className="text-xs text-gray-400 mt-0.5">Sincronizado a las {lastSyncText}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRunAutomation}
            disabled={automationLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 ${automationLoading ? 'animate-pulse' : ''}`}
          >
            {automationLoading ? (
              <><span className="animate-spin inline-block text-xs">🧠</span>IA Analizando...</>
            ) : (
              <><span>🚀</span>Automatizar</>
            )}
          </button>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Nueva tarea
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>
            Actualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'pendientes', label: `Pendientes${pendientes.length ? ` (${pendientes.length})` : ''}` },
          { key: 'finalizados', label: `Finalizados${finalizados.length ? ` (${finalizados.length})` : ''}` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtros (solo en Pendientes) */}
      {tab === 'pendientes' && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">País</label>
            <select
              value={paisFilter}
              onChange={e => setPaisFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {PAIS_OPTIONS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Prioridad</label>
            <select
              value={prioFilter}
              onChange={e => setPrioFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {PRIORIDAD_FILTER.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          {(paisFilter !== 'Todos' || prioFilter !== 'Todos') && (
            <button
              onClick={() => { setPaisFilter('Todos'); setPrioFilter('Todos') }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Limpiar filtros
            </button>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-gray-400 font-medium">Ordenar:</span>
            {[
              { key: 'prioridad', label: 'Prioridad' },
              { key: 'fecha',     label: 'Fecha' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  sortBy === key
                    ? 'bg-gray-800 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <span className="animate-spin mr-2 text-xl">↻</span>
          Cargando desde Google Sheets...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          {tab === 'pendientes' ? (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <TareasTable
                ungrouped={ungrouped}
                groups={groups}
                collapsedGroups={collapsedGroups}
                onToggleCollapse={toggleCollapse}
                onFieldChange={handleFieldChange}
                onEdit={setEditTask}
                onDelete={setDeleteTask}
                dndEnabled
              />
            </DndContext>
          ) : (
            <TareasTable
              tasks={finalizados}
              isFinalizados
              onReopen={setReopenTask}
              onEdit={setEditTask}
              onDelete={setDeleteTask}
            />
          )}
        </div>
      )}

      {/* Modal: confirmar archivado */}
      {archiveTask && (
        <ConfirmModal
          task={archiveTask}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setArchiveTask(null)}
        />
      )}

      {/* Modal: confirmar reapertura */}
      {reopenTask && (
        <ReopenModal
          task={reopenTask}
          onConfirm={handleReopenConfirm}
          onCancel={() => setReopenTask(null)}
        />
      )}

      {/* Modal: confirmar eliminación */}
      {deleteTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-2xl mb-3 text-center">🗑️</div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">Eliminar tarea</h3>
            <p className="text-sm text-gray-600 text-center mb-1">
              ¿Seguro que querés eliminar esta tarea?
            </p>
            <p className="text-sm font-medium text-gray-800 text-center mb-5 px-2">
              "{deleteTask.tarea}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTask(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nueva tarea */}
      {showNewTask && (
        <NuevaTareaModal
          onClose={() => setShowNewTask(false)}
          onCreated={() => { setShowNewTask(false); fetchAll() }}
        />
      )}

      {/* Modal: editar tarea */}
      {editTask && (
        <TareaFormModal
          title="Editar tarea"
          initial={editTask}
          onClose={() => setEditTask(null)}
          onSave={handleEdit}
        />
      )}

      {/* Modal: nombre de grupo */}
      {pendingGroup && (
        <NombreGrupoModal
          taskA={pendingGroup.taskA}
          taskB={pendingGroup.taskB}
          onConfirm={handleCreateGroup}
          onCancel={() => setPendingGroup(null)}
        />
      )}

    </div>
  )
}
