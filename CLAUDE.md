# אוצר חכמים — Ozar Chachamim

## Project Purpose

**English:** A structured knowledge base about Jewish sages — their worlds, thought, historical context, and relationships — intended to serve as the foundation for a public website for yeshiva students and graduates.

**Hebrew:** בסיס ידע מובנה על חכמי ישראל לדורותיהם — עולמם, הגותם, ההקשר ההיסטורי שלהם וקשריהם ההדדיים — המיועד לשמש בסיס לאתר אינטרנט ציבורי לתלמידי ישיבות ובוגריהן.

## Target Audience

Yeshiva bochurim and alumni who want to explore the intellectual world of Torah sages — readers who have a foundation in traditional learning and are looking for deeper historical, biographical, and conceptual context beyond what they encounter in the beit midrash.

## Folder Map

```
ozar-chachamim/
├── CLAUDE.md                  — this file
├── חכמי ישראל.xlsx            — master index spreadsheet
│
├── sages/                     — one .md file per sage (canonical profiles)
├── topics/                    — cross-cutting thematic essays (e.g., mesorah, halacha, kabbalah)
├── periods/                   — historical era overviews (Rishonim, Acharonim, etc.)
├── sources/                   — raw source files (.docx originals, scanned texts)
├── templates/                 — reusable .md templates for consistent content structure
├── site-data/                 — JSON files that feed the website (sage index, tag lists, etc.)
└── notes/                     — working notes, research drafts, editorial decisions
```

## Content Conventions

- Every sage profile lives in `sages/<sage-slug>.md` and follows `templates/sage-profile.md`
- Sage slugs use English transliteration in snake_case (e.g., `rambam.md`, `maharam_rothenburg.md`)
- Tags in each profile must match the controlled vocabulary maintained in `site-data/tags.json`
- Cross-references between sages use the slug format: `[[maharam_rothenburg]]`
- Hebrew text is written right-to-left; mixed Hebrew/English files use English headings with Hebrew body text

## Source Files

Original `.docx` research documents live in `sources/`. They are the raw input — not the canonical content. The canonical version of each sage's profile is the `.md` file in `sages/`.

## Periods Reference

| Period | Hebrew | Approx. Dates |
|---|---|---|
| Tannaim | תנאים | 10–220 CE |
| Amoraim | אמוראים | 220–500 CE |
| Geonim | גאונים | 589–1038 CE |
| Rishonim | ראשונים | 1038–1563 CE |
| Acharonim | אחרונים | 1563–present |

## Current State (migration complete 2026-05-25)

- **44 sage profiles** live in `sages/` — 5 fully populated, 39 structured stubs
- **All 61 source `.docx` files** moved to `sources/<sage-slug>/` (original Hebrew filenames preserved)
- **`site-data/חכמי ישראל.xlsx`** — master index spreadsheet
- **`notes/<slug>/`** — 5 sages have rich structured notes (summary, post, lesson_plan, questions, related_figures) from the original subfolders
- **`topics/shem-mishmuel-leadership.md`** — thematic piece (not a biography)
- **`notes/mishpachat-abravanel.md`** — Abravanel family overview (multi-person, not a single sage)
- **`notes/ruth-hamoaviah.md`** — Ruth the Moabite (biblical figure, not a rabbinic sage)
- **Original empty subfolders** (`Maggid_Mishneh/`, etc.) remain in root as empty directories after content migration
- **10 duplicate `.docx` pairs** are preserved in `sources/` — both versions kept, flagged in the original audit

## Sages Index

| Slug | Hebrew Name | Period |
|---|---|---|
| `philo-alexandria` | פילון האלכסנדרוני | Second Temple |
| `rabbi-meir-tanna` | רבי מאיר | Tannaim |
| `rabbi-yehuda-bar-ilai` | רבי יהודה בר עילאי | Tannaim |
| `rabbeinu-gershom` | רבנו גרשום מאור הגולה | Rishonim (early) |
| `ravad-posquieres` | ראב"ד מפושקייר | Rishonim |
| `riva` | ריב"א | Rishonim |
| `razah` | הרז"ה | Rishonim |
| `bachya-ibn-paquda` | רבנו בחיי אבן פקודה | Rishonim |
| `rambam` | רמב"ם | Rishonim |
| `rashbam` | רשב"ם | Rishonim |
| `rabbi-yosef-bechor-shor` | יוסף בכור שור | Rishonim |
| `ramban` | רמב"ן | Rishonim |
| `ritva` | הריטב"א | Rishonim |
| `rabbeinu-bachya-ben-asher` | רבינו בחיי בן אשר | Rishonim |
| `maggid-mishneh` | המגיד משנה | Rishonim |
| `maharam-rothenburg` | מהר"ם מרוטנבורג | Rishonim |
| `rabbi-shimshon-ben-eliezer` | רבי שמשון בן אליעזר | Rishonim |
| `rabbi-yehuda-hechasid` | רבי יהודה החסיד | Rishonim |
| `baal-haturim` | בעל הטורים | Rishonim |
| `rashbatz` | הרשב"ץ | Rishonim / Acharonim |
| `ribash` | הריב"ש | Rishonim |
| `hasdai-crescas` | ר' חסדאי קרשקש | Rishonim |
| `rabbi-yitzhak-abuhav` | הרב יצחק אבוהב הראשון | Rishonim |
| `maharak` | מהרא"ק | Rishonim / Acharonim |
| `maharam-mintz` | מהר"ם מינץ | Rishonim / Acharonim |
| `maharam-segal` | מהר"ם סג"ל | Rishonim |
| `rabbi-israel-kremz` | רבי ישראל מקרמז' | Rishonim / Acharonim |
| `rabbi-yaakov-margaliot` | רבי יעקב מרגליות | Acharonim (early) |
| `rabbi-yaakov-landa` | רבי יעקב לנדא | Acharonim (early) |
| `rabbi-israel-najara` | רבי ישראל נג'ארה | Acharonim |
| `rabbi-menachem-azaria-fano` | רבי מנחם עזריה מפאנו | Acharonim |
| `yehuda-moscato` | יהודה מוסקאטו | Acharonim |
| `rabbi-david-gans` | רבי דוד גנז | Acharonim |
| `rabbi-elazar-azikri` | רבי אלעזר אזכרי | Acharonim |
| `rabbi-israel-algazi` | רבי ישראל יעקב אלגאזי | Acharonim |
| `ramchal` | הרמח"ל | Acharonim |
| `rabbi-mordechai-sharabi` | הרב מרדכי שרעבי | Modern |
| `rabbi-benzion-uziel` | הרב בן-ציון מאיר חי עוזיאל | Modern |
| `pinchas-kehati` | פנחס קהתי | Modern |
| `rabbi-levi-saadia-nahmani` | הרב לוי סעדיה נחמני | Modern |
| `netivot-shalom` | הרב שלום נח ברזובסקי | Modern |
| `rabbi-elisha-wishlitzky` | הרב אלישע וישליצקי | Modern |
| `rabbi-rafael-moshe-luria` | רבי רפאל משה לוריא | Modern |
| `rabbi-avraham-livni` | רב ד"ר אברהם לבני | Modern |
