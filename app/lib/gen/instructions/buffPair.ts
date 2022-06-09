import { TransactionInstruction, PublicKey } from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface BuffPairAccounts {
  farm: PublicKey;
  farmer: PublicKey;
  buffMint: PublicKey;
  buffWhitelist: PublicKey;
  buffUserAta: PublicKey;
  buffVault: PublicKey;
  mintA: PublicKey;
  mintAReceipt: PublicKey;
  mintB: PublicKey;
  mintBReceipt: PublicKey;
  authority: PublicKey;
  rent: PublicKey;
  systemProgram: PublicKey;
  tokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
}

export function buffPair(accounts: BuffPairAccounts) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: true },
    { pubkey: accounts.farmer, isSigner: false, isWritable: true },
    { pubkey: accounts.buffMint, isSigner: false, isWritable: false },
    { pubkey: accounts.buffWhitelist, isSigner: false, isWritable: false },
    { pubkey: accounts.buffUserAta, isSigner: false, isWritable: true },
    { pubkey: accounts.buffVault, isSigner: false, isWritable: true },
    { pubkey: accounts.mintA, isSigner: false, isWritable: false },
    { pubkey: accounts.mintAReceipt, isSigner: false, isWritable: true },
    { pubkey: accounts.mintB, isSigner: false, isWritable: false },
    { pubkey: accounts.mintBReceipt, isSigner: false, isWritable: true },
    { pubkey: accounts.authority, isSigner: true, isWritable: true },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    {
      pubkey: accounts.associatedTokenProgram,
      isSigner: false,
      isWritable: false,
    },
  ];
  const identifier = Buffer.from([24, 89, 4, 84, 20, 40, 196, 30]);
  const data = identifier;
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data });
  return ix;
}
