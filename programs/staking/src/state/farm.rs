use anchor_lang::prelude::*;

use crate::error::StakingError;

#[derive(Copy, Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct Reward {
    pub mint: Pubkey,
    pub reserved: u64,
    pub available: u64,
}

impl Reward {
    pub const LEN: usize = 32 + 8 + 8;

    pub fn new(mint: Pubkey) -> Self {
        Self {
            mint,
            reserved: 0,
            available: 0,
        }
    }

    pub fn try_fund(&mut self, amount: u64) -> Result<()> {
        self.available = self
            .available
            .checked_add(amount)
            .ok_or(StakingError::ArithmeticError)?;
        Ok(())
    }

    pub fn try_reserve(&mut self, amount: u64) -> Result<()> {
        let increment = self
            .reserved
            .checked_add(amount)
            .ok_or(StakingError::ArithmeticError)?;

        require_gte!(
            self.available,
            increment,
            StakingError::CouldNotReserveReward
        );

        self.reserved = increment;

        self.available = self
            .available
            .checked_sub(increment)
            .ok_or(StakingError::ArithmeticError)?;

        Ok(())
    }

    pub fn try_release(&mut self, amount: u64) -> Result<()> {
        let decrement = self
            .reserved
            .checked_sub(amount)
            .ok_or(StakingError::CouldNotReleaseReward)?;

        self.reserved = decrement;

        Ok(())
    }
}

#[account]
pub struct Farm {
    pub authority: Pubkey,
    pub reward: Reward,
    pub bump: [u8; 1],
}

impl Farm {
    pub const LEN: usize = 32 + Reward::LEN + 1;
    pub const PREFIX: &'static [u8] = b"farm";

    pub fn seeds(&self) -> [&[u8]; 4] {
        [
            Self::PREFIX,
            self.authority.as_ref(),
            self.reward.mint.as_ref(),
            &self.bump,
        ]
    }
}
