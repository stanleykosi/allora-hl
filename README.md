Allora-Hyperliquid Trade Assistant

 Project Description
The Allora-Hyperliquid Trade Assistant is a full-stack web application designed to assist users in trading Bitcoin perpetual futures on Hyperliquid. The application fetches specific Bitcoin price predictions (e.g., price target at a future time) from the decentralized AI network, Allora, via its API. It presents these predictions to the user alongside their Hyperliquid account information (balance, open positions). Users can then configure and execute market-based trades on Hyperliquid based on these predictions with a single explicit confirmation, using predefined parameter templates or custom settings.

The application is intended initially for personal use but designed with the potential for open-sourcing.

**Disclaimer:** This is a tool for advanced users comfortable with high-risk, semi-automated trading strategies. Trading perpetual futures involves substantial risk of loss and is not suitable for all investors. You are solely responsible for managing your own risk, API key security, and all trading decisions made using this application. The developers assume no liability for any financial losses incurred.

## Features
- **Allora Integration:** Securely connects to the Allora API to fetch Bitcoin price predictions.
- **Hyperliquid Integration:** Securely connects to the Hyperliquid API for:
    - Real-time account balance, margin, and equity information.
    - Fetching currently open positions.
    - Executing market orders for BTC perpetual futures.
- **Trading Signal Presentation:**
    - Displays incoming Allora predictions clearly (target price, timeframe, confidence).
    - Suggests trade direction (Long/Short) based on prediction vs. current market price.
- **Trade Execution Workflow:**
    - Stage trades based on selected predictions or manual input.
    - Set trade parameters: size, leverage (leverage is primarily for estimation, actual leverage is set on Hyperliquid).
    *   Use pre-configured Trade Parameter Templates.
    - View estimated margin requirements and potential liquidation price before execution.
    - Explicit user confirmation required for every trade via a modal.
    - Master trade execution switch for an additional safety layer.
- **Dashboard UI:**
    - High-quality interface built with Next.js and Shadcn/UI.
    - Clear visual indicators for API connection statuses (Allora & Hyperliquid).
    - Prominent display of Hyperliquid account summary.
    - List of currently open positions with details (symbol, size, entry, P&L, margin, est. liq. price).
    - Feed of recent Allora predictions.
    - Log of trades executed *through this application*.
- **Configuration:**
    - API keys and sensitive details managed via `.env.local` file.
    - Trade Parameter Templates managed via a settings page (stored in the database).
    - UI preferences (refresh intervals, alert toggles) managed via a settings page (stored in browser localStorage).
- **Alerts:**
    - Optional alerts if a new Allora prediction contradicts the basis of an open position (does not auto-trade).

 Technology Stack
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend:** Next.js API Routes / Server Actions (Node.js runtime)
- **Database:** Prisma ORM with PostgreSQL (e.g., Supabase) or local SQLite.
- **API Key Management:** User-managed environment variables (`.env.local`).

Getting Started

Prerequisites
- Node.js (v18 or later recommended)
- npm, yarn, or pnpm
- Git

 1. Clone the Repository

git clone https://github.com/your-username/allora-hl.git
cd allora-hl

2. Install Dependencies
npm install
 or
yarn install
or
pnpm install

3. **Setup Environment Variables**
This application requires API keys for both Allora and Hyperliquid, and a database connection string.
Copy the example environment file:
cp .env.example .env.local

**Edit .env.local and fill in your actual credentials**
ALLORA_API_KEY: Your API key for the Allora network.
HYPERLIQUID_API_KEY: Your read-only API key for Hyperliquid. (Note: The application uses the private key for trade execution, this key might be for other informational purposes if the SDK uses it).
HYPERLIQUID_API_SECRET: Your Hyperliquid trade-enabled private key (starting with 0x...). This is a highly sensitive key. Ensure it is correct and secure.
DATABASE_URL: Your database connection string.
For Supabase (Recommended for deployed/shared use):
Go to your Supabase project -> Project Settings -> Database -> Connection string (URI).
Use the connection string that includes session pooler
Replace [YOUR-PASSWORD] and [YOUR-SUPABASE-PROJECT-ID].
For Local SQLite Development:
You can use a local SQLite file. Example: file:./dev.db (Ensure prisma/schema.prisma provider is set to sqlite).
The DATABASE_URL for SQLite would look like file:../db/dev.db if your schema.prisma is in prisma/ and you want the db in db/ at the project root. Or simply file:./dev.db if prisma/schema.prisma provider is "sqlite" and you want the db file in the prisma directory. The provided .env.example currently has DATABASE_URL= which implies PostgreSQL (Supabase), adjust your schema.prisma provider if using SQLite.
HYPERLIQUID_USE_TESTNET: Set to true to use the Hyperliquid Testnet. Defaults to false (Mainnet) if not set.

**SECURITY WARNING** Never commit your .env.local file to Git. It contains sensitive credentials. The .gitignore file is already configured to ignore *.env.local.

**4. Setup Database with Prisma**
This project uses Prisma to manage the database schema for Trade Templates and Trade Logs.
Ensure your prisma/schema.prisma file reflects your chosen database provider.
**For Supabase (PostgreSQL)**
datasource db {
  provider = "postgresql" // or "postgresql" for Supabase
  url      = env("DATABASE_URL")
}
For Local SQLite:
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db" // Path relative to schema.prisma
}
(If using SQLite, ensure DATABASE_URL in .env.local is set accordingly, e.g., file:../db/dev.db if db is at project root, or update schema path).

**Generate Prisma Client:**
This step creates the necessary Prisma Client code based on your schema. It's usually run automatically after npm install due to the postinstall script in package.json. If not, run manually:
npx prisma generate

**Apply Database Migrations (Create tables):**
For Supabase (PostgreSQL) or other PostgreSQL databases:
Use prisma migrate deploy if you are deploying an existing migration set, or prisma migrate dev for development to create and apply migrations.
If you have existing migrations (like the init migration in this project):
npx prisma migrate deploy

If you are starting fresh or making schema changes in development:
npx prisma migrate dev --name your_migration_name
This will create the necessary tables (TradeTemplate, TradeLog) in your Supabase database.

**For Local SQLite Development:**
This command will create the database file (e.g., dev.db) and apply the schema.
npx prisma migrate dev --name init
(If you are switching from PostgreSQL to SQLite, you might need to delete existing migrations in prisma/migrations that were for PostgreSQL and then run prisma migrate dev --name init_sqlite).

**Alternative for Supabase (if schema is already defined and you want to push without migrations):**
If your schema.prisma is finalized and you want to push it directly to Supabase (e.g., for a fresh setup without formal migration history for this tool specifically), you can use:
npx prisma db push
Caution: db push is generally for prototyping and bypasses the migration history system. For production or team environments, prisma migrate dev and prisma migrate deploy are preferred.

**5. Run the Development Server**
npm run dev
 or
yarn dev
 or
pnpm dev

Open http://localhost:3000 with your browser to see the application. You will be redirected to /dashboard.
