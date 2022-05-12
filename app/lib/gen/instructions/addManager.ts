import { TransactionInstruction, PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface AddManagerAccounts {
  farm: PublicKey
  farmManager: PublicKey
  managerAuthority: PublicKey
  authority: PublicKey
  systemProgram: PublicKey
}

export function addManager(accounts: AddManagerAccounts) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: false },
    { pubkey: accounts.farmManager, isSigner: false, isWritable: true },
    { pubkey: accounts.managerAuthority, isSigner: false, isWritable: false },
    { pubkey: accounts.authority, isSigner: true, isWritable: true },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([125, 38, 192, 212, 101, 91, 179, 16])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data })
  return ix
}
