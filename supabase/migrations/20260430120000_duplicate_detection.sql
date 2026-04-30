-- Duplicate detection for AI-extracted benefits
-- Date: 2026-04-30
--
-- Rollback:
--   ALTER TABLE product_benefits
--     DROP COLUMN IF EXISTS possible_duplicate_of,
--     DROP COLUMN IF EXISTS duplicate_score;

ALTER TABLE product_benefits
  ADD COLUMN IF NOT EXISTS possible_duplicate_of UUID REFERENCES product_benefits(id),
  ADD COLUMN IF NOT EXISTS duplicate_score NUMERIC(3, 2);

CREATE INDEX IF NOT EXISTS idx_product_benefits_possible_duplicate_of
  ON product_benefits(possible_duplicate_of);
