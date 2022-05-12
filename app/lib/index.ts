import { programs } from "@metaplex/js";
import { BN, utils, web3 } from "@project-serum/anchor";
import {
  AccountMeta,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import { Farm, StakeReceipt } from "./gen/accounts";
import {
  addManager,
  addToWhitelist,
  claimRewards,
  createFarm,
  createLocks,
  fundReward,
  initializeFarmer,
  stake,
  StakeArgs,
  unstake,
} from "./gen/instructions";
import { LockConfigFields } from "./gen/types";
import {
  findWhitelistProofAddress,
  findFarmAddress,
  findFarmerAddress,
  findFarmManagerAddress,
  findLockAddress,
  findStakeReceiptAddress,
} from "./pda";
import { withParsedError } from "./utils";

interface ICreateFarm {
  authority: Signer;
  rewardMint: PublicKey;
}

interface IAddToWhitelist {
  farm: PublicKey;
  creator: PublicKey;
  authority: Signer;
  rewardRate: {
    tokenAmount: BN;
    intervalInSeconds: BN;
  };
}

interface ICreateLocks {
  lockConfigs: LockConfigFields[];
  farm: PublicKey;
  authority: Signer;
}

interface IAddManager {
  farm: PublicKey;
  newManagerAuthority: PublicKey;
  farmAuthority: Signer;
}

interface IInitializeFarmer {
  farm: PublicKey;
  owner: Signer;
}

interface IStake {
  farm: PublicKey;
  mint: PublicKey;
  lock: PublicKey;
  args: StakeArgs;
  owner: Signer;
}

interface IUnstake {
  farm: PublicKey;
  mint: PublicKey;
  owner: Signer;
}

interface IClaimRewards {
  farm: PublicKey;
  authority: Signer;
}

export const StakingProgram = (connection: Connection) => {
  const systemProgram = web3.SystemProgram.programId;
  const tokenProgram = utils.token.TOKEN_PROGRAM_ID;
  const associatedTokenProgram = utils.token.ASSOCIATED_PROGRAM_ID;
  const rent = SYSVAR_RENT_PUBKEY;

  const _createFarm = async ({ rewardMint, authority }: ICreateFarm) => {
    const farm = findFarmAddress({
      authority: authority.publicKey,
      rewardMint,
    });

    const farmManager = findFarmManagerAddress({
      farm,
      authority: authority.publicKey,
    });

    const farmVault = await utils.token.associatedAddress({
      mint: rewardMint,
      owner: farm,
    });

    const createFarmIx = createFarm({
      farm,
      rewardMint,
      farmVault,
      authority: authority.publicKey,

      rent,
      systemProgram,
      tokenProgram,
      associatedTokenProgram,
    });

    const addManagerIx = addManager({
      farm,
      farmManager,
      authority: authority.publicKey,
      managerAuthority: authority.publicKey,
      systemProgram,
    });

    const tx = new Transaction().add(createFarmIx, addManagerIx);

    const txSig = await sendAndConfirmTransaction(connection, tx, [authority]);

    return { tx: txSig, farm };
  };

  const _addManager = async ({
    farm,
    farmAuthority,
    newManagerAuthority,
  }: IAddManager) => {
    const farmManager = findFarmManagerAddress({
      farm,
      authority: newManagerAuthority,
    });

    const ix = addManager({
      farm,
      farmManager,
      managerAuthority: newManagerAuthority,
      authority: farmAuthority.publicKey,
      systemProgram,
    });

    const tx = new Transaction().add(ix);

    const txSig = await sendAndConfirmTransaction(connection, tx, [
      farmAuthority,
    ]);

    return { tx: txSig, farmManager };
  };

  const _createLocks = async ({
    farm,
    lockConfigs,
    authority,
  }: ICreateLocks) => {
    const farmManager = findFarmManagerAddress({
      farm,
      authority: authority.publicKey,
    });

    const ix = createLocks(
      { lockConfigs },
      {
        farm,
        farmManager,
        authority: authority.publicKey,
        systemProgram,
      }
    );

    const lockAccountMetas: AccountMeta[] = lockConfigs.map((config) => {
      const lockAddress = findLockAddress({ config, farm });
      return { pubkey: lockAddress, isSigner: false, isWritable: true };
    });

    ix.keys.push(...lockAccountMetas);

    const tx = new Transaction();

    tx.add(ix);

    const txSig = await sendAndConfirmTransaction(connection, tx, [authority]);

    return { tx: txSig };
  };

  interface IFundReward {
    amount: BN;
    farm: PublicKey;
    authority: Signer;
  }

  const _fundReward = async ({ amount, farm, authority }: IFundReward) => {
    const farmAccount = await Farm.fetch(connection, farm);

    const farmManager = findFarmManagerAddress({
      farm,
      authority: authority.publicKey,
    });

    const farmVault = await utils.token.associatedAddress({
      mint: farmAccount.reward.mint,
      owner: farm,
    });

    const managerAta = await utils.token.associatedAddress({
      mint: farmAccount.reward.mint,
      owner: authority.publicKey,
    });

    const ix = fundReward(
      { amount },
      {
        farm,
        farmManager,
        mint: farmAccount.reward.mint,
        farmVault,
        managerAta,
        authority: authority.publicKey,
        tokenProgram,
      }
    );

    const tx = new Transaction().add(ix);

    const txSig = await sendAndConfirmTransaction(connection, tx, [authority]);

    return { tx: txSig };
  };

  const _addToWhitelist = async ({
    farm,
    creator,
    authority,
    rewardRate,
  }: IAddToWhitelist) => {
    const farmManager = findFarmManagerAddress({
      farm,
      authority: authority.publicKey,
    });
    const whitelistProof = findWhitelistProofAddress({ creator, farm });

    const { tokenAmount, intervalInSeconds } = rewardRate;

    const ix = addToWhitelist(
      { rewardRate: tokenAmount.div(intervalInSeconds) },
      {
        farm,
        creator,
        farmManager,
        authority: authority.publicKey,
        whitelistProof,
        systemProgram,
      }
    );

    const tx = new Transaction().add(ix);

    const txSig = await sendAndConfirmTransaction(connection, tx, [authority]);

    return { tx: txSig, whitelistProof: whitelistProof };
  };

  const _initializeFarmer = async ({ farm, owner }: IInitializeFarmer) => {
    const farmer = findFarmerAddress({ farm, owner: owner.publicKey });

    const ix = initializeFarmer({
      farm,
      farmer,
      owner: owner.publicKey,
      systemProgram,
    });

    const tx = new Transaction().add(ix);

    const txSig = await sendAndConfirmTransaction(connection, tx, [owner]);

    return { tx: txSig, farmer };
  };

  const _stake = async ({ owner, farm, lock, mint, args }: IStake) => {
    const farmer = findFarmerAddress({ farm, owner: owner.publicKey });

    const metadata = await programs.metadata.Metadata.findByMint(
      connection,
      mint
    );

    const metadataCreator = new PublicKey(
      metadata.data.data.creators.find((c) => c.verified).address
    );

    const whitelistProof = findWhitelistProofAddress({
      farm,
      creator: metadataCreator,
    });

    const farmerVault = await utils.token.associatedAddress({
      mint,
      owner: farmer,
    });

    const gemOwnerAta = await utils.token.associatedAddress({
      mint,
      owner: owner.publicKey,
    });

    const stakeReceipt = findStakeReceiptAddress({ farmer, mint });

    const ix = stake(args, {
      farm,
      farmer,

      gemMint: mint,
      gemMetadata: metadata.pubkey,
      whitelistProof,
      farmerVault,
      gemOwnerAta,

      lock,
      stakeReceipt,

      owner: owner.publicKey,

      rent,
      systemProgram,
      tokenProgram,
      associatedTokenProgram,
    });

    const tx = new Transaction().add(ix);

    const txSig = await sendAndConfirmTransaction(connection, tx, [owner]);

    return { tx: txSig, stakeReceipt };
  };

  const _claimRewards = async ({ farm, authority }: IClaimRewards) => {
    const farmer = findFarmerAddress({ farm, owner: authority.publicKey });

    const farmData = await Farm.fetch(connection, farm);

    const farmRewardVault = await utils.token.associatedAddress({
      mint: farmData.reward.mint,
      owner: farm,
    });

    const farmerRewardVault = await utils.token.associatedAddress({
      mint: farmData.reward.mint,
      owner: authority.publicKey,
    });

    const ix = claimRewards({
      farm,
      farmer,
      rewardMint: farmData.reward.mint,
      farmRewardVault,
      farmerRewardVault,
      authority: authority.publicKey,
      rent,
      systemProgram,
      tokenProgram,
      associatedTokenProgram,
    });

    const tx = new Transaction().add(ix);

    const txSig = await sendAndConfirmTransaction(connection, tx, [authority]);

    return { tx: txSig };
  };

  const _unstake = async ({ farm, mint, owner }: IUnstake) => {
    const farmer = findFarmerAddress({ farm, owner: owner.publicKey });

    const metadata = await programs.metadata.Metadata.findByMint(
      connection,
      mint
    );

    const metadataCreator = new PublicKey(
      metadata.data.data.creators.find((c) => c.verified).address
    );

    const whitelistProof = findWhitelistProofAddress({
      farm,
      creator: metadataCreator,
    });

    const farmerVault = await utils.token.associatedAddress({
      mint,
      owner: farmer,
    });

    const gemOwnerAta = await utils.token.associatedAddress({
      mint,
      owner: owner.publicKey,
    });

    const stakeReceipt = findStakeReceiptAddress({ farmer, mint });

    const lock = (await StakeReceipt.fetch(connection, stakeReceipt)).lock;

    const ix = unstake(
      { amount: new BN(1) },
      {
        farm,
        farmer,
        gemMint: mint,
        gemMetadata: metadata.pubkey,
        whitelistProof,
        stakeReceipt,
        lock,
        farmerVault,
        gemOwnerAta,
        owner: owner.publicKey,
        tokenProgram,
      }
    );

    const tx = new Transaction().add(ix);

    const txSig = await sendAndConfirmTransaction(connection, tx, [owner]);

    return { tx: txSig, stakeReceipt };
  };

  return {
    createFarm: withParsedError(_createFarm),
    createLocks: withParsedError(_createLocks),
    fundReward: withParsedError(_fundReward),
    addManager: withParsedError(_addManager),
    addToWhitelist: withParsedError(_addToWhitelist),
    initializeFarmer: withParsedError(_initializeFarmer),
    stake: withParsedError(_stake),
    unstake: withParsedError(_unstake),
    claimRewards: withParsedError(_claimRewards),
  };
};
