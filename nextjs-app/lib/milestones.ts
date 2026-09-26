// Historical milestones — Masterplan Phase 3 §8 / Historical_Milestones_Timeline doc.
// Fixed events rendered as a background layer on the Timeline, visible even
// when sage filters are active. Clicking an event shows its impact summary.
//
// Two kinds, drawn in different colors so the chain of transmission reads
// separately from the history around it:
//   'transmission' — a link in the chain itself: a redaction, a code, a school
//   'history'      — an outside event that shaped where and how Torah was learned
import type { Locale } from './types'

export type MilestoneKind = 'transmission' | 'history'

export interface Milestone {
  year: number
  /** Last year of an event that spans a period (the Holocaust), not a point. */
  endYear?: number
  /** The year is a conventional approximation ("~200"), not a recorded date. */
  circa?: boolean
  kind: MilestoneKind
  label: Record<Locale, string>
  summary: Record<Locale, string>
}

export const HISTORY_MILESTONES: Milestone[] = [
  {
    year: -586,
    kind: 'history',
    label: { he: 'חורבן בית ראשון', en: 'First Temple destroyed', ru: 'Разрушение Первого Храма' },
    summary: {
      he: 'נקודת מפנה מרכזית: גלות בבל וראשית עיצובה של תורה מחוץ לארץ ישראל.',
      en: 'A central turning point: the Babylonian exile and the first shaping of Torah life outside the Land of Israel.',
      ru: 'Ключевой перелом: вавилонское изгнание и начало формирования Торы вне Земли Израиля.',
    },
  },
  {
    year: 70,
    kind: 'history',
    label: { he: 'חורבן בית שני', en: 'Second Temple destroyed', ru: 'Разрушение Второго Храма' },
    summary: {
      he: 'מירושלים ליבנה: התורה שבעל־פה הופכת למרכז החיים היהודיים, ראשית עולם התנאים.',
      en: 'From Jerusalem to Yavneh: the Oral Torah becomes the center of Jewish life — the world of the Tannaim begins.',
      ru: 'Из Иерусалима в Явне: Устная Тора становится центром еврейской жизни — начинается эпоха таннаев.',
    },
  },
  {
    year: 1096,
    kind: 'history',
    label: { he: 'מסעי הצלב — תתנ״ו', en: 'First Crusade', ru: 'Первый крестовый поход' },
    summary: {
      he: 'חורבן קהילות שו״ם באשכנז ועיצוב זיכרון קידוש השם בעולמם של בעלי התוספות.',
      en: 'Destruction of the ShUM communities of Ashkenaz; the memory of martyrdom shapes the world of the Tosafists.',
      ru: 'Разрушение общин ШУМ в Ашкеназе; память о мученичестве формирует мир тосафистов.',
    },
  },
  {
    year: 1242,
    kind: 'history',
    label: { he: 'שריפת התלמוד בפריז', en: 'Burning of the Talmud in Paris', ru: 'Сожжение Талмуда в Париже' },
    summary: {
      he: 'פגיעה אנושה במרכזי התורה בצרפת; מוקד הלימוד נודד לאשכנז ולספרד.',
      en: 'A devastating blow to the Torah centers of France; the center of learning migrates to Ashkenaz and Spain.',
      ru: 'Сокрушительный удар по центрам Торы во Франции; центр учёбы смещается в Ашкеназ и Испанию.',
    },
  },
  {
    year: 1348,
    kind: 'history',
    label: { he: 'המגפה השחורה', en: 'Black Death', ru: 'Чёрная смерть' },
    summary: {
      he: 'פרעות ביהודי אירופה בעקבות המגפה; קהילות נעקרות ונודדות מזרחה.',
      en: 'Massacres of European Jewry in the wake of the plague; communities are uprooted and drift eastward.',
      ru: 'Погромы против евреев Европы после эпидемии; общины изгоняются и движутся на восток.',
    },
  },
  {
    year: 1391,
    kind: 'history',
    label: { he: 'גזירות קנ״א', en: '1391 pogroms in Spain', ru: 'Погромы 1391 года в Испании' },
    summary: {
      he: 'פרעות קשות בספרד ותחילת תופעת האנוסים; פתיחת המשבר שהוביל לגירוש.',
      en: 'Severe pogroms in Spain and the beginning of the converso phenomenon — the crisis that led to the expulsion.',
      ru: 'Тяжёлые погромы в Испании и начало явления анусим — кризис, приведший к изгнанию.',
    },
  },
  {
    // The first Hebrew book to carry a printing date: Rashi on the Torah,
    // Reggio di Calabria, 1475. Gutenberg's press (c. 1440) is not a Hebrew event.
    year: 1475,
    kind: 'history',
    label: { he: 'מהפכת הדפוס', en: 'Printing revolution', ru: 'Революция книгопечатания' },
    summary: {
      he: 'פירוש רש״י לתורה (רג׳ו די קלבריה, 1475) הוא הספר העברי הראשון הנושא תאריך דפוס. ספרי הקודש מונגשים להמונים: מהפכה בתפוצת התלמוד, הפסיקה והפרשנות.',
      en: 'Rashi on the Torah (Reggio di Calabria, 1475) is the first dated printed Hebrew book. Holy books reach the masses — a revolution in the spread of Talmud, halakha and commentary.',
      ru: 'Комментарий Раши к Торе (Реджо-ди-Калабрия, 1475) — первая датированная печатная еврейская книга. Священные книги становятся доступны всем — революция в распространении Талмуда, галахи и комментариев.',
    },
  },
  {
    year: 1492,
    kind: 'history',
    label: { he: 'גירוש ספרד', en: 'Expulsion from Spain', ru: 'Изгнание из Испании' },
    summary: {
      he: 'סיום תור הזהב והתפזרות החכמים לאימפריה העות׳מאנית, צפון אפריקה וארץ ישראל.',
      en: 'The end of the Golden Age; the sages disperse to the Ottoman Empire, North Africa and the Land of Israel.',
      ru: 'Конец Золотого века; мудрецы рассеиваются по Османской империи, Северной Африке и Земле Израиля.',
    },
  },
  {
    year: 1648,
    endYear: 1649,
    kind: 'history',
    label: { he: 'גזירות ת״ח ות״ט', en: 'Khmelnytsky massacres', ru: 'Хмельницкие погромы' },
    summary: {
      he: 'פרעות חמלניצקי במזרח אירופה: חורבן קהילות והקרקע לצמיחת החסידות.',
      en: 'The Khmelnytsky massacres in Eastern Europe: communal destruction and the soil for the growth of Hasidism.',
      ru: 'Погромы Хмельницкого в Восточной Европе: разрушение общин и почва для роста хасидизма.',
    },
  },
  {
    // France, September 1791 — the first European state to emancipate its Jews.
    // 1789 is the Revolution, not the emancipation.
    year: 1791,
    kind: 'history',
    label: { he: 'האמנציפציה', en: 'Emancipation', ru: 'Эмансипация' },
    summary: {
      he: 'צרפת מעניקה ליהודיה שוויון זכויות (1791), ובמאה ה־19 מתפשטת האמנציפציה באירופה: אתגר המודרנה נכנס לבית המדרש.',
      en: 'France grants its Jews equal rights (1791), and emancipation spreads across Europe through the 19th century — the challenge of modernity enters the study hall.',
      ru: 'Франция предоставляет евреям равные права (1791), и в XIX веке эмансипация распространяется по Европе — вызов современности входит в бейт-мидраш.',
    },
  },
  {
    year: 1897,
    kind: 'history',
    label: { he: 'הקונגרס הציוני הראשון', en: 'First Zionist Congress', ru: 'Первый сионистский конгресс' },
    summary: {
      he: 'תחילת התנועה הציונית המודרנית: החכמים נדרשים לשאלת הלאומיות והגאולה.',
      en: 'The beginning of the modern Zionist movement — the sages confront the questions of nationhood and redemption.',
      ru: 'Начало современного сионистского движения — мудрецы обращаются к вопросам нации и избавления.',
    },
  },
  {
    year: 1939,
    endYear: 1945,
    kind: 'history',
    label: { he: 'השואה', en: 'The Holocaust', ru: 'Холокост' },
    summary: {
      he: 'חורבן יהדות אירופה ומרכזי התורה הגדולים; עולם הישיבות נעקר ונבנה מחדש בישראל ובאמריקה.',
      en: 'The destruction of European Jewry and its great Torah centers; the yeshiva world is uprooted and rebuilt in Israel and America.',
      ru: 'Уничтожение европейского еврейства и великих центров Торы; мир ешив вырван с корнем и отстроен заново в Израиле и Америке.',
    },
  },
  {
    year: 1948,
    kind: 'history',
    label: { he: 'הקמת מדינת ישראל', en: 'State of Israel founded', ru: 'Создание Государства Израиль' },
    summary: {
      he: 'שיא התקומה היהודית המודרנית: מרכז התורה חוזר לארץ ישראל.',
      en: 'The peak of modern Jewish revival — the center of Torah returns to the Land of Israel.',
      ru: 'Вершина современного еврейского возрождения — центр Торы возвращается в Землю Израиля.',
    },
  },
]

