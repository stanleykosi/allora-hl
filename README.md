# Allora-Hyperliquid Trade Assistant

## Overview
The Allora-Hyperliquid Trade Assistant is a full-stack web application designed to assist users in trading Bitcoin perpetual futures on Hyperliquid. The application fetches specific Bitcoin price predictions from the decentralized AI network, Allora, via its API. It presents these predictions alongside Hyperliquid account information, enabling users to configure and execute market-based trades with a single explicit confirmation.

> **Disclaimer:** This is a tool for advanced users comfortable with high-risk, semi-automated trading strategies. Trading perpetual futures involves substantial risk of loss and is not suitable for all investors. You are solely responsible for managing your own risk, API key security, and all trading decisions made using this application. The developers assume no liability for any financial losses incurred.

## Features

### Core Functionality
- **Allora Integration**
  - Secure connection to Allora API
  - Fetch Bitcoin price predictions
  - Display target price, timeframe, and confidence metrics

- **Hyperliquid Integration**
  - Real-time account information (balance, margin, equity)
  - Open positions monitoring
  - Market order execution for BTC perpetual futures

### Trading Features
- **Signal Presentation**
  - Clear display of Allora predictions
  - Trade direction suggestions (Long/Short)
  - Current market price comparison

- **Trade Execution**
  - Trade staging based on predictions
  - Customizable parameters:
    - Position size
    - Leverage (for estimation)
    - Pre-configured templates
  - Margin requirement estimation
  - Liquidation price calculation
  - Explicit confirmation workflow
  - Master trade execution switch

### User Interface
- **Dashboard**
  - Modern UI built with Next.js and Shadcn/UI
  - API connection status indicators
  - Account summary display
  - Open positions list
  - Recent predictions feed
  - Trade execution log

### Configuration & Settings
- **System Configuration**
  - Environment-based API key management
  - Trade parameter templates
  - Database storage for templates
  - Browser-based UI preferences

- **Alert System**
  - Optional position contradiction alerts
  - No automated trading

## Technology Stack
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend:** Next.js API Routes / Server Actions (Node.js runtime)
- **Database:** Prisma ORM with PostgreSQL (Supabase) or SQLite
- **Security:** Environment-based API key management

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm, yarn, or pnpm
- Git

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/allora-hl.git
   cd allora-hl
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

   Configure the following in `.env.local`:
   - `ALLORA_API_KEY`: Your Allora network API key
   - `HYPERLIQUID_API_KEY`: Hyperliquid read-only API key
   - `HYPERLIQUID_API_SECRET`: Hyperliquid private key (0x...)
   - `DATABASE_URL`: Database connection string
   - `HYPERLIQUID_USE_TESTNET`: Set to `true` for testnet (defaults to mainnet)

   > **Security Warning:** Never commit `.env.local` to Git. It contains sensitive credentials.

4. **Database Setup**

   **For Supabase (PostgreSQL)**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

   **For Local SQLite**
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

   **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

   **Apply Migrations:**
   ```bash
   # For Supabase/PostgreSQL
   npx prisma migrate deploy
   # or for development
   npx prisma migrate dev --name your_migration_name

   # For SQLite
   npx prisma migrate dev --name init
   ```

   > **Note:** For Supabase without migrations, use `npx prisma db push` (not recommended for production)

5. **Start Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

   Access the application at http://localhost:3000 (redirects to /dashboard)
