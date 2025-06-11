import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { ethers, keccak256, toUtf8Bytes } from 'ethers';
import VotingSystem from '../artifacts/contracts/smart_contract.sol/VotingSystem.json'
import { prisma } from '../prisma';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
});

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
    res.status(400).json({ error: 'Invalid txHash or error fetching transaction receipt' });
    return;
  }

  if (!receipt || receipt.status !== 1) {
    res.status(400).json({ error: 'Transaction not confirmed or failed' });
    return;
  }

  if (!receipt.status) {
    res.status(404).json({ error: 'VotingCreated event not found in transaction' });
    return;
  }

  res.json({ success: true });
  return;
});


const saveBase64Image = (base64String: string): string | null => {
  try {
    if (!base64String.startsWith('data:image/')) return null;

    const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join('uploads', fileName);

    fs.writeFileSync(filePath, buffer);

    return filePath;
  } catch (err) {
    console.error('Error saving image:', err);
    return null;
  }
};


export const createVoting = async (req: Request, res: Response) => {
  try {
    const { title, startTime, endTime, votingType, propositions, metaCID } = req.body;

    const proposalsData = propositions.map((p: any) => {
      const imagePath = p.img ? saveBase64Image(p.img) : null;

      return {
        name: p.name,
        image: imagePath || '',
        metadataCID: p.hash,
        details: p.details,
      };
    });

    const newVoting = await prisma.voting.create({
      data: {
        title,
        startTime: new Date(startTime * 1000),
        endTime: new Date(endTime * 1000),
        votingType,
        metadataCID: metaCID,
        proposals: {
          create: proposalsData,
        },
      },
      include: {
        proposals: true,
      },
    });

    res.status(201).json({ voting: newVoting });
  } catch (err) {
    console.error('Error creating voting:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getVotingByCID = async (req: Request, res: Response) => {
  try {
    const cid = req.query.cid as string;

    if (!cid) {
      res.status(400).json({ error: 'metadataCID (cid) is required as query parameter' });
      return;
    }

    const voting = await prisma.voting.findFirst({
      where: { metadataCID: cid },
      include: {
        proposals: true,
      },
    });

    if (!voting) {
      res.status(404).json({ error: 'Voting not found' });
      return;
    }

    res.status(200).json({ voting });
  } catch (err) {
    console.error('Error fetching voting by CID:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


