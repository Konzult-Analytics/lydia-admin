# Lydia Admin Portal - Full Project Context

> Last updated: 2026-03-26
> Built by: Tiaan (Frankly) + Claude Code

---

## What Is This?

Lydia Admin Portal is an internal web application for **Frankly** (franklysimple.co.za), a South African insurance technology company. It powers an AI-assisted insurance research workflow where:

1. **Upload** - Insurance product PDFs are uploaded
2. **Extract** - Claude AI extracts structured benefit data from the PDFs
3. **Review** - Humans review, edit, approve, or reject the AI's extractions
4. **Train** - Staff chat with "Lydia" (the AI) to test responses and provide feedback that improves future outputs

The extracted, approved data feeds into a comparison engine that helps financial advisors compare insurance products objectively.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | 5.x |
| React | React | 19.2.4 |
| Styling | Tailwind CSS v4 | 4.x |
| Database & Auth | Supabase | supabase-js 2.100.1 |
| AI | Anthropic Claude (Sonnet) | @anthropic-ai/sdk 0.80.0 |
| PDF Parsing | unpdf | 1.4.0 |
| Markdown | react-markdown + remark-gfm | 10.1.0 / 4.0.1 |
| Icons | lucide-react | 1.7.0 |
| Toasts | sonner | 2.0.7 |
| File Upload | react-dropzone | 15.0.0 |

---

## Brand / Design

Company: **Frankly.** (with period)
Logo: Green circle icon + "Frankly." text in bold

### Colors (defined in `src/app/globals.css` via Tailwind v4 `@theme`)

| Token | Hex | Usage |
|-------|-----|-------|
| `frankly-green` | #00D26A | Primary actions, active nav, approve |
| `frankly-green-hover` | #00B85C | Hover states |
| `frankly-green-light` | #E6FBF0 | Light green backgrounds, active nav bg |
| `frankly-dark` | #1A1A1A | Headings, body text |
| `frankly-gray` | #4A4A4A | Secondary text, labels |
| `frankly-gray-light` | #F5F5F5 | Page backgrounds, disabled states |

### Typography
- Font: Inter (via next/font/google)
- No dark mode (light theme only)
- Sidebar: White background with right border, green active states
- Cards: White with subtle shadow, rounded-xl, gray-200 border

---

## Environment Variables

Stored in `.env.local` (git-ignored). Template in `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key (public)
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key (server-only)
ANTHROPIC_API_KEY=               # Claude API key (server-only)
```

The actual Supabase project is: `mgngufqcyweqtvvoimlz.supabase.co`

---

## Project Structure

