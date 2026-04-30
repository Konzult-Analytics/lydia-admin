-- Lydia Admin Portal — Revamp migration
-- Date: 2026-04-30
-- Adds: audit_log table, audit fields on existing tables, extraction settings,
--       document tracking, uncertain field flagging.
--
-- Rollback steps:
--   DROP TABLE IF EXISTS audit_log;
--   ALTER TABLE source_documents
--     DROP COLUMN IF EXISTS extraction_settings,
--     DROP COLUMN IF EXISTS page_count,
--     DROP COLUMN IF EXISTS document_version,
--     DROP COLUMN IF EXISTS is_current,
--     DROP COLUMN IF EXISTS needs_review,
--     DROP COLUMN IF EXISTS review_notes,
--     DROP COLUMN IF EXISTS superseded_by,
--     DROP COLUMN IF EXISTS last_reviewed_at,
--     DROP COLUMN IF EXISTS last_reviewed_by;
--   ALTER TABLE product_benefits
--     DROP COLUMN IF EXISTS uncertain_fields,
--     DROP COLUMN IF EXISTS created_by,
--     DROP COLUMN IF EXISTS updated_by,
--     DROP COLUMN IF EXISTS updated_at;
--   ALTER TABLE benefit_attributes
--     DROP COLUMN IF EXISTS created_by,
--     DROP COLUMN IF EXISTS created_at,
--     DROP COLUMN IF EXISTS updated_by,
--     DROP COLUMN IF EXISTS updated_at;

-- ----- audit_log table -----

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  reason TEXT,
  source_page TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at DESC);

-- ----- product_benefits audit + uncertainty -----

ALTER TABLE product_benefits
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uncertain_fields TEXT[];

-- Existing project tracked these as "pending migration" — re-assert as idempotent
ALTER TABLE product_benefits
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID;

-- ----- benefit_attributes audit -----

ALTER TABLE benefit_attributes
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ----- corrections audit -----

ALTER TABLE corrections
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ----- domain_rules audit -----

ALTER TABLE domain_rules
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ----- approved_outputs audit -----

ALTER TABLE approved_outputs
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- ----- source_documents tracking + extraction settings -----

ALTER TABLE source_documents
  ADD COLUMN IF NOT EXISTS extraction_settings JSONB,
  ADD COLUMN IF NOT EXISTS page_count INTEGER,
  ADD COLUMN IF NOT EXISTS document_version TEXT,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS superseded_by UUID,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reviewed_by UUID;

CREATE INDEX IF NOT EXISTS idx_source_documents_is_current ON source_documents(is_current);
CREATE INDEX IF NOT EXISTS idx_source_documents_created_at ON source_documents(created_at DESC);
