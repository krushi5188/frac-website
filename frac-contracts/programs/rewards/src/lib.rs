use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FRACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

const SMALL_REWARD_THRESHOLD: u64 = 1_000 * 10u64.pow(9); // 1,000 $FRAC
const MEDIUM_REWARD_THRESHOLD: u64 = 10_000 * 10u64.pow(9); // 10,000 $FRAC
const YEAR_1_DURATION: i64 = 365 * 86400; // 365 days
const YEAR_2_DURATION: i64 = 730 * 86400; // 730 days
const YEAR_3_DURATION: i64 = 1095 * 86400; // 1095 days

#[program]
pub mod rewards {
    use super::*;

    /// Initialize rewards program
    pub fn initialize_rewards(ctx: Context<InitializeRewards>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.governance_program.key();
        config.rewards_pool = ctx.accounts.rewards_pool.key();
        config.rewards_distributed = 0;
        config.rewards_remaining = 450_000_000 * 10u64.pow(9); // 450M tokens
        config.rewards_vested_pending = 0;
        config.small_reward_threshold = SMALL_REWARD_THRESHOLD;
        config.medium_reward_threshold = MEDIUM_REWARD_THRESHOLD;
        config.active_reward_grants = 0;

        emit!(RewardsInitialized {
            authority: config.authority,
            rewards_pool: config.rewards_pool,
        });

        Ok(())
    }

    /// Grant reward to user
    pub fn grant_reward(
        ctx: Context<GrantReward>,
        grant_id: u64,
        reward_type: RewardType,
        amount: u64,
        vesting_duration: i64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let config = &mut ctx.accounts.config;
        require!(
            amount <= config.rewards_remaining,
            ErrorCode::InsufficientRewardsPool
        );

        let grant = &mut ctx.accounts.grant;
        let clock = Clock::get()?;

        // Determine vesting schedule based on amount
        let vesting_schedule = if amount < config.small_reward_threshold {
            VestingSchedule::Immediate
        } else if amount < config.medium_reward_threshold {
            VestingSchedule::Linear
        } else {
            VestingSchedule::Milestone
        };

        grant.grant_id = grant_id;
        grant.recipient = ctx.accounts.recipient.key();
        grant.reward_type = reward_type;
        grant.total_amount = amount;
        grant.vesting_schedule = vesting_schedule.clone();
        grant.grant_time = clock.unix_timestamp;
        grant.vesting_duration = match vesting_schedule {
            VestingSchedule::Immediate => 0,
            VestingSchedule::Linear => vesting_duration,
            VestingSchedule::Milestone => YEAR_3_DURATION,
        };
        grant.claimed_amount = 0;
        grant.milestone_stage = 0;
        grant.stage_1_unlocked = false;
        grant.stage_2_unlocked = false;
        grant.stage_3_unlocked = false;
        grant.status = GrantStatus::Active;

        // Lock tokens in vesting
        config.rewards_vested_pending = config
            .rewards_vested_pending
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        config.active_reward_grants = config
            .active_reward_grants
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(RewardGranted {
            grant_id,
            recipient: grant.recipient,
            reward_type,
            amount,
            vesting_schedule,
        });

        Ok(())
    }

    /// Claim vested rewards
    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let grant = &mut ctx.accounts.grant;
        let config = &mut ctx.accounts.config;
        let clock = Clock::get()?;

        require!(grant.status == GrantStatus::Active, ErrorCode::GrantNotActive);

