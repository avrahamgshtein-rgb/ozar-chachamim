# 🏛️ About Ozar Chachamim

## Project Vision

**אוצר חכמים** (*Ozar Chachamim* — "Treasure of the Sages") is an interactive knowledge base dedicated to Jewish sages across 2,500 years of history. The project combines rigorous scholarship with modern data visualization to make the world of Torah, Talmud, and Jewish thought accessible to yeshiva students and graduates.

### Core Mission

To preserve and share the **interconnected wisdom of Jewish sages** — their relationships, ideas, historical contexts, and lasting contributions — through an open, beautifully-designed digital platform.

---

## The Network

### Coverage
- **365 sages** from 7 historical periods:
  - Second Temple (בית שני)
  - Tannaim (תנאים) 
  - Amoraim (אמוראים)
  - Geonim (גאונים)
  - Rishonim (ראשונים)
  - Acharonim (אחרונים)
  - Modern era (עת חדשה)

- **452 documented connections** (teacher-student, influences, debates, family ties, contemporary relationships)
- **148 sages with research summaries** drawn from academic sources, commentaries, and biographical studies
- **Geographic coverage** spanning Eretz Israel, Babylon, Spain, North Africa, France, Germany, Poland, and beyond

### Key Features
- 📊 **Interactive Network Graph** — Explore relationships via D3.js force-directed visualization
- 🗺️ **Geographic Map** — Track sage locations and migration paths across centuries
- 📚 **Research Documents** — 252 academic summaries integrated into the network
- 🎓 **Teaching Materials** — Lesson plans and discussion guides for 5 featured sages
- 🔍 **Full-Text Search** — Fuzzy matching in Hebrew, English, and transliteration
- 📱 **Responsive Design** — Works on desktop, tablet, and mobile devices
- 🌍 **Bilingual Interface** — Full Hebrew (RTL) and English support

---

## How It Works

### Three Core Components

1. **Frontend (Web App)**
   - Built with vanilla JavaScript, D3.js, Leaflet.js
   - Runs on static hosting (Vercel, localhost, or any HTTP server)
   - No backend required (data is embedded or fetched from Supabase)

2. **Data Layer (CSV + JSON)**
   - Master source: `data/חכמי ישראל.csv` (656 sages with normalized metadata)
   - Processed into `data.json` (343 unique sages, 463 validated connections)
   - Research indexed from 252 academic documents

3. **Research Archive**
   - 252 Word documents containing biographical research, historical context, and scholarly analysis
   - Automatically indexed and searchable through the web interface
   - Each document linked to one or more sages in the network

### Technical Stack
- **Frontend:** HTML5 + CSS3 + JavaScript (Vanilla)
- **Visualization:** D3.js v7 (network), Leaflet.js (maps), Canvas (timeline)
- **Data:** JSON, CSV, Supabase (optional backend)
- **Deployment:** Vercel (production), localhost (development)
- **Build:** Node.js / npm, Python (data processing)

---

## Credits & Contributors

### Project Lead
**Avraham Goldshtein**  
📧 avraham.gshtein@gmail.com  
GitHub: [ozar-chachamim-app](https://github.com/your-org/ozar-chachamim-app)

### Key Collaborators
- Claude (Anthropic) — Data validation, feature audits, optimization strategy
- Contributors to research summaries and biographical data (documented in source files)

### Data Sources
- Master dataset: *חכמי ישראל* (Hebrew sages database)
- Academic research: 252 biographical documents from scholarly works
- Geographic data: GeoNames, OpenStreetMap, historical sources
- Historical timeline: Rabbinic sources, encyclopedias, academic timelines

---

## Roadmap & Improvements

### Recent Work (July 2026)
- ✅ 365 sages + 452 connections validated
- ✅ 148 sages with full research integration
- ✅ Mobile responsiveness improved
- ✅ Connected Papers-style highlighting ready for implementation
- ⚠️ Performance optimization (spinners, virtualization) in progress

### Upcoming (Next Phases)
1. **Phase 1:** Loading spinners + fuzzy Hebrew search
2. **Phase 2:** Connected Papers interaction design (node highlighting, side panel)
3. **Phase 3:** Mobile navigation drawer + FAB redesign
4. **Phase 4:** Map legends + enhanced tooltips
5. **Phase 5:** Timeline data density fixes + date labels
6. **Phase 6:** Accessibility audit (WCAG 2.1 compliance)
7. **Phase 7:** Deep linking + advanced filtering

See `Ultimate_Claude_Code_Masterplan.docx` for detailed implementation specs.

---

## How to Use

### For Visitors
1. **Explore the Network:** Click nodes to see sage profiles, hover for connections
2. **Search:** Use the search bar (supports Hebrew spelling variations)
3. **Filter:** By period, region, or field of study
4. **Read:** Click "Research" to access biographical summaries
5. **Share:** Permalink to any sage or view is shareable

### For Contributors
See `CONTRIBUTION.md` (if present) for guidelines on adding sages, research, or features.

### For Developers
- **Local setup:** `cd ozar-chachamim && python -m http.server 8080`
- **Build:** `npm run build` (if using Node.js)
- **Data update:** See `INSTRUCTION.md` for CSV rebuild workflow
- **Code standards:** See `CLAUDE.md` and `INSTRUCTION.md`

---

## Open Source & Licensing

This project is maintained as a **public knowledge resource** for the Jewish learning community.

- **Code:** Available under [MIT License](LICENSE) (or your chosen license)
- **Data:** Available under [Creative Commons BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) (or similar)
- **Research documents:** Respect copyright of original authors and academic publishers

---

## Support & Feedback

Have questions, found an error, or want to contribute?

📧 **Email:** avraham.gshtein@gmail.com  
🐛 **Report issues:** Create an issue in the repository  
💡 **Suggest features:** Discuss in the community forum (if applicable)

---

## Acknowledgments

This project stands on the shoulders of centuries of Torah scholarship and the collaborative efforts of the Jewish learning community. We are grateful to:

- The sages whose wisdom is preserved here
- Scholars and researchers who documented their lives and teachings
- The yeshiva students and educators who will use this tool to deepen their understanding
- All contributors, past and future, who improve this resource

---

**Last updated:** July 6, 2026  
**Status:** Active development  
**Version:** 2.0 (Connected Papers redesign + research integration)

---

*אוצר חכמים — Preserving the Wisdom of Our Sages* 📚🇮🇱
