/** @jsxImportSource theme-ui */
import Head from "next/head"

import { Button, Flex, Heading, Text } from "@theme-ui/components"
import { useState } from "react"

import Header from "@/components/Header/Header"
import { NFTGallery } from "@/components/NFTGallery/NFTGallery"
import CollectionItem from "@/components/NFTGallery/CollectionItem"
import useWalletNFTs, { NFT } from "@/hooks/useWalletNFTs"
import { Tab, TabList, TabPanel, Tabs } from "react-tabs"
import NFTSelectInput from "@/components/NFTSelectInput/NFTSelectInput"
import useStaking from "@/hooks/useStaking"
import { LoadingIcon } from "@/components/icons/LoadingIcon"
import { web3 } from "@project-serum/anchor"
import { CloseIcon, SettingsIcon } from "@/components/icons"

export default function Home() {
  const { walletNFTs, fetchNFTs } = useWalletNFTs([
    "9UaTjLVUTtJF3n9sG8VfvYt4pdYGf7Y59qYZFBRx4kLo",
  ])
  const { walletNFTs: associatedNFTs, fetchNFTs: fetchAssociatedNFTs } =
    useWalletNFTs(process.env.NEXT_PUBLIC_ASSOCIATED_CREATORS.split(","))
  const [isAddingAssociated, setIsAddingAssociated] = useState<false | string>(
    false
  )

  const [isModalOpen, setIsModalOpen] = useState<false | string>(false)

  const [selectedWalletItems, setSelectedWalletItems] = useState<NFT[]>([])

  const {
    farmerAccount,
    initFarmer,
    stakeAll,
    claim,
    stakeReceipts,
    feedbackStatus,
    unstake,
    addObject,
    fetchFarmer,
    removeObject,
    fetchReceipts,
  } = useStaking()

  const handleAssociatedFormSubmit = async (e) => {
    e.preventDefault()

    const data = new FormData(e.currentTarget)

    const mint = data.get("mint")
    const mainMint = data.get("main_mint")

    await addObject(new web3.PublicKey(mainMint), new web3.PublicKey(mint))
    await fetchAssociatedNFTs()
    await fetchReceipts()
    await fetchFarmer()
  }

  /**
   * Handles selected items.
   */
  const handleWalletItemClick = (item: NFT) => {
    setSelectedWalletItems((prev) => {
      const exists = prev.find(
        (NFT) => NFT.onchainMetadata.mint === item.onchainMetadata.mint
      )

      /** Remove if exists */
      if (exists) {
        return prev.filter(
          (NFT) => NFT.onchainMetadata.mint !== item.onchainMetadata.mint
        )
      }

      return prev.length < 4 ? prev?.concat(item) : prev
    })
  }

  const orderedReceipts =
    stakeReceipts &&
    stakeReceipts.sort((a, b) =>
      a.startTs.toNumber() < b.startTs.toNumber() ? 1 : -1
    )

  return (
    <>
      <Head>
        <title>Magpie Staking</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <div
        sx={{
          "&:before": {
            content: "''",
            backgroundImage: "url(magpiebg.png)",
            backgroundRepeat: "repeat",
            backgroundAttachment: "fixed",
            minHeight: "100vh",
            opacity: 0.4,
            zIndex: 0,
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundPosition: "50% 0",
            pointerEvents: "none",
          },
        }}
      ></div>

      <main
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          alignSelf: "stretch",
          margin: "0 auto",
          marginTop: "4rem",
          maxWidth: "78rem",
          position: "relative",
          padding: "0 1.6rem",
          minHeight: "60vh",
        }}
      >
        <Heading mb=".8rem" variant="heading1">
          Magpie Staking
        </Heading>
        <Text>Stake your Magpie now</Text>

        {farmerAccount === false ? (
          <>
            <Button mt="3.2rem" onClick={initFarmer}>
              Init account
            </Button>
            <Flex
              sx={{
                alignItems: "center",
                gap: ".8rem",
                margin: ".8rem 0",
              }}
            >
              {feedbackStatus ? (
                <>
                  {feedbackStatus.indexOf("Success") === -1 ? (
                    <LoadingIcon size="1.6rem" />
                  ) : null}
                  {"  "}{" "}
                  <Text
                    variant="small"
                    sx={{
                      color:
                        feedbackStatus.indexOf("Success") !== -1
                          ? "success"
                          : "text",
                    }}
                  >
                    {feedbackStatus}
                  </Text>
                </>
              ) : (
                ""
              )}
              &nbsp;
            </Flex>
          </>
        ) : null}

        {farmerAccount ? (
          <>
            <Flex
              my="3.2rem"
              sx={{
                flexDirection: "column",
                alignItems: "center",
                gap: "1.6rem",
              }}
            >
              <Flex
                sx={{
                  gap: "1.6rem",
                }}
              >
                {/* {farmerAccount.accruedRewards.toNumber() ? (
                  <Text>
                    Rewards:{" "}
                    <b
                      sx={{
                        fontSize: "1.6rem",
                      }}
                    >
                      {(
                        farmerAccount.accruedRewards.toNumber() / 1000000
                      ).toFixed(2)}
                    </b>
                  </Text>
                ) : null} */}

                {/* {farmerAccount?.totalRewardRate?.toNumber() ? (
                  <Text>
                    Rate:{" "}
                    <b
                      sx={{
                        fontSize: "1.6rem",
                      }}
                    >
                      {(
                        (farmerAccount?.totalRewardRate?.toNumber() / 1000000) *
                        86400
                      ).toFixed(2)}{" "}
                    </b>
                    per day
                  </Text>
                ) : null} */}
              </Flex>
              <Button onClick={claim}>Claim rewards</Button>

              <Flex
                sx={{
                  alignItems: "center",
                  gap: ".8rem",
                  margin: ".8rem 0",
                }}
              >
                {feedbackStatus ? (
                  <>
                    {feedbackStatus.indexOf("Success") === -1 ? (
                      <LoadingIcon size="1.6rem" />
                    ) : null}
                    {"  "}{" "}
                    <Text
                      variant="small"
                      sx={{
                        color:
                          feedbackStatus.indexOf("Success") !== -1
                            ? "success"
                            : "text",
                      }}
                    >
                      {feedbackStatus}
                    </Text>
                  </>
                ) : (
                  ""
                )}
                &nbsp;
              </Flex>
            </Flex>

            <Flex
              my="3.2rem"
              sx={{
                flexDirection: "column",
                gap: "1.6rem",
                alignSelf: "stretch",
              }}
            >
              <Tabs
                sx={{
                  margin: "3.2rem 0",
                  alignSelf: "stretch",
                  minHeight: "48rem",
                }}
              >
                <TabList>
                  <Tab>Your wallet</Tab>
                  <Tab>Your vault</Tab>
                </TabList>

                <TabPanel>
                  <NFTGallery NFTs={walletNFTs}>
                    <>
                      {walletNFTs?.map((item) => {
                        const isSelected = selectedWalletItems.find(
                          (NFT) =>
                            NFT.onchainMetadata.mint ===
                            item.onchainMetadata.mint
                        )

                        return (
                          <Flex
                            sx={{
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "1.6rem",
                            }}
                          >
                            <CollectionItem
                              key={item.onchainMetadata.mint}
                              item={item}
                              onClick={handleWalletItemClick}
                              sx={{
                                maxWidth: "16rem",
                                "> img": {
                                  border: "3px solid transparent",
                                  borderColor: isSelected
                                    ? "primary"
                                    : "transparent",
                                },
                              }}
                            />
                          </Flex>
                        )
                      })}
                    </>
                  </NFTGallery>
                  <Button
                    sx={{
                      margin: "3.2rem auto",
                    }}
                    onClick={async (e) => {
                      const allMints = selectedWalletItems.map(
                        (item) => item.mint
                      )
                      await stakeAll(allMints)
                      await fetchNFTs()
                      await fetchReceipts()
                    }}
                    disabled={!selectedWalletItems.length}
                  >
                    Stake selected
                  </Button>
                </TabPanel>

                <TabPanel>
                  <Flex
                    sx={{
                      flexDirection: "column",
                      gap: "3.2rem",

                      "@media (min-width: 768px)": {
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                      },
                    }}
                  >
                    {orderedReceipts &&
                      orderedReceipts.map((stake) => {
                        const isAdding =
                          isAddingAssociated &&
                          isAddingAssociated === stake.mint.toString()

                        const isOpen =
                          isModalOpen && isModalOpen === stake.mint.toString()

                        return (
                          <Flex
                            key={stake.mint?.toString()}
                            sx={{
                              background: "background",
                              padding: "1.6rem",
                              borderRadius: ".4rem",
                              flexDirection: "column",
                              position: "relative",
                              justifyContent: "center",

                              "@media (min-width:768px)": {
                                flexDirection: "row",
                              },
                            }}
                          >
                            <Flex
                              sx={{
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "1.6rem",
                              }}
                            >
                              <CollectionItem item={stake.metadata} />
                              <Flex
                                sx={{
                                  gap: "1.6rem",
                                  alignItems: "center",
                                  flexDirection: "column",
                                  marginTop: "1.6rem",
                                }}
                              >
                                {stake.objects?.length ? (
                                  <Flex sx={{ gap: ".8rem" }}>
                                    {stake.objects
                                      ? stake.objects.map((object) => {
                                          return (
                                            <img
                                              sx={{
                                                maxWidth: "2.4rem",
                                              }}
                                              src={
                                                object.metadata.externalMetadata
                                                  .image
                                              }
                                            />
                                          )
                                        })
                                      : null}
                                  </Flex>
                                ) : null}
                                <Button
                                  sx={{
                                    alignItems: "center",
                                  }}
                                  variant="secondary"
                                  onClick={async () => {
                                    setIsModalOpen(stake.mint.toString())
                                  }}
                                >
                                  <SettingsIcon
                                    sx={{
                                      width: "1.6rem",
                                      height: "1.6rem",
                                      marginRight: ".8rem",
                                    }}
                                  />{" "}
                                  Shiny Things
                                </Button>
                                <Button
                                  variant="resetted"
                                  onClick={async () => {
                                    await unstake(stake.mint)
                                    await fetchNFTs()
                                    await fetchReceipts()
                                  }}
                                >
                                  Unstake
                                </Button>
                              </Flex>
                            </Flex>

                            <div
                              sx={{
                                position: "fixed",
                                margin: "0 auto",
                                backgroundColor: "background",
                                visibility: isOpen ? "visible" : "hidden",
                                opacity: isOpen ? 1 : 0,
                                left: 0,
                                right: 0,
                                top: "16rem",
                                zIndex: 999,
                                maxWidth: "48rem",
                                padding: "3.2rem",
                                boxShadow: "0px 4px 4px rgba(0,0,0,0.25)",
                              }}
                            >
                              <Button
                                variant="resetted"
                                sx={{
                                  cursor: "pointer",
                                }}
                                onClick={() => setIsModalOpen(false)}
                              >
                                <CloseIcon />
                              </Button>
                              <Flex
                                sx={{
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "1.6rem",
                                }}
                              >
                                <Flex
                                  sx={{
                                    gap: "1.6rem",
                                  }}
                                >
                                  {stake.objects.map((object) =>
                                    object ? (
                                      <Flex
                                        key={object.key.toString()}
                                        sx={{
                                          flexDirection: "column",
                                          alignItems: "center",
                                          gap: "1.6rem",
                                        }}
                                      >
                                        <CollectionItem
                                          item={object.metadata}
                                          sx={{
                                            maxWidth: "8rem",
                                          }}
                                        />
                                        <Button
                                          variant="secondary"
                                          onClick={async () => {
                                            /** Remove object */
                                            await removeObject(
                                              stake.mint,
                                              object.key
                                            )
                                            await fetchReceipts()
                                            await fetchAssociatedNFTs()
                                          }}
                                        >
                                          Withdraw
                                        </Button>
                                      </Flex>
                                    ) : null
                                  )}
                                </Flex>

                                <Flex
                                  sx={{
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "1.6rem",
                                  }}
                                >
                                  <Button
                                    variant="resetted"
                                    onClick={() =>
                                      setIsAddingAssociated((prev) =>
                                        prev ? false : stake.mint.toString()
                                      )
                                    }
                                  >
                                    {isAdding ? null : "+"} Add
                                    {isAdding ? "ing" : null} a Shiny Thing
                                  </Button>

                                  {isAdding ? (
                                    <form
                                      onSubmit={handleAssociatedFormSubmit}
                                      sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: "1.6rem",
                                      }}
                                    >
                                      <Flex
                                        sx={{
                                          gap: "1.6rem",
                                        }}
                                      >
                                        <input
                                          type="hidden"
                                          name="main_mint"
                                          value={stake.mint.toString()}
                                        />
                                        <NFTSelectInput
                                          name="mint"
                                          NFTs={associatedNFTs}
                                          label="Select a Shiny Thing"
                                        />
                                      </Flex>
                                      <Flex
                                        sx={{
                                          gap: "1.6rem",
                                        }}
                                      >
                                        <Button type="submit">Add Thing</Button>
                                      </Flex>
                                      <Flex
                                        sx={{
                                          alignItems: "center",
                                          gap: ".8rem",
                                          margin: ".8rem 0",
                                        }}
                                      >
                                        {feedbackStatus ? (
                                          <>
                                            {feedbackStatus.indexOf(
                                              "Success"
                                            ) === -1 ? (
                                              <LoadingIcon size="1.6rem" />
                                            ) : null}
                                            {"  "}{" "}
                                            <Text
                                              variant="small"
                                              sx={{
                                                color:
                                                  feedbackStatus.indexOf(
                                                    "Success"
                                                  ) !== -1
                                                    ? "success"
                                                    : "text",
                                              }}
                                            >
                                              {feedbackStatus}
                                            </Text>
                                          </>
                                        ) : (
                                          ""
                                        )}
                                        &nbsp;
                                      </Flex>
                                    </form>
                                  ) : null}
                                </Flex>
                              </Flex>
                            </div>
                            <div
                              onClick={() => setIsModalOpen(false)}
                              sx={{
                                "::before": {
                                  content: "''",
                                  position: "fixed",
                                  backgroundColor: "background",
                                  visibility: isOpen ? "visible" : "hidden",
                                  opacity: isOpen ? 0.5 : 0,
                                  zIndex: 998,
                                  top: 0,
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                },
                              }}
                            ></div>
                          </Flex>
                        )
                      })}
                  </Flex>
                </TabPanel>
              </Tabs>

              {/* <Flex
            sx={{
              flexDirection: "column",
              gap: ".8rem",
            }}
          >
            <Heading variant="heading3">NFT Selector:</Heading>
            <NFTSelectInput name="nft" NFTs={walletNFTs} />
          </Flex> */}
            </Flex>
          </>
        ) : null}
      </main>

      <footer
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "4rem 0",
          // marginTop: "32rem",
          position: "relative",
        }}
      >
        <a
          href="https://twitter.com/magicshards"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <Text
            variant="small"
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              sx={{
                height: "32px",
              }}
              src="/magicshards320px.gif"
              alt="Magic Shards"
              height={32}
            />
          </Text>
        </a>
      </footer>
    </>
  )
}
