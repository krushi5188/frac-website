use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FRACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

const MIN_STAKE_AMOUNT: u64 = 100 * 10u64.pow(9); // 100 $FRAC
const SECONDS_PER_YEAR: u64 = 31_557_600; // 365.25 days
const EARLY_UNSTAKE_PENALTY_BPS: u64 = 1000; // 10%

#[program]
pub mod staking {
    use super::*;

    /// Initialize the staking program (one-time)
    pub fn initialize_staking(ctx: Context<InitializeStaking>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.governance_program.key();
        config.rewards_pool = ctx.accounts.rewards_pool.key();
        config.rewards_remaining = 250_000_000 * 10u64.pow(9); // 250M tokens
        config.total_staked = 0;
        config.flexible_apy = 500; // 5%
        config.apy_30_days = 700; // 7%
        config.apy_90_days = 1000; // 10%
        config.apy_180_days = 1300; // 13%
        config.apy_365_days = 1600; // 16%
        config.last_updated = Clock::get()?.unix_timestamp;

        emit!(StakingInitialized {
            authority: config.authority,
            rewards_pool: config.rewards_pool,
        });

        Ok(())
    }

    /// Create a new stake
    pub fn create_stake(
        ctx: Context<CreateStake>,
        amount: u64,
        stake_type: StakeType,
        lock_duration_days: u16,
    ) -> Result<()> {
        require!(amount >= MIN_STAKE_AMOUNT, ErrorCode::StakeAmountTooLow);
        require!(
            lock_duration_days == 0
                || lock_duration_days == 30
                || lock_duration_days == 90
                || lock_duration_days == 180
                || lock_duration_days == 365,
            ErrorCode::InvalidLockDuration
        );

        let config = &mut ctx.accounts.config;
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        // Determine APY rate based on lock duration
        let apy_rate = match lock_duration_days {
            0 => config.flexible_apy,
            30 => config.apy_30_days,
            90 => config.apy_90_days,
            180 => config.apy_180_days,
            365 => config.apy_365_days,
            _ => return Err(ErrorCode::InvalidLockDuration.into()),
        };

        // Calculate end time for fixed-term stakes
        let end_time = if lock_duration_days > 0 {
            clock
                .unix_timestamp
                .checked_add((lock_duration_days as i64) * 86400)
                .ok_or(ErrorCode::MathOverflow)?
        } else {
            0
        };

        // Transfer tokens from user to staking vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.staking_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Initialize stake account
        stake_account.user = ctx.accounts.user.key();
        stake_account.amount = amount;
        stake_account.stake_type = stake_type;
        stake_account.lock_duration_days = lock_duration_days;
        stake_account.apy_rate = apy_rate;
        stake_account.start_time = clock.unix_timestamp;
        stake_account.end_time = end_time;
        stake_account.last_claim_time = clock.unix_timestamp;
        stake_account.rewards_earned = 0;
        stake_account.is_active = true;
        stake_account.priority_tier = calculate_priority_tier(amount);

        // Update global stats
        config.total_staked = config
            .total_staked
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(TokensStaked {
            user: ctx.accounts.user.key(),
            amount,
            stake_type,
            lock_duration_days,
            apy_rate,
            priority_tier: stake_account.priority_tier,
        });

        Ok(())
    }

    /// Claim accumulated rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let config = &mut ctx.accounts.config;
        let clock = Clock::get()?;

        require!(stake_account.is_active, ErrorCode::StakeNotActive);

        // Calculate accumulated rewards
        let seconds_elapsed = clock
            .unix_timestamp
            .checked_sub(stake_account.last_claim_time)
            .ok_or(ErrorCode::MathOverflow)? as u64;

        let rewards_per_second = calculate_rewards_per_second(
            stake_account.amount,
            stake_account.apy_rate,
        )?;

        let rewards = rewards_per_second
            .checked_mul(seconds_elapsed)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(rewards > 0, ErrorCode::NoRewardsToClaim);
        require!(
            rewards <= config.rewards_remaining,
            ErrorCode::InsufficientRewardsPool
        );

