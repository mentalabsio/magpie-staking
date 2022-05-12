
# Magicshards Staking Program
- [x] Should be able to whitelist a collection. Each collection has its own reward rate. (tokens/gem/sec).
- [x] Should be able to stake an NFT from a whitelisted collection.
- [x] The reward should be calculated based on the lock factor/duration.


### TODO:
- Allow whitelisting a mint address (for spl tokens).
- Allow staking $TOKEN.
- Remove mint/creator from whitelist.

### NFTabs staking rules
- [x] Stake a pair [NFT A, NFT B] (technically can be done, but there's no program logic for the "pair" thing)
- [ ] Buff a staked pair with NFT C. (since there's no logic for the pair, there's no way to buff it)
- [ ] Stake $TOKENS with lock.

### Prodigy staking rules
- [x] Stake and NFT with a bonus for the lock period.
- [ ] Use NFT off-chain metadata to calculate final reward.

