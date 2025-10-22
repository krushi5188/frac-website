use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

declare_id!("FRACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

const MAX_WHITELIST_SIZE: usize = 10_000;
const CACHE_DURATION: i64 = 300; // 5 minutes

#[program]
pub mod access_control {
    use super::*;

    /// Initialize access control program
    pub fn initialize_access_control(ctx: Context<InitializeAccessControl>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.governance_program.key();
        config.tier_thresholds = [
            0,
            5_000 * 10u64.pow(9),     // Tier 1: Bronze
            15_000 * 10u64.pow(9),    // Tier 2: Silver
            50_000 * 10u64.pow(9),    // Tier 3: Gold
            150_000 * 10u64.pow(9),   // Tier 4: Platinum
        ];
        config.whitelisted_programs = Vec::new();
        config.paused = false;

        emit!(AccessControlInitialized {
            authority: config.authority,
        });

        Ok(())
    }

    /// Create a new access gate
    pub fn create_access_gate(
        ctx: Context<CreateAccessGate>,
        gate_id: String,
        required_tier: u8,
        description: String,
    ) -> Result<()> {
        require!(!gate_id.is_empty(), ErrorCode::InvalidGateId);
        require!(required_tier <= 4, ErrorCode::InvalidTier);
        require!(!description.is_empty(), ErrorCode::EmptyDescription);

        let gate = &mut ctx.accounts.gate;
        gate.gate_id = gate_id.clone();
        gate.required_tier = required_tier;
        gate.whitelist = Vec::new();
        gate.blacklist = Vec::new();
        gate.active = true;
        gate.description = description.clone();

        emit!(GateCreated {
            gate_id,
            required_tier,
            description,
        });

        Ok(())
    }

    /// Check if user has access to a gate (public query)
    pub fn check_access(
        ctx: Context<CheckAccess>,
        user: Pubkey,
    ) -> Result<(bool, u8, u64)> {
        let gate = &ctx.accounts.gate;
        let config = &ctx.accounts.config;

        require!(gate.active, ErrorCode::GateNotActive);

        // Check blacklist first
        if gate.blacklist.contains(&user) {
            return Ok((false, 0, 0));
        }

        // Check whitelist - bypasses tier requirement
        if gate.whitelist.contains(&user) {
            return Ok((true, 4, 0)); // Grant max tier for whitelisted
        }

        // Calculate access score: holdings + (2 * staked)
        // In production, would query token balance and staking program
        let holdings = 0; // Placeholder
        let staked = 0; // Placeholder

        let access_score = holdings
            .checked_add(staked.checked_mul(2).ok_or(ErrorCode::MathOverflow)?)
            .ok_or(ErrorCode::MathOverflow)?;

        // Determine tier
        let user_tier = determine_tier(&config.tier_thresholds, access_score);

        // Check access
        let has_access = user_tier >= gate.required_tier;

        Ok((has_access, user_tier, access_score))
    }

    /// Get user's current tier (public query)
    pub fn get_user_tier(
        ctx: Context<GetUserTier>,
        user: Pubkey,
    ) -> Result<(u8, u64, u64, u64)> {
        let config = &ctx.accounts.config;
        let cache = &ctx.accounts.cache;
        let clock = Clock::get()?;

        // Check if cache is valid
        if cache.user == user
            && cache.last_updated > 0
            && clock.unix_timestamp < cache.stale_after
        {
            let next_tier_threshold = if (cache.last_calculated_tier as usize) < 4 {
                config.tier_thresholds[(cache.last_calculated_tier as usize) + 1]
            } else {
                0
            };
            let tokens_needed = next_tier_threshold
                .saturating_sub(cache.last_calculated_score);

            return Ok((
                cache.last_calculated_tier,
                cache.last_calculated_score,
                next_tier_threshold,
                tokens_needed,
            ));
        }

        // Recalculate (simplified - would query token and staking programs)
        let holdings = 0; // Placeholder
        let staked = 0; // Placeholder
        let access_score = holdings + (staked * 2);
        let tier = determine_tier(&config.tier_thresholds, access_score);

        let next_tier_threshold = if (tier as usize) < 4 {
            config.tier_thresholds[(tier as usize) + 1]
        } else {
            0
        };
        let tokens_needed = next_tier_threshold.saturating_sub(access_score);

        Ok((tier, access_score, next_tier_threshold, tokens_needed))
    }

    /// Add user to gate whitelist
    pub fn add_to_whitelist(
        ctx: Context<ModifyGateList>,
        user: Pubkey,
    ) -> Result<()> {
        let gate = &mut ctx.accounts.gate;

        require!(
            gate.whitelist.len() < MAX_WHITELIST_SIZE,
            ErrorCode::WhitelistFull
        );
        require!(
            !gate.whitelist.contains(&user),
            ErrorCode::AlreadyWhitelisted
        );

        gate.whitelist.push(user);

        emit!(UserWhitelisted {
            gate_id: gate.gate_id.clone(),
            user,
        });

        Ok(())
    }

    /// Add user to gate blacklist
    pub fn add_to_blacklist(
        ctx: Context<ModifyGateList>,
        user: Pubkey,
    ) -> Result<()> {
        let gate = &mut ctx.accounts.gate;

        require!(
            !gate.blacklist.contains(&user),
            ErrorCode::AlreadyBlacklisted
        );

        // Remove from whitelist if present
        if let Some(pos) = gate.whitelist.iter().position(|&x| x == user) {
            gate.whitelist.remove(pos);
        }

        gate.blacklist.push(user);

        emit!(UserBlacklisted {
            gate_id: gate.gate_id.clone(),
            user,
        });

        Ok(())
    }

    /// Update tier thresholds
    pub fn update_tier_thresholds(
        ctx: Context<UpdateTierThresholds>,
        new_thresholds: [u64; 5],
    ) -> Result<()> {
        // Verify ascending order
        for i in 0..4 {
            require!(
                new_thresholds[i] < new_thresholds[i + 1],
                ErrorCode::InvalidThresholds
            );
        }
        require!(new_thresholds[0] == 0, ErrorCode::InvalidThresholds);

        let config = &mut ctx.accounts.config;
        config.tier_thresholds = new_thresholds;

        emit!(TierThresholdsUpdated { new_thresholds });

        Ok(())
    }

    /// Toggle gate active status
    pub fn toggle_gate(ctx: Context<ToggleGate>, active: bool) -> Result<()> {
        let gate = &mut ctx.accounts.gate;
        gate.active = active;

        emit!(GateToggled {
            gate_id: gate.gate_id.clone(),
            active,
        });

        Ok(())
    }

    /// Update user access cache
    pub fn update_cache(
        ctx: Context<UpdateCache>,
        tier: u8,
        score: u64,
    ) -> Result<()> {
        let cache = &mut ctx.accounts.cache;
        let clock = Clock::get()?;

        cache.user = ctx.accounts.user.key();
        cache.last_calculated_tier = tier;
        cache.last_calculated_score = score;
        cache.last_updated = clock.unix_timestamp;
        cache.stale_after = clock
            .unix_timestamp
            .checked_add(CACHE_DURATION)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }
}

// Helper Functions

fn determine_tier(thresholds: &[u64; 5], score: u64) -> u8 {
    if score >= thresholds[4] {
        4 // Platinum
    } else if score >= thresholds[3] {
        3 // Gold
    } else if score >= thresholds[2] {
        2 // Silver
    } else if score >= thresholds[1] {
        1 // Bronze
    } else {
        0 // Public
    }
}

// Account Structures

#[account]
pub struct AccessControlConfig {
    pub authority: Pubkey,
    pub tier_thresholds: [u64; 5],
    pub whitelisted_programs: Vec<Pubkey>,
    pub paused: bool,
}

#[account]
pub struct AccessGate {
    pub gate_id: String,
    pub required_tier: u8,
    pub whitelist: Vec<Pubkey>,
    pub blacklist: Vec<Pubkey>,
    pub active: bool,
    pub description: String,
}

#[account]
pub struct UserAccessCache {
    pub user: Pubkey,
    pub last_calculated_tier: u8,
    pub last_calculated_score: u64,
    pub last_updated: i64,
    pub stale_after: i64,
}

// Context Structures

#[derive(Accounts)]
pub struct InitializeAccessControl<'info> {
    #[account(
        init,
        payer = deployer,
        space = 8 + 32 + 40 + 256 + 1,
        seeds = [b"access_control_config"],
        bump
    )]
    pub config: Account<'info, AccessControlConfig>,

    /// CHECK: Governance program
    pub governance_program: AccountInfo<'info>,

    #[account(mut)]
    pub deployer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(gate_id: String)]
