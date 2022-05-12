use anchor_lang::prelude::*;

#[account]
pub struct WhitelistProof {
    pub creator: Pubkey,
    pub farm: Pubkey,
    // Tokens/gem/sec
    pub reward_rate: u64,
}

impl WhitelistProof {
    pub const LEN: usize = 32 + 32 + 8;
    pub const PREFIX: &'static [u8] = b"collection_data";
}
