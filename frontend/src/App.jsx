import { useEffect, useState } from 'react'

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking...')
  const [projects, setProjects] = useState([])
  const [ledger, setLedger] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadMessage, setUploadMessage] = useState('')

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
  }

  useEffect(() => {
    loadData()
  }, [])

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
        <div style={{
          padding: '25px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h1>dMRV Digital Audit Certificate</h1>

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

              <button
                onClick={() => window.print()}
                style={{
                  marginTop: '15px',
                  padding: '10px 16px',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Download / Print Certificate
              </button>

              {entry.imageUrl && (
                <img
                  src={entry.imageUrl}
                  alt="Verified Satellite"
                  style={{
                    width: '100%',
                    maxWidth: '700px',
                    borderRadius: '8px',
                    marginTop: '15px',
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

  return (
    <div style={{
      fontFamily: 'Arial',
      padding: '40px',
      backgroundColor: '#f4f7fa',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#0f172a', fontSize: '42px' }}>
        dMRV Platform
      </h1>

      <p style={{ color: '#334155', fontSize: '20px' }}>
        Digital Monitoring, Reporting & Verification
      </p>

      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2>Project Dashboard</h2>
        <p>Total Projects: {projects.length}</p>
        <p>Audit Records: {ledger.length}</p>
        <p>Satellite Images: {ledger.length}</p>
        <p><strong>Backend Status:</strong> {backendStatus}</p>
      </div>

      <div style={{
        marginTop: '25px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2>Satellite Image Upload</h2>

        <input
          type="file"
          accept="image/*,.tif,.tiff"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />

        <br /><br />

        <button onClick={uploadImage}>
          Upload Satellite Image
        </button>

        <p>{uploadMessage}</p>
      </div>

      <div style={{
        marginTop: '25px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2>Immutable Audit Ledger</h2>

        {ledger.map((entry) => (
          <div key={entry.id} style={{
            padding: '15px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            marginTop: '10px',
            wordBreak: 'break-all'
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
                  borderRadius: '8px',
                  marginTop: '10px',
                  border: '1px solid #cbd5e1'
                }}
              />
            )}
            <p><strong>Hash:</strong> {entry.hash}</p>
            <p><strong>Timestamp:</strong> {new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            <p><strong>Status:</strong> {entry.status}</p>
            <p><strong>Azure ACL:</strong> {entry.azureAclStatus || 'Not Sent'}</p>

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
                    borderRadius: '8px'
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '25px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2>Registered Projects</h2>

        {projects.map((project) => (
          <div key={project.id} style={{
            padding: '15px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            marginTop: '10px'
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