```
lydia-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx                          # Root layout (Inter font, Toaster)
│   │   ├── page.tsx                            # Redirect: auth → /upload, unauth → /login
│   │   ├── globals.css                         # Tailwind v4 @theme with brand colors
│   │   ├── (auth)/
│   │   │   └── login/page.tsx                  # Login page with Frankly branding
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                      # Sidebar nav + header + content area
│   │   │   ├── upload/page.tsx                 # Upload page with dropdowns + dropzone
│   │   │   ├── review/page.tsx                 # Review page with filters + stats + cards
│   │   │   └── train/page.tsx                  # Chat interface + feedback sidebar
│   │   └── api/
│   │       ├── upload-document/route.ts        # POST - stub for direct upload
│   │       ├── extract/route.ts                # POST - PDF extraction via Claude
│   │       ├── review/route.ts                 # GET list + PATCH approve/reject/edit
│   │       ├── extractions/[id]/route.ts       # GET single + PUT update with corrections
│   │       ├── extractions/[id]/attributes/route.ts  # PUT batch attribute update
│   │       ├── chat/route.ts                   # POST - Chat with Lydia (Claude)
│   │       ├── feedback/route.ts               # POST - stub
│   │       ├── feedback/approve/route.ts       # POST - save approved output
│   │       ├── feedback/flag/route.ts          # POST - flag issue + create correction
│   │       ├── feedback/add-rule/route.ts      # POST - add domain rule
│   │       ├── rules/route.ts                  # GET - list active domain rules
│   │       └── approved-outputs/route.ts       # GET - list approved outputs
│   ├── components/
│   │   ├── logo.tsx                            # Frankly. logo (sm/md/lg, optional subtitle)
│   │   ├── ui/
│   │   │   ├── button.tsx                      # 5 variants: primary/secondary/outline/danger/ghost
│   │   │   ├── badge.tsx                       # 6 variants: pending/approved/rejected/processing/uploaded/failed
│   │   │   ├── card.tsx                        # Card with sm/md/lg padding
│   │   │   ├── select.tsx                      # Labeled select dropdown
│   │   │   ├── modal.tsx                       # Centered modal with sm/md/lg/xl sizes
│   │   │   └── slide-over.tsx                  # Right slide-over panel with header/body/footer
│   │   ├── upload/
│   │   │   ├── dropzone.tsx                    # PDF drag-and-drop with react-dropzone
│   │   │   └── upload-status.tsx               # Step progress: uploading → processing → complete
│   │   ├── review/
│   │   │   ├── benefit-card.tsx                # Summary card with quick approve/reject + Details
│   │   │   ├── detail-panel.tsx                # Full slide-over with editable sections
│   │   │   └── reject-modal.tsx                # Rejection reason modal
│   │   └── train/
│   │       ├── chat-message.tsx                # Message bubble with markdown + feedback buttons
│   │       ├── chat-input.tsx                  # Auto-growing textarea, Enter to send
│   │       ├── typing-indicator.tsx            # Animated dots
│   │       ├── feedback-modal.tsx              # Flag issue form
│   │       ├── rule-modal.tsx                  # Add domain rule form
│   │       └── sidebar-panel.tsx               # Collapsible panel with count badge
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                       # Browser Supabase client
│   │   │   ├── server.ts                       # Server Supabase client (cookies-based)
│   │   │   └── middleware.ts                   # Auth middleware (redirects to /login)
│   │   └── utils.ts                            # cn() classname merge utility
│   ├── middleware.ts                            # Next.js middleware entry point
│   └── types/
│       └── database.ts                         # All TypeScript interfaces for DB tables
├── .env.example
├── .env.local                                  # (git-ignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## Database Schema (Supabase)

### Tables

**insurers**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| name | text | Full insurer name |
| short_name | text | Abbreviated name |

**products**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| insurer_id | text FK → insurers | |
| name | text | Product name |
| product_type | text | e.g. "life", "health" |

**benefit_types**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | e.g. LIFE_COVER, TERM_ILL, SEVERE_ILL |
| name | text | Human-readable name |
| category_id | text FK → benefit_categories | |

**source_documents**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| insurer_id | text FK | |
| product_id | text FK | |
| file_name | text | Original filename |
| file_path | text | Path in Supabase Storage |
| file_size | int | Bytes |
| document_type | text | product_guide / brochure / technical_guide / benefit_schedule |
| upload_status | text | uploaded / processing / processed / failed |
| uploaded_by | uuid | |
| created_at | timestamptz | |

**product_benefits**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_id | text FK | |
| benefit_type_id | text FK → benefit_types | |
| benefit_name | text | |
| description | text | |
| key_features | text[] | Array of feature strings |
| exclusions | text[] | Array of exclusion strings |
| source_document_id | uuid FK | |
| source_page | text | Page reference |
| extraction_confidence | decimal | 0.0 - 1.0 |
| status | text | pending / approved / rejected |
| rejection_reason | text | Why it was rejected |
| reviewer_notes | text | Reviewer's notes |
| reviewed_by | uuid | |
| reviewed_at | timestamptz | |
| created_at | timestamptz | |

**benefit_attributes**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_benefit_id | uuid FK | |
| attribute_name | text | e.g. "Annual Limit", "Waiting Period" |
| attribute_value | text | e.g. "R50,000", "12 months" |
| attribute_unit | text | e.g. "ZAR", "months", "%" |
| source_page | text | |

**corrections**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_benefit_id | uuid FK | |
| field_name | text | Which field was corrected |
| original_value | text | What Claude said |
| corrected_value | text | What the human corrected to |
| corrected_by | uuid | |
| created_at | timestamptz | |

**extraction_log**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| source_document_id | uuid FK | |
| extraction_type | text | e.g. "benefit_extraction" |
| benefits_found | int | Count saved |
| raw_extraction | jsonb | Full Claude response + _meta |

**domain_rules** (for Train page)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| rule_name | text | e.g. "always_mention_exclusions" |
| rule_text | text | The rule content |
| importance | text | critical / high / medium / low |
| applies_to | text | all / comparison / extraction / explanation |
| is_active | boolean | |

**approved_outputs** (for Train page)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_query | text | The question asked |
| assistant_response | text | Lydia's approved response |
| query_type | text | general / comparison / etc. |
| what_makes_it_good | text | Why it was approved |
| source_message_id | uuid FK | |
| created_at | timestamptz | |

**chat_sessions** (for Train page)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| title | text | Auto-generated from first message |

**chat_messages** (for Train page)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK | |
| role | text | user / assistant |
| content | text | Message content |
| feedback | text | approved / flagged / null |
| feedback_note | text | Details if flagged |
| created_at | timestamptz | |

### Supabase Storage

- **Bucket:** `documents`
- **Path pattern:** `{insurer_id}/{product_id}/{filename}.pdf`

---

## Key Workflows

### 1. Upload & Extract Flow

```
User selects insurer → product → document type → drops PDF
  ↓
Upload PDF to Supabase Storage (bucket: "documents")
  ↓
Create source_documents record (status: "uploaded")
  ↓
POST /api/extract { documentId }
  ↓
Download PDF → unpdf extracts text (page by page with markers)
  ↓
If text > 150,000 chars → truncate with note to Claude
  ↓
Claude Sonnet extracts benefits as structured JSON
  ↓
