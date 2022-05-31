import { web3, BN } from "@project-serum/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { StakingProgram } from "lib";
import { fromTxError } from "lib/gen/errors";
import { findFarmAddress } from "lib/pda";
import { findFarmLocks } from "lib/utils";

const farmAuthorityPubKey = new web3.PublicKey(
  "CBoRBoZxcpyLNhsdASwBBhy7qd3qoHM8CvQUNyKd2vdd"
);
const rewardMint = new web3.PublicKey(
  "ChsNJV8gzmjb1aGzxFPY8iGEbkDK6CM1ecsJieB85Hpb"
);

const useStaking = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const initFarmer = async () => {
    const stakingClient = StakingProgram(connection);

    const farm = findFarmAddress({
      authority: farmAuthorityPubKey,
      rewardMint,
    });

    const { ix } = await stakingClient.createInitializeFarmerInstruction({
      farm,
      owner: publicKey,
    });

    const tx = new Transaction();

    tx.add(ix);

    const latest = await connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = publicKey;

    const txid = await sendTransaction(tx, connection);

    await connection.confirmTransaction(txid);

    console.log(txid);
  };

  const stakeAll = async (mints: web3.PublicKey[]) => {
    try {
      const farm = findFarmAddress({
        authority: farmAuthorityPubKey,
        rewardMint,
      });

      const locks = await findFarmLocks(connection, farm);
      const lock = locks.find((lock) => lock.bonusFactor === 0);

      const stakingClient = StakingProgram(connection);

      let additionals = [];
      const ixs = await Promise.all(
        mints.map(async (mint) => {
          const { ix } = await stakingClient.createStakeInstruction({
            farm,
            mint,
            lock: lock.address,
            owner: publicKey,
            args: { amount: new BN(1) },
          });

          return ix;
        })
      );

      const tx = new Transaction();

      tx.add(...additionals, ...ixs);

      const latest = await connection.getLatestBlockhash();
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = publicKey;

      const txid = await sendTransaction(tx, connection);

      await connection.confirmTransaction(txid);

      console.log(txid);
    } catch (e) {
      console.log(e);
      const parsed = fromTxError(e);

      if (parsed) {
        console.log(parsed);
      }
    }
  };

  return { initFarmer, stakeAll };
};

export default useStaking;
