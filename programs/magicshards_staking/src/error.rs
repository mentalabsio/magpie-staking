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

    #[msg("Invalid whitelist type")]
    InvalidWhitelist,

    #[msg("This NFT is already being buffed.")]
    NFTAlreadyBuffed,

    #[msg("Cannot buff an unstaked NFT.")]
    BuffUnstaked,

    #[msg("Buff factor must be greater than 0")]
    FactorMustBeGtZero,

    #[msg("An arithmetic error occurred.")]
    ArithmeticError,
}
