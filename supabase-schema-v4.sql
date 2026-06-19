-- Ozar Chachamim — Extended Connection Metadata Schema
-- Version 4: Adds strength, period, context_he, evidence_source to connections

-- Existing tables (from v3) remain unchanged
-- New columns added to connections table

ALTER TABLE connections
ADD COLUMN IF NOT EXISTS strength INT DEFAULT 2 CHECK (strength >= 1 AND strength <= 5),
ADD COLUMN IF NOT EXISTS period TEXT DEFAULT 'לא ידוע',
ADD COLUMN IF NOT EXISTS context_he TEXT,
ADD COLUMN IF NOT EXISTS evidence_source TEXT DEFAULT 'מסורת קלאסית';

-- Create index on strength for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_connections_strength ON connections(strength);

-- Example: Populate existing connections with metadata
-- (These are based on research documents and classic sources)
UPDATE connections SET strength = 4, period = 'תנאים-אמוראים', context_he = 'עמיתים בדיון הלכתי בנושאי ביטול מעות חמץ וערכי קרבנות', evidence_source = 'מסכת פסחים' WHERE source_id = 13 AND target_id = 41;
UPDATE connections SET strength = 3, period = 'תנאים', context_he = 'משקפים דיון קולקטיבי בבית המדרש בנושאי טהרות ובתולה', evidence_source = 'מסכת כתובות' WHERE source_id = 24 AND target_id = 242;
UPDATE connections SET strength = 4, period = 'תנאים', context_he = 'תלמיד ומורה בנושא הלכות קידושין וגט', evidence_source = 'מסכת קידושין' WHERE source_id = 27 AND target_id = 25;
UPDATE connections SET strength = 2, period = 'גאונים', context_he = 'התפתחות מקבילה של שיטות פסקה בגאוניות', evidence_source = 'תשובות גאונים' WHERE source_id = 31 AND target_id = 232;
UPDATE connections SET strength = 3, period = 'תנאים', context_he = 'עמיתים בדיון על תחביב וטעם המלח', evidence_source = 'מסכת מכות' WHERE source_id = 32 AND target_id = 41;
UPDATE connections SET strength = 2, period = 'ראשונים', context_he = 'שיטות מקבילות בפרשת ההלכה ובתפסוק', evidence_source = 'ביאורי ראשונים' WHERE source_id = 36 AND target_id = 229;
UPDATE connections SET strength = 2, period = 'בית שני', context_he = 'השפעה תרבותית הלנית על חכמי ארץ ישראל', evidence_source = 'מסכת מנחות' WHERE source_id = 37 AND target_id = 3;
UPDATE connections SET strength = 4, period = 'תנאים', context_he = 'עיסוק משותף בכללי דיון הלכתי', evidence_source = 'פעילות בבית המדרש' WHERE source_id = 41 AND target_id = 25;
UPDATE connections SET strength = 3, period = 'אמוראים', context_he = 'תלמידים של אותו מורה בבבל', evidence_source = 'הגמרא' WHERE source_id = 43 AND target_id = 47;
UPDATE connections SET strength = 2, period = 'תנאים-אמוראים', context_he = 'השפעה בעקבות מסורת', evidence_source = 'ספרות חז"ל' WHERE source_id = 43 AND target_id = 41;
UPDATE connections SET strength = 3, period = 'תנאים', context_he = 'שותפות בעמידה לפני בעית הדין', evidence_source = 'מסכת בבא בתרא' WHERE source_id = 44 AND target_id = 41;
UPDATE connections SET strength = 2, period = 'תנאים', context_he = 'מרחוק - השפעת השיטה', evidence_source = 'כללי הדיון' WHERE source_id = 50 AND target_id = 41;
UPDATE connections SET strength = 3, period = 'תנאים', context_he = 'שיתוף בהלכות ודיון קולקטיבי', evidence_source = 'ספרות התנאים' WHERE source_id = 51 AND target_id = 41;
UPDATE connections SET strength = 2, period = 'אמוראים', context_he = 'השפעה בעקבות מסורת', evidence_source = 'עברת שיטה דור לדור' WHERE source_id = 60 AND target_id = 41;
UPDATE connections SET strength = 4, period = 'אמוראים', context_he = 'תלמיד ומורה בבבל בנושא הלכות קידושין', evidence_source = 'הגמרא הבבלית' WHERE source_id = 109 AND target_id = 106;
UPDATE connections SET strength = 3, period = 'גאונים', context_he = 'דיון על תיקוני הגאונים וסדרי התפילה', evidence_source = 'תשובות גאונים' WHERE source_id = 114 AND target_id = 250;
UPDATE connections SET strength = 4, period = 'ראשונים', context_he = 'תלמידים של אותו מורה בצרפת', evidence_source = 'ספרות הבעלי התוספות' WHERE source_id = 146 AND target_id = 154;
UPDATE connections SET strength = 3, period = 'ראשונים', context_he = 'עמיתים בעבודת הפרשנות בצרפת', evidence_source = 'ביאור הגמרא' WHERE source_id = 146 AND target_id = 137;
UPDATE connections SET strength = 3, period = 'ראשונים', context_he = 'שיתוף בעבודת הפרשנות', evidence_source = 'כתבי ראשונים' WHERE source_id = 148 AND target_id = 169;
UPDATE connections SET strength = 4, period = 'ראשונים', context_he = 'משפחה - דור לדור', evidence_source = 'ביוגרפיות משפחתיות' WHERE source_id = 151 AND target_id = 148;
UPDATE connections SET strength = 1, period = 'ראשונים', context_he = 'ציטוט וקבלת שיטה', evidence_source = 'ספרות התנאים' WHERE source_id = 153 AND target_id = 41;
UPDATE connections SET strength = 2, period = 'ראשונים', context_he = 'השפעה עקיפה דרך מסורת', evidence_source = 'עברת דברים' WHERE source_id = 162 AND target_id = 41;
UPDATE connections SET strength = 2, period = 'ראשונים', context_he = 'דיון על הלכות אבל וחציוט', evidence_source = 'מסכת מועד קטן' WHERE source_id = 162 AND target_id = 20;
UPDATE connections SET strength = 3, period = 'אחרונים', context_he = 'שיטות מקבילות בהלכה חדשה', evidence_source = 'עמדות אחרונים' WHERE source_id = 184 AND target_id = 229;
UPDATE connections SET strength = 2, period = 'אחרונים', context_he = 'דיון על חדושים וקביעת הלכה', evidence_source = 'כתבי אחרונים' WHERE source_id = 185 AND target_id = 232;

-- Row-Level Security (RLS) policies remain same as v3
-- No new permissions needed for the new columns
