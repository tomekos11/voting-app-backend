import { Request, Response } from 'express';
import { ethers, keccak256, toUtf8Bytes } from 'ethers';
import VotingSystem from '../abi/VotingSystem.json';


const infuraApiKey = "";
const provider = new ethers.JsonRpcProvider(
      `https://sepolia.infura.io/v3/${infuraApiKey}`,
      'sepolia',
      { staticNetwork: true }
    );

const contractAddress = "0xf1925365e426b11c63b661119a0de23b278af1e1";
if (!contractAddress) {
  throw new Error('CONTRACT_ADDRESS is not set in environment variables');
}

const contract = new ethers.Contract(contractAddress, VotingSystem.abi, provider);

class VoteController {
  async verifyTransaction(req: Request, res: Response) {
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: 'txHash is required' });
    }

    try {
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt || receipt.status !== 1) {
        return res.status(400).json({ error: 'Transaction not confirmed or failed' });
      }

      const votingCreatedTopic = keccak256(toUtf8Bytes('VotingCreated(uint256,address,string)'));

      const votingEvent = receipt.logs.find(log => log.topics[0] === votingCreatedTopic);
      console.log(receipt)
      if (!votingEvent) {
        return res.status(404).json({ error: 'VotingCreated event not found in transaction' });
      }

      const parsed = contract.interface.parseLog(votingEvent);
      const { votingId, creator, title } = parsed.args;

      return res.json({ success: true, votingId, creator, title });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default new VoteController();