export const TRANSMISSION_MILESTONES: Milestone[] = [
  {
    year: 200,
    circa: true,
    kind: 'transmission',
    label: { he: 'חתימת המשנה', en: 'Mishnah sealed', ru: 'Завершение Мишны' },
    summary: {
      he: 'רבי יהודה הנשיא עורך את המשנה: התורה שבעל־פה מקבלת צורה סדורה, והיא היסוד שעליו נבנים שני התלמודים.',
      en: 'Rabbi Judah the Prince redacts the Mishnah: the Oral Torah takes an ordered form, the foundation on which both Talmuds are built.',
      ru: 'Рабби Иегуда ха-Наси редактирует Мишну: Устная Тора обретает упорядоченную форму — основу, на которой строятся оба Талмуда.',
    },
  },
  {
    year: 500,
    circa: true,
    kind: 'transmission',
    label: { he: 'חתימת התלמוד', en: 'Talmud sealed', ru: 'Завершение Талмуда' },
    summary: {
      he: '״רבינא ורב אשי סוף הוראה״: התלמוד הבבלי נחתם והופך לספר היסוד של ההלכה; אחריו באים הסבוראים והגאונים.',
      en: '"Ravina and Rav Ashi are the end of instruction": the Babylonian Talmud is sealed and becomes the foundation text of halakha; the Savoraim and Geonim follow.',
      ru: '«Равина и Рав Аши — конец поучения»: Вавилонский Талмуд завершён и становится основным текстом галахи; за ним следуют савораим и гаоны.',
    },
  },
  {
    year: 1038,
    kind: 'transmission',
    label: { he: 'סוף תקופת הגאונים', en: 'End of the Geonic era', ru: 'Конец эпохи гаонов' },
    summary: {
      he: 'פטירת רב האי גאון: הנהגת ישיבות בבל שוקעת, ומרכז התורה עובר לספרד, לצפון אפריקה ולאשכנז — ראשית תקופת הראשונים.',
      en: 'Rav Hai Gaon dies: the leadership of the Babylonian academies fades and the center of Torah passes to Spain, North Africa and Ashkenaz — the age of the Rishonim begins.',
      ru: 'Умирает Рав Хай Гаон: руководство вавилонских академий угасает, и центр Торы переходит в Испанию, Северную Африку и Ашкеназ — начинается эпоха ришоним.',
    },
  },
  {
    year: 1180,
    circa: true,
    kind: 'transmission',
    label: { he: 'משנה תורה', en: 'Mishneh Torah', ru: 'Мишне Тора' },
    summary: {
      he: 'הרמב״ם משלים את ״משנה תורה״ — הקודקס המקיף הראשון של ההלכה כולה, מסודר לפי נושאים.',
      en: 'Maimonides completes the Mishneh Torah — the first comprehensive code of all of halakha, arranged by subject.',
      ru: 'Маймонид завершает «Мишне Тора» — первый всеобъемлющий кодекс всей галахи, упорядоченный по темам.',
    },
  },
  {
    year: 1565,
    kind: 'transmission',
    label: { he: 'שולחן ערוך', en: 'Shulchan Arukh', ru: 'Шулхан Арух' },
    summary: {
      he: 'השולחן ערוך של רבי יוסף קארו נדפס בוונציה, ועם הגהות הרמ״א הופך לספר ההלכה המחייב לספרדים ולאשכנזים גם יחד.',
      en: 'Rabbi Joseph Karo\'s Shulchan Arukh is printed in Venice; with the Rema\'s glosses it becomes the binding code for Sephardim and Ashkenazim alike.',
      ru: '«Шулхан Арух» рабби Йосефа Каро напечатан в Венеции; с глоссами Рамо он становится обязательным кодексом и для сефардов, и для ашкеназов.',
    },
  },
  {
    year: 1740,
    circa: true,
    kind: 'transmission',
    label: { he: 'ראשית החסידות', en: 'Rise of Hasidism', ru: 'Зарождение хасидизма' },
    summary: {
      he: 'הבעל שם טוב מפיץ את תורתו בפודוליה: ראשיתה של תנועת החסידות, שתעצב מחדש את עולם התורה במזרח אירופה.',
      en: 'The Baal Shem Tov teaches in Podolia: the start of the Hasidic movement, which will reshape the Torah world of Eastern Europe.',
      ru: 'Бааль Шем Тов проповедует в Подолии: начало хасидского движения, которое изменит мир Торы Восточной Европы.',
    },
  },
  {
    year: 1803,
    kind: 'transmission',
    label: { he: 'ישיבת וולוז׳ין', en: 'Volozhin Yeshiva', ru: 'Воложинская иешива' },
    summary: {
      he: 'רבי חיים מוולוז׳ין, תלמיד הגר״א, מייסד את ישיבת ״עץ חיים״ — אם הישיבות הליטאיות.',
      en: 'Rabbi Chaim of Volozhin, disciple of the Vilna Gaon, founds the Etz Chaim yeshiva — the mother of the Lithuanian yeshivot.',
      ru: 'Рабби Хаим из Воложина, ученик Виленского Гаона, основывает иешиву «Эц Хаим» — мать литовских иешив.',
    },
  },
]

/** Every milestone, in chronological order. The Timeline draws all of them. */
export const ALL_MILESTONES: Milestone[] =
  [...HISTORY_MILESTONES, ...TRANSMISSION_MILESTONES].sort((a, b) => a.year - b.year)

/**
 * The original, history-only list. The network graph's background layer reads
 * this name; it predates `kind`, so it keeps its meaning rather than silently
 * growing the transmission events too.
 */
export const MILESTONES: Milestone[] = HISTORY_MILESTONES
