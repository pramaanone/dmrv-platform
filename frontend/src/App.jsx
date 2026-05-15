import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking...')
  const [projects, setProjects] = useState([])
  const [ledger, setLedger] = useState([])
  const [iotReadings, setIotReadings] = useState([])
  const [esgRecords, setEsgRecords] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const [esgStatus, setEsgStatus] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('pramaanoneUser')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const demoUsers = [
    {
      email: 'admin@pramaanone.com',
      password: 'admin123',
      role: 'Platform Admin'
    },
    {
      email: 'contact@pramaanone.com',
      password: 'audit123',
      role: 'Auditor'
    },
    {
      email: 'support@pramaanone.com',
      password: 'factory123',
      role: 'Factory Operator'
    },
    {
      email: 'info@pramaanone.com',
      password: 'info123',
      role: 'Compliance Viewer'
    }
  ]

  const loadData = () => {
    fetch('https://dmrv-platform-m0g3.onrender.com/health')
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.message))
      .catch(() => setBackendStatus('Backend not connected'))

    fetch('https://dmrv-platform-m0g3.onrender.com/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch(() => setProjects([]))

    fetch('https://dmrv-platform-m0g3.onrender.com/ledger')
      .then((res) => res.json())
      .then((data) => setLedger(data))
      .catch(() => setLedger([]))

    fetch('https://dmrv-platform-m0g3.onrender.com/iot/readings')
      .then((res) => res.json())
      .then((data) => setIotReadings(data))
      .catch(() => setIotReadings([]))

    fetch('https://dmrv-platform-m0g3.onrender.com/esg/records')
      .then((res) => res.json())
      .then((data) => setEsgRecords(data))
      .catch(() => setEsgRecords([]))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLogin = () => {
    const user = demoUsers.find(
      (item) =>
        item.email.toLowerCase() === loginEmail.toLowerCase().trim() &&
        item.password === loginPassword
    )

    if (!user) {
      setLoginError('Invalid email or password.')
      return
    }

    setCurrentUser(user)
    localStorage.setItem('pramaanoneUser', JSON.stringify(user))
    setLoginError('')
  }

  const handleLogout = () => {
    localStorage.removeItem('pramaanoneUser')
    localStorage.removeItem('dmrvUser')
    setCurrentUser(null)
    setLoginEmail('')
    setLoginPassword('')
  }

  const uploadImage = async () => {
    if (!selectedFile) {
      setUploadMessage('Please select a satellite image first')
      return
    }

    const formData = new FormData()
    formData.append('image', selectedFile)

    const response = await fetch('https://dmrv-platform-m0g3.onrender.com/upload', {
      method: 'POST',
      body: formData
    })

    const data = await response.json()
    setUploadMessage(data.message)
    loadData()
  }

  const simulateIotReading = async () => {
    const sampleReading = {
      projectId: 1,
      edgeGatewayId: 'EDGE-GNT-001',
      meterId: 'MTR-GNT-POWER-001',
      protocol: 'Modbus RTU over RS485',
      parameter: 'Electricity Consumption',
      value: Number((1200 + Math.random() * 100).toFixed(2)),
      unit: 'kWh',
      location: 'Guntur Spinning Mills, Guntur'
    }

    const response = await fetch('https://dmrv-platform-m0g3.onrender.com/iot/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleReading)
    })

    await response.json()
    loadData()
  }

  const getEsgSummary = () => {
    const latestEnergyReading = [...iotReadings]
      .reverse()
      .find(reading => reading.parameter === 'Electricity Consumption')

    const energyKwh = latestEnergyReading ? Number(latestEnergyReading.value) : 1276.24
    const emissionFactor = 0.82
    const co2Kg = Number((energyKwh * emissionFactor).toFixed(2))
    const carbonFormula = 'Energy Usage × Emission Factor'
    const carbonCalculation = `${energyKwh} × ${emissionFactor} = ${co2Kg} kg CO2e`

    return {
      projectId: 1,
      projectName: 'Demo Factory dMRV Project',
      energyKwh,
      emissionFactor,
      carbonFormula,
      carbonCalculation,
      co2Kg,
      waterUsageLiters: 18450,
      wasteGeneratedKg: 320,
      renewableEnergyPercent: 18,
      complianceScore: 76,
      source: 'Edge Gateway and Satellite Evidence'
    }
  }

  const storeEsgProof = async () => {
    setEsgStatus('Storing ESG proof in Azure ACL...')

    const response = await fetch('https://dmrv-platform-m0g3.onrender.com/esg/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getEsgSummary())
    })

    const data = await response.json()

    if (data.record?.azureAclStatus === 'Stored') {
      setEsgStatus(`ESG proof stored in Azure ACL. Hash: ${data.record.hash}`)
      setEsgRecords((prev) => [...prev, data.record])
    } else {
      setEsgStatus(`ESG proof storage failed: ${data.record?.azureAclError || 'Unknown error'}`)
    }

    loadData()
  }

  const downloadEsgPdf = (record = null) => {
    const esg = record || getEsgSummary()
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('PramaanOne ESG Summary Report', 20, 20)

    doc.setFontSize(12)
    doc.text('Report Type: ESG Sustainability Metrics Summary', 20, 35)
    doc.text(`Project: ${esg.projectName}`, 20, 50)
    doc.text(`Energy Usage: ${esg.energyKwh} kWh`, 20, 65)
    doc.text(`Emission Factor: ${esg.emissionFactor || 0.82} kg CO2/kWh`, 20, 80)
    doc.text(`Carbon Formula: ${esg.carbonFormula || 'Energy Usage × Emission Factor'}`, 20, 95)
    doc.text(`Carbon Calculation: ${esg.carbonCalculation || `${esg.energyKwh} × ${esg.emissionFactor || 0.82} = ${esg.co2Kg} kg CO2e`}`, 20, 110)
    doc.text(`Estimated CO2 Emissions: ${esg.co2Kg} kg CO2e`, 20, 125)
    doc.text(`Water Usage: ${esg.waterUsageLiters} L`, 20, 140)
    doc.text(`Waste Generated: ${esg.wasteGeneratedKg} kg`, 20, 110)
    doc.text(`Renewable Energy: ${esg.renewableEnergyPercent}%`, 20, 125)
    doc.text(`ESG Compliance Score: ${esg.complianceScore}/100`, 20, 140)
    doc.text(`Source: ${esg.source}`, 20, 155)

    if (esg.hash) {
      doc.text(`ESG Hash: ${esg.hash}`, 20, 170)
      doc.text(`Azure ACL Status: ${esg.azureAclStatus || 'Not Stored'}`, 20, 185)
      doc.text(`Timestamp: ${new Date(esg.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, 20, 200)

      if (esg.qrCode) {
        doc.text('QR Verification:', 20, 215)
        doc.addImage(esg.qrCode, 'PNG', 20, 220, 40, 40)
      }
    }

    doc.setFontSize(10)
    doc.text('Signed by PramaanOne ESG Verification Engine', 20, 275)
    doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, 20, 285)

    doc.save('PramaanOne-ESG-Summary-Report.pdf')
  }


  const generatePdfCertificate = (entry) => {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('PramaanOne Digital Audit Certificate', 20, 20)

    doc.setFontSize(12)
    doc.text('Certificate Type: dMRV Audit Verification', 20, 35)
    doc.text('Status: Verified & Tamper-Proof Record', 20, 45)
    doc.text(`Record ID: ${entry.id}`, 20, 60)
    doc.text(`File Name: ${entry.fileName}`, 20, 70)
    doc.text(`Azure ACL Status: ${entry.azureAclStatus || 'Not Sent'}`, 20, 80)
    doc.text(`ServiceNow Status: ${entry.serviceNowStatus || 'Not Sent'}`, 20, 90)
    doc.text(`ServiceNow Sys ID: ${entry.serviceNowSysId || 'N/A'}`, 20, 100)
    doc.text(`Timestamp: ${new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, 20, 110)

    doc.text('SHA256 Hash:', 20, 125)
    const hashLines = doc.splitTextToSize(entry.hash || 'N/A', 170)
    doc.text(hashLines, 20, 135)

    doc.text('Digital Signature:', 20, 145)
    doc.text('Signed by PramaanOne dMRV Verification Engine', 20, 155)
    doc.text('Signature Mode: Demo Digital Signature', 20, 165)

    if (entry.qrCode) {
      doc.text('QR Verification:', 20, 185)
      doc.addImage(entry.qrCode, 'PNG', 20, 190, 45, 45)
    }

    doc.save(`PramaanOne-Certificate-${entry.id}.pdf`)
  }


  const generateIotPdfCertificate = (reading) => {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('PramaanOne Edge Gateway Audit Report', 20, 20)

    doc.setFontSize(12)
    doc.text('Report Type: Edge Gateway Meter Reading Verification', 20, 35)
    doc.text(`Reading ID: ${reading.id}`, 20, 50)
    doc.text(`Edge Gateway ID: ${reading.edgeGatewayId || 'EDGE-GNT-001'}`, 20, 60)
    doc.text(`Meter ID: ${reading.meterId}`, 20, 70)
    doc.text(`Protocol: ${reading.protocol || 'Modbus RTU over RS485'}`, 20, 80)
    doc.text(`Parameter: ${reading.parameter}`, 20, 90)
    doc.text(`Value: ${reading.value} ${reading.unit}`, 20, 100)
    doc.text(`Location: ${reading.location}`, 20, 110)
    doc.text(`Edge Status: ${reading.edgeStatus || 'Validated at Edge'}`, 20, 120)
    doc.text(`Sync Status: ${reading.syncStatus || 'Sent to Cloud'}`, 20, 130)
    doc.text(`Azure ACL Status: ${reading.azureAclStatus || 'Not Sent'}`, 20, 140)
    doc.text(`ServiceNow Status: ${reading.serviceNowStatus || 'Not Sent'}`, 20, 150)
    doc.text(`ServiceNow Sys ID: ${reading.serviceNowSysId || 'N/A'}`, 20, 160)
    doc.text(`Timestamp: ${new Date(reading.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, 20, 170)

    doc.text('Edge Gateway Reading SHA256 Hash:', 20, 185)
    const hashLines = doc.splitTextToSize(reading.hash || 'N/A', 170)
    doc.text(hashLines, 20, 195)

    doc.text('Digital Signature:', 20, 175)
    doc.text('Signed by PramaanOne Edge Gateway Verification Engine', 20, 185)
    doc.text('Signature Mode: Demo Digital Signature', 20, 195)

    if (reading.qrCode) {
      doc.text('QR Verification:', 20, 215)
      doc.addImage(reading.qrCode, 'PNG', 20, 220, 45, 45)
    }

    doc.save(`PramaanOne-Edge-Gateway-Report-${reading.id}.pdf`)
  }

  const cardStyle = {
    marginTop: '25px',
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
    border: '1px solid #e2e8f0'
  }

  const buttonStyle = {
    padding: '11px 18px',
    backgroundColor: '#0f172a',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600'
  }


  const badgeStyle = (bg, color) => ({
    display: 'inline-block',
    padding: '7px 12px',
    borderRadius: '999px',
    backgroundColor: bg,
    color,
    fontSize: '13px',
    fontWeight: '700',
    marginRight: '8px',
    marginTop: '8px'
  })

  const path = window.location.pathname
  const verifyMatch = path.match(/\/verify\/(\d+)/)
  const iotReportMatch = path.match(/\/iot-report\/(\d+)/)

  if (iotReportMatch) {
    const reportId = Number(iotReportMatch[1])
    const reading = iotReadings.find(item => item.id === reportId)

    return (
      <div style={{
        fontFamily: 'Arial',
        padding: '40px',
        backgroundColor: '#f4f7fa',
        minHeight: '100vh'
      }}>
        <div style={cardStyle}>
          <h1>PramaanOne Edge Gateway Audit Report</h1>

          {!reading ? (
            <p>Loading or Edge Gateway reading not found...</p>
          ) : (
            <>
              <h2 style={{ color: 'green' }}>✓ Verified Edge Gateway Meter Reading</h2>
              <p><strong>Reading ID:</strong> {reading.id}</p>
              <p><strong>Edge Gateway ID:</strong> {reading.edgeGatewayId || 'EDGE-GNT-001'}</p>
              <p><strong>Meter ID:</strong> {reading.meterId}</p>
              <p><strong>Protocol:</strong> {reading.protocol || 'Modbus RTU over RS485'}</p>
              <p><strong>Parameter:</strong> {reading.parameter}</p>
              <p><strong>Value:</strong> {reading.value} {reading.unit}</p>
              <p><strong>Location:</strong> {reading.location}</p>
              <p><strong>Edge Status:</strong> {reading.edgeStatus || 'Validated at Edge'}</p>
              <p><strong>Sync Status:</strong> {reading.syncStatus || 'Sent to Cloud'}</p>
              <p><strong>Azure ACL:</strong> {reading.azureAclStatus || 'Not Sent'}</p>
              <p><strong>ServiceNow:</strong> {reading.serviceNowStatus || 'Not Sent'}</p>
              {reading.serviceNowSysId && (
                <p><strong>ServiceNow Sys ID:</strong> {reading.serviceNowSysId}</p>
              )}
              <p><strong>Hash:</strong> {reading.hash || 'N/A'}</p>
              <p><strong>Timestamp:</strong> {new Date(reading.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '15px', flexWrap: 'wrap' }}>
                <button onClick={() => generateIotPdfCertificate(reading)} style={buttonStyle}>
                  Download Edge Audit PDF
                </button>

                <button onClick={() => window.print()} style={buttonStyle}>
                  Print Edge Report
                </button>
              </div>

              {reading.qrCode && (
                <div style={{ marginTop: '20px' }}>
                  <p><strong>QR Verification:</strong></p>
                  <img
                    src={reading.qrCode}
                    alt="Edge Gateway QR Verification"
                    style={{
                      width: '150px',
                      height: '150px',
                      border: '1px solid #cbd5e1',
                      padding: '8px',
                      borderRadius: '10px',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }



  if (verifyMatch) {
    const verifyId = Number(verifyMatch[1])
    const entry = ledger.find(item => item.id === verifyId)

    return (
      <div style={{
        fontFamily: 'Arial',
        padding: '40px',
        backgroundColor: '#f4f7fa',
        minHeight: '100vh'
      }}>
        <div style={cardStyle}>
          <h1>PramaanOne Digital Audit Certificate</h1>

          {!entry ? (
            <p>Loading or record not found...</p>
          ) : (
            <>
              <h2 style={{ color: 'green' }}>✓ Verified & Tamper-Proof Record</h2>
              <p><strong>Record ID:</strong> {entry.id}</p>
              <p><strong>Status:</strong> {entry.status}</p>
              <p><strong>Azure ACL:</strong> {entry.azureAclStatus || 'Not Sent'}</p>
              <p><strong>ServiceNow:</strong> {entry.serviceNowStatus || 'Not Sent'}</p>
              {entry.serviceNowSysId && (
                <p><strong>ServiceNow Sys ID:</strong> {entry.serviceNowSysId}</p>
              )}
              <p><strong>File:</strong> {entry.fileName}</p>
              <p><strong>Hash:</strong> {entry.hash}</p>
              <p><strong>Timestamp:</strong> {new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '15px', flexWrap: 'wrap' }}>
                <button onClick={() => generatePdfCertificate(entry)} style={buttonStyle}>
                  Download Signed PDF Certificate
                </button>

                <button onClick={() => window.print()} style={buttonStyle}>
                  Print Certificate
                </button>
              </div>

              {entry.imageUrl && (
                <img
                  src={entry.imageUrl}
                  alt="Verified Satellite"
                  style={{
                    width: '100%',
                    maxWidth: '700px',
                    borderRadius: '12px',
                    marginTop: '20px',
                    border: '1px solid #cbd5e1'
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div style={{
        fontFamily: 'Arial',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a, #164e63)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'white',
          borderRadius: '22px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
        }}>
          <h1 style={{ marginBottom: '8px', color: '#0f172a' }}>
            PramaanOne Secure Login
          </h1>

          <p style={{ color: '#475569', marginBottom: '24px' }}>
            Digital MRV platform with role-based access for audit, factory and compliance users.
          </p>

          <label>Email</label>
          <input
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="Enter email"
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '6px',
              marginBottom: '14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '15px'
            }}
          />

          <label>Password</label>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Enter password"
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '6px',
              marginBottom: '14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '15px'
            }}
          />

          {loginError && (
            <p style={{ color: '#dc2626', fontWeight: '600' }}>{loginError}</p>
          )}

          <button onClick={handleLogin} style={{ ...buttonStyle, width: '100%' }}>
            Login to PramaanOne Platform
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: 'Arial',
      padding: '40px',
      backgroundColor: '#f4f7fa',
      minHeight: '100vh'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div>
          <h1 style={{ color: '#0f172a', fontSize: '42px', marginBottom: '8px' }}>
            PramaanOne dMRV Platform
          </h1>

          <p style={{ color: '#334155', fontSize: '20px', marginTop: 0 }}>
            Digital Monitoring, Reporting & Verification
          </p>

          <div>
            <span style={badgeStyle('#dcfce7', '#166534')}>Audit Ready</span>
            <span style={badgeStyle('#dbeafe', '#1e40af')}>Azure ACL Backed</span>
            <span style={badgeStyle('#fef3c7', '#92400e')}>Edge Gateway Enabled</span>
            <span style={badgeStyle('#ede9fe', '#5b21b6')}>PDF Certificate</span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0 }}><strong>{currentUser.role}</strong></p>
          <p style={{ marginTop: '4px', color: '#64748b' }}>{currentUser.email}</p>
          <button onClick={handleLogout} style={buttonStyle}>Logout</button>
        </div>
      </div>

      <div style={{
        marginTop: '30px',
        padding: '24px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, #0f172a, #164e63)',
        color: 'white',
        boxShadow: '0 10px 35px rgba(15, 23, 42, 0.18)'
      }}>
        <h2 style={{ marginTop: 0 }}>Compliance Overview</h2>
        <p style={{ maxWidth: '900px', color: '#e2e8f0', fontSize: '16px' }}>
          PramaanOne is tracking satellite evidence, Edge gateway meter readings, immutable audit records,
          Azure Confidential Ledger status, QR verification and signed PDF certificates in one audit-friendly dashboard.
        </p>

        <div>
          <span style={badgeStyle('#ecfeff', '#155e75')}>Satellite Evidence</span>
          <span style={badgeStyle('#ecfdf5', '#166534')}>Tamper-Proof Hash</span>
          <span style={badgeStyle('#eff6ff', '#1d4ed8')}>QR Verification</span>
          <span style={badgeStyle('#fff7ed', '#9a3412')}>Edge Meter Ingestion</span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '18px',
        marginTop: '25px'
      }}>
        <div style={cardStyle}>
          <h3>Total Projects</h3>
          <h1>{projects.length}</h1>
        </div>

        <div style={cardStyle}>
          <h3>Audit Records</h3>
          <h1>{ledger.length}</h1>
        </div>

        <div style={cardStyle}>
          <h3>Satellite Images</h3>
          <h1>{ledger.length}</h1>
        </div>

        <div style={cardStyle}>
          <h3>Edge Gateway & Meter Readings</h3>
          <h1>{iotReadings.length}</h1>
        </div>

        <div style={cardStyle}>
          <h3>Backend Status</h3>
          <p style={{ color: backendStatus.includes('not') ? '#dc2626' : '#16a34a', fontWeight: '700' }}>
            {backendStatus}
          </p>
        </div>
      </div>

      {(() => {
        const roleWorkspaces = {
          'Platform Admin': {
            title: 'Platform Admin Workspace',
            focus: 'Monitor platform health, audit records, Azure ACL status and user access.',
            actions: ['Review total projects and audit records', 'Check Azure ACL Stored status', 'Monitor satellite and Edge Gateway submissions', 'Prepare platform demo for stakeholders']
          },
          'Auditor': {
            title: 'Auditor Workspace',
            focus: 'Verify satellite evidence, Edge Gateway readings, hashes, QR certificates and ACL proof.',
            actions: ['Open satellite certificate', 'Download signed PDF certificate', 'Open Edge Gateway audit report', 'Validate Azure Confidential Ledger proof']
          },
          'Factory Operator': {
            title: 'Factory Operator Workspace',
            focus: 'Submit factory evidence and Edge Gateway meter readings for audit verification.',
            actions: ['Upload factory boundary evidence', 'Simulate Edge Gateway reading', 'Confirm Azure ACL Stored status', 'Share generated report with auditor']
          },
          'Compliance Viewer': {
            title: 'Compliance Viewer Workspace',
            focus: 'Review audit-ready reports and download compliance proof documents.',
            actions: ['View audit dashboard', 'Open verification reports', 'Download PDF certificates', 'Review QR-based audit trail']
          }
        }

        const workspace = roleWorkspaces[currentUser.role] || roleWorkspaces['Compliance Viewer']

        return (
          <div style={{
            ...cardStyle,
            marginTop: '25px',
            borderLeft: '6px solid #7c3aed',
            background: '#faf5ff'
          }}>
            <h2 style={{ marginTop: 0 }}>{workspace.title}</h2>
            <p style={{ color: '#475569', fontSize: '16px' }}>{workspace.focus}</p>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '18px'
            }}>
              {workspace.actions.map((action, index) => (
                <div key={index} style={{
                  padding: '11px 15px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #ffffff, #f3e8ff)',
                  border: '1px solid #d8b4fe',
                  color: '#581c87',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: '0 6px 18px rgba(124, 58, 237, 0.12)'
                }}>
                  ✓ {action}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginTop: '25px'
      }}>
        <div style={{
          ...cardStyle,
          borderLeft: '6px solid #0891b2'
        }}>
          <h2 style={{ marginTop: 0 }}>PramaanOne dMRV System Flow</h2>

          <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
            <div style={{ padding: '14px', borderRadius: '12px', background: '#ecfeff' }}>
              <strong>Satellite Evidence Layer</strong>
              <p style={{ marginBottom: 0 }}>
                Factory boundary / site evidence is uploaded, hashed and linked with QR verification.
              </p>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', background: '#f0fdf4' }}>
              <strong>Edge Gateway Meter Layer</strong>
              <p style={{ marginBottom: 0 }}>
                Meter readings are simulated through Edge Gateway using Modbus RTU over RS485.
              </p>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', background: '#eff6ff' }}>
              <strong>Azure Confidential Ledger Proof Layer</strong>
              <p style={{ marginBottom: 0 }}>
                Satellite and Edge records are stored as immutable proof transactions in Azure ACL.
              </p>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', background: '#fff7ed' }}>
              <strong>Audit Report & Certificate Layer</strong>
              <p style={{ marginBottom: 0 }}>
                Auditors can open QR-based certificates and download signed PDF reports.
              </p>
            </div>
          </div>
        </div>

        <div style={{
          ...cardStyle,
          borderLeft: '6px solid #16a34a'
        }}>
          <h2 style={{ marginTop: 0 }}>Demo Guide / How to Test</h2>

          <ol style={{ lineHeight: '1.8', paddingLeft: '22px' }}>
            <li>Upload satellite or factory boundary evidence image.</li>
            <li>Verify hash generation and Azure ACL Stored status.</li>
            <li>Open certificate and download signed PDF.</li>
            <li>Click Simulate Edge Gateway Reading.</li>
            <li>Open Edge Gateway Audit Report.</li>
            <li>Download Edge Gateway PDF and verify QR-based report.</li>
          </ol>

          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: '#f8fafc' }}>
            <strong>Demo Focus:</strong>
            <p style={{ marginBottom: 0 }}>
              This demo proves satellite evidence, Edge Gateway readings, hash generation,
              Azure Confidential Ledger proof and auditor-friendly PDF reporting.
            </p>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2>Satellite Image Upload</h2>

        <input
          type="file"
          accept="image/*,.tif,.tiff"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />

        <br /><br />

        <button onClick={uploadImage} style={buttonStyle}>
          Upload Satellite Image
        </button>

        <p>{uploadMessage}</p>
      </div>

      <div style={cardStyle}>
        <h2>Edge Gateway & Meter Readings</h2>

        <button onClick={simulateIotReading} style={buttonStyle}>
          Simulate Edge Gateway Reading
        </button>

        {iotReadings.length === 0 ? (
          <p>No Edge Gateway readings received yet.</p>
        ) : (
          <div style={{ marginTop: '18px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Edge Gateway ID</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Meter ID</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Protocol</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Parameter</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Value</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Location</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Edge Status</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Sync Status</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Azure ACL</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Report</th>
                </tr>
              </thead>
              <tbody>
                {iotReadings.map((reading) => (
                  <tr key={reading.id}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.edgeGatewayId || 'EDGE-GNT-001'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.meterId}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.protocol || 'Modbus RTU over RS485'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.parameter}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.value} {reading.unit}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.location}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.edgeStatus || 'Validated at Edge'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.syncStatus || 'Sent to Cloud'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.azureAclStatus || 'Not Sent'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.serviceNowStatus || 'Not Sent'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                      <button
                        onClick={() => window.open(`/iot-report/${reading.id}`, '_blank')}
                        style={buttonStyle}
                      >
                        Open Edge Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{
        ...cardStyle,
        borderLeft: '6px solid #059669',
        background: '#f0fdf4'
      }}>
        <h2>ESG Metrics Dashboard</h2>
        <p style={{ color: '#475569', fontSize: '16px' }}>
          Sustainability summary based on satellite evidence and Edge Gateway energy readings.
        </p>

        {(() => {
          const esgSummary = getEsgSummary()
          const energyKwh = esgSummary.energyKwh
          const co2Kg = esgSummary.co2Kg
          const waterUsage = esgSummary.waterUsageLiters
          const wasteGenerated = esgSummary.wasteGeneratedKg
          const renewableEnergy = esgSummary.renewableEnergyPercent
          const complianceScore = esgSummary.complianceScore

          const esgCards = [
            { label: 'Energy Usage', value: `${energyKwh} kWh`, note: 'From Edge Gateway meter data' },
            { label: 'Estimated CO2 Emissions', value: `${co2Kg} kg CO2e`, note: 'Calculated using demo emission factor' },
            { label: 'Water Usage', value: `${waterUsage} L`, note: 'Sample ESG metric' },
            { label: 'Waste Generated', value: `${wasteGenerated} kg`, note: 'Sample ESG metric' },
            { label: 'Renewable Energy', value: `${renewableEnergy}%`, note: 'Sample ESG metric' },
            { label: 'ESG Compliance Score', value: `${complianceScore}/100`, note: 'Demo readiness score' }
          ]

          return (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                marginTop: '18px'
              }}>
                {esgCards.map((item, index) => (
                  <div key={index} style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'white',
                    border: '1px solid #bbf7d0',
                    boxShadow: '0 6px 18px rgba(22, 163, 74, 0.08)'
                  }}>
                    <p style={{ margin: 0, color: '#64748b', fontWeight: 700 }}>{item.label}</p>
                    <h2 style={{ margin: '8px 0', color: '#166534' }}>{item.value}</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{item.note}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={storeEsgProof} style={buttonStyle}>
                  Generate ESG Summary Record
                </button>

              </div>

              {esgStatus && (
                <p style={{ marginTop: '12px', color: esgStatus.includes('failed') ? '#b91c1c' : '#166534', fontWeight: 700 }}>
                  {esgStatus}
                </p>
              )}

              <div style={{
                marginTop: '18px',
                padding: '16px',
                borderRadius: '14px',
                background: 'white',
                border: '1px solid #bbf7d0'
              }}>
                <h3 style={{ marginTop: 0 }}>ESG Summary Records</h3>

                {esgRecords.length === 0 ? (
                  <p>No ESG proof records stored yet.</p>
                ) : (
                  esgRecords.map((record) => (
                    <div key={record.id} style={{
                      padding: '14px',
                      border: '1px solid #dcfce7',
                      borderRadius: '12px',
                      marginTop: '12px',
                      background: '#f8fafc'
                    }}>
                      <p><strong>ID:</strong> {record.id}</p>
                      <p><strong>Project:</strong> {record.projectName}</p>
                      <p><strong>Energy Usage:</strong> {record.energyKwh} kWh</p>
                      <p><strong>Emission Factor:</strong> {record.emissionFactor || 0.82} kg CO2/kWh</p>
                      <p><strong>Carbon Formula:</strong> {record.carbonFormula || 'Energy Usage × Emission Factor'}</p>
                      <p><strong>Carbon Calculation:</strong> {record.carbonCalculation || `${record.energyKwh} × ${record.emissionFactor || 0.82} = ${record.co2Kg} kg CO2e`}</p>
                      <p><strong>CO2 Emissions:</strong> {record.co2Kg} kg CO2e</p>
                      <p><strong>Water Usage:</strong> {record.waterUsageLiters} L</p>
                      <p><strong>Waste Generated:</strong> {record.wasteGeneratedKg} kg</p>
                      <p><strong>Renewable Energy:</strong> {record.renewableEnergyPercent}%</p>
                      <p><strong>Compliance Score:</strong> {record.complianceScore}/100</p>
                      <p><strong>Hash:</strong> {record.hash}</p>
                      <p><strong>Timestamp:</strong> {new Date(record.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                      <p><strong>Azure ACL:</strong> {record.azureAclStatus}</p>
                      <p><strong>ServiceNow:</strong> {record.serviceNowStatus || 'Not Sent'}</p>
                      {record.serviceNowSysId && (
                        <p><strong>ServiceNow Sys ID:</strong> {record.serviceNowSysId}</p>
                      )}

                      {record.qrCode && (
                        <div style={{ marginTop: '12px' }}>
                          <p><strong>QR Verification:</strong></p>
                          <img
                            src={record.qrCode}
                            alt="ESG QR Verification"
                            style={{ width: '120px', height: '120px' }}
                          />
                        </div>
                      )}

                      <button onClick={() => downloadEsgPdf(record)} style={buttonStyle}>
                        Download ESG Summary PDF
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )
        })()}
      </div>

      <div style={cardStyle}>
        <h2>Immutable Audit Ledger</h2>

        {ledger.length === 0 ? (
          <p>No ledger records found yet.</p>
        ) : (
          ledger.map((entry) => (
            <div key={entry.id} style={{
              padding: '18px',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              marginTop: '14px',
              wordBreak: 'break-all',
              backgroundColor: '#f8fafc'
            }}>
              <p><strong>ID:</strong> {entry.id}</p>
              <p><strong>File:</strong> {entry.fileName}</p>

              {entry.imageUrl && (
                <img
                  src={entry.imageUrl}
                  alt="Satellite Upload"
                  style={{
                    width: '100%',
                    maxWidth: '500px',
                    borderRadius: '12px',
                    marginTop: '10px',
                    border: '1px solid #cbd5e1'
                  }}
                />
              )}

              <p><strong>Hash:</strong> {entry.hash}</p>
              <p><strong>Timestamp:</strong> {new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
              <p><strong>Status:</strong> {entry.status}</p>
              <p><strong>Azure ACL:</strong> {entry.azureAclStatus || 'Not Sent'}</p>

              <button
                onClick={() => window.open(`/verify/${entry.id}`, '_blank')}
                style={buttonStyle}
              >
                Open Certificate
              </button>

              {entry.qrCode && (
                <div style={{ marginTop: '15px' }}>
                  <p><strong>QR Verification:</strong></p>
                  <img
                    src={entry.qrCode}
                    alt="QR Verification"
                    style={{
                      width: '140px',
                      height: '140px',
                      border: '1px solid #cbd5e1',
                      padding: '8px',
                      borderRadius: '10px',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={cardStyle}>
        <h2>Registered Projects</h2>

        {projects.map((project) => (
          <div key={project.id} style={{
            padding: '16px',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            marginTop: '12px',
            backgroundColor: '#f8fafc'
          }}>
            <h3>{project.name}</h3>
            <p><strong>Location:</strong> {project.location}</p>
            <p><strong>Status:</strong> {project.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