        // Calculate claimable amount based on vesting schedule
        let claimable = match grant.vesting_schedule {
            VestingSchedule::Immediate => {
                grant.total_amount.checked_sub(grant.claimed_amount)
                    .ok_or(ErrorCode::MathOverflow)?
            }
            VestingSchedule::Linear => {
                let elapsed = clock
                    .unix_timestamp
                    .checked_sub(grant.grant_time)
                    .ok_or(ErrorCode::MathOverflow)? as u64;
                let vested = if elapsed >= grant.vesting_duration as u64 {
                    grant.total_amount
                } else {
                    grant
                        .total_amount
                        .checked_mul(elapsed)
                        .ok_or(ErrorCode::MathOverflow)?
                        .checked_div(grant.vesting_duration as u64)
                        .ok_or(ErrorCode::MathOverflow)?
                };
                vested
                    .checked_sub(grant.claimed_amount)
                    .ok_or(ErrorCode::MathOverflow)?
            }
            VestingSchedule::Milestone => {
                let mut unlocked_percentage = 0u64;
                if grant.stage_1_unlocked {
                    unlocked_percentage += 10; // 10%
                }
                if grant.stage_2_unlocked {
                    unlocked_percentage += 30; // 30%
                }
                if grant.stage_3_unlocked {
                    unlocked_percentage += 60; // 60%
                }

                let unlocked = grant
                    .total_amount
                    .checked_mul(unlocked_percentage)
                    .ok_or(ErrorCode::MathOverflow)?
                    .checked_div(100)
                    .ok_or(ErrorCode::MathOverflow)?;

                unlocked
                    .checked_sub(grant.claimed_amount)
                    .ok_or(ErrorCode::MathOverflow)?
            }
        };

        require!(claimable > 0, ErrorCode::NoClaimableRewards);

