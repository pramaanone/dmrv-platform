const { ClientSecretCredential } = require("@azure/identity")
const ConfidentialLedgerModule = require("@azure-rest/confidential-ledger")

const ConfidentialLedger = ConfidentialLedgerModule.default
const { getLedgerIdentity } = ConfidentialLedgerModule

const endpoint = "https://dmrv-acl-demo.confidential-ledger.azure.com"
const ledgerName = "dmrv-acl-demo"
const identityServiceUrl = "https://identity.confidential-ledger.core.azure.com"

async function writeAuditToACL(auditData) {

  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  )

  const { ledgerIdentityCertificate } = await getLedgerIdentity(
    ledgerName,
    identityServiceUrl
  )

  const client = ConfidentialLedger(
    endpoint,
    ledgerIdentityCertificate,
    credential
  )

  const result = await client.path("/app/transactions").post({
    contentType: "application/json",
    body: {
      contents: JSON.stringify(auditData)
    }
  })

  return result
}

module.exports = { writeAuditToACL }
