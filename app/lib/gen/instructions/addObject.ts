import { TransactionInstruction, PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface AddObjectAccounts {
  farm: PublicKey
  farmer: PublicKey
  mint: PublicKey
  receipt: PublicKey
  object: PublicKey
  objectWhitelist: PublicKey
  objectMetadata: PublicKey
  userObjectAta: PublicKey
  objectVault: PublicKey
  owner: PublicKey
  rent: PublicKey
  systemProgram: PublicKey
  tokenProgram: PublicKey
  associatedTokenProgram: PublicKey
}

export function addObject(accounts: AddObjectAccounts) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: false },
    { pubkey: accounts.farmer, isSigner: false, isWritable: true },
    { pubkey: accounts.mint, isSigner: false, isWritable: false },
    { pubkey: accounts.receipt, isSigner: false, isWritable: true },
    { pubkey: accounts.object, isSigner: false, isWritable: false },
    { pubkey: accounts.objectWhitelist, isSigner: false, isWritable: false },
    { pubkey: accounts.objectMetadata, isSigner: false, isWritable: false },
    { pubkey: accounts.userObjectAta, isSigner: false, isWritable: true },
    { pubkey: accounts.objectVault, isSigner: false, isWritable: true },
    { pubkey: accounts.owner, isSigner: true, isWritable: true },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    {
      pubkey: accounts.associatedTokenProgram,
      isSigner: false,
      isWritable: false,
    },
  ]
  const identifier = Buffer.from([192, 248, 138, 97, 45, 229, 187, 212])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
