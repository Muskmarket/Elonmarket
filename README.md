# 🚀 MuskMarket: Elon Musk Prediction Game

MuskMarket is a high-stakes, free-to-play prediction platform built on **Solana** and **Supabase**. Players use their $MUX tokens to predict the topic of Elon Musk's next post on X (Twitter). Correct predictions earn rewards from a prize pool funded by on-chain revenue.

![MuskMarket Banner](/public/musk-logo.jpg)

## ✨ Features

- **Live Prediction Markets:** Real-time rounds with dynamic voting windows.
- **On-Chain Verification:** Voting eligibility is verified against your Solana wallet's $MUX balance.
- **Automatic Winner Detection:** Backend integration with X (via IFTTT/Webhooks) to instantly detect winners.
- **Automated Payouts:** Rewards are automatically calculated and queued for distribution to winners.
- **Global Leaderboard:** Track the top earners and most accurate predictors in the community.
- **Player Profiles:** Detailed statistics, achievement badges, and activity history for every player.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion.
- **Backend:** Supabase (Edge Functions, PostgreSQL, Realtime, RLS).
- **Blockchain:** Solana (Web3.js, Wallet Adapter).
- **Ingestion:** IFTTT Webhooks / Custom Tweet Pollers.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase CLI
- A Solana Wallet (e.g., Phantom)

### Frontend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/muskmarket.git
   cd muskmarket
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your Supabase credentials.
4. Start development server:
   ```bash
   npm run dev
   ```

### Backend Setup (Supabase)
1. Initialize Supabase:
   ```bash
   supabase init
   ```
2. Apply migrations:
   ```bash
   supabase migration up
   ```
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy detect-winner
   // Repeat for other functions in supabase/functions
   ```
4. Set required secrets:
   ```bash
   supabase secrets set IFTTT_TIMEZONE_OFFSET=6
   ```

## 🎮 How to Play

1. **Connect Wallet:** Link your Solana wallet to the platform.
2. **Hold $MUX:** Ensure you meet the minimum token requirement to be eligible for voting.
3. **Cast Prediction:** Select your predicted category before the voting window closes.
4. **Wait for Post:** Once the monitoring window starts, the system scans for Elon's next post.
5. **Win SOL:** If your category is mentioned first, you win! Rewards are sent automatically.

## 🛡️ Security

- **RLS Policies:** All database access is secured via Row Level Security.
- **Vault Architecture:** Private keys for reward distribution are stored in a secure, external vault environment.
- **Balance Verification:** Token balances are verified directly on the Solana mainnet before every vote.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
