const express = require('express')
const router = express.Router()
const { getSheetValues, updateSheetCell, moveRow, appendRow } = require('../sheets')

const TASKS_SHEET   = () => process.env.TASKS_SHEET_NAME   || 'Trabajo pendiente'
const FIN_SHEET     = () => process.env.FINALIZADOS_SHEET_NAME || 'Finalizados'
const DATA_RANGE    = 'A2:K500'

// Mapeo de campo → letra de columna en Sheets
const FIELD_COLUMN = {
  prioridad:             'A',
  libreria_intranet:     'F',
  documentacion_inicial: 'G',
  finalizado:            'H',
}

const FIELD_OPTIONS = {
  prioridad:             ['Urgente', 'Alta', 'Baja', 'Hecho', 'Solo documentación'],
  libreria_intranet:     ['Pendiente', 'Hecho'],
  documentacion_inicial: ['Pendiente', 'En curso', '✅ Finalizado'],
  finalizado:            ['SÍ', 'NO'],
}

function parseDate(str) {
  if (!str) return null
  // Intenta DD/MM/YYYY o D/M/YYYY (locale español)
  const parts = str.split('/')
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number)
    // Si el año está en la tercera posición
    if (c > 1900) {
      const d = new Date(c, b - 1, a)
      if (!isNaN(d.getTime())) return d
    }
  }
  const fallback = new Date(str)
  return isNaN(fallback.getTime()) ? null : fallback
}

function rowToTask(row, rowIndex) {
  const fechaDate = parseDate(row[3])
  const diasRetraso = fechaDate
    ? Math.floor((Date.now() - fechaDate.getTime()) / 86400000)
    : null

  return {
    rowIndex,
    prioridad:             row[0]  || '',
    pais:                  row[1]  || '',
    tarea:                 row[2]  || '',
    fecha_mail:            row[3]  || '',
    dias_retraso:          diasRetraso,
    libreria_intranet:     row[5]  || '',
    documentacion_inicial: row[6]  || '',
    finalizado:            row[7]  || '',
    mail:                  row[8]  || '',
    mail2:                 row[9]  || '',
    documento:             row[10] || '',
  }
}

function taskToRow(task) {
  return [
    task.prioridad,
    task.pais,
    task.tarea,
    task.fecha_mail,
    '',  // días de retraso — columna calculada en Sheets, se deja vacía
    task.libreria_intranet,
    task.documentacion_inicial,
    task.finalizado,
    task.mail,
    task.mail2,
    task.documento,
  ]
}

function isFullyCompleted(task) {
  return (
    task.prioridad             === 'Hecho' &&
    task.libreria_intranet     === 'Hecho' &&
    task.documentacion_inicial === '✅ Finalizado' &&
    task.finalizado            === 'SÍ'
  )
}

