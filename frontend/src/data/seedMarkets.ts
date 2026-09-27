import { Market, UserPosition } from '../types/market';

const NOW = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export const INITIAL_MARKETS: Market[] = [
  {
    id: 'dm-101',
    type: 'vibe',
    question: 'Will OpenAI announce an autonomous agent product with local computer-use before November 15, 2026?',
    category: 'Technology',
    sideA: {
      label: 'Yes, Announced',
      description: 'Public release or keynote announcement confirming autonomous desktop/OS agent',
    },
    sideB: {
      label: 'No, Not Announced',
      description: 'No official desktop/OS agent product announced by the deadline',
    },
    poolA: 1850,
    poolB: 2420,
    lockTimestamp: NOW + 4 * DAY + 6 * HOUR,
    resolutionDeadline: NOW + 45 * DAY,
    status: 'open',
    creatorAddress: '0x39F4...A18C',
    creatorSide: 'A',
    creatorStake: 500,
    vibeRule: {
      resolutionCriteria:
        'Resolution requires an official post on openai.com/blog or an announcement during an official OpenAI live keynote detailing an autonomous agent capable of operating user interfaces (mouse/keyboard) or local computer-use workflows. Unverified social rumors, 3rd-party partner plugins, or unannounced API waitlists do not qualify.',
      evidenceDomains: ['openai.com', 'news.ycombinator.com', 'bloomberg.com', 'reuters.com'],
      evaluatorModel: 'DuelArbitrator v1.4 (Public Evidence Grounding)',
    },
  },
  {
    id: 'dm-102',
    type: 'clean',
    question: 'Ethereum Spot Price at or above $4,200.00 USD at 18:00 UTC on October 31, 2026',
    category: 'Crypto',
    sideA: {
      label: 'At or Above ($4,200+)',
      description: 'ETH/USD spot closing tick >= $4,200.00',
    },
    sideB: {
      label: 'Below $4,200',
      description: 'ETH/USD spot closing tick < $4,200.00',
    },
    poolA: 4200,
    poolB: 3100,
    lockTimestamp: NOW + 18 * HOUR,
    resolutionDeadline: NOW + 28 * DAY,
    status: 'open',
    creatorAddress: '0x811C...32E9',
    creatorSide: 'B',
    creatorStake: 1000,
    cleanRule: {
      dataSourceName: 'Binance & CoinGecko Median Benchmark',
      dataSourceUrl: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
      metricIdentifier: 'ETHUSDT.price_close_18:00_UTC',
      targetOperator: '>=',
      thresholdValue: 4200.0,
      formattedTarget: '>= $4,200.00 USD',
    },
  },
  {
    id: 'dm-103',
    type: 'vibe',
    question: 'Will the Department of Justice file a formal motion requesting structural breakup of Apple App Store before Q4 2026?',
    category: 'Policy & Law',
    sideA: {
      label: 'Breakup Motion Filed',
      description: 'Formal prayer for structural divestiture filed in US Federal Court',
    },
    sideB: {
      label: 'No Breakup Motion',
      description: 'Relief limited to behavioral remedies or monetary penalties',
    },
    poolA: 1950,
    poolB: 1400,
    lockTimestamp: NOW - 12 * HOUR,
    resolutionDeadline: NOW - 6 * HOUR,
    appealDeadline: NOW + 18 * HOUR + 24 * 60 * 1000,
    status: 'pending_appeal',
    creatorAddress: '0x992B...7841',
    creatorSide: 'A',
    creatorStake: 400,
    vibeRule: {
      resolutionCriteria:
        'A formal filing in US District Court in DOJ v. Apple Inc. must explicitly pray for structural divestiture (e.g. separating App Store into an independent entity). Behavioral injunctions (such as allowing alternative in-app payment links) without structural separation mandate resolution as Side B.',
      evidenceDomains: ['justice.gov', 'courtlistener.com', 'wsj.com'],
      evaluatorModel: 'DuelArbitrator v1.4 (Public Evidence Grounding)',
    },
    resolution: {
      resolvedTimestamp: NOW - 6 * HOUR,
      decidedOutcome: 'B',
      sourceTitle: 'DOJ Antitrust Division Civil Docket 2:24-cv-04050 Summary of Requested Injunctions',
      sourceUrl: 'https://justice.gov/atr/case-document/file/1589321/download',
      extractedSnippet:
        'The United States respectfully requests that the Court enter injunctive relief enjoining Apple from continuing its anticompetitive contractual terms regarding third-party payment rails and cloud streaming; no petition for corporate divestiture or structural dissolution is entered in this pleading.',
      reasoningReceipt:
        'The filed document requests behavioral injunctions and anti-steering prohibitions only. Per the explicit criteria requiring a prayer for structural divestiture, the claim resolves to Side B (No Breakup Motion).',
      evidenceHash: '0x9d48f2c0192e4ab9102c771bfca82103a8f9024c6e91',
    },
    appeal: {
      appealId: 'apl-882',
      appellantAddress: '0x71C8...339A',
      contestedTimestamp: NOW - 2 * HOUR,
      counterEvidenceUrl: 'https://courtlistener.com/docket/68392102/12/us-v-apple-amended-prayer/',
      counterReasoning:
        'Paragraph 184 of the amended complaint states the United States preserves its claim to order the divestiture of such business lines as are necessary to restore competition. This satisfies structural prayer standards under Section 4 of the Sherman Act.',
      appealBondAmount: 300,
      status: 'under_review',
    },
  },
  {
    id: 'dm-104',
    type: 'clean',
    question: 'US Federal Reserve cuts Target Federal Funds Rate by 50bps or more at the next FOMC meeting',
    category: 'Macroeconomics',
    sideA: {
      label: '50bps+ Cut',
      description: 'Effective rate reduced by 50 basis points or greater',
    },
    sideB: {
      label: '< 50bps (25bps or Hold)',
      description: 'Cut is 25bps, 0bps, or rate is hiked',
    },
    poolA: 5200,
    poolB: 4800,
    lockTimestamp: NOW - 3 * HOUR,
    resolutionDeadline: NOW + 2 * DAY,
    status: 'locked',
    creatorAddress: '0x44D1...77F0',
    creatorSide: 'B',
    creatorStake: 1500,
    cleanRule: {
      dataSourceName: 'Federal Reserve Board Official Press Release / FRED',
      dataSourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
      metricIdentifier: 'FOMC.statement.target_range_cut_bps',
      targetOperator: '>=',
      thresholdValue: 50,
      formattedTarget: '>= 50 basis points',
    },
  },
  {
    id: 'dm-105',
    type: 'vibe',
    question: 'Did SpaceX successfully catch the Super Heavy booster with the launch tower chopstick arms on Starship Flight 5?',
    category: 'Aerospace',
    sideA: {
      label: 'Successful Tower Catch',
      description: 'Booster safely guided into launch tower arms without destructive rupture',
    },
    sideB: {
      label: 'Splashdown / Failed Catch',
      description: 'Booster redirected to Gulf of Mexico or catastrophic landing failure',
    },
    poolA: 7800,
    poolB: 3400,
    lockTimestamp: NOW - 14 * DAY,
    resolutionDeadline: NOW - 10 * DAY,
    status: 'resolved',
    creatorAddress: '0x12A9...88F1',
    creatorSide: 'A',
    creatorStake: 800,
    vibeRule: {
      resolutionCriteria:
        'Super Heavy booster must return to Starbase launch site and be caught mid-air by the Mechazilla launch tower mechanical chopstick arms, holding position stably after engine cutoff. Any water ditching or explosion during capture resolves to Side B.',
      evidenceDomains: ['spacex.com', 'nasaspaceflight.com', 'reuters.com'],
      evaluatorModel: 'DuelArbitrator v1.3 (Multi-Source Video & Telemetry Check)',
    },
    resolution: {
      resolvedTimestamp: NOW - 10 * DAY,
      decidedOutcome: 'A',
      sourceTitle: 'SpaceX Official Starship Flight 5 Mission Report & Live Broadcast Telemetry',
      sourceUrl: 'https://www.spacex.com/launches/mission/?missionId=starship-flight-5',
      extractedSnippet:
        'The Super Heavy booster successfully executed its return-to-launch-site burn and was captured by the chopstick arms at the Starbase orbital launch mount at T+00:06:54, achieving a historic first mechanical tower recovery.',
      reasoningReceipt:
        'Verified live broadcast footage and official flight confirmation from SpaceX corroborate capture by the Mechazilla arms without destructive rupture. All primary conditions for Side A are decisively satisfied.',
      evidenceHash: '0xee149b231804cfa1082d495914ab0192e4281734bc1a',
    },
  },
  {
    id: 'dm-106',
    type: 'clean',
    question: 'Solana 7-day average daily active wallet addresses exceeds 4,000,000 before October 1, 2026',
    category: 'Crypto',
    sideA: {
      label: 'Exceeds 4.0M',
      description: '7-day rolling average active signers > 4,000,000',
    },
    sideB: {
      label: 'Fails to Exceed',
      description: '7-day rolling average remains <= 4,000,000',
    },
    poolA: 2600,
    poolB: 2350,
    lockTimestamp: NOW - 20 * DAY,
    resolutionDeadline: NOW - 15 * DAY,
    status: 'resolved',
    creatorAddress: '0x55B3...C441',
    creatorSide: 'A',
    creatorStake: 600,
    cleanRule: {
      dataSourceName: 'Artemis Analytics & Dune Solana Metrics Engine',
      dataSourceUrl: 'https://app.artemis.xyz/dashboard/solana',
      metricIdentifier: 'solana.daily_active_addresses_7d_sma',
      targetOperator: '>',
      thresholdValue: 4000000,
      formattedTarget: '> 4,000,000 addresses',
    },
    resolution: {
      resolvedTimestamp: NOW - 15 * DAY,
      decidedOutcome: 'A',
      sourceTitle: 'Artemis Analytics Verified On-Chain Data Feed (Block 294,180,240)',
      sourceUrl: 'https://api.artemis.xyz/v1/metrics/solana/daily-active-addresses',
      extractedSnippet:
        'Solana 7-day simple moving average reached 4,218,940 active signer addresses as of September 28, 2026 23:59 UTC.',
      reasoningReceipt:
        'Final deterministic value from verified blockchain oracle recorded 4,218,940, exceeding the 4,000,000 threshold requirement.',
      finalizedNumericValue: 4218940,
      evidenceHash: '0x37a0984fb61924ca789012356cdafe012849182374e1',
    },
  },
];

export const INITIAL_USER_POSITIONS: UserPosition[] = [
  {
    id: 'pos-1',
    marketId: 'dm-101',
    side: 'A',
    amount: 350,
    timestamp: NOW - 2 * DAY,
    claimed: false,
  },
  {
    id: 'pos-2',
    marketId: 'dm-105',
    side: 'A',
    amount: 500,
    timestamp: NOW - 12 * DAY,
    claimed: false,
  },
  {
    id: 'pos-3',
    marketId: 'dm-103',
    side: 'A',
    amount: 250,
    timestamp: NOW - 18 * HOUR,
    claimed: false,
  },
];
