use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("Cooldown is not over yet.")]
    CooldownIsNotOver,

    #[msg("Insufficient reward funds. Could not reserve.")]
    CouldNotReserveReward,

    #[msg("Insufficient reserved reward. Could not release.")]
    CouldNotReleaseReward,

    #[msg("Cannot unstake while the gem is still locked.")]
    GemStillLocked,

    #[msg("An arithmetic error occurred.")]
    ArithmeticError,
}
