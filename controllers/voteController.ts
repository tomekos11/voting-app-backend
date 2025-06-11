import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { ethers, keccak256, toUtf8Bytes } from 'ethers';
import VotingSystem from '../abi/VotingSystem.json';

// Funkcja initEthers zwracająca provider i contract
function initEthers() {
  const infuraApiKey = process.env.INFURA_API_KEY || "";
  if (!infuraApiKey) throw new Error('INFURA_API_KEY is not set');

  const provider = new ethers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${infuraApiKey}`,
    'sepolia',
    { staticNetwork: true }
  );

  const contractAddress = process.env.CONTRACT_ADDRESS || "";
  if (!contractAddress) throw new Error('CONTRACT_ADDRESS is not set');

  const contract = new ethers.Contract(contractAddress, VotingSystem.abi, provider);
  return { provider, contract };
}

export const verifyTransaction = asyncHandler(async (req: Request, res: Response) => {
  const { provider, contract } = initEthers();

  const { txHash } = req.body;
  if (!txHash) {
    res.status(400).json({ error: 'txHash is required' });
    return;
  }

  let receipt;
  try {
    receipt = await provider.getTransactionReceipt(txHash);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid txHash or error fetching transaction receipt' });
  }

  if (!receipt || receipt.status !== 1) {
    res.status(400).json({ error: 'Transaction not confirmed or failed' });
    return;
  }

  const votingCreatedTopic = keccak256(toUtf8Bytes('VotingCreated(uint256,address,string)'));
  const votingEvent = receipt.logs.find(log => log.topics[0] === votingCreatedTopic);

  if (!votingEvent) {
    res.status(404).json({ error: 'VotingCreated event not found in transaction' });
    return;
  }

  const parsed = contract.interface.parseLog(votingEvent);
  const { votingId, creator, title } = parsed.args;

  res.json({ success: true, votingId, creator, title });
});
