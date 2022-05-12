import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface RewardFields {
  mint: PublicKey
  reserved: BN
  available: BN
}

export interface RewardJSON {
  mint: string
  reserved: string
  available: string
}

export class Reward {
  readonly mint: PublicKey
  readonly reserved: BN
  readonly available: BN

  constructor(fields: RewardFields) {
    this.mint = fields.mint
    this.reserved = fields.reserved
    this.available = fields.available
  }

  static layout(property?: string) {
    return borsh.struct(
      [borsh.publicKey("mint"), borsh.u64("reserved"), borsh.u64("available")],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new Reward({
      mint: obj.mint,
      reserved: obj.reserved,
      available: obj.available,
    })
  }

  static toEncodable(fields: RewardFields) {
    return {
      mint: fields.mint,
      reserved: fields.reserved,
      available: fields.available,
    }
  }

  toJSON(): RewardJSON {
    return {
      mint: this.mint.toString(),
      reserved: this.reserved.toString(),
      available: this.available.toString(),
    }
  }

  static fromJSON(obj: RewardJSON): Reward {
    return new Reward({
      mint: new PublicKey(obj.mint),
      reserved: new BN(obj.reserved),
      available: new BN(obj.available),
    })
  }

  toEncodable() {
    return Reward.toEncodable(this)
  }
}
