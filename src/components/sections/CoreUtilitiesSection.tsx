'use client'

import UtilityCard from './UtilityCard'
import {
  PieChart,
  ArrowRightLeft,
  Lock,
  Vote,
  Key,
  Gift,
  Handshake,
  Network,
} from 'lucide-react'

const utilities = [
  {
    id: 1,
    title: 'Fractional Ownership Layer',
    description:
      '$FRAC represents fractional ownership of underlying assets — whether real-world (real estate, commodities) or digital (NFTs, IP, metaverse assets). It allows users to hold, trade, and transfer ownership portions seamlessly through blockchain infrastructure.',
    icon: PieChart,
    pattern: 'A' as const,
  },
  {
    id: 2,
    title: 'Ecosystem Transaction Medium',
    description:
      'Within the FractionalBase ecosystem, all transactions—be it asset creation, listing, fractional sale, or redemption—are denominated in $FRAC. This positions it as both a unit of exchange and value store for platform users.',
    icon: ArrowRightLeft,
    pattern: 'B' as const,
  },
  {
    id: 3,
    title: 'Staking and Yield Mechanics',
    description:
      '$FRAC holders can stake tokens to participate in network validation, liquidity bootstrapping, or fractional asset pool creation. Staking directly translates to higher yield rates, better placement in tokenized asset offerings, and priority access to premium fractional listings.',
    icon: Lock,
    pattern: 'A' as const,
  },
  {
    id: 4,
    title: 'Governance and DAO Voting Rights',
    description:
      'FractionalBase governance adopts a decentralized model where $FRAC represents voting power. Holders can vote on new asset onboarding, platform upgrades, fee structures, and tokenomics proposals, ensuring the community leads platform direction.',
    icon: Vote,
    pattern: 'B' as const,
  },
  {
    id: 5,
    title: 'Access Control and Whitelisting',
    description:
      'Certain functionalities—like accessing exclusive fractionalized portfolios, algorithmic trading strategies, or analytical dashboards—will be gated to $FRAC holders, balancing utility with scarcity and incentivizing token retention across the ecosystem.',
    icon: Key,
    pattern: 'A' as const,
  },
  {
    id: 6,
    title: 'Reward and Loyalty Driver',
    description:
      'FractionalBase\'s engagement model gives $FRAC rewards for community actions, including liquidity provision, referrals, project voting, or staking participation. This drives circular token velocity while maintaining intrinsic value through capped supply mechanisms.',
    icon: Gift,
    pattern: 'B' as const,
  },
  {
    id: 7,
    title: 'Enterprise & Partner Collateralization',
    description:
      'B2B and institutional partners within the ecosystem may use $FRAC as collateral or payment for token issuance, fractional listing fees, and market-making incentives. Holding specific thresholds of $FRAC can unlock commercial discounts and enhanced exposure for enterprise assets.',
    icon: Handshake,
    pattern: 'A' as const,
  },
  {
    id: 8,
    title: 'Cross-Chain Liquidity Layer',
    description:
      '$FRAC is designed to be chain-agnostic with interoperable bridges, enabling fractional asset transfers across major blockchain networks (e.g., Solana, Ethereum, BSC). This ensures global liquidity access across tokenized markets.',
    icon: Network,
    pattern: 'B' as const,
  },
]

export default function CoreUtilitiesSection() {
  return (
    <div id="utilities">
      {utilities.map((utility, index) => (
        <UtilityCard
          key={utility.id}
          title={utility.title}
          description={utility.description}
          icon={utility.icon}
          pattern={utility.pattern}
          index={index}
        />
      ))}
    </div>
  )
}
