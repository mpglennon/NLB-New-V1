# Blackwell Product Vision — Future State

*Captured: Feb 20, 2026 | Michael + Opus brainstorm*
*Timeframe: 2-3 months out, after NLBCash is generating revenue and Hard Asset manuscript is complete*

---

## The Thesis

One financial projection engine. Three products. Three brands. Three price points. Three audiences that never cross-shop each other.

---

## Product 1: NLBCash (LIVE — in testing)

| | |
|---|---|
| **What** | 30-second daily cash flow check-in |
| **Audience** | Everyday people — freelancers, severance, students, lumpy income |
| **Vibe** | Dark, minimal, anti-anxiety |
| **Tagline** | "Life, not lattes." |
| **Price** | ~$5-10/mo |
| **Domain** | nlbcash.ca |
| **Status** | Auth + sync live, user testing in progress |

NLBCash stays as the daily driver. Opens fast, update in 30 seconds, see your runway. Sits *on top of* the deeper tools below — they complement, they don't compete.

---

## Product 2: Personal Wealth Architect (CONCEPT)

| | |
|---|---|
| **What** | Personal FP&A platform for the financially sophisticated |
| **Audience** | High net worth individuals, financially savvy professionals, anyone who wants a real model — not just a budget |
| **Vibe** | Dark, elegant, premium — similar aesthetic to NLBCash but richer |
| **Tagline energy** | "Your money. Your model." |
| **Price** | ~$25-50/mo |
| **Domain** | TBD |
| **Cadence** | Weekly cockpit, not a daily glance |

### What It Does (That NLBCash Doesn't)
- Full financial model: income, expenses, assets, liabilities, net worth projection
- Scenario modeling ("what if I take this job?" / "what if I sell the house?" / "what if I get a roommate?")
- Light historical analysis — not obsessive backward-looking, but enough to see trends
- CEO-style dashboard: the numbers that matter, no noise
- Multiple accounts (checking, savings, investment — the full picture)
- Possibly: tax projection, retirement runway, milestone tracking

### Core Insight
The "do I need a roommate?" question is just runway math with more variables. Same engine as NLBCash, deeper inputs, richer outputs.

---

## Product 3: CEO Dashboard (CONCEPT)

| | |
|---|---|
| **What** | Same FP&A engine, reskinned for business |
| **Audience** | Founders, CEOs, operators who are tired of waiting on their CFO |
| **Vibe** | Clean, professional, lighter palette — more pigment, less dark mode |
| **Tagline energy** | "Stop waiting on your CFO." |
| **Price** | ~$50-100/mo |
| **Domain** | TBD |
| **Cadence** | Weekly / as-needed scenario runs |

### Vocabulary Reskin

| Personal Version | Business Version |
|---|---|
| Income | Revenue |
| Expenses | OPEX / COGS |
| Surplus | EBITDA |
| Balance | Cash Position |
| Runway | Burn Rate / Months of Runway |
| "Do I need a roommate?" | "Do I need to close that deal next week?" |

### Core Insight
Same data model, same projection engine, same charts. Different labels, different default categories, maybe a few business-specific views (P&L summary, cash flow statement, revenue by segment). Build once, sell twice.

The pain point is real: CFOs guard their territory. A CEO asks for numbers on Monday, gets told Friday, then gets stalled for two weeks. This tool lets the CEO run their own scenarios without asking permission.

---

## Architecture Strategy

- **Shared core:** One calculation engine (the runway/projection math from NLBCash, extended)
- **Separate frontends:** Each product gets its own repo, domain, landing page, brand identity
- **Separate Supabase projects:** Clean data isolation per product
- **Separate Stripe accounts:** Or one Stripe account with separate products — TBD based on brand separation needs

---

## Go-to-Market Sequence

1. **NOW:** Finish NLBCash testing, domain, Stripe, launch. Get to revenue.
2. **THEN:** Complete Hard Asset manuscript.
3. **FUTURE (2-3 months):** Begin competitive teardown for Personal Wealth Architect
   - Analyze: Monarch, Tiller, Copilot, YNAB, Quicken, ProjectionLab
   - Reddit research: what users love, what they hate
   - Build opinionated PRD with Opus — screen by screen, data model, user flows
   - Build to spec in focused sessions (not iterative discovery like NLBCash)
4. **AFTER THAT:** Reskin to CEO Dashboard with business vocabulary

---

## Build Process Improvement (Learned from NLBCash)

NLBCash was built **forward** — start simple, iterate based on feel and feedback. It worked but burned many iteration cycles.

Future products should be built **reverse-engineered:**
1. Competitive teardown (Opus + Kate do overnight research)
2. Opinionated PRD (Michael reviews like a board deck)
3. Build to spec (80% in 1-2 long sessions)
4. User testing catches the remaining 20% (date picker size, single-occurrence edits — the stuff no PRD catches)

Estimated savings: 60-70% fewer iteration cycles vs. NLBCash.

---

## NLC App Studios — Parent Brand
- All products ship under NLC App Studios (Natural Language Coding)
- Each product gets its own domain, identity, and audience — completely separate consumer-facing brands
- Studios brand is for Michael's credibility and portfolio, not consumer-facing marketing

---

*This doc is a parking lot. Come back to it when NLBCash is cashflowing and the manuscript is done. Don't build ahead of revenue.*
