use anchor_lang::prelude::*;

use crate::error::StakingError;

#[account]
pub struct StakeReceipt {
    pub farmer: Pubkey,
    pub mint: Pubkey,
    pub lock: Pubkey,
    pub start_ts: u64,
    pub end_ts: Option<u64>,
    pub amount: u64,
    pub reward_rate: u64,
    // Public key of the NFT that is buffing this stake.
    pub buff: Option<Pubkey>,
}

impl StakeReceipt {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 9 + 8 + 8 + 33;
    pub const PREFIX: &'static [u8] = b"stake_receipt";

    pub fn try_buff(&mut self, buff_key: Pubkey, factor: u64) -> Result<u64> {
        require!(self.end_ts == None, StakingError::BuffUnstaked);
        require_gt!(factor, 0_u64, StakingError::FactorMustBeGtZero);

        match self.buff {
            Some(buff) => {
                msg!(
                    "Mint {} is already being buffed by NFT {}.",
                    self.mint,
                    buff
                );
                Err(error!(StakingError::NFTAlreadyBuffed))
            }
            None => {
                self.buff = Some(buff_key);
                let previous_reward_rate = self.reward_rate;
                let buffed = self
                    .reward_rate
                    .checked_mul(factor)
                    .ok_or(StakingError::ArithmeticError)?;
                self.reward_rate = buffed;
                Ok(buffed - previous_reward_rate)
            }
        }
    }
}
