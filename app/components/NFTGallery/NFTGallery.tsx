/** @jsxImportSource theme-ui */

import { Flex, Spinner, Text } from "@theme-ui/components"
import useWalletNFTs, { NFT } from "@/hooks/useWalletNFTs"
import CollectionItem from "@/components/NFTGallery/CollectionItem"
import { useWallet } from "@solana/wallet-adapter-react"

export type NFTCollectionProps = {
  NFTs: NFT[]
  children?: React.ReactChild
}

/**
 * Component to displays all NFTs from a connected wallet
 */
export function NFTGallery({ NFTs, children }: NFTCollectionProps) {
  const { publicKey } = useWallet()

  return (
    <>
      {NFTs ? (
        NFTs.length ? (
          <div
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.6rem",
              alignItems: "center",

              "@media (min-width: 768px)": {
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
              },
            }}
          >
            {children}
          </div>
        ) : (
          /** NFTs fetched but array is empty, means current wallet has no NFT. */
          <Flex
            sx={{
              justifyContent: "center",
              alignSelf: "stretch",
            }}
          >
            <Text>There are no NFTs on your wallet.</Text>
          </Flex>
        )
      ) : /** No NFTs and public key, means it is loading */
      publicKey ? (
        <Flex
          sx={{
            justifyContent: "center",
            alignSelf: "stretch",
          }}
        >
          <Spinner variant="styles.spinnerLarge" />
        </Flex>
      ) : null}
    </>
  )
}
