use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FRACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

const MIN_STAKE_TO_PROPOSE: u64 = 100_000 * 10u64.pow(9); // 100k $FRAC
const TIMELOCK_DELAY: i64 = 86400; // 24 hours
const MAX_ACTIONS: usize = 10;

#[program]
pub mod governance {
    use super::*;

    /// Initialize governance program
    pub fn initialize_governance(
        ctx: Context<InitializeGovernance>,
        treasury_wallet: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.deployer.key();
        config.proposal_count = 0;
        config.min_stake_to_propose = MIN_STAKE_TO_PROPOSE;
        config.active_proposals = 0;
        config.executed_proposals = 0;
        config.treasury_wallet = treasury_wallet;

        emit!(GovernanceInitialized {
            authority: config.authority,
            treasury_wallet,
        });

        Ok(())
    }

    /// Create a new proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        proposal_type: ProposalType,
        title: String,
        description_uri: String,
        executable_actions_data: Vec<u8>, // Serialized actions
    ) -> Result<()> {
        require!(title.len() <= 128, ErrorCode::TitleTooLong);
        require!(!description_uri.is_empty(), ErrorCode::EmptyDescription);
        require!(
            !executable_actions_data.is_empty(),
            ErrorCode::NoActionsProvided
        );

        let config = &mut ctx.accounts.config;
        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        // Verify proposer has enough staked (would query staking program in production)
        // For now, assume external validation

        // Determine voting duration and quorum based on proposal type
        let (voting_duration, quorum_threshold) = match proposal_type {
            ProposalType::Emergency => (172_800, 1000), // 2 days, 10%
            ProposalType::ParameterChange => (432_000, 1500), // 5 days, 15%
            ProposalType::TreasurySpending => (604_800, 2000), // 7 days, 20%
            ProposalType::ProtocolUpgrade => (1_209_600, 2500), // 14 days, 25%
        };

        proposal.proposal_id = config.proposal_count;
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.proposal_type = proposal_type;
        proposal.title = title.clone();
        proposal.description_uri = description_uri.clone();
        proposal.voting_start_time = clock.unix_timestamp;
        proposal.voting_end_time = clock
            .unix_timestamp
            .checked_add(voting_duration)
            .ok_or(ErrorCode::MathOverflow)?;
        proposal.snapshot_staked_supply = 0; // Would query from staking program
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.votes_abstain = 0;
        proposal.quorum_threshold = quorum_threshold;
        proposal.status = ProposalStatus::Active;
        proposal.executable_actions_data = executable_actions_data;
        proposal.execution_time = 0;

        config.proposal_count = config
            .proposal_count
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        config.active_proposals = config
            .active_proposals
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(ProposalCreated {
            proposal_id: proposal.proposal_id,
            proposer: proposal.proposer,
            proposal_type,
            title,
            voting_end_time: proposal.voting_end_time,
        });

        Ok(())
    }

    /// Cast a vote on a proposal
    pub fn cast_vote(
        ctx: Context<CastVote>,
        vote_choice: VoteChoice,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let vote_record = &mut ctx.accounts.vote_record;
        let clock = Clock::get()?;

        require!(
            proposal.status == ProposalStatus::Active,
            ErrorCode::ProposalNotActive
        );
        require!(
            clock.unix_timestamp < proposal.voting_end_time,
            ErrorCode::VotingPeriodEnded
        );

        // Query voting power from staking program (simplified for this implementation)
        let voting_power = 1000 * 10u64.pow(9); // Placeholder

        // If vote record exists, subtract old vote first
        if vote_record.voting_power > 0 {
            match vote_record.vote_choice {
                VoteChoice::For => {
                    proposal.votes_for = proposal
                        .votes_for
                        .checked_sub(vote_record.voting_power)
                        .ok_or(ErrorCode::MathOverflow)?;
                }
                VoteChoice::Against => {
                    proposal.votes_against = proposal
                        .votes_against
                        .checked_sub(vote_record.voting_power)
                        .ok_or(ErrorCode::MathOverflow)?;
                }
                VoteChoice::Abstain => {
                    proposal.votes_abstain = proposal
                        .votes_abstain
                        .checked_sub(vote_record.voting_power)
                        .ok_or(ErrorCode::MathOverflow)?;
                }
            }
        }

        // Add new vote
        match vote_choice {
            VoteChoice::For => {
                proposal.votes_for = proposal
                    .votes_for
                    .checked_add(voting_power)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            VoteChoice::Against => {
                proposal.votes_against = proposal
                    .votes_against
                    .checked_add(voting_power)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            VoteChoice::Abstain => {
                proposal.votes_abstain = proposal
                    .votes_abstain
                    .checked_add(voting_power)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
        }

        // Update vote record
        vote_record.proposal_id = proposal.proposal_id;
        vote_record.voter = ctx.accounts.voter.key();
        vote_record.voting_power = voting_power;
        vote_record.vote_choice = vote_choice;
        vote_record.timestamp = clock.unix_timestamp;

        emit!(VoteCast {
            proposal_id: proposal.proposal_id,
            voter: ctx.accounts.voter.key(),
            vote_choice,
            voting_power,
        });

        Ok(())
    }

    /// Finalize a proposal after voting ends
    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let config = &mut ctx.accounts.config;
        let clock = Clock::get()?;

        require!(
            proposal.status == ProposalStatus::Active,
            ErrorCode::ProposalNotActive
        );
        require!(
            clock.unix_timestamp >= proposal.voting_end_time,
            ErrorCode::VotingPeriodNotEnded
        );

        // Calculate quorum: (total votes) / (snapshot supply)
        let total_votes = proposal
            .votes_for
            .checked_add(proposal.votes_against)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_add(proposal.votes_abstain)
            .ok_or(ErrorCode::MathOverflow)?;

        // For simplicity, assume snapshot_staked_supply is set (would query from staking)
        let snapshot_supply = if proposal.snapshot_staked_supply == 0 {
            1_000_000 * 10u64.pow(9) // Placeholder
        } else {
            proposal.snapshot_staked_supply
        };

        let quorum_bps = total_votes
            .checked_mul(10000)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(snapshot_supply)
            .ok_or(ErrorCode::MathOverflow)?;

        // Calculate majority: votes_for / (votes_for + votes_against)
        let vote_count_for_majority = proposal
            .votes_for
            .checked_add(proposal.votes_against)
            .ok_or(ErrorCode::MathOverflow)?;

        let majority_bps = if vote_count_for_majority > 0 {
            proposal
                .votes_for
                .checked_mul(10000)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(vote_count_for_majority)
                .ok_or(ErrorCode::MathOverflow)?
        } else {
            0
        };

        // Determine outcome
        let passed = quorum_bps >= proposal.quorum_threshold && majority_bps > 5000; // >50%

        proposal.status = if passed {
            ProposalStatus::Passed
        } else {
            ProposalStatus::Failed
        };

        config.active_proposals = config
            .active_proposals
            .checked_sub(1)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(ProposalFinalized {
            proposal_id: proposal.proposal_id,
            passed,
            votes_for: proposal.votes_for,
            votes_against: proposal.votes_against,
            votes_abstain: proposal.votes_abstain,
        });

        Ok(())
    }

    /// Execute a passed proposal (after timelock)
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let config = &mut ctx.accounts.config;
        let clock = Clock::get()?;

        require!(
            proposal.status == ProposalStatus::Passed,
            ErrorCode::ProposalNotPassed
        );

        let timelock_end = proposal
            .voting_end_time
            .checked_add(TIMELOCK_DELAY)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(
            clock.unix_timestamp >= timelock_end,
            ErrorCode::TimelockNotExpired
        );

        // Execute actions (simplified - would perform CPIs to other programs)
        // In production, deserialize executable_actions_data and execute each action

        proposal.status = ProposalStatus::Executed;
        proposal.execution_time = clock.unix_timestamp;

        config.executed_proposals = config
            .executed_proposals
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(ProposalExecuted {
            proposal_id: proposal.proposal_id,
            execution_time: proposal.execution_time,
        });

        Ok(())
    }

    /// Cancel a proposal
    pub fn cancel_proposal(ctx: Context<CancelProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let config = &mut ctx.accounts.config;

        require!(
            proposal.status == ProposalStatus::Active
                || proposal.status == ProposalStatus::Pending,
            ErrorCode::CannotCancelProposal
        );

        proposal.status = ProposalStatus::Cancelled;

        config.active_proposals = config
            .active_proposals
            .checked_sub(1)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(ProposalCancelled {
            proposal_id: proposal.proposal_id,
            cancelled_by: ctx.accounts.authority.key(),
        });

        Ok(())
    }

    /// Update governance parameters (via proposal execution)
    pub fn update_governance_params(
        ctx: Context<UpdateGovernanceParams>,
        min_stake_to_propose: Option<u64>,
        new_authority: Option<Pubkey>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(min_stake) = min_stake_to_propose {
            config.min_stake_to_propose = min_stake;
        }

        if let Some(authority) = new_authority {
            config.authority = authority;
        }

        emit!(ParamsUpdated {
            min_stake_to_propose: config.min_stake_to_propose,
            authority: config.authority,
        });

        Ok(())
    }
}

