import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface AssociatedObjectFields {
  key: PublicKey
  rate: BN
}

export interface AssociatedObjectJSON {
  key: string
  rate: string
}

export class AssociatedObject {
  readonly key: PublicKey
  readonly rate: BN

  constructor(fields: AssociatedObjectFields) {
    this.key = fields.key
    this.rate = fields.rate
  }

  static layout(property?: string) {
    return borsh.struct([borsh.publicKey("key"), borsh.u64("rate")], property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new AssociatedObject({
      key: obj.key,
      rate: obj.rate,
    })
  }

  static toEncodable(fields: AssociatedObjectFields) {
    return {
      key: fields.key,
      rate: fields.rate,
    }
  }

  toJSON(): AssociatedObjectJSON {
    return {
      key: this.key.toString(),
      rate: this.rate.toString(),
    }
  }

  static fromJSON(obj: AssociatedObjectJSON): AssociatedObject {
    return new AssociatedObject({
      key: new PublicKey(obj.key),
      rate: new BN(obj.rate),
    })
  }

  toEncodable() {
    return AssociatedObject.toEncodable(this)
  }
}
