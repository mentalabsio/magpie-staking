import { TransactionInstruction, PublicKey } from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";
import { LockConfigFields } from "../types/LockConfig";

export interface CreateLocksArgs {
  lockConfigs: Array<LockConfigFields>;
}

export interface CreateLocksAccounts {
  farm: PublicKey;
  farmManager: PublicKey;
  authority: PublicKey;
  systemProgram: PublicKey;
}

export const layout = borsh.struct([
  borsh.vec(types.LockConfig.layout(), "lockConfigs"),
]);

export function createLocks(
  args: CreateLocksArgs,
  accounts: CreateLocksAccounts
) {
  const keys = [
    { pubkey: accounts.farm, isSigner: false, isWritable: false },
    { pubkey: accounts.farmManager, isSigner: false, isWritable: false },
    { pubkey: accounts.authority, isSigner: true, isWritable: false },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
  ];
  const identifier = Buffer.from([116, 223, 225, 220, 25, 137, 7, 164]);
  const buffer = Buffer.alloc(1000);
  const len = layout.encode(
    {
      lockConfigs: args.lockConfigs.map((item) =>
        types.LockConfig.toEncodable(item)
      ),
    },
    buffer
  );
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len);
  const ix = new TransactionInstruction({ keys, programId: PROGRAM_ID, data });
  return ix;
}
