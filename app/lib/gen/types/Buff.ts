import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface BuffFields {
  key: PublicKey
  factor: BN
}

export interface BuffJSON {
  key: string
  factor: string
}

export class Buff {
  readonly key: PublicKey
  readonly factor: BN

  constructor(fields: BuffFields) {
    this.key = fields.key
    this.factor = fields.factor
  }

  static layout(property?: string) {
    return borsh.struct([borsh.publicKey("key"), borsh.u64("factor")], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new Buff({
      key: obj.key,
      factor: obj.factor,
    })
  }

  static toEncodable(fields: BuffFields) {
    return {
      key: fields.key,
      factor: fields.factor,
    }
  }

  toJSON(): BuffJSON {
    return {
      key: this.key.toString(),
      factor: this.factor.toString(),
    }
  }

  static fromJSON(obj: BuffJSON): Buff {
    return new Buff({
      key: new PublicKey(obj.key),
      factor: new BN(obj.factor),
    })
  }

  toEncodable() {
    return Buff.toEncodable(this)
  }
}
