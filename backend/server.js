const express = require('express')
const cors = require('cors')
const multer = require('multer')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const QRCode = require('qrcode')
const { writeAuditToACL } = require('./aclClient')

const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../storage/uploads')))

const ledgerFile = path.join(__dirname, '../storage/ledger.json')
const iotReadingsFile = path.join(__dirname, '../storage/iot-readings.json')

const projects = [
  {
    id: 1,
    name: 'Demo Factory dMRV Project',
    location: 'Vizag, Andhra Pradesh',
    status: 'Active'
  }
]


const uploadsDir = path.join(__dirname, '../storage/uploads')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

let auditLedger = []

if (fs.existsSync(ledgerFile)) {
  auditLedger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'))
}

let iotReadings = []

if (fs.existsSync(iotReadingsFile)) {
  iotReadings = JSON.parse(fs.readFileSync(iotReadingsFile, 'utf8'))
}

function saveLedger() {
  fs.writeFileSync(ledgerFile, JSON.stringify(auditLedger, null, 2))
}

function saveIotReadings() {
  fs.writeFileSync(iotReadingsFile, JSON.stringify(iotReadings, null, 2))
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../storage/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'dMRV backend is running' })
})

app.get('/projects', (req, res) => {
  res.json(projects)
})

app.get('/ledger', (req, res) => {
  res.json(auditLedger)
})

app.get('/verify/:id', (req, res) => {
  const id = Number(req.params.id)
  const entry = auditLedger.find(item => item.id === id)

  if (!entry) {
    return res.status(404).json({
      status: 'Not Found',
      message: 'Audit record not found'
    })
  }

  res.json({
    status: 'Verified',
    message: 'Audit record is valid and tamper-proof',
    record: entry
  })
})

app.post('/upload', upload.single('image'), async (req, res) => {
  const fileHash = crypto
    .createHash('sha256')
    .update(req.file.filename + Date.now())
    .digest('hex')

  const nextId = auditLedger.length + 1
  const verificationUrl = `http://localhost:5173/verify/${nextId}`
  const qrCode = await QRCode.toDataURL(verificationUrl)

  const auditEntry = {
    id: nextId,
    fileName: req.file.filename,
    imageUrl: `http://localhost:5050/uploads/${req.file.filename}`,
    hash: fileHash,
    timestamp: new Date(),
    status: 'Verified',
    verificationUrl,
    qrCode
  }

  try {
    const aclResult = await writeAuditToACL({
      project: 'Demo Factory dMRV Project',
      recordType: 'Satellite Image Hash',
      fileName: auditEntry.fileName,
      imageHash: auditEntry.hash,
      location: 'Vizag, Andhra Pradesh',
      timestamp: auditEntry.timestamp,
      verificationUrl: auditEntry.verificationUrl
    })

    auditEntry.azureAclStatus = 'Stored'
    auditEntry.azureAclResponse = aclResult.body

  } catch (error) {
    console.error('AZURE ACL ERROR:')
    console.error(error)

    auditEntry.azureAclStatus = 'Failed'
    auditEntry.azureAclError = error.message
  }

  auditLedger.push(auditEntry)
  saveLedger()

  res.json({
    message: 'Satellite image uploaded successfully',
    file: req.file.filename,
    imageUrl: auditEntry.imageUrl,
    hash: fileHash,
    verificationUrl,
    qrCode
  })
})


app.get('/iot/readings', (req, res) => {
  res.json(iotReadings)
})

app.post('/iot/readings', (req, res) => {
  const {
    projectId,
    meterId,
    parameter,
    value,
    unit,
    location
  } = req.body

  if (!meterId || !parameter || value === undefined || !unit) {
    return res.status(400).json({
      status: 'Failed',
      message: 'meterId, parameter, value and unit are required'
    })
  }

  const reading = {
    id: iotReadings.length + 1,
    projectId: projectId || 1,
    meterId,
    parameter,
    value,
    unit,
    location: location || 'Vizag, Andhra Pradesh',
    timestamp: new Date(),
    status: 'Received'
  }

  iotReadings.push(reading)
  saveIotReadings()

  res.json({
    status: 'Success',
    message: 'IoT reading ingested successfully',
    reading
  })
})

app.listen(5050, () => {
  console.log('Backend running on http://localhost:5050')
})