// Account Structures

#[account]
pub struct GovernanceConfig {
    pub authority: Pubkey,
    pub proposal_count: u64,
    pub min_stake_to_propose: u64,
    pub active_proposals: u16,
    pub executed_proposals: u64,
    pub treasury_wallet: Pubkey,
}

#[account]
pub struct Proposal {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub proposal_type: ProposalType,
    pub title: String,
    pub description_uri: String,
    pub voting_start_time: i64,
    pub voting_end_time: i64,
    pub snapshot_staked_supply: u64,
    pub votes_for: u64,
    pub votes_against: u64,
    pub votes_abstain: u64,
    pub quorum_threshold: u16,
    pub status: ProposalStatus,
    pub executable_actions_data: Vec<u8>,
    pub execution_time: i64,
}

#[account]
pub struct VoteRecord {
    pub proposal_id: u64,
    pub voter: Pubkey,
    pub voting_power: u64,
    pub vote_choice: VoteChoice,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ProposalType {
    Emergency,
    ParameterChange,
    TreasurySpending,
    ProtocolUpgrade,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ProposalStatus {
    Pending,
    Active,
    Passed,
    Failed,
    Executed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum VoteChoice {
    For,
    Against,
    Abstain,
}

// Context Structures

#[derive(Accounts)]
pub struct InitializeGovernance<'info> {
    #[account(
        init,
        payer = deployer,
        space = 8 + 32 + 8 + 8 + 2 + 8 + 32,
        seeds = [b"governance_config"],
        bump
    )]
    pub config: Account<'info, GovernanceConfig>,