        // Transfer rewards from pool to recipient
        let seeds = &[b"rewards_vault".as_ref(), &[ctx.bumps.rewards_vault]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.rewards_pool.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.rewards_vault.to_account_info(),
                },
                signer,
            ),
            claimable,
        )?;

        // Update grant
        grant.claimed_amount = grant
            .claimed_amount
            .checked_add(claimable)
            .ok_or(ErrorCode::MathOverflow)?;

        if grant.claimed_amount == grant.total_amount {
            grant.status = GrantStatus::Completed;
            config.active_reward_grants = config
                .active_reward_grants
                .checked_sub(1)
                .ok_or(ErrorCode::MathOverflow)?;
        }

        // Update config
        config.rewards_distributed = config
            .rewards_distributed
            .checked_add(claimable)
            .ok_or(ErrorCode::MathOverflow)?;

        config.rewards_remaining = config
            .rewards_remaining
            .checked_sub(claimable)
            .ok_or(ErrorCode::MathOverflow)?;

        config.rewards_vested_pending = config
            .rewards_vested_pending
            .checked_sub(claimable)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(RewardClaimed {
            grant_id: grant.grant_id,
            recipient: grant.recipient,
            amount: claimable,
        });

        Ok(())
    }

    /// Record user activity for milestone tracking
    pub fn record_activity(
        ctx: Context<RecordActivity>,
        activity_type: ActivityType,
        amount: u64,
    ) -> Result<()> {
        let progress = &mut ctx.accounts.milestone_progress;

        // Initialize if needed
        if progress.user == Pubkey::default() {
            progress.user = ctx.accounts.user.key();
        }

        // Update relevant counter
        match activity_type {
            ActivityType::Trading => {
                progress.total_trading_volume = progress
                    .total_trading_volume
                    .checked_add(amount)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            ActivityType::Staking => {
                progress.total_staking_days = progress
                    .total_staking_days
                    .checked_add(amount)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            ActivityType::Voting => {
                progress.governance_votes_cast = progress
                    .governance_votes_cast
                    .checked_add(1)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            ActivityType::VaultCreation => {
                progress.vaults_created = progress
                    .vaults_created
                    .checked_add(1)
                    .ok_or(ErrorCode::MathOverflow)?;
                progress.vault_tvl_achieved = progress
                    .vault_tvl_achieved
                    .checked_add(amount)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            ActivityType::Referral => {
                progress.referrals_completed = progress
                    .referrals_completed
                    .checked_add(1)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            ActivityType::TierHolding => {
                progress.tier_2_days = progress
                    .tier_2_days
                    .checked_add(amount as u32)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
        }

        progress.last_updated = Clock::get()?.unix_timestamp;

        emit!(ActivityRecorded {
            user: ctx.accounts.user.key(),
            activity_type,
            amount,
        });

        Ok(())
    }

    /// Unlock milestone stage
    pub fn unlock_milestone_stage(
        ctx: Context<UnlockMilestoneStage>,
        stage: u8,
    ) -> Result<()> {
        require!(stage >= 1 && stage <= 3, ErrorCode::InvalidStage);

        let grant = &mut ctx.accounts.grant;
        let progress = &ctx.accounts.milestone_progress;
        let clock = Clock::get()?;

        require!(
            grant.vesting_schedule == VestingSchedule::Milestone,
            ErrorCode::NotMilestoneVesting
        );

        // Check time requirement
        let required_time = match stage {
            1 => grant.grant_time + YEAR_1_DURATION,
            2 => grant.grant_time + YEAR_2_DURATION,
            3 => grant.grant_time + YEAR_3_DURATION,
            _ => return Err(ErrorCode::InvalidStage.into()),
        };

        require!(
            clock.unix_timestamp >= required_time,
            ErrorCode::TimeRequirementNotMet
        );

        // Verify milestones completed
        let milestones_met = match stage {
            1 => check_year_1_milestones(progress),
            2 => check_year_2_milestones(progress) && grant.stage_1_unlocked,
            3 => check_year_3_milestones(progress) && grant.stage_2_unlocked,
            _ => false,
        };

        require!(milestones_met, ErrorCode::MilestonesNotMet);

        // Unlock stage
        match stage {
            1 => {
                require!(!grant.stage_1_unlocked, ErrorCode::AlreadyUnlocked);
                grant.stage_1_unlocked = true;
            }
            2 => {
                require!(!grant.stage_2_unlocked, ErrorCode::AlreadyUnlocked);
                grant.stage_2_unlocked = true;
            }
            3 => {
                require!(!grant.stage_3_unlocked, ErrorCode::AlreadyUnlocked);
                grant.stage_3_unlocked = true;
            }
            _ => return Err(ErrorCode::InvalidStage.into()),
        }

        grant.milestone_stage = stage;

        emit!(MilestoneStageUnlocked {
            grant_id: grant.grant_id,
            recipient: grant.recipient,
            stage,
        });

        Ok(())
    }

    /// Create referral code
    pub fn create_referral_code(ctx: Context<CreateReferralCode>) -> Result<()> {
        let referral = &mut ctx.accounts.referral;
        let clock = Clock::get()?;

        // Generate unique code (simplified - in production use proper random generation)
        let code = format!("REF{}", clock.unix_timestamp);

        referral.referrer = ctx.accounts.user.key();
        referral.code = code.clone();
        referral.total_referrals = 0;
        referral.created_at = clock.unix_timestamp;

        emit!(ReferralCodeCreated {
            referrer: ctx.accounts.user.key(),
            code,
        });

        Ok(())
    }

    /// Update reward parameters (governance only)
    pub fn update_reward_params(
        ctx: Context<UpdateRewardParams>,
        small_threshold: Option<u64>,
        medium_threshold: Option<u64>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(threshold) = small_threshold {
            config.small_reward_threshold = threshold;
        }

        if let Some(threshold) = medium_threshold {
            config.medium_reward_threshold = threshold;
        }

        emit!(ParamsUpdated {
            small_threshold: config.small_reward_threshold,
            medium_threshold: config.medium_reward_threshold,
        });

        Ok(())
    }
}

// Helper Functions

fn check_year_1_milestones(progress: &MilestoneProgress) -> bool {
    let mut met = 0;

    // Milestone 1: 10k trading volume
    if progress.total_trading_volume >= 10_000 * 10u64.pow(9) {
        met += 1;
    }
    // Milestone 2: 90 staking days
    if progress.total_staking_days >= 90 {
        met += 1;
    }
    // Milestone 3: 5 votes
    if progress.governance_votes_cast >= 5 {
        met += 1;
    }
    // Milestone 4: 3 referrals
    if progress.referrals_completed >= 3 {
        met += 1;
    }

    met >= 2 // Need 2 of 4
}

fn check_year_2_milestones(progress: &MilestoneProgress) -> bool {
    let mut met = 0;

    if progress.total_trading_volume >= 50_000 * 10u64.pow(9) {
        met += 1;
    }
    if progress.total_staking_days >= 180 {
        met += 1;
    }
    if progress.governance_votes_cast >= 15 {
        met += 1;
    }
    if progress.vaults_created >= 1 && progress.vault_tvl_achieved >= 10_000 * 10u64.pow(9) {
        met += 1;
    }
    if progress.referrals_completed >= 10 {
        met += 1;
    }

    met >= 3 // Need 3 of 5
}

fn check_year_3_milestones(progress: &MilestoneProgress) -> bool {
    let mut met = 0;

    if progress.total_trading_volume >= 200_000 * 10u64.pow(9) {
        met += 1;
    }
    if progress.total_staking_days >= 365 {
        met += 1;
    }
    if progress.governance_votes_cast >= 30 {
        met += 1;
    }
    if progress.vaults_created >= 3 && progress.vault_tvl_achieved >= 50_000 * 10u64.pow(9) {
        met += 1;
    }
    if progress.referrals_completed >= 25 {
        met += 1;
    }
    if progress.tier_2_days >= 180 {
        met += 1;
    }

    met >= 3 // Need 3 of 6
}

// Account Structures

#[account]
pub struct RewardsConfig {
    pub authority: Pubkey,
    pub rewards_pool: Pubkey,
    pub rewards_distributed: u64,
    pub rewards_remaining: u64,
    pub rewards_vested_pending: u64,
    pub small_reward_threshold: u64,
    pub medium_reward_threshold: u64,
    pub active_reward_grants: u32,
}

#[account]
pub struct RewardGrant {
    pub grant_id: u64,
    pub recipient: Pubkey,
    pub reward_type: RewardType,
    pub total_amount: u64,
    pub vesting_schedule: VestingSchedule,
    pub grant_time: i64,
    pub vesting_duration: i64,
    pub claimed_amount: u64,
    pub milestone_stage: u8,
    pub stage_1_unlocked: bool,
    pub stage_2_unlocked: bool,
    pub stage_3_unlocked: bool,
    pub status: GrantStatus,
}

#[account]
pub struct MilestoneProgress {
    pub user: Pubkey,
    pub total_trading_volume: u64,
    pub total_staking_days: u64,
    pub governance_votes_cast: u32,
    pub vaults_created: u32,
    pub vault_tvl_achieved: u64,
    pub referrals_completed: u32,
    pub tier_2_days: u32,
    pub last_updated: i64,
}

#[account]
pub struct ReferralCode {
    pub referrer: Pubkey,
    pub code: String,
    pub total_referrals: u32,
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum RewardType {
    TradingRebate,
    LiquidityProvision,
    Referral,
    GovernanceVoting,
    VaultCreation,
    TesterAirdrop,
    CommunityGrant,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VestingSchedule {
    Immediate,
    Linear,
    Milestone,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GrantStatus {
    Active,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ActivityType {
    Trading,
    Staking,
    Voting,
    VaultCreation,
    Referral,
    TierHolding,
}

// Context Structures

#[derive(Accounts)]
pub struct InitializeRewards<'info> {
    #[account(
        init,
        payer = deployer,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 4,
        seeds = [b"rewards_config"],
        bump
    )]
    pub config: Account<'info, RewardsConfig>,

    #[account(mut)]
    pub rewards_pool: Account<'info, TokenAccount>,

    /// CHECK: Governance program
    pub governance_program: AccountInfo<'info>,

    #[account(
        seeds = [b"rewards_vault"],
        bump
    )]
    /// CHECK: Rewards vault PDA
    pub rewards_vault: AccountInfo<'info>,

    #[account(mut)]
    pub deployer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(grant_id: u64)]
pub struct GrantReward<'info> {
    #[account(mut, seeds = [b"rewards_config"], bump)]
    pub config: Account<'info, RewardsConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 32 + 1 + 8 + 1 + 8 + 8 + 8 + 1 + 1 + 1 + 1 + 1,
        seeds = [b"reward_grant", grant_id.to_le_bytes().as_ref()],
        bump
    )]
    pub grant: Account<'info, RewardGrant>,

    /// CHECK: Reward recipient
    pub recipient: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut, seeds = [b"rewards_config"], bump)]
    pub config: Account<'info, RewardsConfig>,

    #[account(
        mut,
        has_one = recipient,
    )]
    pub grant: Account<'info, RewardGrant>,

    #[account(
        seeds = [b"rewards_vault"],
        bump
    )]
    /// CHECK: Rewards vault PDA
    pub rewards_vault: AccountInfo<'info>,

    #[account(mut)]
    pub rewards_pool: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient: Signer<'info>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RecordActivity<'info> {
    #[account(
        init_if_needed,
        payer = program_authority,
        space = 8 + 32 + 8 + 8 + 4 + 4 + 8 + 4 + 4 + 8,
        seeds = [b"milestone_progress", user.key().as_ref()],
        bump
    )]
    pub milestone_progress: Account<'info, MilestoneProgress>,

    /// CHECK: User whose activity is being recorded
    pub user: AccountInfo<'info>,

    /// CHECK: Whitelisted program calling this
    #[account(mut)]
    pub program_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnlockMilestoneStage<'info> {
    #[account(
        mut,
        has_one = recipient,
    )]
    pub grant: Account<'info, RewardGrant>,

    #[account(
        seeds = [b"milestone_progress", recipient.key().as_ref()],
        bump
    )]
    pub milestone_progress: Account<'info, MilestoneProgress>,

    #[account(mut)]
    pub recipient: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateReferralCode<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 4 + 8,
        seeds = [b"referral", user.key().as_ref()],
        bump
    )]
    pub referral: Account<'info, ReferralCode>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRewardParams<'info> {
    #[account(
        mut,
        seeds = [b"rewards_config"],
        bump,
        has_one = authority
    )]
    pub config: Account<'info, RewardsConfig>,

    pub authority: Signer<'info>,
}

