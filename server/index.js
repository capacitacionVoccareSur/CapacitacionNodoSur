if (process.env.NODE_ENV !== 'production') require('dotenv').config()
require('dns').setDefaultResultOrder('ipv4first')
const express = require('express')
const cors = require('cors')
const path = require('path')
const { initDB } = require('./db')
const coordinadoresRouter = require('./routes/coordinadores')
const importRouter = require('./routes/import')
const tareasRouter = require('./routes/tareas')
const documentacionRouter = require('./routes/documentacion')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/coordinadores', coordinadoresRouter)
app.use('/api/import', importRouter)
app.use('/api/tareas', tareasRouter)
app.use('/api/documentacion', documentacionRouter)

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

initDB()
  .then(() => console.log('✓ Base de datos conectada'))
  .catch(err => console.warn('⚠ Base de datos no disponible (módulo Coordinadores desactivado):', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`✓ Servidor corriendo en http://localhost:${PORT}`)
    })
  })