        // Transfer rewards from pool to user
        let seeds = &[b"staking_vault".as_ref(), &[ctx.bumps.staking_vault]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.rewards_pool.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.staking_vault.to_account_info(),
                },
                signer,
            ),
            rewards,
        )?;

        // Update stake account
        stake_account.last_claim_time = clock.unix_timestamp;
        stake_account.rewards_earned = 0;

        // Update config
        config.rewards_remaining = config
            .rewards_remaining
            .checked_sub(rewards)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(RewardsClaimed {
            user: ctx.accounts.user.key(),
            amount: rewards,
        });

        Ok(())
    }

    /// Unstake tokens (full or partial)
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let config = &mut ctx.accounts.config;
        let clock = Clock::get()?;

        require!(stake_account.is_active, ErrorCode::StakeNotActive);
        require!(
            amount <= stake_account.amount,
            ErrorCode::InsufficientStakedAmount
        );

        let unstake_amount = if amount == 0 {
            stake_account.amount
        } else {
            amount
        };

        // Check if early unstake penalty applies
        let is_early_unstake = stake_account.stake_type == StakeType::FixedTerm
            && clock.unix_timestamp < stake_account.end_time;

        let penalty_amount = if is_early_unstake {
            unstake_amount
                .checked_mul(EARLY_UNSTAKE_PENALTY_BPS)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(10000)
                .ok_or(ErrorCode::MathOverflow)?
        } else {
            0
        };

        let amount_to_return = unstake_amount
            .checked_sub(penalty_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        let seeds = &[b"staking_vault".as_ref(), &[ctx.bumps.staking_vault]];
        let signer = &[&seeds[..]];

        // Transfer tokens back to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.staking_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.staking_vault.to_account_info(),
                },
                signer,
            ),
            amount_to_return,
        )?;

        // Transfer penalty to treasury if applicable
        if penalty_amount > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.staking_vault.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                        authority: ctx.accounts.staking_vault.to_account_info(),
                    },
                    signer,
                ),
                penalty_amount,
            )?;
        }

        // Update stake account
        stake_account.amount = stake_account
            .amount
            .checked_sub(unstake_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        if stake_account.amount == 0 {
            stake_account.is_active = false;
        }

        stake_account.priority_tier = calculate_priority_tier(stake_account.amount);

        // Update global stats
        config.total_staked = config
            .total_staked
            .checked_sub(unstake_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(TokensUnstaked {
            user: ctx.accounts.user.key(),
            amount: unstake_amount,
            penalty: penalty_amount,
            amount_returned: amount_to_return,
        });

        Ok(())
    }

    /// Update APY rates (governance only)
    pub fn update_apy_rates(
        ctx: Context<UpdateApyRates>,
        flexible_apy: u16,
        apy_30_days: u16,
        apy_90_days: u16,
        apy_180_days: u16,
        apy_365_days: u16,
    ) -> Result<()> {
        require!(flexible_apy <= 10000, ErrorCode::InvalidApyRate);
        require!(apy_30_days <= 10000, ErrorCode::InvalidApyRate);
        require!(apy_90_days <= 10000, ErrorCode::InvalidApyRate);
        require!(apy_180_days <= 10000, ErrorCode::InvalidApyRate);
        require!(apy_365_days <= 10000, ErrorCode::InvalidApyRate);

        let config = &mut ctx.accounts.config;
        config.flexible_apy = flexible_apy;
        config.apy_30_days = apy_30_days;
        config.apy_90_days = apy_90_days;
        config.apy_180_days = apy_180_days;
        config.apy_365_days = apy_365_days;
        config.last_updated = Clock::get()?.unix_timestamp;

        emit!(ApyRatesUpdated {
            flexible_apy,
            apy_30_days,
            apy_90_days,
            apy_180_days,
            apy_365_days,
        });

        Ok(())
    }

    /// Get user priority tier (public query for other programs)
    pub fn get_user_priority_tier(
        _ctx: Context<GetUserPriorityTier>,
        total_staked: u64,
    ) -> Result<u8> {
        Ok(calculate_priority_tier(total_staked))
    }
}

// Helper Functions

