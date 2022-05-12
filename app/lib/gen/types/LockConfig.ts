import { PublicKey } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"

export interface LockConfigFields {
  duration: BN
  bonusFactor: number
  cooldown: BN
}

export interface LockConfigJSON {
  duration: string
  bonusFactor: number
  cooldown: string
}

export class LockConfig {
  readonly duration: BN
  readonly bonusFactor: number
  readonly cooldown: BN

  constructor(fields: LockConfigFields) {
    this.duration = fields.duration
    this.bonusFactor = fields.bonusFactor
    this.cooldown = fields.cooldown
  }

  static layout(property?: string) {
    return borsh.struct(
      [borsh.u64("duration"), borsh.u8("bonusFactor"), borsh.u64("cooldown")],
      property
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new LockConfig({
      duration: obj.duration,
      bonusFactor: obj.bonusFactor,
      cooldown: obj.cooldown,
    })
  }

  static toEncodable(fields: LockConfigFields) {
    return {
      duration: fields.duration,
      bonusFactor: fields.bonusFactor,
      cooldown: fields.cooldown,
    }
  }

  toJSON(): LockConfigJSON {
    return {
      duration: this.duration.toString(),
      bonusFactor: this.bonusFactor,
      cooldown: this.cooldown.toString(),
    }
  }

  static fromJSON(obj: LockConfigJSON): LockConfig {
    return new LockConfig({
      duration: new BN(obj.duration),
      bonusFactor: obj.bonusFactor,
      cooldown: new BN(obj.cooldown),
    })
  }

  toEncodable() {
    return LockConfig.toEncodable(this)
  }
}
