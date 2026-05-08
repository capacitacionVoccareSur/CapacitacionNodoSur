const express = require('express')
const router = express.Router()
const { getPool } = require('../db')
const { getSheetsClient } = require('../sheets')

const COUNTRIES = ['argentina', 'chile', 'ecuador', 'peru', 'bolivia', 'paraguay', 'uruguay']
const SPREADSHEET_ID = () => process.env.GOOGLE_SPREADSHEET_ID

function validateCountryValues(body) {
  for (const country of COUNTRIES) {
    const val = body[country]
    if (val !== undefined && ![0, 50, 100].includes(Number(val))) {
      return `Valor inválido para ${country}: debe ser 0, 50 o 100`
    }
  }
  return null
}

// GET /api/coordinadores
router.get('/', async (req, res) => {
  try {
    const result = await (await getPool()).query('SELECT * FROM coordinadores ORDER BY nombre')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/coordinadores/export/sheets
router.post('/export/sheets', async (req, res) => {
  try {
    const result = await (await getPool()).query('SELECT * FROM coordinadores ORDER BY nombre')
    const rows = result.rows

    const sheets = await getSheetsClient()
    const timestamp = new Date().toLocaleString('es-AR').replace(/[/,:]/g, '-')
    const sheetTitle = `Exp-Coord-${timestamp}`

    // 1. Crear nueva hoja
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID(),
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: sheetTitle }
          }
        }]
      }
    })

    // 2. Preparar datos
    const header = ['Nombre', ...COUNTRIES.map(c => c.charAt(0).toUpperCase() + c.slice(1)), 'Promedio %']
    const data = rows.map(r => {
      const vals = COUNTRIES.map(c => r[c] || 0)
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / COUNTRIES.length)
      return [r.nombre, ...vals, avg]
    })

    // 3. Escribir datos
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID(),
      range: `'${sheetTitle}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [header, ...data]
      }
    })

    res.json({ success: true, sheetTitle, url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID()}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/coordinadores
router.post('/', async (req, res) => {
  const { nombre, argentina = 0, chile = 0, ecuador = 0, peru = 0, bolivia = 0, paraguay = 0, uruguay = 0 } = req.body

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' })
  }

  const err = validateCountryValues(req.body)
  if (err) return res.status(400).json({ error: err })

  try {
    const result = await (await getPool()).query(
      `INSERT INTO coordinadores (nombre, argentina, chile, ecuador, peru, bolivia, paraguay, uruguay)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nombre.trim(), argentina, chile, ecuador, peru, bolivia, paraguay, uruguay]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/coordinadores/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { nombre, argentina = 0, chile = 0, ecuador = 0, peru = 0, bolivia = 0, paraguay = 0, uruguay = 0 } = req.body

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' })
  }

  const err = validateCountryValues(req.body)
  if (err) return res.status(400).json({ error: err })

  try {
    const result = await (await getPool()).query(
      `UPDATE coordinadores
       SET nombre = $1, argentina = $2, chile = $3, ecuador = $4,
           peru = $5, bolivia = $6, paraguay = $7, uruguay = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [nombre.trim(), argentina, chile, ecuador, peru, bolivia, paraguay, uruguay, Number(id)]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Coordinador no encontrado' })
    }

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/coordinadores/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  try {
    const result = await (await getPool()).query('DELETE FROM coordinadores WHERE id = $1', [Number(id)])

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Coordinador no encontrado' })
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
