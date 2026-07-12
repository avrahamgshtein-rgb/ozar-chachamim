// Historical milestones — Masterplan Phase 3 §8 / Historical_Milestones_Timeline doc.
// Fixed events rendered as a background layer on the Timeline, visible even
// when sage filters are active. Clicking an event shows its impact summary.
import type { Locale } from './types'

export interface Milestone {
  year: number
  label: Record<Locale, string>
  summary: Record<Locale, string>
}

export const MILESTONES: Milestone[] = [
  {
    year: -586,
    label: { he: 'חורבן בית ראשון', en: 'First Temple destroyed', ru: 'Разрушение Первого Храма' },
    summary: {
      he: 'נקודת מפנה מרכזית: גלות בבל וראשית עיצובה של תורה מחוץ לארץ ישראל.',
      en: 'A central turning point: the Babylonian exile and the first shaping of Torah life outside the Land of Israel.',
      ru: 'Ключевой перелом: вавилонское изгнание и начало формирования Торы вне Земли Израиля.',
    },
  },
  {
    year: 70,
    label: { he: 'חורבן בית שני', en: 'Second Temple destroyed', ru: 'Разрушение Второго Храма' },
    summary: {
      he: 'מירושלים ליבנה: התורה שבעל־פה הופכת למרכז החיים היהודיים, ראשית עולם התנאים.',
      en: 'From Jerusalem to Yavneh: the Oral Torah becomes the center of Jewish life — the world of the Tannaim begins.',
      ru: 'Из Иерусалима в Явне: Устная Тора становится центром еврейской жизни — начинается эпоха таннаев.',
    },
  },
  {
    year: 1096,
    label: { he: 'מסעי הצלב — תתנ"ו', en: 'First Crusade', ru: 'Первый крестовый поход' },
    summary: {
      he: 'חורבן קהילות שו"ם באשכנז ועיצוב זיכרון קידוש השם בעולמם של בעלי התוספות.',
      en: 'Destruction of the ShUM communities of Ashkenaz; the memory of martyrdom shapes the world of the Tosafists.',
      ru: 'Разрушение общин ШУМ в Ашкеназе; память о мученичестве формирует мир тосафистов.',
    },
  },
  {
    year: 1242,
    label: { he: 'שריפת התלמוד בפריז', en: 'Burning of the Talmud in Paris', ru: 'Сожжение Талмуда в Париже' },
    summary: {
      he: 'פגיעה אנושה במרכזי התורה בצרפת; מוקד הלימוד נודד לאשכנז ולספרד.',
      en: 'A devastating blow to the Torah centers of France; the center of learning migrates to Ashkenaz and Spain.',
      ru: 'Сокрушительный удар по центрам Торы во Франции; центр учёбы смещается в Ашкеназ и Испанию.',
    },
  },
  {
    year: 1348,
    label: { he: 'המגפה השחורה', en: 'Black Death', ru: 'Чёрная смерть' },
    summary: {
      he: 'פרעות ביהודי אירופה בעקבות המגפה; קהילות נעקרות ונודדות מזרחה.',
      en: 'Massacres of European Jewry in the wake of the plague; communities are uprooted and drift eastward.',
      ru: 'Погромы против евреев Европы после эпидемии; общины изгоняются и движутся на восток.',
    },
  },
  {
    year: 1391,
    label: { he: 'גזירות קנ"א', en: '1391 pogroms in Spain', ru: 'Погромы 1391 года в Испании' },
    summary: {
      he: 'פרעות קשות בספרד ותחילת תופעת האנוסים; פתיחת המשבר שהוביל לגירוש.',
      en: 'Severe pogroms in Spain and the beginning of the converso phenomenon — the crisis that led to the expulsion.',
      ru: 'Тяжёлые погромы в Испании и начало явления анусим — кризис, приведший к изгнанию.',
    },
  },
  {
    year: 1440,
    label: { he: 'מהפכת הדפוס', en: 'Printing revolution', ru: 'Революция книгопечатания' },
    summary: {
      he: 'הנגשת ספרי קודש להמונים: מהפכה בתפוצת התלמוד, הפסיקה והפרשנות.',
      en: 'Holy books become accessible to the masses — a revolution in the spread of Talmud, halakha and commentary.',
      ru: 'Священные книги становятся доступны всем — революция в распространении Талмуда, галахи и комментариев.',
    },
  },
  {
    year: 1492,
    label: { he: 'גירוש ספרד', en: 'Expulsion from Spain', ru: 'Изгнание из Испании' },
    summary: {
      he: 'סיום תור הזהב והתפזרות החכמים לאימפריה העות\'מאנית, צפון אפריקה וארץ ישראל.',
      en: 'The end of the Golden Age; the sages disperse to the Ottoman Empire, North Africa and the Land of Israel.',
      ru: 'Конец Золотого века; мудрецы рассеиваются по Османской империи, Северной Африке и Земле Израиля.',
    },
  },
  {
    year: 1648,
    label: { he: 'גזירות ת"ח ות"ט', en: 'Khmelnytsky massacres', ru: 'Хмельницкие погромы' },
    summary: {
      he: 'פרעות חמלניצקי במזרח אירופה: חורבן קהילות והקרקע לצמיחת החסידות.',
      en: 'The Khmelnytsky massacres in Eastern Europe: communal destruction and the soil for the growth of Hasidism.',
      ru: 'Погромы Хмельницкого в Восточной Европе: разрушение общин и почва для роста хасидизма.',
    },
  },
  {
    year: 1789,
    label: { he: 'האמנציפציה', en: 'Emancipation', ru: 'Эмансипация' },
    summary: {
      he: 'שינוי במעמד המשפטי של יהודי אירופה: אתגר המודרנה נכנס לבית המדרש.',
      en: 'A change in the legal status of European Jewry — the challenge of modernity enters the study hall.',
      ru: 'Изменение правового статуса евреев Европы — вызов современности входит в бейт-мидраш.',
    },
  },
  {
    year: 1897,
    label: { he: 'הקונגרס הציוני הראשון', en: 'First Zionist Congress', ru: 'Первый сионистский конгресс' },
    summary: {
      he: 'תחילת התנועה הציונית המודרנית: החכמים נדרשים לשאלת הלאומיות והגאולה.',
      en: 'The beginning of the modern Zionist movement — the sages confront the questions of nationhood and redemption.',
      ru: 'Начало современного сионистского движения — мудрецы обращаются к вопросам нации и избавления.',
    },
  },
  {
    year: 1939,
    label: { he: 'השואה', en: 'The Holocaust', ru: 'Холокост' },
    summary: {
      he: 'חורבן יהדות אירופה ומרכזי התורה הגדולים; עולם הישיבות נעקר ונבנה מחדש בישראל ובאמריקה.',
      en: 'The destruction of European Jewry and its great Torah centers; the yeshiva world is uprooted and rebuilt in Israel and America.',
      ru: 'Уничтожение европейского еврейства и великих центров Торы; мир ешив вырван с корнем и отстроен заново в Израиле и Америке.',
    },
  },
  {
    year: 1948,
    label: { he: 'הקמת מדינת ישראל', en: 'State of Israel founded', ru: 'Создание Государства Израиль' },
    summary: {
      he: 'שיא התקומה היהודית המודרנית: מרכז התורה חוזר לארץ ישראל.',
      en: 'The peak of modern Jewish revival — the center of Torah returns to the Land of Israel.',
      ru: 'Вершина современного еврейского возрождения — центр Торы возвращается в Землю Израиля.',
    },
  },
]
