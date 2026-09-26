// The chain of transmission from Sinai, as the Rambam counts it in his
// introduction to Mishneh Torah: forty generations from Rav Ashi back to
// Moses ("נמצא מרב אשי עד משה רבנו ארבעים דורות"). The count follows his
// closing summary, which runs through the line of the Nesi'im (Hillel's
// house) from Hillel to Rabbeinu HaKadosh; his fuller list also names the
// students who received alongside them, kept here as `alongside`.
//
// Stations are in chronological order, Moses first. `match` holds sage LABELS
// exactly as they appear in the dataset: resolve them against the loaded
// sages at runtime, never by id (ids drift, names don't). A station whose
// people aren't in the corpus yet has an empty `match` and is shown as text.

import type { Locale } from './types'

type T = Record<Locale, string>

export interface ChainStation {
  /** 1 = Moses … 40 = Rav Ashi. */
  gen: number
  name: T
  /** Dataset labels of the people at this station. */
  match: string[]
  /** Others the Rambam names as receiving in the same generation. */
  alongside?: { name: T; match: string[] }[]
}

export const SINAI_CHAIN_SOURCE: T = {
  he: 'הקדמת הרמב״ם למשנה תורה',
  en: "Maimonides, Introduction to the Mishneh Torah",
  ru: 'Маймонид, предисловие к «Мишне Тора»',
}

