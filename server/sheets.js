const { google } = require('googleapis')

let _auth = null

function getAuth() {
  if (_auth) return _auth

  let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''

  // Elimina comillas externas si dotenv no las quitó
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1)
  }

  // Normaliza: convierte cualquier \n literal (backslash+n) en newline real
  privateKey = privateKey.replace(/\\n/g, '\n')

  _auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return _auth
}

async function getSheetsClient() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

const SPREADSHEET_ID = () => process.env.GOOGLE_SPREADSHEET_ID

// Cache de sheetId numérico por nombre (para deleteRow)
const _sheetIdCache = {}

async function getSheetId(sheetName) {
  if (_sheetIdCache[sheetName] !== undefined) return _sheetIdCache[sheetName]
  const sheets = await getSheetsClient()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID() })
  for (const sheet of meta.data.sheets) {
    _sheetIdCache[sheet.properties.title] = sheet.properties.sheetId
  }
  if (_sheetIdCache[sheetName] === undefined) {
    throw new Error(`Hoja "${sheetName}" no encontrada en el spreadsheet`)
  }
  return _sheetIdCache[sheetName]
}

async function getSheetValues(sheetName, range) {
  const sheets = await getSheetsClient()
  const fullRange = `'${sheetName}'!${range}`
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: fullRange,
  })
  return response.data.values || []
}

async function updateSheetCell(sheetName, rowIndex, colLetter, value) {
  const sheets = await getSheetsClient()
  const range = `'${sheetName}'!${colLetter}${rowIndex}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  })
}

async function appendRow(sheetName, rowData) {
  const sheets = await getSheetsClient()
  const sheetId = await getSheetId(sheetName)

  const values = rowData.map(v => {
    if (v === null || v === undefined || v === '') return {}
    if (typeof v === 'number') return { userEnteredValue: { numberValue: v } }
    return { userEnteredValue: { stringValue: String(v) } }
  })

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: {
      requests: [{
        appendCells: {
          sheetId,
          rows: [{ values }],
          fields: 'userEnteredValue',
        },
      }],
    },
  })
}

async function deleteRow(sheetName, rowIndex) {
  const sheets = await getSheetsClient()
  const sheetId = await getSheetId(sheetName)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // API es 0-based
            endIndex: rowIndex,
          },
        },
      }],
    },
  })
}

// Mueve una fila: copia al destino, luego borra del origen
async function moveRow(sourceSheet, targetSheet, rowIndex, rowData) {
  await appendRow(targetSheet, rowData)
  await deleteRow(sourceSheet, rowIndex)
}

module.exports = { getSheetsClient, getSheetValues, updateSheetCell, appendRow, deleteRow, moveRow }
