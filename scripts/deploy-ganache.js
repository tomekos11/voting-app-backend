const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const artifact = require('../artifacts/contracts/smart_contract.sol/VotingSystem.json');

function upsertEnvValue(envPath, key, value) {
  const newLine = `${key}=${value}`;

  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRegex = new RegExp(`^${escapedKey}=.*$`, 'm');

  if (keyRegex.test(content)) {
    content = content.replace(keyRegex, newLine);
  } else {
    const suffix = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    content = `${content}${suffix}${newLine}\n`;
  }

  fs.writeFileSync(envPath, content, 'utf8');
}

function updateContractAddressInEnvs(contractAddress) {
  const backendEnvPath = path.resolve(__dirname, '../.env');
  const frontendEnvPath = path.resolve(__dirname, '../../voting-app-frontend/.env');

  upsertEnvValue(backendEnvPath, 'CONTRACT_ADDRESS', contractAddress);

  if (fs.existsSync(frontendEnvPath)) {
    upsertEnvValue(frontendEnvPath, 'CONTRACT_ADDRESS', contractAddress);
    upsertEnvValue(frontendEnvPath, 'NUXT_PUBLIC_CONTRACT_ADDRESS', contractAddress);
  }

  return { backendEnvPath, frontendEnvPath, frontendUpdated: fs.existsSync(frontendEnvPath) };
}

async function main() {
  const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = await provider.getSigner(0);
  const deployerAddress = await signer.getAddress();

  console.log(`Deploying VotingSystem from: ${deployerAddress}`);
  console.log(`RPC URL: ${rpcUrl}`);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const envUpdateResult = updateContractAddressInEnvs(contractAddress);

  console.log(`VotingSystem deployed at: ${contractAddress}`);
  console.log(`Updated CONTRACT_ADDRESS in: ${envUpdateResult.backendEnvPath}`);
  if (envUpdateResult.frontendUpdated) {
    console.log(`Updated CONTRACT_ADDRESS and NUXT_PUBLIC_CONTRACT_ADDRESS in: ${envUpdateResult.frontendEnvPath}`);
  } else {
    console.log(`Skipped frontend .env update (file not found): ${envUpdateResult.frontendEnvPath}`);
  }
}

main().catch((error) => {
  console.error('Deployment failed:', error);
  process.exit(1);
});
