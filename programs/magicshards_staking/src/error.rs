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

    #[msg("Must unstake before staking again.")]
    GemStillStaked,

    #[msg("Attempt to operate on a gem that is no longer staked.")]
    GemNotStaked,

    #[msg("This NFT is already being buffed.")]
    GemAlreadyBuffed,

    #[msg("This NFT was not buffed.")]
    GemNotBuffed,

    #[msg("The gem must be debuffed before realizing this operation.")]
    GemStillBuffed,

    #[msg("Invalid whitelist type.")]
    InvalidWhitelistType,

    #[msg("Buff factor must be greater than 0.")]
    FactorMustBeGtZero,

    #[msg("An arithmetic error occurred.")]
    ArithmeticError,
}
