-- Meta Lead Form Integration
-- Adds per-account Meta configuration for lead form webhook routing

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS meta_page_id        TEXT,
  ADD COLUMN IF NOT EXISTS meta_ad_account_id  TEXT;

-- Fast lookup for webhook routing (page_id → account)
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_meta_page_id
  ON public.accounts(meta_page_id)
  WHERE meta_page_id IS NOT NULL;
