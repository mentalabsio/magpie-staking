use anchor_lang::prelude::*;

#[account]
pub struct StakeReceipt {
    pub farmer: Pubkey,
    pub mint: Pubkey,
    pub lock: Pubkey,
    pub start_ts: u64,
    pub end_ts: Option<u64>,
}

impl StakeReceipt {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 9;
    pub const PREFIX: &'static [u8] = b"stake_receipt";
}
