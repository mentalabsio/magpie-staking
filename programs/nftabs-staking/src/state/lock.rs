use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct Lock {
    pub farm: Pubkey,
    pub duration: u64,
    pub cooldown: u64,
    pub bonus_factor: u8,
}

impl Lock {
    pub const LEN: usize = 32 + 8 + 8 + 1;
    pub const PREFIX: &'static [u8] = b"lock";
}
