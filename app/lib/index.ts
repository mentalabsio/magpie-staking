import { BN, utils, web3 } from "@project-serum/anchor";
import {
  AccountMeta,
  Connection,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";

import { Farm, StakeReceipt } from "./gen/accounts";
import {
  addManager,
  addObject,
  addToWhitelist,
  claimRewards,
  createFarm,
  createLocks,
  fundReward,
  initializeFarmer,
  removeFromWhitelist,
  removeObject,
  stake,
  StakeArgs,
  unstake,
} from "./gen/instructions";
import { LockConfigFields, WhitelistTypeKind } from "./gen/types";
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

interface IAddObject {
  farm: PublicKey;
  mint: PublicKey;
  object: PublicKey;
  owner: PublicKey;
}

interface IRemoveObject {
  farm: PublicKey;
  mint: PublicKey;
  object: PublicKey;
  owner: PublicKey;
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

  const createFarmInstruction = async ({
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

    const lockAccountMetas: AccountMeta[] = lockConfigs.map(config => {
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

  const createAddObjectInstruction = async ({
    farm,
    owner,
    mint,
    object,
  }: IAddObject) => {
    const farmer = findFarmerAddress({ farm, owner });
    const receipt = findStakeReceiptAddress({ farmer, mint });

    const { creatorAddress, metadataAddress } = await tryFindCreator(
      connection,
      object
    );

    const objectWhitelist = findWhitelistProofAddress({
      farm,
      creatorOrMint: creatorAddress,
    });

    const objectVault = await utils.token.associatedAddress({
      mint: object,
      owner: farmer,
    });

    const userObjectAta = await utils.token.associatedAddress({
      mint: object,
      owner,
    });

    const ix = addObject({
      farm,
      farmer,
      mint,
      receipt,

      object,
      objectMetadata: metadataAddress,
      objectVault,
      objectWhitelist,
      userObjectAta,

      owner,

      rent,
      systemProgram,
      tokenProgram,
      associatedTokenProgram,
    });

    return { ix };
  };

  const createRemoveObjectInstruction = async ({
    owner,
    object,
    mint,
    farm,
  }: IRemoveObject) => {
    const farmer = findFarmerAddress({ farm, owner });
    const receipt = findStakeReceiptAddress({ farmer, mint });

    const userObjectAta = await utils.token.associatedAddress({
      mint: object,
      owner,
    });

    const objectVault = await utils.token.associatedAddress({
      mint: object,
      owner: farmer,
    });

    const ix = removeObject({
      farm,
      mint,
      object,
      owner,
      tokenProgram,
      farmer,
      objectVault,
      userObjectAta,
      receipt,
    });

    return { ix };
  };

  return {
    // Admin-domain
    createFarmInstruction,
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
    createAddObjectInstruction,
    createRemoveObjectInstruction,
  };
};
