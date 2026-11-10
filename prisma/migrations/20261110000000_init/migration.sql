-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('ANTHROPIC', 'OPENAI', 'TWELVE_DATA', 'ALPHA_VANTAGE');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'FETCHING_DATA', 'CALCULATING', 'BULL_WORKING', 'BEAR_WORKING', 'DEBATING', 'JUDGE_REVIEWING', 'GENERATING_REPORT', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('BULL', 'BEAR', 'JUDGE', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_configurations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "encrypted_api_key" TEXT NOT NULL,
    "key_hint" TEXT NOT NULL,
    "selected_model" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "provider_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "currency" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analysis_settings" JSONB NOT NULL DEFAULT '{}',
    "error_message" TEXT,
    "is_saved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "agent_type" "AgentType" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "round_number" INTEGER NOT NULL,
    "message_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "structured_json" JSONB,
    "evidence_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_snapshots" (
    "id" UUID NOT NULL,
    "analysis_id" UUID,
    "user_id" UUID,
    "provider" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "data_kind" TEXT NOT NULL,
    "source_timestamp" TIMESTAMPTZ(3),
    "retrieved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "market_data_json" JSONB NOT NULL,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_calculations" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "indicator_type" TEXT NOT NULL,
    "calculation_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_reports" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "judge_result_json" JSONB NOT NULL,
    "markdown_content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "final_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "currency" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "provider_configurations_user_id_provider_key" ON "provider_configurations"("user_id", "provider");

-- CreateIndex
CREATE INDEX "analyses_user_id_created_at_idx" ON "analyses"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "analyses_user_id_ticker_exchange_idx" ON "analyses"("user_id", "ticker", "exchange");

-- CreateIndex
CREATE INDEX "analyses_status_idx" ON "analyses"("status");

-- CreateIndex
CREATE INDEX "agent_messages_analysis_id_round_number_idx" ON "agent_messages"("analysis_id", "round_number");

-- CreateIndex
CREATE UNIQUE INDEX "agent_messages_analysis_id_sequence_key" ON "agent_messages"("analysis_id", "sequence");

-- CreateIndex
CREATE INDEX "market_snapshots_analysis_id_idx" ON "market_snapshots"("analysis_id");

-- CreateIndex
CREATE INDEX "market_snapshots_symbol_exchange_data_kind_retrieved_at_idx" ON "market_snapshots"("symbol", "exchange", "data_kind", "retrieved_at" DESC);

-- CreateIndex
CREATE INDEX "financial_calculations_analysis_id_indicator_type_idx" ON "financial_calculations"("analysis_id", "indicator_type");

-- CreateIndex
CREATE UNIQUE INDEX "final_reports_analysis_id_key" ON "final_reports"("analysis_id");

-- CreateIndex
CREATE INDEX "watchlist_items_user_id_created_at_idx" ON "watchlist_items"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_user_id_symbol_exchange_key" ON "watchlist_items"("user_id", "symbol", "exchange");

-- AddForeignKey
ALTER TABLE "provider_configurations" ADD CONSTRAINT "provider_configurations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_calculations" ADD CONSTRAINT "financial_calculations_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reports" ADD CONSTRAINT "final_reports_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (defence in depth for Supabase).
-- The app connects through Prisma with the database owner role, which bypasses
-- RLS. Enabling RLS with no policies blocks access through Supabase's public
-- PostgREST API (anon/authenticated roles), so these tables are reachable
-- only through the application's server-side code.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analyses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "market_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_calculations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "final_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "watchlist_items" ENABLE ROW LEVEL SECURITY;