fn calculate_priority_tier(amount: u64) -> u8 {
    let amount_tokens = amount / 10u64.pow(9);
    if amount_tokens >= 100_000 {
        3
    } else if amount_tokens >= 10_000 {
        2
    } else if amount_tokens >= 1_000 {
        1
    } else {
        0
    }
}

fn calculate_rewards_per_second(amount: u64, apy_rate: u16) -> Result<u64> {
    let annual_rewards = amount
        .checked_mul(apy_rate as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;

    let rewards_per_second = annual_rewards
        .checked_div(SECONDS_PER_YEAR)
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(rewards_per_second)
}

// Account Structures

#[account]
pub struct StakingConfig {
    pub authority: Pubkey,
    pub rewards_pool: Pubkey,
    pub rewards_remaining: u64,
    pub total_staked: u64,
    pub flexible_apy: u16,
    pub apy_30_days: u16,
    pub apy_90_days: u16,
    pub apy_180_days: u16,
    pub apy_365_days: u16,
    pub last_updated: i64,
}

#[account]
pub struct StakeAccount {
    pub user: Pubkey,
    pub amount: u64,
    pub stake_type: StakeType,
    pub lock_duration_days: u16,
    pub apy_rate: u16,
    pub start_time: i64,
    pub end_time: i64,
    pub last_claim_time: i64,
    pub rewards_earned: u64,
    pub is_active: bool,
    pub priority_tier: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum StakeType {
    Flexible,
    FixedTerm,
}

// Context Structures

#[derive(Accounts)]
pub struct InitializeStaking<'info> {
    #[account(
        init,
        payer = deployer,
        space = 8 + 32 + 32 + 8 + 8 + 2 + 2 + 2 + 2 + 2 + 8,
        seeds = [b"staking_config"],
        bump
    )]
    pub config: Account<'info, StakingConfig>,

    #[account(mut)]
    pub rewards_pool: Account<'info, TokenAccount>,

    /// CHECK: Governance program
    pub governance_program: AccountInfo<'info>,

    #[account(mut)]
    pub deployer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateStake<'info> {
    #[account(mut, seeds = [b"staking_config"], bump)]
    pub config: Account<'info, StakingConfig>,

    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 1 + 2 + 2 + 8 + 8 + 8 + 8 + 1 + 1,
        seeds = [b"stake", user.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"staking_vault"],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut, seeds = [b"staking_config"], bump)]
    pub config: Account<'info, StakingConfig>,

    #[account(
        mut,
        has_one = user,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"staking_vault"],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub rewards_pool: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut, seeds = [b"staking_config"], bump)]
    pub config: Account<'info, StakingConfig>,

    #[account(
        mut,
        has_one = user,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"staking_vault"],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateApyRates<'info> {
    #[account(
        mut,
        seeds = [b"staking_config"],
        bump,
        has_one = authority
    )]
    pub config: Account<'info, StakingConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetUserPriorityTier<'info> {
    pub config: Account<'info, StakingConfig>,
}

// Events

#[event]
pub struct StakingInitialized {
    pub authority: Pubkey,
    pub rewards_pool: Pubkey,
}

#[event]
pub struct TokensStaked {
    pub user: Pubkey,
    pub amount: u64,
    pub stake_type: StakeType,
    pub lock_duration_days: u16,
    pub apy_rate: u16,
    pub priority_tier: u8,
}

#[event]
pub struct RewardsClaimed {
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TokensUnstaked {
    pub user: Pubkey,
    pub amount: u64,
    pub penalty: u64,
    pub amount_returned: u64,
}

#[event]
pub struct ApyRatesUpdated {
    pub flexible_apy: u16,
    pub apy_30_days: u16,
    pub apy_90_days: u16,
    pub apy_180_days: u16,
    pub apy_365_days: u16,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Stake amount too low")]
    StakeAmountTooLow,
    #[msg("Invalid lock duration")]
    InvalidLockDuration,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Stake not active")]
    StakeNotActive,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    #[msg("Insufficient rewards pool")]
    InsufficientRewardsPool,
    #[msg("Insufficient staked amount")]
    InsufficientStakedAmount,
    #[msg("Invalid APY rate")]
    InvalidApyRate,
}
