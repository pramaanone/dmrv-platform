import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking...')
  const [projects, setProjects] = useState([])
  const [ledger, setLedger] = useState([])
  const [iotReadings, setIotReadings] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadMessage, setUploadMessage] = useState('')

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

    fetch('http://localhost:5050/iot/readings')
      .then((res) => res.json())
      .then((data) => setIotReadings(data))
      .catch(() => setIotReadings([]))
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
      meterId: 'MTR-VIZAG-001',
      parameter: 'Electricity Consumption',
      value: Number((1200 + Math.random() * 100).toFixed(2)),
      unit: 'kWh',
      location: 'Vizag Factory'
    }

    const response = await fetch('http://localhost:5050/iot/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleReading)
    })

    await response.json()
    loadData()
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
    doc.text(`Timestamp: ${new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, 20, 90)

    doc.text('SHA256 Hash:', 20, 105)
    const hashLines = doc.splitTextToSize(entry.hash || 'N/A', 170)
    doc.text(hashLines, 20, 115)

    doc.text('Digital Signature:', 20, 145)
    doc.text('Signed by PramaanOne dMRV Verification Engine', 20, 155)
    doc.text('Signature Mode: Demo Digital Signature', 20, 165)

    if (entry.qrCode) {
      doc.text('QR Verification:', 20, 185)
      doc.addImage(entry.qrCode, 'PNG', 20, 190, 45, 45)
    }

    doc.save(`PramaanOne-Certificate-${entry.id}.pdf`)
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
            <span style={badgeStyle('#fef3c7', '#92400e')}>IoT Enabled</span>
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
          PramaanOne is tracking satellite evidence, IoT meter readings, immutable audit records,
          Azure Confidential Ledger status, QR verification and signed PDF certificates in one audit-friendly dashboard.
        </p>

        <div>
          <span style={badgeStyle('#ecfeff', '#155e75')}>Satellite Evidence</span>
          <span style={badgeStyle('#ecfdf5', '#166534')}>Tamper-Proof Hash</span>
          <span style={badgeStyle('#eff6ff', '#1d4ed8')}>QR Verification</span>
          <span style={badgeStyle('#fff7ed', '#9a3412')}>Meter Ingestion</span>
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
          <h3>IoT Meter Readings</h3>
          <h1>{iotReadings.length}</h1>
        </div>

        <div style={cardStyle}>
          <h3>Backend Status</h3>
          <p style={{ color: backendStatus.includes('not') ? '#dc2626' : '#16a34a', fontWeight: '700' }}>
            {backendStatus}
          </p>
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
        <h2>IoT Meter Readings</h2>

        <button onClick={simulateIotReading} style={buttonStyle}>
          Simulate IoT Meter Reading
        </button>

        {iotReadings.length === 0 ? (
          <p>No IoT readings received yet.</p>
        ) : (
          <div style={{ marginTop: '18px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Meter ID</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Parameter</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Value</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Location</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {iotReadings.map((reading) => (
                  <tr key={reading.id}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.meterId}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.parameter}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.value} {reading.unit}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.location}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{reading.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
