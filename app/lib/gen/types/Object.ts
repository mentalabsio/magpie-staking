import { PublicKey } from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh";

export interface ObjectFields {
  key: PublicKey;
  rate: BN;
}

export interface ObjectJSON {
  key: string;
  rate: string;
}

export class Object {
  readonly key: PublicKey;
  readonly rate: BN;

  constructor(fields: ObjectFields) {
    this.key = fields.key;
    this.rate = fields.rate;
  }

  static layout(property?: string) {
    return borsh.struct([borsh.publicKey("key"), borsh.u64("rate")], property);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new Object({
      key: obj.key,
      rate: obj.rate,
    });
  }

  static toEncodable(fields: ObjectFields) {
    return {
      key: fields.key,
      rate: fields.rate,
    };
  }

  toJSON(): ObjectJSON {
    return {
      key: this.key.toString(),
      rate: this.rate.toString(),
    };
  }

  static fromJSON(obj: ObjectJSON): Object {
    return new Object({
      key: new PublicKey(obj.key),
      rate: new BN(obj.rate),
    });
  }

  toEncodable() {
    return Object.toEncodable(this);
  }
}