// POST /api/tareas — crear nueva tarea en Sheets
router.post('/', async (req, res) => {
  const { tarea, pais = '', prioridad = 'Alta', fecha_mail = '' } = req.body
  if (!tarea?.trim()) return res.status(400).json({ error: 'La tarea es requerida' })

  try {
    await appendRow(TASKS_SHEET(), [
      prioridad,
      pais,
      tarea.trim(),
      fecha_mail,
      '',           // dias_retraso — calculado por Sheets
      'Pendiente',  // libreria_intranet
      'Pendiente',  // documentacion_inicial
      'NO',         // finalizado
      '', '', '',   // mail, mail2, documento
    ])
    res.status(201).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/tareas/:rowIndex — editar todos los campos de una tarea
router.put('/:rowIndex', async (req, res) => {
  const rowIndex = Number(req.params.rowIndex)
  const { tarea, pais = '', prioridad = 'Alta', fecha_mail = '', mail = '', mail2 = '', documento = '' } = req.body
  if (!tarea?.trim()) return res.status(400).json({ error: 'La tarea es requerida' })

  try {
    // Actualizamos toda la fila (A a K, excepto la E que es calculada)
    // En lugar de multiples calls, podemos usar update con range completo si queremos ser eficientes
    // Pero para mantener consistencia con updateSheetCell y no romper la columna E:
    await Promise.all([
      updateSheetCell(TASKS_SHEET(), rowIndex, 'A', prioridad),
      updateSheetCell(TASKS_SHEET(), rowIndex, 'B', pais),
      updateSheetCell(TASKS_SHEET(), rowIndex, 'C', tarea.trim()),
      updateSheetCell(TASKS_SHEET(), rowIndex, 'D', fecha_mail),
      // E es dias_retraso (calculada)
      updateSheetCell(TASKS_SHEET(), rowIndex, 'I', mail),
      updateSheetCell(TASKS_SHEET(), rowIndex, 'J', mail2),
      updateSheetCell(TASKS_SHEET(), rowIndex, 'K', documento),
    ])
    
    const rows = await getSheetValues(TASKS_SHEET(), `A${rowIndex}:K${rowIndex}`)
    const task = rowToTask(rows[0] || [], rowIndex)
    res.json({ task })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/tareas/:rowIndex — elimina una tarea
router.delete('/:rowIndex', async (req, res) => {
  const rowIndex = Number(req.params.rowIndex)
  try {
    const { deleteRow } = require('../sheets')
    await deleteRow(TASKS_SHEET(), rowIndex)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/tareas/finalizados/:rowIndex — elimina una tarea finalizada
router.delete('/finalizados/:rowIndex', async (req, res) => {
  const rowIndex = Number(req.params.rowIndex)
  try {
    const { deleteRow } = require('../sheets')
    await deleteRow(FIN_SHEET(), rowIndex)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tareas
router.get('/', async (req, res) => {
  try {
    const rows = await getSheetValues(TASKS_SHEET(), DATA_RANGE)
    const tasks = rows
      .map((row, i) => rowToTask(row, i + 2))
      .filter(t => t.tarea)
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tareas/finalizados
router.get('/finalizados', async (req, res) => {
  try {
    const rows = await getSheetValues(FIN_SHEET(), DATA_RANGE)
    const tasks = rows
      .map((row, i) => rowToTask(row, i + 2))
      .filter(t => t.tarea)
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tareas/meta
router.get('/meta', (req, res) => {
  res.json({ fields: FIELD_OPTIONS })
})

// PATCH /api/tareas/:rowIndex — actualiza un campo y devuelve si está listo para archivar
router.patch('/:rowIndex', async (req, res) => {
  const rowIndex = Number(req.params.rowIndex)
  const { field, value } = req.body

  if (!FIELD_COLUMN[field]) {
    return res.status(400).json({ error: `Campo no editable: ${field}` })
  }
  if (!FIELD_OPTIONS[field].includes(value)) {
    return res.status(400).json({ error: `Valor inválido para ${field}: "${value}"` })
  }

  try {
    await updateSheetCell(TASKS_SHEET(), rowIndex, FIELD_COLUMN[field], value)

    // Re-lee la fila para obtener el estado actual
    const rows = await getSheetValues(TASKS_SHEET(), `A${rowIndex}:K${rowIndex}`)
    const task = rowToTask(rows[0] || [], rowIndex)

    res.json({ task, readyToArchive: isFullyCompleted(task) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tareas/:rowIndex/archive — mueve a Finalizados
router.post('/:rowIndex/archive', async (req, res) => {
  const rowIndex = Number(req.params.rowIndex)

  try {
    const rows = await getSheetValues(TASKS_SHEET(), `A${rowIndex}:K${rowIndex}`)
    if (!rows[0]) return res.status(404).json({ error: 'Fila no encontrada' })

    const task = rowToTask(rows[0], rowIndex)
    await moveRow(TASKS_SHEET(), FIN_SHEET(), rowIndex, taskToRow(task))

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tareas/automatizar — Dispara el motor de Apps Script
router.post('/automatizar', async (req, res) => {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL
  
  if (!scriptUrl) {
    return res.status(500).json({ error: 'URL de Apps Script no configurada en el servidor (.env)' })
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow'
    })

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Apps Script HTML Response:', text.substring(0, 500))
      throw new Error('El script de Google devolvió una página HTML en lugar de datos. Asegúrate de que el Script esté publicado como "Web App", que la URL sea la de "/exec" y que el acceso esté configurado para "Anyone".')
    }

    const result = await response.json()
    
    if (result.status === 'success') {
      res.json({ success: true, message: result.message })
    } else {
      res.status(500).json({ error: result.message || 'Error en la ejecución del script' })
    }
  } catch (err) {
    res.status(500).json({ error: `Error de conexión con Apps Script: ${err.message}` })
  }
})

// POST /api/tareas/finalizados/:rowIndex/reopen — vuelve a Tareas

// POST /api/tareas/finalizados/:rowIndex/reopen — vuelve a Tareas
router.post('/finalizados/:rowIndex/reopen', async (req, res) => {
  const rowIndex = Number(req.params.rowIndex)

  try {
    const rows = await getSheetValues(FIN_SHEET(), `A${rowIndex}:K${rowIndex}`)
    if (!rows[0]) return res.status(404).json({ error: 'Fila no encontrada' })

    const task = rowToTask(rows[0], rowIndex)
    await moveRow(FIN_SHEET(), TASKS_SHEET(), rowIndex, taskToRow(task))

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
