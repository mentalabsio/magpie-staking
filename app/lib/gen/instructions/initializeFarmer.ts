import { TransactionInstruction, PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface InitializeFarmerAccounts {
  farm: PublicKey
  farmer: PublicKey
  owner: PublicKey
  systemProgram: PublicKey
}

export function initializeFarmer(accounts: InitializeFarmerAccounts) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: false },
    { pubkey: accounts.farmer, isSigner: false, isWritable: true },
    { pubkey: accounts.owner, isSigner: true, isWritable: true },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([33, 254, 50, 5, 156, 85, 154, 149])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
