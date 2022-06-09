import { TransactionInstruction, PublicKey } from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface DebuffPairAccounts {
  farm: PublicKey;
  farmer: PublicKey;
  buffMint: PublicKey;
  buffUserAta: PublicKey;
  buffVault: PublicKey;
  mintA: PublicKey;
  mintAReceipt: PublicKey;
  mintB: PublicKey;
  mintBReceipt: PublicKey;
  authority: PublicKey;
  tokenProgram: PublicKey;
}

export function debuffPair(accounts: DebuffPairAccounts) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: true },
    { pubkey: accounts.farmer, isSigner: false, isWritable: true },
    { pubkey: accounts.buffMint, isSigner: false, isWritable: false },
    { pubkey: accounts.buffUserAta, isSigner: false, isWritable: true },
    { pubkey: accounts.buffVault, isSigner: false, isWritable: true },
    { pubkey: accounts.mintA, isSigner: false, isWritable: false },
    { pubkey: accounts.mintAReceipt, isSigner: false, isWritable: true },
    { pubkey: accounts.mintB, isSigner: false, isWritable: false },
    { pubkey: accounts.mintBReceipt, isSigner: false, isWritable: true },
    { pubkey: accounts.authority, isSigner: true, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
  ];
  const identifier = Buffer.from([251, 106, 212, 199, 136, 102, 33, 176]);
  const data = identifier;
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data });
  return ix;
}
