import { BN, utils, web3 } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  AccountMeta,
  Connection,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
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
  unstake,
} from "./gen/instructions";
import { debuffPair } from "./gen/instructions/debuffPair";
import { StakeArgs } from "./gen/instructions/stake";
import { WhitelistTypeKind } from "./gen/types";
import { LockConfigFields } from "./gen/types/LockConfig";
import {
  findWhitelistProofAddress,
  findFarmAddress,
  findFarmerAddress,
  findFarmManagerAddress,
  findLockAddress,
  findStakeReceiptAddress,
} from "./pda";
import { tryFindCreator } from "./utils";

interface ICreateFarm {
  authority: PublicKey;
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
  authority: PublicKey;
}

interface IFundReward {
  amount: BN;
  farm: PublicKey;
  authority: PublicKey;
}

interface IAddManager {
  farm: PublicKey;
  newManagerAuthority: PublicKey;
  farmAuthority: PublicKey;
}

interface IInitializeFarmer {
  farm: PublicKey;
  owner: PublicKey;
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
  authority: PublicKey;
}

export const StakingProgram = (connection: Connection) => {
  const systemProgram = web3.SystemProgram.programId;
  const tokenProgram = utils.token.TOKEN_PROGRAM_ID;
  const associatedTokenProgram = utils.token.ASSOCIATED_PROGRAM_ID;
  const rent = SYSVAR_RENT_PUBKEY;

  const createCreateFarmInstruction = async ({
    rewardMint,
    authority,
  }: ICreateFarm) => {
    const farm = findFarmAddress({
      authority,
      rewardMint,
    });

    const farmManager = findFarmManagerAddress({
      farm,
      authority,
    });

    const farmVault = await utils.token.associatedAddress({
      mint: rewardMint,
      owner: farm,
    });

    const createFarmIx = createFarm({
      farm,
      rewardMint,
      farmVault,
      authority,

      rent,
      systemProgram,
      tokenProgram,
      associatedTokenProgram,
    });

    const addManagerIx = addManager({
      farm,
      farmManager,
      authority,
      managerAuthority: authority,
      systemProgram,
    });

    return { ix: [createFarmIx, addManagerIx] };
  };

  const createAddManagerInstruction = async ({
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
      authority: farmAuthority,
      systemProgram,
    });

    return { ix };
  };

  const createCreateLocksInstruction = async ({
    farm,
    lockConfigs,
    authority,
  }: ICreateLocks) => {
    const farmManager = findFarmManagerAddress({
      farm,
      authority: authority,
    });

    const ix = createLocks(
      { lockConfigs },
      {
        farm,
        farmManager,
        authority: authority,
        systemProgram,
      }
    );

    const lockAccountMetas: AccountMeta[] = lockConfigs.map((config) => {
      const lockAddress = findLockAddress({ config, farm });
      return { pubkey: lockAddress, isSigner: false, isWritable: true };
    });

    ix.keys.push(...lockAccountMetas);

    return { ix };
  };

  const createFundRewardInstruction = async ({
    amount,
    farm,
    authority,
  }: IFundReward) => {
    const farmAccount = await Farm.fetch(connection, farm);

    const farmManager = findFarmManagerAddress({
      farm,
      authority: authority,
    });

    const farmVault = await utils.token.associatedAddress({
      mint: farmAccount.reward.mint,
      owner: farm,
    });

    const managerAta = await utils.token.associatedAddress({
      mint: farmAccount.reward.mint,
      owner: authority,
    });

    const ix = fundReward(
      { amount },
      {
        farm,
        farmManager,
        mint: farmAccount.reward.mint,
        farmVault,
        managerAta,
        authority: authority,
        tokenProgram,
      }
    );

    return { ix };
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

  const createInitializeFarmerInstruction = async ({
    farm,
    owner,
  }: IInitializeFarmer) => {
    const farmer = findFarmerAddress({ farm, owner });

    const ix = initializeFarmer({
      farm,
      farmer,
      owner,
      systemProgram,
    });

    return { ix };
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

  const createClaimRewardsInstruction = async ({
    farm,
    authority,
  }: IClaimRewards) => {
    const farmer = findFarmerAddress({ farm, owner: authority });

    const farmData = await Farm.fetch(connection, farm);

    const farmRewardVault = await utils.token.associatedAddress({
      mint: farmData.reward.mint,
      owner: farm,
    });

    const farmerRewardVault = await utils.token.associatedAddress({
      mint: farmData.reward.mint,
      owner: authority,
    });

    const ix = claimRewards({
      farm,
      farmer,
      rewardMint: farmData.reward.mint,
      farmRewardVault,
      farmerRewardVault,
      authority,
      rent,
      systemProgram,
      tokenProgram,
      associatedTokenProgram,
    });

    return { ix };
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

      mintB,
      mintBReceipt,

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
    // Admin-domain
    createCreateFarmInstruction,
    createCreateLocksInstruction,
    createAddToWhitelistInstruction,
    createRemoveFromWhitelistInstruction,
    createFundRewardInstruction,
    createAddManagerInstruction,
    // User-domain
    createInitializeFarmerInstruction,
    createClaimRewardsInstruction,
    createStakeInstruction,
    createUnstakeInstruction,
    createBuffPairInstruction,
    createDebuffPairInstruction,
  };
};
