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
  buffPair,
  claimRewards,
  createFarm,
  createLocks,
  fundReward,
  initializeFarmer,
  removeFromWhitelist,
  stake,
  StakeArgs,
  unstake,
} from "./gen/instructions";
import { debuffPair } from "./gen/instructions/debuffPair";
import { LockConfigFields, WhitelistTypeKind } from "./gen/types";
import {
  findWhitelistProofAddress,
  findFarmAddress,
  findFarmerAddress,
  findFarmManagerAddress,
  findLockAddress,
  findStakeReceiptAddress,
} from "./pda";
import { tryFindCreator, withParsedError } from "./utils";

interface ICreateFarm {
  authority: Signer;
  rewardMint: PublicKey;
}

interface IAddToWhitelist {
  farm: PublicKey;
  creatorOrMint: PublicKey;
  authority: PublicKey;
  whitelistType: WhitelistTypeKind;
  rewardRate: {
    tokenAmount: BN;
    intervalInSeconds: BN;
  };
}

interface IRemoveFromWhitelist {
  farm: PublicKey;
  addressToRemove: PublicKey;
  authority: PublicKey;
}

interface ICreateLocks {
  lockConfigs: LockConfigFields[];
  farm: PublicKey;
  authority: Signer;
}

interface IFundReward {
  amount: BN;
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
  owner: PublicKey;
}

interface IUnstake {
  farm: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
}

interface IBuffPair {
  farm: PublicKey;
  buffMint: PublicKey;
  pair: [PublicKey, PublicKey];
  authority: PublicKey;
}

interface IDebuffPair {
  farm: PublicKey;
  buffMint: PublicKey;
  pair: [PublicKey, PublicKey];
  authority: PublicKey;
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

  const createAddToWhitelistInstruction = async ({
    farm,
    creatorOrMint,
    authority,
    rewardRate,
    whitelistType,
  }: IAddToWhitelist) => {
    const farmManager = findFarmManagerAddress({
      farm,
      authority,
    });
    const whitelistProof = findWhitelistProofAddress({ creatorOrMint, farm });

    const { tokenAmount, intervalInSeconds } = rewardRate;

    const ix = addToWhitelist(
      { rewardRate: tokenAmount.div(intervalInSeconds), whitelistType },
      {
        farm,
        farmManager,
        creatorOrMint,
        whitelistProof,
        authority,
        systemProgram,
      }
    );

    return { ix };
  };

