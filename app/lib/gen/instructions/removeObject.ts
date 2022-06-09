import { TransactionInstruction, PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface RemoveObjectAccounts {
  farm: PublicKey
  farmer: PublicKey
  mint: PublicKey
  receipt: PublicKey
  object: PublicKey
  userObjectAta: PublicKey
  objectVault: PublicKey
  owner: PublicKey
  tokenProgram: PublicKey
}

export function removeObject(accounts: RemoveObjectAccounts) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: false },
    { pubkey: accounts.farmer, isSigner: false, isWritable: true },
    { pubkey: accounts.mint, isSigner: false, isWritable: false },
    { pubkey: accounts.receipt, isSigner: false, isWritable: true },
    { pubkey: accounts.object, isSigner: false, isWritable: false },
    { pubkey: accounts.userObjectAta, isSigner: false, isWritable: true },
    { pubkey: accounts.objectVault, isSigner: false, isWritable: true },
    { pubkey: accounts.owner, isSigner: true, isWritable: false },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([2, 190, 222, 128, 105, 24, 9, 23])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