export const SINAI_CHAIN: ChainStation[] = [
  { gen: 1,  name: { he: 'משה רבנו', en: 'Moses', ru: 'Моисей' }, match: ['משה רבנו'] },
  { gen: 2,  name: { he: 'יהושע', en: 'Joshua', ru: 'Иисус Навин' }, match: [] },
  { gen: 3,  name: { he: 'פנחס והזקנים', en: 'Pinchas and the Elders', ru: 'Пинхас и старейшины' }, match: [] },
  { gen: 4,  name: { he: 'עלי', en: 'Eli', ru: 'Илий' }, match: [] },
  { gen: 5,  name: { he: 'שמואל', en: 'Samuel', ru: 'Самуил' }, match: ['שמואל הנביא'] },
  { gen: 6,  name: { he: 'דוד המלך', en: 'King David', ru: 'Царь Давид' }, match: ['דוד המלך'] },
  { gen: 7,  name: { he: 'אחיה השילוני', en: 'Ahijah the Shilonite', ru: 'Ахия Силомлянин' }, match: [] },
  { gen: 8,  name: { he: 'אליהו', en: 'Elijah', ru: 'Илия' }, match: [] },
  { gen: 9,  name: { he: 'אלישע', en: 'Elisha', ru: 'Елисей' }, match: [] },
  { gen: 10, name: { he: 'יהוידע הכהן', en: 'Jehoiada the Priest', ru: 'Иодай-священник' }, match: [] },
  { gen: 11, name: { he: 'זכריה', en: 'Zechariah', ru: 'Захария' }, match: [] },
  { gen: 12, name: { he: 'הושע', en: 'Hosea', ru: 'Осия' }, match: [] },
  { gen: 13, name: { he: 'עמוס', en: 'Amos', ru: 'Амос' }, match: [] },
  { gen: 14, name: { he: 'ישעיהו', en: 'Isaiah', ru: 'Исаия' }, match: ['ישעיהו הנביא'] },
  { gen: 15, name: { he: 'מיכה', en: 'Micah', ru: 'Михей' }, match: [] },
  { gen: 16, name: { he: 'יואל', en: 'Joel', ru: 'Иоиль' }, match: [] },
  { gen: 17, name: { he: 'נחום', en: 'Nahum', ru: 'Наум' }, match: [] },
  { gen: 18, name: { he: 'חבקוק', en: 'Habakkuk', ru: 'Аввакум' }, match: [] },
  { gen: 19, name: { he: 'צפניה', en: 'Zephaniah', ru: 'Софония' }, match: [] },
  { gen: 20, name: { he: 'ירמיהו', en: 'Jeremiah', ru: 'Иеремия' }, match: [] },
  { gen: 21, name: { he: 'ברוך בן נריה', en: 'Baruch son of Neriah', ru: 'Варух, сын Нирии' }, match: [] },
  { gen: 22, name: { he: 'עזרא ובית דינו', en: 'Ezra and his court', ru: 'Ездра и его суд' }, match: ['עזרא הסופר'] },
  { gen: 23, name: { he: 'שמעון הצדיק', en: 'Simeon the Just', ru: 'Шимон Праведный' }, match: [] },
  { gen: 24, name: { he: 'אנטיגנוס איש סוכו', en: 'Antigonus of Sokho', ru: 'Антигнос из Сохо' }, match: [] },
  { gen: 25, name: { he: 'יוסי בן יועזר ויוסף בן יוחנן', en: 'Yose ben Yoezer and Yosef ben Yochanan', ru: 'Йосе бен Йоэзер и Йосеф бен Йоханан' }, match: [] },
  { gen: 26, name: { he: 'יהושע בן פרחיה ונתאי הארבלי', en: 'Joshua ben Perachiah and Nittai of Arbel', ru: 'Иеошуа бен Перахья и Ниттай из Арбеля' }, match: [] },
  { gen: 27, name: { he: 'יהודה בן טבאי ושמעון בן שטח', en: 'Judah ben Tabbai and Simeon ben Shetach', ru: 'Иегуда бен Таббай и Шимон бен Шетах' }, match: ['שמעון בן שטח'] },
  { gen: 28, name: { he: 'שמעיה ואבטליון', en: 'Shemaiah and Avtalion', ru: 'Шмайя и Авталион' }, match: [] },
  { gen: 29, name: { he: 'הלל ושמאי', en: 'Hillel and Shammai', ru: 'Гилель и Шамай' }, match: ['הלל הזקן', 'שמאי הזקן'] },
  {
    gen: 30, name: { he: 'רבן שמעון בנו של הלל', en: 'Rabban Shimon son of Hillel', ru: 'Раббан Шимон, сын Гилеля' }, match: [],
    alongside: [{ name: { he: 'רבן יוחנן בן זכאי', en: 'Rabban Yochanan ben Zakkai', ru: 'Раббан Йоханан бен Заккай' }, match: ['רבן יוחנן בן זכאי'] }],
  },
  {
    gen: 31, name: { he: 'רבן גמליאל הזקן', en: 'Rabban Gamliel the Elder', ru: 'Раббан Гамлиэль Старший' }, match: [],
    alongside: [{
      name: { he: 'רבי אליעזר הגדול ורבי יהושע', en: 'Rabbi Eliezer the Great and Rabbi Joshua', ru: 'Рабби Элиэзер Великий и рабби Иеошуа' },
      match: ['רבי אליעזר הגדול (רבי אליעזר בן הורקנוס)', 'רבי יהושע בן חנניה'],
    }],
  },
  {
    gen: 32, name: { he: 'רבן שמעון בן גמליאל', en: 'Rabban Shimon ben Gamliel', ru: 'Раббан Шимон бен Гамлиэль' }, match: ['רבן שמעון בן גמליאל הראשון'],
    alongside: [{ name: { he: 'רבי עקיבא', en: 'Rabbi Akiva', ru: 'Рабби Акива' }, match: ['רבי עקיבא בן יוסף'] }],
  },
  {
    gen: 33, name: { he: 'רבן גמליאל', en: 'Rabban Gamliel', ru: 'Раббан Гамлиэль' }, match: ['רבן גמליאל דיבנה'],
    alongside: [{
      name: { he: 'רבי מאיר, רבי יהודה, רבי יוסי ורבי שמעון', en: 'Rabbi Meir, Rabbi Judah, Rabbi Yose and Rabbi Shimon', ru: 'Рабби Меир, рабби Иегуда, рабби Йосе и рабби Шимон' },
      match: ['רבי מאיר בעל הנס', 'רבי יהודה בר אילאי', 'רבי יוסי בן חלפתא', 'רבי שמעון בר יוחאי'],
    }],
  },
  { gen: 34, name: { he: 'רבן שמעון', en: 'Rabban Shimon', ru: 'Раббан Шимон' }, match: [] },
  { gen: 35, name: { he: 'רבינו הקדוש', en: 'Rabbi Judah the Prince', ru: 'Рабби Иегуда ха-Наси' }, match: ['רבי יהודה הנשיא'] },
  { gen: 36, name: { he: 'רבי יוחנן, רב ושמואל', en: 'Rabbi Yochanan, Rav and Shmuel', ru: 'Рабби Йоханан, Рав и Шмуэль' }, match: ['שמואל (האמורא)'] },
  { gen: 37, name: { he: 'רב הונא', en: 'Rav Huna', ru: 'Рав Хуна' }, match: ['רב הונא'] },
  { gen: 38, name: { he: 'רבה', en: 'Rabbah', ru: 'Рабба' }, match: [] },
  { gen: 39, name: { he: 'רבא', en: 'Rava', ru: 'Рава' }, match: [] },
  { gen: 40, name: { he: 'רב אשי', en: 'Rav Ashi', ru: 'Рав Аши' }, match: [] },
]
