import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@project-serum/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";
import { RewardFields, RewardJSON, Reward } from "../types/Reward";

export interface FarmFields {
  authority: PublicKey;
  reward: RewardFields;
  bump: Array<number>;
}

export interface FarmJSON {
  authority: string;
  reward: RewardJSON;
  bump: Array<number>;
}

export class Farm {
  readonly authority: PublicKey;
  readonly reward: Reward;
  readonly bump: Array<number>;

  static readonly discriminator = Buffer.from([
    161, 156, 211, 253, 250, 64, 53, 250,
  ]);

  static readonly layout = borsh.struct([
    borsh.publicKey("authority"),
    Reward.layout("reward"),
    borsh.array(borsh.u8(), 1, "bump"),
  ]);

  constructor(fields: FarmFields) {
    this.authority = fields.authority;
    this.reward = new Reward({ ...fields.reward });
    this.bump = fields.bump;
  }

  static async fetch(c: Connection, address: PublicKey): Promise<Farm | null> {
    const info = await c.getAccountInfo(address);

    if (info === null) {
      return null;
    }
    if (!info.owner.equals(PROGRAM_ID)) {
      throw new Error("account doesn't belong to this program");
    }

    return this.decode(info.data);
  }

  static async fetchMultiple(
    c: Connection,
    addresses: PublicKey[]
  ): Promise<Array<Farm | null>> {
    const infos = await c.getMultipleAccountsInfo(addresses);

    return infos.map((info) => {
      if (info === null) {
        return null;
      }
      if (!info.owner.equals(PROGRAM_ID)) {
        throw new Error("account doesn't belong to this program");
      }

      return this.decode(info.data);
    });
  }

  static decode(data: Buffer): Farm {
    if (!data.slice(0, 8).equals(Farm.discriminator)) {
      throw new Error("invalid account discriminator");
    }

    const dec = Farm.layout.decode(data.slice(8));

    return new Farm({
      authority: dec.authority,
      reward: Reward.fromDecoded(dec.reward),
      bump: dec.bump,
    });
  }

  toJSON(): FarmJSON {
    return {
      authority: this.authority.toString(),
      reward: this.reward.toJSON(),
      bump: this.bump,
    };
  }

  static fromJSON(obj: FarmJSON): Farm {
    return new Farm({
      authority: new PublicKey(obj.authority),
      reward: Reward.fromJSON(obj.reward),
      bump: obj.bump,
    });
  }
}
