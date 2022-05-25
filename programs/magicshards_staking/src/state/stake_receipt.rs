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
    pub buff: Option<Buff>,
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

    pub fn try_buff(&mut self, buff_key: Pubkey, factor: u64) -> Result<u64> {
        require!(self.is_running(), StakingError::GemNotStaked);
        require_gt!(factor, 0_u64, StakingError::FactorMustBeGtZero);

        match self.buff {
            Some(_) => Err(error!(StakingError::GemAlreadyBuffed)),
            None => {
                self.buff = Some(Buff {
                    key: buff_key,
                    factor,
                });
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

    pub fn try_debuff(&mut self) -> Result<u64> {
        require!(self.is_running(), StakingError::GemNotStaked);

        match self.buff.take() {
            Some(Buff { factor, .. }) => {
                let previous_reward_rate = self.reward_rate;
                let debuffed = self
                    .reward_rate
                    .checked_div(factor)
                    .ok_or(StakingError::ArithmeticError)?;
                self.reward_rate = debuffed;
                Ok(previous_reward_rate - debuffed)
            }
            None => Err(error!(StakingError::GemNotBuffed)),
        }
    }
}
