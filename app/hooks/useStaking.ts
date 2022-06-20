import { web3, BN } from "@project-serum/anchor"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { Transaction } from "@solana/web3.js"
import { useCallback, useEffect, useState } from "react"

import { StakingProgram } from "lib"
import { Farmer, StakeReceipt } from "lib/gen/accounts"
import { findFarmAddress, findFarmerAddress } from "lib/pda"
import { findFarmLocks, findUserStakeReceipts } from "lib/utils"
import { getNFTMetadata } from "utils/nfts"
import { NFT } from "./useWalletNFTs"

const farmAuthorityPubKey = new web3.PublicKey(
  "7JFd6StCPAqyV2Cj4WG7rSJY3uWHSToW7dLesCvCHTBd"
)

const rewardMint = new web3.PublicKey(
  "6B9C2UiSco1op2CaFnxiomsXSDQGZwP5bCC5fx5M4ERw"
)

export type StakeReceiptWithMetadata = StakeReceipt & {
  metadata: NFT
}

const useStaking = () => {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [feedbackStatus, setFeedbackStatus] = useState("")
  const [farmerAccount, setFarmerAccount] = useState<Farmer | false | null>(
    null
  )

  const [stakeReceipts, setStakeReceipts] = useState<
    StakeReceiptWithMetadata[] | null
  >(null)

  /**
   * Fetch all stake receipts
   */
  const fetchReceipts = useCallback(async () => {
    if (publicKey) {
      try {
        const farm = findFarmAddress({
          authority: farmAuthorityPubKey,
          rewardMint,
        })

        setFeedbackStatus("Fetching receipts...")
        const receipts = await findUserStakeReceipts(
          connection,
          farm,
          publicKey
        )

        const stakingReceipts = receipts.filter(
          (receipt) => receipt.endTs === null
        )

        setFeedbackStatus("Fetching metadatas...")
        const withMetadatas = await Promise.all(
          stakingReceipts.map(async (receipt) => {
            const metadata = await getNFTMetadata(
              receipt.mint.toString(),
              connection
            )

            const withMetadata = Object.assign(receipt, { metadata })

            return withMetadata
          })
        )

        setStakeReceipts(withMetadatas)
        setFeedbackStatus("")
      } catch (e) {
        setFeedbackStatus(
          "Something went wrong. " + (e.message ? e.message : e)
        )
      }
    }
  }, [publicKey])

  /**
   * Fetch farmer account
   */
  const fetchFarmer = useCallback(async () => {
    try {
      const farm = findFarmAddress({
        authority: farmAuthorityPubKey,
        rewardMint,
      })

      setFeedbackStatus("Fetching farmer...")
      const farmer = findFarmerAddress({ farm, owner: publicKey })
      const farmerAccount = await Farmer.fetch(connection, farmer)

      if (!farmerAccount) {
        setFarmerAccount(false)

        return true
      }

      setFarmerAccount(farmerAccount)
      setFeedbackStatus("")
    } catch (e) {
      setFeedbackStatus("Something went wrong. " + (e.message ? e.message : e))
    }
  }, [publicKey])

  useEffect(() => {
    if (publicKey) {
      fetchFarmer()
      fetchReceipts()
    }
  }, [publicKey])

  const initFarmer = async () => {
    try {
      const stakingClient = StakingProgram(connection)

      const farm = findFarmAddress({
        authority: farmAuthorityPubKey,
        rewardMint,
      })

      setFeedbackStatus("Initializing transaction...")
      const { ix } = await stakingClient.createInitializeFarmerInstruction({
        farm,
        owner: publicKey,
      })

      const latest = await connection.getLatestBlockhash()
      const tx = new Transaction()

      tx.recentBlockhash = latest.blockhash
      tx.add(ix)

      tx.feePayer = publicKey

      setFeedbackStatus("Awaiting approval...")
      const txid = await sendTransaction(tx, connection)

      await connection.confirmTransaction(txid)

      setFeedbackStatus("Success!")

      await fetchFarmer()
    } catch (e) {
      setFeedbackStatus("Something went wrong. " + (e.message ? e.message : e))
    }
  }

  const stakeAll = async (mints: web3.PublicKey[]) => {
    try {
      const farm = findFarmAddress({
        authority: farmAuthorityPubKey,
        rewardMint,
      })

      setFeedbackStatus("Initializing...")
      const locks = await findFarmLocks(connection, farm)
      const lock = locks.find((lock) => lock.bonusFactor === 0)

      const stakingClient = StakingProgram(connection)

      let additionals = []
      const ixs = await Promise.all(
        mints.map(async (mint) => {
          const { ix } = await stakingClient.createStakeInstruction({
            farm,
            mint,
            lock: lock.address,
            owner: publicKey,
            args: { amount: new BN(1) },
          })

          return ix
        })
      )

      const tx = new Transaction()

      tx.add(...additionals, ...ixs)

      const latest = await connection.getLatestBlockhash()
      tx.recentBlockhash = latest.blockhash
      tx.feePayer = publicKey

      setFeedbackStatus("Awaiting approval...")
      const txid = await sendTransaction(tx, connection)

      setFeedbackStatus("Confirming...")
      await connection.confirmTransaction(txid)

      console.log(txid)
    } catch (e) {
      setFeedbackStatus("Something went wrong. " + (e.message ? e.message : e))
    }
  }

  const unstakeAll = async (mints: web3.PublicKey[]) => {
    try {
      const farm = findFarmAddress({
        authority: farmAuthorityPubKey,
        rewardMint,
      })

      const stakingClient = StakingProgram(connection)

      setFeedbackStatus("Initializing...")

      const ixs = await Promise.all(
        mints.map(async (mint) => {
          const { ix } = await stakingClient.createUnstakeInstruction({
            farm,
            mint,
            owner: publicKey,
          })

          return ix
        })
      )

      const tx = new Transaction()

      tx.add(...ixs)
      const latest = await connection.getLatestBlockhash()
      tx.recentBlockhash = latest.blockhash
      tx.feePayer = publicKey

      setFeedbackStatus("Awaiting approval...")

      const txid = await sendTransaction(tx, connection)

      setFeedbackStatus("Confirming...")

      await connection.confirmTransaction(txid)
    } catch (e) {
      setFeedbackStatus("Something went wrong. " + (e.message ? e.message : e))
    }
  }

  const claim = async () => {
    try {
      const farm = findFarmAddress({
        authority: farmAuthorityPubKey,
        rewardMint,
      })

      const stakingClient = StakingProgram(connection)

      const { ix } = await stakingClient.createClaimRewardsInstruction({
        farm,
        authority: publicKey,
      })

      const latest = await connection.getLatestBlockhash("finalized")
      const tx = new Transaction()

      tx.add(ix)
      tx.recentBlockhash = latest.blockhash
      tx.feePayer = publicKey

      setFeedbackStatus("Awaiting approval...")

      const txid = await sendTransaction(tx, connection)

      setFeedbackStatus("Confirming...")

      await connection.confirmTransaction(txid)

      setFeedbackStatus("Success!")
    } catch (e) {
      setFeedbackStatus("Something went wrong. " + (e.message ? e.message : e))
    }
  }

  return {
    farmerAccount,
    feedbackStatus,
    claim,
    initFarmer,
    stakeAll,
    unstakeAll,
    stakeReceipts,
    fetchReceipts,
  }
}

export default useStaking