  const createRemoveFromWhitelistInstruction = ({
    farm,
    addressToRemove,
    authority,
  }: IRemoveFromWhitelist) => {
    const whitelistProof = findWhitelistProofAddress({
      farm,
      creatorOrMint: addressToRemove,
    });
    const farmManager = findFarmManagerAddress({ farm, authority });

    const ix = removeFromWhitelist({
      farm,
      authority,
      whitelistProof,
      systemProgram,
      farmManager,
    });

    return { ix };
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

  const createStakeInstruction = async ({
    owner,
    farm,
    lock,
    mint,
    args,
  }: IStake) => {
    const farmer = findFarmerAddress({ farm, owner });

    // Initially we assume we're staking a fungible token.
    let creatorOrMint = mint;
    let metadata: AccountMeta | undefined;

    const foundMetadata = await tryFindCreator(connection, mint);

    if (foundMetadata) {
      const { metadataAddress, creatorAddress } = foundMetadata;
      metadata = {
        pubkey: metadataAddress,
        isSigner: false,
        isWritable: false,
      };
      creatorOrMint = creatorAddress;
    }

    const whitelistProof = findWhitelistProofAddress({
      farm,
      creatorOrMint,
    });

    const farmerVault = await utils.token.associatedAddress({
      mint,
      owner: farmer,
    });

    const gemOwnerAta = await utils.token.associatedAddress({
      mint,
      owner,
    });

    const stakeReceipt = findStakeReceiptAddress({ farmer, mint });

    const ix = stake(args, {
      farm,
      farmer,

      gemMint: mint,
      whitelistProof,
      farmerVault,
      gemOwnerAta,

      lock,
      stakeReceipt,

      owner,

      rent,
      systemProgram,
      tokenProgram,
      associatedTokenProgram,
    });

    foundMetadata && ix.keys.push(metadata);

    return { ix };
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

  const createUnstakeInstruction = async ({ farm, mint, owner }: IUnstake) => {
    const farmer = findFarmerAddress({ farm, owner });

    const farmerVault = await utils.token.associatedAddress({
      mint,
      owner: farmer,
    });

    const gemOwnerAta = await utils.token.associatedAddress({
      mint,
      owner,
    });

    const stakeReceipt = findStakeReceiptAddress({ farmer, mint });

    const lock = (await StakeReceipt.fetch(connection, stakeReceipt)).lock;

    const ix = unstake({
      farm,
      farmer,
      gemMint: mint,
      stakeReceipt,
      lock,
      farmerVault,
      gemOwnerAta,
      owner,
      tokenProgram,
    });

    return { ix };
  };

  const createBuffPairInstruction = async ({
    farm,
    buffMint,
    pair,
    authority,
  }: IBuffPair) => {
    const farmer = findFarmerAddress({ farm, owner: authority });

    const { metadataAddress, creatorAddress } = await tryFindCreator(
      connection,
      buffMint
    );

    const metadata = {
      pubkey: metadataAddress,
      isSigner: false,
      isWritable: false,
    };

    const buffUserAta = await utils.token.associatedAddress({
      mint: buffMint,
      owner: authority,
    });

    const buffVault = await utils.token.associatedAddress({
      mint: buffMint,
      owner: farmer,
    });

    const buffWhitelist = findWhitelistProofAddress({
      farm,
      creatorOrMint: creatorAddress,
    });

    const [
      { mint: mintA, receipt: mintAReceipt, whitelist: mintAWhitelist },
      { mint: mintB, receipt: mintBReceipt, whitelist: mintBWhitelist },
    ] = pair.map((mint) => {
      const receipt = findStakeReceiptAddress({ farmer, mint });
      const whitelist = findWhitelistProofAddress({
        farm,
        creatorOrMint: mint,
      });
      return { mint, receipt, whitelist };
    });

    const ix = buffPair({
      farm,
      farmer,

      buffMint,
      buffUserAta,
      buffVault,
      buffWhitelist,

      mintA,
      mintAReceipt,
      mintAWhitelist,

      mintB,
      mintBReceipt,
      mintBWhitelist,

      authority,

      rent,
      systemProgram,
      tokenProgram,
      associatedTokenProgram,
    });

    ix.keys.push(metadata);

    return { ix };
  };

  const createDebuffPairInstruction = async ({
    authority,
    buffMint,
    farm,
    pair,
  }: IDebuffPair) => {
    const farmer = findFarmerAddress({ farm, owner: authority });

    const buffUserAta = await utils.token.associatedAddress({
      mint: buffMint,
      owner: authority,
    });

    const buffVault = await utils.token.associatedAddress({
      mint: buffMint,
      owner: farmer,
    });

    const [
      { mint: mintA, receipt: mintAReceipt },
      { mint: mintB, receipt: mintBReceipt },
    ] = pair.map((mint) => {
      const receipt = findStakeReceiptAddress({ farmer, mint });
      const whitelist = findWhitelistProofAddress({
        farm,
        creatorOrMint: mint,
      });
      return { mint, receipt, whitelist };
    });

    const ix = debuffPair({
      farm,
      farmer,

      buffMint,
      buffVault,
      buffUserAta,

      mintA,
      mintAReceipt,

      mintB,
      mintBReceipt,

      authority,

      tokenProgram,
    });

    return { ix };
  };

  return {
    createFarm: withParsedError(_createFarm),
    createLocks: withParsedError(_createLocks),
    fundReward: withParsedError(_fundReward),
    addManager: withParsedError(_addManager),
    initializeFarmer: withParsedError(_initializeFarmer),
    claimRewards: withParsedError(_claimRewards),
    createStakeInstruction,
    createUnstakeInstruction,
    createAddToWhitelistInstruction,
    createRemoveFromWhitelistInstruction,
    createBuffPairInstruction,
    createDebuffPairInstruction,
  };
};