pub struct CreateAccessGate<'info> {
    #[account(seeds = [b"access_control_config"], bump, has_one = authority)]
    pub config: Account<'info, AccessControlConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + 64 + 1 + 512 + 512 + 1 + 256,
        seeds = [b"access_gate", gate_id.as_bytes()],
        bump
    )]
    pub gate: Account<'info, AccessGate>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckAccess<'info> {
    pub config: Account<'info, AccessControlConfig>,
    pub gate: Account<'info, AccessGate>,
}

#[derive(Accounts)]
pub struct GetUserTier<'info> {
    pub config: Account<'info, AccessControlConfig>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 32 + 1 + 8 + 8 + 8,
        seeds = [b"user_cache", user.key().as_ref()],
        bump
    )]
    pub cache: Account<'info, UserAccessCache>,

    /// CHECK: User to check tier for
    pub user: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModifyGateList<'info> {
    #[account(seeds = [b"access_control_config"], bump, has_one = authority)]
    pub config: Account<'info, AccessControlConfig>,

    #[account(mut)]
    pub gate: Account<'info, AccessGate>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateTierThresholds<'info> {
    #[account(
        mut,
        seeds = [b"access_control_config"],
        bump,
        has_one = authority
    )]
    pub config: Account<'info, AccessControlConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ToggleGate<'info> {
    #[account(seeds = [b"access_control_config"], bump, has_one = authority)]
    pub config: Account<'info, AccessControlConfig>,

    #[account(mut)]
    pub gate: Account<'info, AccessGate>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateCache<'info> {
    #[account(
        mut,
        seeds = [b"user_cache", user.key().as_ref()],
        bump
    )]
    pub cache: Account<'info, UserAccessCache>,

    pub user: Signer<'info>,
}

// Events

#[event]
pub struct AccessControlInitialized {
    pub authority: Pubkey,
}

#[event]
pub struct GateCreated {
    pub gate_id: String,
    pub required_tier: u8,
    pub description: String,
}

#[event]
pub struct UserWhitelisted {
    pub gate_id: String,
    pub user: Pubkey,
}

#[event]
pub struct UserBlacklisted {
    pub gate_id: String,
    pub user: Pubkey,
}

#[event]
pub struct TierThresholdsUpdated {
    pub new_thresholds: [u64; 5],
}

#[event]
pub struct GateToggled {
    pub gate_id: String,
    pub active: bool,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid gate ID")]
    InvalidGateId,
    #[msg("Invalid tier")]
    InvalidTier,
    #[msg("Empty description")]
    EmptyDescription,
    #[msg("Gate not active")]
    GateNotActive,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Whitelist full")]
    WhitelistFull,
    #[msg("Already whitelisted")]
    AlreadyWhitelisted,
    #[msg("Already blacklisted")]
    AlreadyBlacklisted,
    #[msg("Invalid thresholds")]
    InvalidThresholds,
}
