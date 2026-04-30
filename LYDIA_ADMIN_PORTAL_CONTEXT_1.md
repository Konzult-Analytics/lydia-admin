# LYDIA ADMIN PORTAL — Complete Project Context

**Document Version:** 1.0  
**Date Created:** March 26, 2026  
**Project:** Lydia Admin Portal (Lydia 2.0)  
**Company:** Konzult Analytics / Frankly Simple  
**Status:** MVP Deployed to Vercel

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Team & Roles](#2-team--roles)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Database Schema](#5-database-schema)
6. [Features Built](#6-features-built)
7. [API Routes](#7-api-routes)
8. [Components Created](#8-components-created)
9. [Issues & Solutions](#9-issues--solutions)
10. [Environment Setup](#10-environment-setup)
11. [Deployment](#11-deployment)
12. [Future Work](#12-future-work)

---

## 1. PROJECT OVERVIEW

### 1.1 What is Lydia?

Lydia 2.0 is an AI-powered **independent insurance research assistant** for South African financial advisors. It helps advisors compare insurance products across multiple insurers by extracting, structuring, and presenting information from insurer documentation.

### 1.2 The Admin Portal

The Lydia Admin Portal is an internal tool for populating and training the Lydia system. It allows the team to:

- **Upload** insurance product PDFs
- **Review** AI-extracted benefit information (approve/edit/reject)
- **Train** Lydia through chat interactions and feedback

### 1.3 Critical Constraint

**Lydia must NEVER recommend one insurer over another.** This would require FSP licensing. Instead, Lydia presents objective comparisons with source citations, and the advisor makes the final decision.

### 1.4 The Product Family

| Product | Target | Status |
|---------|--------|--------|
| **Lydia Admin Portal** | Internal team | ✅ MVP Complete |
| **Lydia 2.0** | Financial advisors | Future |
| **Frankly Simple** | B2C consumers | Future |
| **Frankly Pro** | B2B advisors | Future |

---

## 2. TEAM & ROLES

| Person | Role |
|--------|------|
| User (Project Owner) | Technical lead, architecture decisions |
| Tiaan | Domain expert (insurance), data validation, quality assurance |
| Yannick | Team member |
| Claude (Planning) | Strategy, architecture, reasoning, supervision |
| Claude Code (Cursor) | Implementation, code, technical problem-solving |

---

## 3. TECH STACK

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Next.js 14 (App Router) | Full-stack React framework |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Database** | Supabase (PostgreSQL) | Database, auth, storage |
| **AI Engine** | Claude API (Anthropic) | PDF extraction, chat |
| **PDF Parsing** | unpdf | Server-side text extraction |
| **Deployment** | Vercel | Hosting |
| **Version Control** | GitHub | Code repository |

### 3.1 Key Dependencies

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x",
  "@anthropic-ai/sdk": "^0.x",
  "unpdf": "^1.4.0",
  "react-dropzone": "^14.x",
  "react-markdown": "^9.x",
  "remark-gfm": "^4.x",
  "lucide-react": "^0.x",
  "sonner": "^1.x"
}
```

---

## 4. ARCHITECTURE

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     VERCEL                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   NEXT.JS APP                              │  │
│  │                                                            │  │
│  │   /app (frontend)              /api (backend)              │  │
│  │   ├── (auth)/login/            ├── upload-document/        │  │
│  │   ├── (dashboard)/             ├── extract/                │  │
│  │   │   ├── upload/              ├── review/                 │  │
│  │   │   ├── review/              ├── extractions/[id]/       │  │
│  │   │   └── train/               ├── chat/                   │  │
│  │   │                            ├── feedback/               │  │
│  │   │                            ├── rules/                  │  │
│  │   │                            └── approved-outputs/       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ Supabase │    │ Supabase │    │  Claude  │
       │    DB    │    │ Storage  │    │   API    │
       │          │    │  (PDFs)  │    │          │
       └──────────┘    └──────────┘    └──────────┘
```

### 4.2 Data Flow

1. **Upload Flow:**
   - User uploads PDF → Stored in Supabase Storage
   - PDF text extracted using `unpdf` library
   - Text sent to Claude for benefit extraction
   - Extracted benefits saved to `product_benefits` table (status: pending)
   - Attributes saved to `benefit_attributes` table

2. **Review Flow:**
   - Tiaan sees pending extractions on Review page
   - Can view details, edit, add notes
   - Approve → status changes to 'approved'
   - Reject → status changes to 'rejected', reason logged

3. **Train Flow:**
   - Chat with Lydia using Claude API
   - System prompt includes domain rules, corrections, approved outputs
   - Feedback mechanisms: Approve (👍), Flag (👎), Add Rule (📝)

---

## 5. DATABASE SCHEMA

### 5.1 Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `insurers` | Insurance companies | id, name, short_name, website |
| `products` | Specific plans per insurer | id, insurer_id, name, product_type |
| `benefit_categories` | High-level groupings | id, name, description |
| `benefit_types` | Standardized benefit definitions | id, category_id, name |
| `benefit_aliases` | Maps insurer terms to standard types | benefit_type_id, insurer_id, alias_name |
| `product_benefits` | Main content (descriptions, features) | product_id, benefit_type_id, description, key_features[], status |
| `benefit_attributes` | Structured key-value data | product_benefit_id, attribute_name, attribute_value |
| `standard_attributes` | Template per benefit type | benefit_type_id, attribute_name, is_required |
| `source_documents` | Uploaded PDFs | insurer_id, product_id, file_name, file_path, upload_status |

### 5.2 Learning Layer Tables

| Table | Purpose |
|-------|---------|
| `corrections` | Records mistakes and fixes for Claude to learn from |
| `domain_rules` | Expert rules Claude must follow |
| `approved_outputs` | Examples of good responses (few-shot examples) |

### 5.3 Operational Tables

| Table | Purpose |
|-------|---------|
| `extraction_log` | Audit trail of extractions with metadata |
| `chat_sessions` | Chat conversation sessions |
| `chat_messages` | Individual messages with feedback status |

### 5.4 Key Views

```sql
-- Products with insurer info
v_products_full

-- Benefits comparison (approved only)
v_benefits_comparison

-- Active domain rules for prompt injection
v_active_domain_rules

-- Pending extractions for review
v_pending_extractions
```

### 5.5 Seed Data

The database is pre-seeded with:
- 10 insurers (Discovery, BrightRock, Liberty, Sanlam, Momentum, Old Mutual, FMI, Hollard, PPS, 1Life)
- 7 initial products
- 6 benefit categories
- 11+ benefit types
- 7 domain rules
- Standard attributes templates

---

## 6. FEATURES BUILT

### 6.1 Authentication (Login Page)

- Supabase Auth with email/password
- Protected routes via middleware
- Session management
- Logout functionality

### 6.2 Upload Page

**UI Components:**
- Insurer dropdown (fetches from database)
- Product dropdown (filtered by selected insurer)
- Document type dropdown
- Drag-and-drop PDF upload zone (react-dropzone)
- Upload status display with progress steps

**Functionality:**
- PDF uploaded to Supabase Storage (`documents` bucket)
- Text extracted using `unpdf` library
- Claude extracts benefits with structured JSON output
- Benefits and attributes saved to database
- Status tracking: Uploading → Processing → Complete/Failed

### 6.3 Review Page

**UI Components:**
- Filters (Status, Insurer, Benefit Type)
- Extraction cards with summary info
- Slide-over detail panel
- Editable fields (name, description, features, exclusions, attributes)
- Reviewer notes textarea
- Approval/Rejection workflow

**Functionality:**
- View all pending extractions
- Edit any field before approving
- Add reviewer notes
- Approve → saves changes, updates status
- Reject → requires reason, logs rejection
- Corrections automatically logged when edits are made

### 6.4 Train Page (Chat Interface)

**UI Components:**
- Chat messages area with markdown rendering
- Typing indicator
- Feedback buttons on AI responses (👍 👎 📝)
- Sidebar panels (Domain Rules, Approved Outputs, Recent Corrections)
- Quick actions (New Chat, Export Chat)

**Functionality:**
- Full conversation history maintained
- System prompt dynamically built from:
  - Active domain rules
  - Relevant corrections
  - Approved outputs (few-shot examples)
  - Database content (if query mentions specific insurers)
- Approve response → saves to `approved_outputs`
- Flag issue → creates `correction` record
- Add rule → creates `domain_rule`

---

## 7. API ROUTES

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/upload-document` | POST | Handle PDF upload to Supabase Storage |
| `/api/extract` | POST | Extract benefits from PDF using Claude |
| `/api/review` | GET | Fetch extractions with filters |
| `/api/review` | PATCH | Update extraction (approve/reject/edit) |
| `/api/extractions/[id]` | GET | Get single extraction details |
| `/api/extractions/[id]` | PUT | Update extraction |
| `/api/extractions/[id]/attributes` | PUT | Update attributes |
| `/api/chat` | POST | Send message to Claude, get response |
| `/api/feedback/approve` | POST | Save approved output |
| `/api/feedback/flag` | POST | Create correction |
| `/api/feedback/add-rule` | POST | Create domain rule |
| `/api/rules` | GET | Fetch domain rules |
| `/api/approved-outputs` | GET | Fetch approved outputs |

---

## 8. COMPONENTS CREATED

### 8.1 UI Components (`/src/components/ui/`)

| Component | Purpose |
|-----------|---------|
| `button.tsx` | Styled button with variants (primary, secondary, danger, outline, ghost) |
| `select.tsx` | Styled dropdown select |
| `card.tsx` | Card container with padding options |
| `badge.tsx` | Status badges (pending, approved, rejected, processing, etc.) |
| `modal.tsx` | Reusable modal with backdrop, sizes |
| `slide-over.tsx` | Slide-over panel from right side |

### 8.2 Upload Components (`/src/components/upload/`)

| Component | Purpose |
|-----------|---------|
| `dropzone.tsx` | PDF drag-and-drop upload zone |
| `upload-status.tsx` | Step-by-step progress display |

### 8.3 Review Components (`/src/components/review/`)

| Component | Purpose |
|-----------|---------|
| `benefit-card.tsx` | Card showing extraction summary |
| `detail-panel.tsx` | Slide-over with editable fields |
| `reject-modal.tsx` | Modal for rejection reason |

### 8.4 Train Components (`/src/components/train/`)

| Component | Purpose |
|-----------|---------|
| `chat-message.tsx` | Message bubble with markdown + feedback buttons |
| `chat-input.tsx` | Auto-growing textarea with send |
| `typing-indicator.tsx` | Animated typing dots |
| `feedback-modal.tsx` | Modal for flagging issues |
| `rule-modal.tsx` | Modal for adding rules |
| `sidebar-panel.tsx` | Collapsible panel for sidebar items |

### 8.5 Other Components

| Component | Purpose |
|-----------|---------|
| `logo.tsx` | Frankly logo component |

---

## 9. ISSUES & SOLUTIONS

### 9.1 Storage Bucket Not Found

**Problem:** Upload failed with "Bucket not found"

**Cause:** 
1. Bucket didn't exist
2. Bucket was named "Documents" (capital D) but code looked for "documents"
3. Missing storage policies

**Solution:**
- Created bucket named `documents` (lowercase)
- Added RLS policies for authenticated users (INSERT, SELECT, UPDATE, DELETE)

### 9.2 PDF Too Large for Claude Context

**Problem:** Large PDFs exceeded Claude's 200K token context limit

**Cause:** Entire PDF was being sent as base64

**Solution:**
- Switched to extracting text first using `unpdf` library
- Truncate text at 150,000 characters with note about truncation
- Send plain text instead of base64 PDF

### 9.3 pdf-parse Library Bug

**Problem:** `pdf-parse` tried to load test file that doesn't exist

**Cause:** Known bug in pdf-parse library requiring test data

**Solution:** Switched to `unpdf` library which is designed for server-side usage

### 9.4 pdfjs-dist Worker Issues

**Problem:** pdfjs-dist failed with worker module errors in Next.js

**Cause:** Worker compatibility issues in serverless environment

**Solution:** Switched to `unpdf` which handles this internally

### 9.5 Benefits Not Saving (0 found)

**Problem:** Claude extracted benefits but they weren't saved

**Cause:** 
1. Missing `benefit_type_id` in Claude's response
2. Schema had UNIQUE constraint on (product_id, benefit_type_id)
3. Missing benefit types in database

**Solution:**
- Updated extraction prompt to require benefit_type_id
- Added fallback inference function to map benefit names to types
- Removed UNIQUE constraint
- Added missing benefit types (PREMIUM_WAIVER, RETRENCHMENT, CHILD_COVER, etc.)

### 9.6 Reject Functionality Error

**Problem:** Rejecting a benefit threw an error

**Cause:** Missing columns in database (rejection_reason, reviewed_at, reviewed_by)

**Solution:** Added missing columns via SQL ALTER TABLE

---

## 10. ENVIRONMENT SETUP

### 10.1 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic (Claude API)
ANTHROPIC_API_KEY=your-claude-api-key
```

### 10.2 Local Development

```bash
# Navigate to project
cd lydia-admin

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### 10.3 Supabase Setup

1. Create Supabase project
2. Run the database schema SQL
3. Create Storage bucket named `documents` (private)
4. Add storage policies for authenticated users
5. Create user accounts via Auth dashboard

---

## 11. DEPLOYMENT

### 11.1 Deployed URL

The app is deployed on Vercel (URL to be confirmed).

### 11.2 Deployment Steps

1. Push code to GitHub repository
2. Connect Vercel to GitHub repo
3. Add environment variables in Vercel dashboard
4. Deploy

### 11.3 Vercel Environment Variables

Add these in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

---

## 12. FUTURE WORK

### 12.1 Immediate Improvements

- [ ] Handle remaining extraction edge cases
- [ ] Add more benefit types as needed
- [ ] Improve benefit type inference logic
- [ ] Add bulk upload functionality
- [ ] Add search within Review page

### 12.2 Phase 2 Features

- [ ] Build advisor-facing Lydia interface
- [ ] Add comparison report generation
- [ ] Add more insurers and products
- [ ] Implement full RAG with PDF embeddings
- [ ] Add analytics dashboard

### 12.3 Future Products

- [ ] Frankly Simple (B2C consumer platform)
- [ ] Frankly Pro (B2B advisor platform)
- [ ] API for third-party integrations

---

## APPENDIX A: BENEFIT TYPES

| ID | Name | Category |
|----|------|----------|
| LIFE_COVER | Life Cover | LIFE |
| TERM_ILL | Terminal Illness | LIFE |
| FUNERAL_ADVANCE | Funeral Advance | LIFE |
| LUMP_SUM_DISAB | Lump Sum Disability | DISABILITY |
| FUNC_IMPAIR | Functional Impairment | DISABILITY |
| INCOME_DISAB | Income Disability | DISABILITY |
| SEVERE_ILL | Severe Illness Cover | SEVERE_ILLNESS |
| CANCER_COVER | Cancer Cover | SEVERE_ILLNESS |
| HEART_COVER | Heart Cover | SEVERE_ILLNESS |
| INCOME_PROT | Income Protection | INCOME |
| TEMP_INCOME | Temporary Income Protection | INCOME |
| OTHER | Other Benefits | OTHER |
| PREMIUM_WAIVER | Premium Waiver | OTHER |
| RETRENCHMENT | Retrenchment Cover | INCOME |
| CHILD_COVER | Child Cover | OTHER |
| ACCIDENTAL_DEATH | Accidental Death | LIFE |
| EDUCATION | Education Benefits | OTHER |

---

## APPENDIX B: DOMAIN RULES

| Rule Name | Importance | Description |
|-----------|------------|-------------|
| cite_sources | Critical | Always cite source document and page number |
| no_recommendations | Critical | Never recommend one insurer over another |
| explain_acceleration | High | Explain if benefit is accelerated or standalone |
| highlight_minimums | High | Highlight when minimum cover amounts differ |
| waiting_periods | High | Always mention waiting periods (even if none) |
| survival_periods | High | State survival periods clearly |
| use_insurer_terminology | Medium | Quote insurer's actual terms |

---

## APPENDIX C: FOLDER STRUCTURE

```
lydia-admin/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── upload/
│   │   │   │   └── page.tsx
│   │   │   ├── review/
│   │   │   │   └── page.tsx
│   │   │   └── train/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── upload-document/
│   │   │   ├── extract/
│   │   │   ├── review/
│   │   │   ├── extractions/
│   │   │   ├── chat/
│   │   │   ├── feedback/
│   │   │   ├── rules/
│   │   │   └── approved-outputs/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── upload/
│   │   ├── review/
│   │   └── train/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   └── utils.ts
│   └── types/
│       └── database.ts
├── .env.local
├── .env.example
├── .gitignore
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## APPENDIX D: BRANDING

### Colors (Frankly Brand)

| Name | Hex | Usage |
|------|-----|-------|
| Primary Green | #00D26A | Primary buttons, active states |
| Primary Green Hover | #00B85C | Button hover states |
| Green Light | #E6FBF0 | Success backgrounds |
| Dark | #1A1A1A | Text, dark elements |
| Gray | #4A4A4A | Secondary text |
| Gray Light | #F5F5F5 | Backgrounds |

### Logo

"Frankly." with green circle icon + "Lydia Admin" subtitle

---

*End of Context Document*