    #[account(mut)]
    pub deployer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut, seeds = [b"governance_config"], bump)]
    pub config: Account<'info, GovernanceConfig>,

    #[account(
        init,
        payer = proposer,
        space = 8 + 8 + 32 + 1 + 128 + 256 + 8 + 8 + 8 + 8 + 8 + 8 + 2 + 1 + 512 + 8,
        seeds = [b"proposal", config.proposal_count.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub proposer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,

    #[account(
        init_if_needed,
        payer = voter,
        space = 8 + 8 + 32 + 8 + 1 + 8,
        seeds = [b"vote_record", proposal.proposal_id.to_le_bytes().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    #[account(mut, seeds = [b"governance_config"], bump)]
    pub config: Account<'info, GovernanceConfig>,

    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut, seeds = [b"governance_config"], bump)]
    pub config: Account<'info, GovernanceConfig>,

    #[account(mut)]
    pub proposal: Account<'info, Proposal>,

    /// CHECK: Treasury wallet for fund transfers
    pub treasury_wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CancelProposal<'info> {
    #[account(mut, seeds = [b"governance_config"], bump)]
    pub config: Account<'info, GovernanceConfig>,

    #[account(
        mut,
        constraint = proposal.proposer == authority.key() || config.authority == authority.key()
    )]
    pub proposal: Account<'info, Proposal>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateGovernanceParams<'info> {
    #[account(
        mut,
        seeds = [b"governance_config"],
        bump,
        has_one = authority
    )]
    pub config: Account<'info, GovernanceConfig>,

    pub authority: Signer<'info>,
}

// Events

#[event]
pub struct GovernanceInitialized {
    pub authority: Pubkey,
    pub treasury_wallet: Pubkey,
}

#[event]
pub struct ProposalCreated {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub proposal_type: ProposalType,
    pub title: String,
    pub voting_end_time: i64,
}

#[event]
pub struct VoteCast {
    pub proposal_id: u64,
    pub voter: Pubkey,
    pub vote_choice: VoteChoice,
    pub voting_power: u64,
}

#[event]
pub struct ProposalFinalized {
    pub proposal_id: u64,
    pub passed: bool,
    pub votes_for: u64,
    pub votes_against: u64,
    pub votes_abstain: u64,
}

#[event]
pub struct ProposalExecuted {
    pub proposal_id: u64,
    pub execution_time: i64,
}

#[event]
pub struct ProposalCancelled {
    pub proposal_id: u64,
    pub cancelled_by: Pubkey,
}

#[event]
pub struct ParamsUpdated {
    pub min_stake_to_propose: u64,
    pub authority: Pubkey,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Title too long")]
    TitleTooLong,
    #[msg("Empty description")]
    EmptyDescription,
    #[msg("No actions provided")]
    NoActionsProvided,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Proposal not active")]
    ProposalNotActive,
    #[msg("Voting period ended")]
    VotingPeriodEnded,
    #[msg("Voting period not ended")]
    VotingPeriodNotEnded,
    #[msg("Proposal not passed")]
    ProposalNotPassed,
    #[msg("Timelock not expired")]
    TimelockNotExpired,
    #[msg("Cannot cancel proposal")]
    CannotCancelProposal,
}
