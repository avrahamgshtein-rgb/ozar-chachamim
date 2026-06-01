# אוצר חכמים — Ozar Chachamim

## Project Purpose

**English:** A structured knowledge base about Jewish sages — their worlds, thought, historical context, and relationships — intended to serve as the foundation for a public website for yeshiva students and graduates.

**Hebrew:** בסיס ידע מובנה על חכמי ישראל לדורותיהם — עולמם, הגותם, ההקשר ההיסטורי שלהם וקשריהם ההדדיים — המיועד לשמש בסיס לאתר אינטרנט ציבורי לתלמידי ישיבות ובוגריהן.

## Current Goal (Phase 1: Auth + History)

Add user authentication and personal research history:
1. Users log in with email/password (via Supabase)
2. Each user has personal "research history" — sages viewed, timestamps, personal notes
3. Users can bookmark favorite sages
4. Deploy to Vercel + Supabase (free tier)

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JS (RTL, Frank Ruhl Libre + Heebo fonts)
- **Current Deployment:** Vercel (static HTML)
- **Backend (Phase 1):** Supabase (PostgreSQL + Auth)
- **API (Phase 2):** Claude API for AI insights
- **Views:** Grid (cards), Network (SVG force graph), Geographic (11 regions)

## Sages (44 Total)

- **Fully populated:** rambam, ramban, ritva, rabbi-meir-tanna, pinchas-kehati
- **Stubs ready:** 39 more
- **Network:** All linked with teacher→student edges

## Architecture

Single-file SPA (`index.html`):
- ~800 lines CSS + HTML + JS
- Embedded SAGES_DATA array (all 44 sages)
- SVG force-directed network graph (Verlet physics)
- Modal for deep research (async DATA/ fetch)

## Next Steps (This Week)

1. ✅ CLAUDE.md created
2. → Set up Supabase (free project)
3. → Create auth tables + user_history table
4. → Add login form to index.html
5. → Deploy to Vercel + link Supabase
6. → Test end-to-end

## Resources

- Deployment: https://vercel.com
- Backend: https://supabase.com (free tier)
- AI: https://console.anthropic.com
