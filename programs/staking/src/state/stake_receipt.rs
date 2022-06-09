use anchor_lang::prelude::*;

use crate::{error::StakingError, state::*};

#[account]
pub struct StakeReceipt {
    pub farmer: Pubkey,
    pub mint: Pubkey,
    pub lock: Pubkey,
    pub start_ts: u64,
    pub end_ts: Option<u64>,
    pub amount: u64,
    pub reward_rate: u64,
    pub objects: Vec<AssociatedObject>,
}

#[derive(Copy, Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct AssociatedObject {
    pub key: Pubkey,
    pub rate: u64,
}

impl AssociatedObject {
    pub const LEN: usize = 32 + 8;
}

impl StakeReceipt {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 9 + 8 + 8 + 4 + (AssociatedObject::LEN * 3);
    pub const PREFIX: &'static [u8] = b"stake_receipt";

    pub fn is_running(&self) -> bool {
        self.end_ts.is_none()
    }

    pub fn try_add_object(&mut self, farmer: &mut Farmer, object: AssociatedObject) -> Result<()> {
        require_gt!(
            3_usize,
            self.objects.len(),
            StakingError::MaxObjectsExceeded
        );

        farmer.update_accrued_rewards()?;

        let rate = object.rate;
        self.objects.push(object);

        // Update receipt reward_rate;
        self.reward_rate = self
            .reward_rate
            .checked_add(rate)
            .ok_or(StakingError::ArithmeticError)?;

        // Update farmer reward_rate;
        farmer.increase_reward_rate(rate)?;

        Ok(())
    }

    pub fn try_remove_object(&mut self, farmer: &mut Farmer, obj_key: Pubkey) -> Result<()> {
        let idx = self
            .objects
            .iter()
            .position(|o| o.key == obj_key)
            .ok_or(StakingError::ObjectNotFound)?;

        let object = self.objects.swap_remove(idx);

        farmer.update_accrued_rewards()?;

        self.reward_rate = self
            .reward_rate
            .checked_sub(object.rate)
            .ok_or(StakingError::ArithmeticError)?;

        farmer.decrease_reward_rate(object.rate)?;

        Ok(())
    }
}
