use anchor_lang::prelude::*;

#[account]
pub struct FarmManager {
    pub farm: Pubkey,
    pub authority: Pubkey,
}

impl FarmManager {
    pub const LEN: usize = 32 + 32;
    pub const PREFIX: &'static [u8] = b"farm_manager";
}