Each benefit → infer benefit_type_id (Claude's value or fallback mapping)
  ↓
Save to product_benefits (status: "pending") + benefit_attributes
  ↓
Log to extraction_log with _meta (pages, tokens, save counts)
  ↓
Update source_documents status to "processed"
```

### 2. Review Flow

```
GET /api/review?status=pending (with optional insurer/benefitType filters)
  ↓
Review page shows: stats cards, status tabs, filter dropdowns, benefit cards
  ↓
Click "Details" → slide-over panel with all sections:
  - Description (editable)
  - Attributes table (add/edit/delete rows)
  - Key Features (add/edit/delete items)
  - Exclusions (add/edit/delete items)
  - Reviewer Notes (editable textarea)
  - Source Information (read-only: file, page, confidence bar)
  ↓
Actions:
  - Approve → status: "approved", sets reviewed_at
  - Edit → updates fields, logs corrections, then approves
  - Reject → opens modal for reason, status: "rejected"
  - Approve All → batch approve all pending
```

### 3. Train Flow

```
User types a message (or clicks a suggested query)
  ↓
POST /api/chat { sessionId, message }
  ↓
System prompt built dynamically from:
  - domain_rules (active rules Claude must follow)
  - corrections (past mistakes to avoid)
  - approved_outputs (1-2 few-shot examples)
  - insurers/products list
  - If message mentions known insurers → fetch relevant approved benefits
  ↓
Claude Sonnet responds with conversation history (last 20 messages)
  ↓
Response rendered with react-markdown (tables, bold, lists)
  ↓
Feedback buttons on each AI message:
  - Approve → saves Q&A pair to approved_outputs (future few-shot example)
  - Flag → creates correction record (fed into future system prompts)
  - Add Rule → creates domain_rule (injected into all future prompts)
  ↓
Sidebar shows: active rules, approved outputs, recent corrections
```

---

## Benefit Type Mapping

The extract route includes fallback logic to map benefit names to type IDs:

| Type ID | Matches |
|---------|---------|
| LIFE_COVER | death, life cover |
| TERM_ILL | terminal |
| FUNERAL_ADVANCE | funeral |
| LUMP_SUM_DISAB | lump + disability |
| FUNC_IMPAIR | impairment |
| INCOME_DISAB | income + disability |
| SEVERE_ILL | severe, critical, dread |
| CANCER_COVER | cancer |
| HEART_COVER | heart, cardiac |
| INCOME_PROT | income protection, salary protection, permanent + expense |
| TEMP_INCOME | temporary income, temporary + expense |
| PREMIUM_WAIVER | premium + waiver |
| RETRENCHMENT | retrenchment, debt instalment |
| CHILD_COVER | child + expense/additional |
| EDUCATION | tertiary, education |
| ACCIDENTAL_DEATH | accidental + death |
| OTHER | anything else |

Claude is also asked to provide `benefit_type_id` in its extraction. If it returns a valid type, that's used. If invalid or missing, the fallback mapping kicks in.

---

## Pending Database Migrations

The user may need to run these SQL statements if columns don't exist yet:

```sql
ALTER TABLE product_benefits ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE product_benefits ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;
ALTER TABLE product_benefits ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE product_benefits ADD COLUMN IF NOT EXISTS reviewed_by UUID;
```

---

## Deployment Notes

- **Target:** Vercel
- **Build:** `npm run build` passes clean (all 18 routes)
- **No hardcoded URLs** — all API calls use relative paths
- **No hardcoded secrets** — all via process.env
- **Console output:** Only console.error on error paths + key extraction status logs
- **.env.local** is git-ignored; `.env.example` is committed
- **Supabase Storage bucket** must be named `documents`

---

## What Was Built (Session Summary)

1. **Project Init** — Next.js 16 with TypeScript, Tailwind v4, App Router, src/ directory
2. **Dependencies** — Supabase, Anthropic SDK, react-dropzone, lucide-react, sonner, react-markdown, unpdf
3. **Supabase Integration** — Browser client, server client, auth middleware
4. **Full Upload Page** — Insurer/product/type dropdowns, drag-and-drop, upload to storage, trigger extraction
5. **Extract API** — PDF text extraction via unpdf, Claude Sonnet extraction, benefit type inference, structured save with error logging
6. **Reusable UI Components** — Button (5 variants), Badge (6 variants), Card, Select, Modal, SlideOver
7. **Frankly Branding** — Custom color palette, Inter font, Logo component, white sidebar, green accent
8. **Review Page** — Stats summary, status tabs, insurer/type filters, benefit cards with quick actions, slide-over detail panel with full inline editing, reject modal, corrections logging, approve all
9. **Train Page** — Chat with Claude (Lydia), conversation history, markdown rendering, feedback loop (approve/flag/add rule), sidebar panels for rules/outputs/corrections, suggested queries, export chat
10. **Feedback APIs** — Approve output, flag issue, add domain rule
11. **PDF Extraction Fixes** — Migrated from base64 PDF → pdf-parse → pdfjs-dist → unpdf for reliable text extraction
12. **Benefit Type System** — 17 type IDs with Claude prompt + fallback inference mapping
13. **Reviewer Notes** — Added reviewer_notes field to detail panel and API
14. **Deploy Prep** — Console cleanup, .gitignore fix, metadata update, no hardcoded URLs/keys
