use anchor_lang::prelude::*;

#[account]
pub struct StakeReceipt {
    pub farmer: Pubkey,
    pub mint: Pubkey,
    pub lock: Pubkey,
    pub start_ts: u64,
    pub end_ts: Option<u64>,
    pub amount: u64,
    pub reward_rate: u64,
}

#[derive(Copy, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Buff {
    pub key: Pubkey,
    pub factor: u64,
}

impl StakeReceipt {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 9 + 8 + 8 + 33;
    pub const PREFIX: &'static [u8] = b"stake_receipt";

    pub fn is_running(&self) -> bool {
        self.end_ts.is_none()
    }
}
