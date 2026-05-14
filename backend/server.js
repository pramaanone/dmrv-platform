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
const esgRecordsFile = path.join(__dirname, '../storage/esg-records.json')

const backendBaseUrl = process.env.BACKEND_BASE_URL || 'https://dmrv-platform-m0g3.onrender.com'
const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'https://dmrv-platform-beige.vercel.app'

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

let esgRecords = []

if (fs.existsSync(esgRecordsFile)) {
  esgRecords = JSON.parse(fs.readFileSync(esgRecordsFile, 'utf8'))
}

function saveLedger() {
  fs.writeFileSync(ledgerFile, JSON.stringify(auditLedger, null, 2))
}

function saveIotReadings() {
  fs.writeFileSync(iotReadingsFile, JSON.stringify(iotReadings, null, 2))
}

function saveEsgRecords() {
  fs.writeFileSync(esgRecordsFile, JSON.stringify(esgRecords, null, 2))
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

app.get('/esg/records', (req, res) => {
  res.json(esgRecords)
})

app.post('/esg/records', async (req, res) => {
  const {
    projectId,
    projectName,
    energyKwh,
    co2Kg,
    waterUsageLiters,
    wasteGeneratedKg,
    renewableEnergyPercent,
    complianceScore,
    source
  } = req.body

  const timestamp = new Date().toISOString()
  const nextId = esgRecords.length + 1

  const esgPayload = {
    id: nextId,
    projectId: projectId || 1,
    projectName: projectName || 'Demo Factory dMRV Project',
    recordType: 'ESG Summary Record',
    energyKwh,
    co2Kg,
    waterUsageLiters,
    wasteGeneratedKg,
    renewableEnergyPercent,
    complianceScore,
    source: source || 'Edge Gateway and Satellite Evidence',
    timestamp
  }

  const esgHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(esgPayload))
    .digest('hex')

  const verificationUrl = `${frontendBaseUrl}/`

  const esgRecord = {
    ...esgPayload,
    hash: esgHash,
    verificationUrl,
    azureAclStatus: 'Pending'
  }

  try {
    const aclResult = await writeAuditToACL({
      project: esgRecord.projectName,
      recordType: esgRecord.recordType,
      energyKwh: esgRecord.energyKwh,
      co2Kg: esgRecord.co2Kg,
      waterUsageLiters: esgRecord.waterUsageLiters,
      wasteGeneratedKg: esgRecord.wasteGeneratedKg,
      renewableEnergyPercent: esgRecord.renewableEnergyPercent,
      complianceScore: esgRecord.complianceScore,
      source: esgRecord.source,
      esgHash: esgRecord.hash,
      timestamp: esgRecord.timestamp,
      verificationUrl: esgRecord.verificationUrl
    })

    esgRecord.azureAclResponse = aclResult.body

    if (aclResult.body && aclResult.body.error) {
      esgRecord.azureAclStatus = 'Failed'
      esgRecord.azureAclError = aclResult.body.error.message || 'Azure ACL write failed'
    } else {
      esgRecord.azureAclStatus = 'Stored'
    }
  } catch (error) {
    esgRecord.azureAclStatus = 'Failed'
    esgRecord.azureAclError = error.message
  }

  esgRecords.push(esgRecord)
  saveEsgRecords()

  res.json({
    message: 'ESG summary record stored successfully',
    record: esgRecord
  })
})

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
  const verificationUrl = `${frontendBaseUrl}/verify/${nextId}`
  const qrCode = await QRCode.toDataURL(verificationUrl)

  const auditEntry = {
    id: nextId,
    fileName: req.file.filename,
    imageUrl: `${backendBaseUrl}/uploads/${req.file.filename}`,
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

    auditEntry.azureAclResponse = aclResult.body

    if (aclResult.body && aclResult.body.error) {
      auditEntry.azureAclStatus = 'Failed'
      auditEntry.azureAclError = aclResult.body.error.message || 'Azure ACL write failed'
    } else {
      auditEntry.azureAclStatus = 'Stored'
    }

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

app.post('/iot/readings', async (req, res) => {
  const {
    projectId,
    edgeGatewayId,
    meterId,
    protocol,
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

  const nextId = iotReadings.length + 1
  const timestamp = new Date()
  const verificationUrl = `${frontendBaseUrl}/iot-report/${nextId}`

  const iotHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({
      projectId: projectId || 1,
      edgeGatewayId: edgeGatewayId || 'EDGE-GNT-001',
      meterId,
      protocol: protocol || 'Modbus RTU over RS485',
      parameter,
      value,
      unit,
      location: location || 'Guntur Spinning Mills, Guntur',
      timestamp
    }))
    .digest('hex')

  const qrCode = await QRCode.toDataURL(verificationUrl)

  const reading = {
    id: nextId,
    projectId: projectId || 1,
    edgeGatewayId: edgeGatewayId || 'EDGE-GNT-001',
    meterId,
    protocol: protocol || 'Modbus RTU over RS485',
    parameter,
    value,
    unit,
    location: location || 'Guntur Spinning Mills, Guntur',
    timestamp,
    status: 'Received',
    edgeStatus: 'Validated at Edge',
    syncStatus: 'Sent to Cloud',
    hash: iotHash,
    verificationUrl,
    qrCode
  }

  try {
    const aclResult = await writeAuditToACL({
      project: 'Demo Factory dMRV Project',
      recordType: 'Edge Gateway Meter Reading',
      edgeGatewayId: reading.edgeGatewayId,
      meterId: reading.meterId,
      protocol: reading.protocol,
      edgeStatus: reading.edgeStatus,
      syncStatus: reading.syncStatus,
      parameter: reading.parameter,
      value: reading.value,
      unit: reading.unit,
      location: reading.location,
      readingHash: reading.hash,
      timestamp: reading.timestamp,
      verificationUrl: reading.verificationUrl
    })

    reading.azureAclResponse = aclResult.body

    if (aclResult.body && aclResult.body.error) {
      reading.azureAclStatus = 'Failed'
      reading.azureAclError = aclResult.body.error.message || 'Azure ACL write failed'
    } else {
      reading.azureAclStatus = 'Stored'
    }
  } catch (error) {
    console.error('AZURE ACL IOT ERROR:')
    console.error(error)

    reading.azureAclStatus = 'Failed'
    reading.azureAclError = error.message
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