// Events

#[event]
pub struct RewardsInitialized {
    pub authority: Pubkey,
    pub rewards_pool: Pubkey,
}

#[event]
pub struct RewardGranted {
    pub grant_id: u64,
    pub recipient: Pubkey,
    pub reward_type: RewardType,
    pub amount: u64,
    pub vesting_schedule: VestingSchedule,
}

#[event]
pub struct RewardClaimed {
    pub grant_id: u64,
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ActivityRecorded {
    pub user: Pubkey,
    pub activity_type: ActivityType,
    pub amount: u64,
}

#[event]
pub struct MilestoneStageUnlocked {
    pub grant_id: u64,
    pub recipient: Pubkey,
    pub stage: u8,
}

#[event]
pub struct ReferralCodeCreated {
    pub referrer: Pubkey,
    pub code: String,
}

#[event]
pub struct ParamsUpdated {
    pub small_threshold: u64,
    pub medium_threshold: u64,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient rewards pool")]
    InsufficientRewardsPool,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Grant not active")]
    GrantNotActive,
    #[msg("No claimable rewards")]
    NoClaimableRewards,
    #[msg("Invalid stage")]
    InvalidStage,
    #[msg("Not milestone vesting")]
    NotMilestoneVesting,
    #[msg("Time requirement not met")]
    TimeRequirementNotMet,
    #[msg("Milestones not met")]
    MilestonesNotMet,
    #[msg("Already unlocked")]
    AlreadyUnlocked,
}
