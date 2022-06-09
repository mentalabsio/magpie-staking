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

    #[msg("This mint or creator has not been whitelisted.")]
    AddressNotWhitelisted,

    #[msg("Invalid whitelist type.")]
    InvalidWhitelistType,

    #[msg("Remove all the objects before unstaking.")]
    GemStillHasObjects,

    #[msg("Object not found.")]
    ObjectNotFound,

    #[msg("Maximum number of objects exceeded.")]
    MaxObjectsExceeded,

    #[msg("An arithmetic error occurred.")]
    ArithmeticError,
}
