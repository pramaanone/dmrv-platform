const { DefaultAzureCredential } = require("@azure/identity")
const ConfidentialLedger = require("@azure-rest/confidential-ledger").default

const endpoint = "https://dmrv-acl-demo.confidential-ledger.azure.com"

async function testACL() {
  try {
    const credential = new DefaultAzureCredential()

    const client = ConfidentialLedger(endpoint, credential)

    console.log("Connected to Azure Confidential Ledger")
  } catch (error) {
    console.error("ACL Connection Failed")
    console.error(error)
  }
}

testACL()
