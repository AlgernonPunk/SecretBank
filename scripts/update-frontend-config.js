const fs = require('fs');
const path = require('path');

// Function to update the frontend contract configuration
function updateFrontendConfig(contractAddress, networkName = 'sepolia') {
  const configPath = path.join(__dirname, '../app/src/config/contracts.ts');

  if (!fs.existsSync(configPath)) {
    console.error('Frontend config file not found:', configPath);
    return;
  }

  try {
    let configContent = fs.readFileSync(configPath, 'utf8');

    // Update the SECRET_BANK_ADDRESS
    const addressRegex = /export const SECRET_BANK_ADDRESS: Address = '[^']*'/;
    const newAddress = `export const SECRET_BANK_ADDRESS: Address = '${contractAddress}'`;

    if (addressRegex.test(configContent)) {
      configContent = configContent.replace(addressRegex, newAddress);
      console.log(`✅ Updated SECRET_BANK_ADDRESS to: ${contractAddress}`);
    } else {
      console.error('❌ Could not find SECRET_BANK_ADDRESS pattern in config file');
      return;
    }

    // Write the updated content back to the file
    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log('✅ Frontend configuration updated successfully!');
    console.log(`📍 Network: ${networkName}`);
    console.log(`📋 Contract: ${contractAddress}`);

  } catch (error) {
    console.error('❌ Error updating frontend config:', error.message);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  const contractAddress = process.argv[2];
  const networkName = process.argv[3] || 'sepolia';

  if (!contractAddress) {
    console.error('❌ Please provide a contract address');
    console.log('Usage: node update-frontend-config.js <CONTRACT_ADDRESS> [NETWORK_NAME]');
    process.exit(1);
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    console.error('❌ Invalid contract address format');
    process.exit(1);
  }

  updateFrontendConfig(contractAddress, networkName);
}

module.exports = { updateFrontendConfig };