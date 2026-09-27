// Schools of thought and centres of learning ("בתי מדרש ומסורות").
//
// Curated, not derived: each school lists the sages who belong to it by NAME
// (the Hebrew display name, as `displayName(label)` returns it), never by id.
// Names are resolved against whatever dataset the app loaded, at runtime, so
// an id renumbering can't silently attach the wrong person to a school; a name
// that stops resolving simply drops out (and the scratchpad check script
// fails). Membership is conservative on purpose: only people whose place in
// the school is textbook, not argued. Accuracy over coverage.
//
// A school is shown only if at least MIN_MEMBERS of its people resolve.

import type { Locale, Period, Region, Sage } from './types'
import { ALL_PERIODS } from './types'
import { displayName } from './displayName'

export type L10n = Record<Locale, string>

/**
 * How a school relates to another, read from the school that lists it:
 *   influenced — this school influenced the other
 *   opposed    — this school opposed the other
 *   grewOutOf  — this school grew out of the other
 */
export type SchoolRelation = 'influenced' | 'opposed' | 'grewOutOf'

export interface School {
  key: string
  name: L10n
  /** Short name for tight spots (the family map). */
  short: L10n
  /** 2–3 sentences, factual and restrained. */
  summary: L10n
  /** Approximate years of activity; `null` end = continues today. */
  span: [number, number | null]
  region: Region
  /** A representative place. */
  place: L10n
  /** Sage names (Hebrew display names), matched to the dataset by name. */
  founders: string[]
  members: string[]
  keyIdeas: L10n[]
  related: { key: string; relation: SchoolRelation }[]
}

export const MIN_MEMBERS = 3

export const SCHOOLS: School[] = [
  {
    key: 'hillel-shammai',
    name:  { he: 'בית הלל ובית שמאי', en: 'The Houses of Hillel and Shammai', ru: 'Школы Гиллеля и Шаммая' },
    short: { he: 'בית הלל ושמאי', en: 'Hillel & Shammai', ru: 'Гиллель и Шаммай' },
    summary: {
      he: 'שתי האסכולות שצמחו סביב הלל הזקן ושמאי הזקן בשלהי ימי הבית השני. המשנה והתלמוד מתעדים מאות מחלוקות ביניהן, ולרוב בית שמאי מחמירים ובית הלל מקלים. לפי התלמוד יצאה בת קול ואמרה: ״אלו ואלו דברי אלהים חיים, והלכה כבית הלל״.',
      en: 'Two schools that formed around Hillel the Elder and Shammai the Elder in the last generations of the Second Temple. The Mishnah and Talmud record hundreds of disputes between them, with the House of Shammai usually taking the stricter view. The Talmud tells of a heavenly voice declaring that “both are the words of the living God, but the law follows the House of Hillel.”',
      ru: 'Две школы, сложившиеся вокруг Гиллеля Старшего и Шаммая Старшего в последние поколения эпохи Второго Храма. Мишна и Талмуд фиксируют сотни споров между ними, и, как правило, школа Шаммая занимает более строгую позицию. По преданию Талмуда, небесный голос провозгласил: «И те и другие — слова Бога живого, но закон — по дому Гиллеля».',
    },
    span: [-30, 70],
    region: 'eretz-israel',
    place: { he: 'ירושלים', en: 'Jerusalem', ru: 'Иерусалим' },
    founders: ['הלל הזקן', 'שמאי הזקן'],
    members: ['רבן יוחנן בן זכאי'],
    keyIdeas: [
      { he: 'מחלוקת לשם שמיים', en: 'Dispute for the sake of Heaven', ru: 'Спор ради Небес' },
      { he: 'הלכה כבית הלל: ענווה והקדמת דברי החולקים', en: 'Why the law follows Hillel: humility, and quoting the other side first', ru: 'Почему закон — по Гиллелю: скромность и первое слово оппоненту' },
      { he: '״מה ששנוא עליך אל תעשה לחברך״', en: '“What is hateful to you, do not do to your fellow”', ru: '«Что ненавистно тебе, не делай ближнему»' },
    ],
    related: [{ key: 'bavel', relation: 'influenced' }],
  },
  {
    key: 'bavel',
    name:  { he: 'ישיבות סורא ופומבדיתא', en: 'The Academies of Sura and Pumbedita', ru: 'Академии Суры и Пумбедиты' },
    short: { he: 'ישיבות בבל', en: 'Babylonian academies', ru: 'Академии Вавилонии' },
    summary: {
      he: 'שתי הישיבות הגדולות של בבל, שפעלו במשך כשמונה מאות שנה. בהן התגבש התלמוד הבבלי, ומהן הנהיגו הגאונים קהילות מספרד ועד צפון אפריקה באמצעות תשובות ששלחו אליהן. אחרי מותו של רב האי גאון ב־1038 דעכה השפעתן, ומרכז התורה עבר מערבה.',
      en: 'The two great academies of Babylonia, active for some eight centuries. The Babylonian Talmud took shape in their halls, and the Geonim who later headed them guided communities from Spain to North Africa through their responsa. After Rav Hai Gaon died in 1038 their authority faded and the centre of learning moved west.',
      ru: 'Две великие академии Вавилонии, действовавшие около восьми веков. В их стенах сложился Вавилонский Талмуд, а возглавлявшие их позднее гаоны направляли общины от Испании до Северной Африки своими респонсами. После смерти рава Хая Гаона в 1038 году их влияние угасло, и центр учёности переместился на запад.',
    },
    span: [220, 1040],
    region: 'mizrach',
    place: { he: 'סורא ופומבדיתא, בבל', en: 'Sura and Pumbedita, Babylonia', ru: 'Сура и Пумбедита, Вавилония' },
    founders: ['רב יהודה בר יחזקאל'],
    members: [
      'רב הונא', 'רב חסדא', 'רב יוסף בר חייא',
      'רב סעדיה גאון', 'רב שמואל בן חפני גאון (רשב״ה)', 'רב שרירא גאון', 'רב האי גאון',
    ],
    keyIdeas: [
      { he: 'עיצוב התלמוד הבבלי ולימודו', en: 'Shaping and teaching the Babylonian Talmud', ru: 'Создание и изучение Вавилонского Талмуда' },
      { he: 'ספרות השאלות והתשובות', en: 'Responsa: law by correspondence', ru: 'Респонсы: закон в переписке' },
      { he: 'ירחי כלה: כינוסי לימוד המוניים באדר ובאלול', en: 'The kallah months: mass study gatherings in Adar and Elul', ru: 'Месяцы «калла»: массовые учебные собрания в адаре и элуле' },
    ],
    related: [{ key: 'andalusia', relation: 'influenced' }],
  },
  {
    key: 'andalusia',
    name:  { he: 'תור הזהב בספרד', en: 'The Golden Age in Spain', ru: 'Золотой век в Испании' },
    short: { he: 'תור הזהב', en: 'Golden Age', ru: 'Золотой век' },
    summary: {
      he: 'תקופת פריחה של יהדות ספרד המוסלמית, שבה צמחו זו לצד זו תורה, שירה, דקדוק ופילוסופיה. אנשי חצר כמו חסדאי אבן שפרוט ושמואל הנגיד תמכו במשוררים ובמדקדקים, וישיבת לוסנה של הרי״ף ורבי יוסף אבן מיגאש הפכה את ספרד למרכז תלמודי. פלישת המווחידון באמצע המאה ה־12 פיזרה את חכמיה צפונה ומזרחה.',
      en: 'A flowering of Jewish life in Muslim Spain, where Torah, poetry, grammar and philosophy grew side by side. Courtiers such as Hasdai ibn Shaprut and Samuel ha-Nagid patronised poets and grammarians, while the Lucena academy of the Rif and Joseph ibn Migash made Spain a Talmudic centre. The Almohad invasion in the mid-twelfth century scattered its scholars north and east.',
      ru: 'Расцвет еврейской жизни в мусульманской Испании, где Тора, поэзия, грамматика и философия развивались бок о бок. Придворные вроде Хасдая ибн Шапрута и Шмуэля ха-Нагида покровительствовали поэтам и грамматикам, а академия Рифа и Йосефа ибн Мигаша в Лусене сделала Испанию центром изучения Талмуда. Вторжение Альмохадов в середине XII века рассеяло её мудрецов на север и восток.',
    },
    span: [940, 1170],
    region: 'sefarad',
    place: { he: 'קורדובה ולוסנה', en: 'Córdoba and Lucena', ru: 'Кордова и Лусена' },
    founders: ['חסדאי אבן שפרוט'],
    members: [
      'מנחם בן סרוק', 'דונש בן לברט', 'שמואל הנגיד', "רבי יונה אבן ג'נאח",
      'רבי שלמה אבן גבירול', 'רבי יצחק אבן גיאת', 'רבנו בחיי אבן פקודה',
      'רבי יצחק אלפסי (הרי״ף)', 'רבי יוסף אבן מיגאש', 'רבי יהודה הלוי (ריה״ל)',
      'אברהם אבן עזרא', 'רבי אברהם אבן דאוד (הראב״ד הראשון)',
    ],
    keyIdeas: [
      { he: 'לשון הקודש כשפת שירה ודקדוק', en: 'Hebrew reborn as a language of poetry and grammar', ru: 'Иврит как язык поэзии и грамматики' },
      { he: 'מפגש בין תורה לפילוסופיה בערבית', en: 'Torah in dialogue with Arabic philosophy', ru: 'Тора в диалоге с арабоязычной философией' },
      { he: 'לימוד תלמוד המכוון להלכה למעשה, בדרכו של הרי״ף', en: 'Talmud study aimed at practical law, in the manner of the Rif', ru: 'Изучение Талмуда ради практической галахи — по примеру Рифа' },
    ],
    related: [{ key: 'provence', relation: 'influenced' }],
  },
  {
    key: 'early-ashkenaz',
    name:  { he: 'חכמי אשכנז הראשונים', en: 'The Early Sages of Ashkenaz', ru: 'Первые мудрецы Ашкеназа' },
    short: { he: 'אשכנז הקדומה', en: 'Early Ashkenaz', ru: 'Ранний Ашкеназ' },
    summary: {
      he: 'הישיבות של קהילות הריינוס במגנצא ובוורמייזא, שבהן הונחו יסודות התורה של יהדות אשכנז. רבנו גרשום מאור הגולה ותלמידיו העתיקו את התלמוד, הגיהו ופירשו אותו, ותיקנו תקנות שחייבו את קהילות אשכנז. רש״י למד בישיבות אלה, ופירושו לתלמוד מסכם את מסורתן.',
      en: 'The academies of the Rhineland communities of Mainz and Worms, where the foundations of Ashkenazi learning were laid. Rabbenu Gershom, “Light of the Exile,” and his students copied, corrected and explained the Talmud, and issued ordinances binding on the communities of Ashkenaz. Rashi studied in these academies, and his Talmud commentary distils their tradition.',
      ru: 'Академии рейнских общин Майнца и Вормса, где были заложены основы ашкеназской учёности. Рабейну Гершом, «Светоч изгнания», и его ученики переписывали, выверяли и толковали Талмуд и издавали постановления, обязательные для общин Ашкеназа. В этих академиях учился Раши, и его комментарий к Талмуду подытоживает их традицию.',
    },
    span: [970, 1100],
    region: 'ashkenaz',
    place: { he: 'מגנצא ווורמייזא', en: 'Mainz and Worms', ru: 'Майнц и Вормс' },
    founders: ['רבנו גרשום מאור הגולה'],
    members: ['רבי יעקב בן יקר', 'רבנו יצחק בן יהודה ממגנצא', 'רבי יצחק הלוי (סגן לויה)', 'רש״י (רבי שלמה יצחקי)'],
    keyIdeas: [
      { he: 'תקנות רבנו גרשום: איסור ריבוי נשים ואיסור קריאת מכתב של אחר', en: 'Rabbenu Gershom’s ordinances: no polygamy, no reading another’s letters', ru: 'Постановления рабейну Гершома: запрет многоженства и чтения чужих писем' },
      { he: 'קונטרסי הישיבה: פירוש רציף לתלמוד', en: 'Running commentaries on the Talmud compiled in the academy', ru: 'Сквозные комментарии к Талмуду, составленные в академии' },
      { he: 'מנהג אשכנז כמסורת מחייבת', en: 'Ashkenazi custom as a binding tradition', ru: 'Ашкеназский обычай как обязывающая традиция' },
    ],
    related: [],
  },
  {
    key: 'tosafists',
    name:  { he: 'בעלי התוספות', en: 'The Tosafists', ru: 'Тосафисты' },
    short: { he: 'בעלי התוספות', en: 'Tosafists', ru: 'Тосафисты' },
    summary: {
      he: 'חכמי צרפת ואשכנז במאות ה־12 וה־13, רבים מהם צאצאי רש״י ותלמידיו. הם השוו סוגיות מכל רחבי התלמוד, הקשו על פירוש רש״י ויישבו סתירות בדרך דיאלקטית. הגהותיהם, התוספות, מודפסות מול פירוש רש״י בכל דף גמרא.',
      en: 'Scholars of France and Germany in the twelfth and thirteenth centuries, many of them Rashi’s descendants and students. They compared passages from across the Talmud, pressed hard questions on Rashi’s reading and resolved contradictions by dialectic. Their glosses, the Tosafot, face Rashi’s commentary on every printed page of the Talmud.',
      ru: 'Мудрецы Франции и Германии XII–XIII веков, многие из них — потомки и ученики Раши. Они сопоставляли отрывки со всего Талмуда, ставили острые вопросы к толкованию Раши и диалектически снимали противоречия. Их глоссы, «Тосафот», печатаются напротив комментария Раши на каждой странице Талмуда.',
    },
    span: [1100, 1300],
    region: 'tsarfat',
    place: { he: 'צפון צרפת וארץ הריינוס', en: 'Northern France and the Rhineland', ru: 'Северная Франция и Рейнская область' },
    founders: ['רבנו תם (ר׳ יעקב בן מאיר)', 'ר״י הזקן מדמפייר'],
    members: [
      'רבי מאיר בן שמואל מרמרו', 'הרשב״ם', "ר' יצחק בן אשר הלוי (ריב״א הראשון)", 'הרב אליעזר בן נתן (ראב״ן)',
      'רבי יוסף בכור שור', 'הרא״ם ממיץ', 'רבי יצחק בן יעקב הלבן מפראג', 'הריצב״א', 'רבי שמחה משפיירא',
      'הראבי״ה (רבי אליעזר בן יואל הלוי)', 'רבי יצחק מווינה (בעל האור זרוע)', 'רבי משה מקוצי (הסמ״ג)',
      'רבי יחיאל מפריז', 'רבי משה מאיוורא', 'רבי אליעזר מטוך', 'רבי יצחק מקורביל (הסמ״ק)',
      'רבנו פרץ מקורביל', 'המהר״ם מרוטנבורג',
    ],
    keyIdeas: [
      { he: 'השוואת סוגיות מקבילות ויישוב סתירות', en: 'Cross-referencing parallel passages to resolve contradictions', ru: 'Сопоставление параллельных мест для снятия противоречий' },
      { he: 'דיאלוג ביקורתי עם פירוש רש״י', en: 'A critical dialogue with Rashi', ru: 'Критический диалог с Раши' },
      { he: 'המנהג כמקור להלכה', en: 'Custom as a source of law', ru: 'Обычай как источник галахи' },
    ],
    related: [
      { key: 'early-ashkenaz', relation: 'grewOutOf' },
      { key: 'catalonia', relation: 'influenced' },
    ],
  },
  {
    key: 'provence',
    name:  { he: 'חכמי פרובנס', en: 'The Sages of Provence', ru: 'Мудрецы Прованса' },
    short: { he: 'פרובנס', en: 'Provence', ru: 'Прованс' },
    summary: {
      he: 'קהילות דרום צרפת, מנרבונה ולוניל ועד פושקייר ופרפיניאן, שבהן נפגשו מסורת התלמוד של צפון צרפת ותרבות ספרד. חכמיהן כתבו השגות ופירושים על הרי״ף והרמב״ם, תרגמו לעברית ספרי מחשבה שנכתבו בערבית, ובחוגיהם הופיעו ראשוני המקובלים. הגירוש מצרפת ב־1306 פגע קשות ברבים מהמרכזים האלה.',
      en: 'The communities of southern France, from Narbonne and Lunel to Posquières and Perpignan, where the Talmudic tradition of northern France met the culture of Spain. Their scholars wrote critical glosses and commentaries on the Rif and Maimonides, translated Arabic works of Jewish thought into Hebrew, and their circles produced the first Kabbalists. The expulsion from France in 1306 struck many of these centres hard.',
      ru: 'Общины юга Франции — от Нарбонны и Люнеля до Поскьера и Перпиньяна, — где талмудическая традиция Северной Франции встретилась с культурой Испании. Их мудрецы писали критические глоссы и комментарии к Рифу и Маймониду, переводили на иврит арабоязычные труды еврейской мысли, а в их кругах появились первые каббалисты. Изгнание из Франции в 1306 году нанесло тяжёлый удар многим из этих центров.',
    },
    span: [1050, 1345],
    region: 'provence',
    place: { he: 'נרבונה ולוניל', en: 'Narbonne and Lunel', ru: 'Нарбонна и Люнель' },
    founders: [],
    members: [
      'רבי משה הדרשן', 'רבי זרחיה הלוי (בעל המאור)', 'רבי יצחק בן אבא מרי (בעל העיטור)',
      'רבי יהונתן הכהן מלוניל', 'הראב״ד מפושקייר', 'רבי משולם מבדרש', 'רבי דוד קמחי',
      'רבי יצחק סגי נהור', 'רבינו מנוח מנרבונה', 'רבי מאיר בן שמעון המעילי', 'רבי מנחם המאירי',
      'רבי אהרן הכהן מלוניל', 'רבי אברהם בן יצחק מן ההר', 'הרלב״ג',
    ],
    keyIdeas: [
      { he: 'השגות: ביקורת חריפה על גדולי הפוסקים', en: 'Hassagot: sharp critical glosses on the great codifiers', ru: '«Хасагот»: острые критические замечания к великим кодификаторам' },
      { he: 'תרגום ספרות המחשבה מערבית לעברית', en: 'Translating Jewish thought from Arabic into Hebrew', ru: 'Перевод еврейской мысли с арабского на иврит' },
      { he: 'ראשית הקבלה: ספר הבהיר ורבי יצחק סגי נהור', en: 'The dawn of Kabbalah: the Bahir and Isaac the Blind', ru: 'Зарождение каббалы: «Бахир» и рабби Ицхак Слепой' },
    ],
    related: [{ key: 'catalonia', relation: 'influenced' }],
  },
  {
    key: 'catalonia',
    name:  { he: 'חכמי קטלוניה: בית מדרשו של הרמב״ן', en: 'The Catalan School of Nahmanides', ru: 'Каталонская школа Нахманида' },
    short: { he: 'בית מדרש הרמב״ן', en: 'Nahmanides’ school', ru: 'Школа Рамбана' },
    summary: {
      he: 'האסכולה התלמודית שקמה סביב הרמב״ן בגירונה ונמשכה בברצלונה בידי הרשב״א ותלמידיו. היא חיברה את דרך הלימוד הדיאלקטית של בעלי התוספות עם המסורת ההלכתית של ספרד, והולידה את ספרות החידושים הקלאסית על התלמוד. שרשרת רבותיה נמשכה עד הר״ן והריב״ש, עד שפרעות 1391 קטעו אותה.',
      en: 'The Talmudic school that grew up around Nahmanides in Girona and was carried on in Barcelona by the Rashba and his students. It joined the dialectical method of the Tosafists to the legal tradition of Spain and produced the classic genre of chiddushim, novellae on the Talmud. Its line of teachers ran through the Ran and the Rivash until the massacres of 1391 broke it.',
      ru: 'Талмудическая школа, сложившаяся вокруг Нахманида в Жироне и продолженная в Барселоне Рашбой и его учениками. Она соединила диалектический метод тосафистов с галахической традицией Испании и создала классический жанр «хидушим» — новелл к Талмуду. Цепь её учителей тянулась до Рана и Риваша, пока её не оборвали погромы 1391 года.',
    },
    span: [1225, 1410],
    region: 'sefarad',
    place: { he: 'גירונה וברצלונה', en: 'Girona and Barcelona', ru: 'Жирона и Барселона' },
    founders: ['הרמב״ן (רבי משה בן נחמן)'],
    members: [
      'רבנו יונה גירונדי', 'הרשב״א', 'רבי אהרן הלוי', 'הריטב״א', 'רבנו בחיי בן אשר',
      'רבי שם טוב אבן גאון', 'רבי יהושע אבן שועיב', 'הר״ן (רבנו נסים מגירונה)', 'רבי יצחק בר ששת (הריב״ש)',
    ],
    keyIdeas: [
      { he: 'חידושים: עיון מעמיק בסוגיה בדרך התוספות', en: 'Chiddushim: close analysis of the Talmudic passage in the Tosafist manner', ru: 'Хидушим: углублённый разбор сугии в духе тосафистов' },
      { he: 'הלכה מתוך התלמוד עצמו, לא רק מתוך ספרי הפסיקה', en: 'Deriving law from the Talmud itself, not only from the codes', ru: 'Галаха из самого Талмуда, а не только из кодексов' },
      { he: 'תורת הסוד לצד הלמדנות', en: 'Kabbalah alongside Talmudic scholarship', ru: 'Каббала рядом с талмудической учёностью' },
    ],
    related: [{ key: 'castile', relation: 'influenced' }],
  },
  {
    key: 'castile',
    name:  { he: 'מקובלי קסטיליה וחוג הזוהר', en: 'The Kabbalists of Castile and the Zohar Circle', ru: 'Каббалисты Кастилии и круг «Зоара»' },
    short: { he: 'חוג הזוהר', en: 'Zohar circle', ru: 'Круг «Зоара»' },
    summary: {
      he: 'חוגי מקובלים בקסטיליה של המחצית השנייה של המאה ה־13, ובהם האחים הכהנים, רבי יוסף ג׳יקטיליה ורבי משה די ליאון. בחוגים אלה התגבשה תורת הספירות לשפה סמלית עשירה, ובתוכם הופיע לראשונה ספר הזוהר. זהות מחברו של הזוהר שנויה במחלוקת עד היום.',
      en: 'Circles of Kabbalists in Castile in the second half of the thirteenth century, among them the Kohen brothers, Joseph Gikatilla and Moses de León. Here the doctrine of the sefirot matured into a rich symbolic language, and here the Zohar first appeared. Who wrote the Zohar is still debated.',
      ru: 'Кружки каббалистов в Кастилии второй половины XIII века, среди них братья Коэны, Йосеф Гикатилья и Моше де Леон. Здесь учение о сфирот стало богатым языком символов, и здесь впервые появился «Зоар». Вопрос о его авторстве остаётся спорным и сегодня.',
    },
    span: [1260, 1310],
    region: 'sefarad',
    place: { he: 'קסטיליה', en: 'Castile', ru: 'Кастилия' },
    founders: [],
    members: ['רבי יעקב הכהן (המקובל)', "רבי יוסף ג'יקטיליה", 'רבי משה די ליאון'],
    keyIdeas: [
      { he: 'תורת הספירות כשפה סמלית', en: 'The sefirot as a symbolic language', ru: 'Сфирот как язык символов' },
      { he: 'שמות הקודש כמפתח לתורה', en: 'Divine names as the key to the Torah', ru: 'Святые имена как ключ к Торе' },
      { he: 'פירוש סודי לתורה: ספר הזוהר', en: 'A mystical reading of the Torah: the Zohar', ru: 'Мистическое прочтение Торы: «Зоар»' },
    ],
    related: [{ key: 'safed', relation: 'influenced' }],
  },
  {
    key: 'safed',
    name:  { he: 'מקובלי צפת', en: 'The Kabbalists of Safed', ru: 'Каббалисты Цфата' },
    short: { he: 'מקובלי צפת', en: 'Safed', ru: 'Цфат' },
    summary: {
      he: 'במאה ה־16 הפכה צפת, שבה התיישבו רבים ממגורשי ספרד וצאצאיהם, למרכז של הלכה וקבלה. הרמ״ק סידר את תורת הזוהר לשיטה, והאר״י, שלימד בעיר כשנתיים בלבד, הנחיל לתלמידיו תורה חדשה על הצמצום, שבירת הכלים והתיקון. רבי חיים ויטאל העלה את דבריו על הכתב, ומצפת התפשטה קבלת האר״י בכל העולם היהודי.',
      en: 'In the sixteenth century Safed, settled by many Spanish exiles and their descendants, became a centre of both law and Kabbalah. Cordovero set the teachings of the Zohar in systematic order, and the Ari, who taught in the town for barely two years, left his students a new doctrine of contraction, the breaking of the vessels and repair. Hayyim Vital wrote his words down, and from Safed Lurianic Kabbalah spread across the Jewish world.',
      ru: 'В XVI веке Цфат, где поселились многие изгнанники из Испании и их потомки, стал центром и галахи, и каббалы. Кордоверо привёл учение «Зоара» в стройную систему, а Ари, учивший в городе всего около двух лет, оставил ученикам новое учение о сжатии, разбиении сосудов и исправлении. Хаим Виталь записал его слова, и из Цфата лурианская каббала распространилась по всему еврейскому миру.',
    },
    span: [1530, 1620],
    region: 'eretz-israel',
    place: { he: 'צפת', en: 'Safed', ru: 'Цфат' },
    founders: ['רבי משה קורדובירו (הרמ״ק)', 'האר״י הקדוש'],
    members: ['רבי יוסף קארו', 'רבי שלמה הלוי אלקבץ', 'רבי חיים ויטאל', 'רבי אלעזר אזכרי', 'רבי יוסף אבן טבול'],
    keyIdeas: [
      { he: 'צמצום, שבירת הכלים ותיקון', en: 'Tzimtzum, the breaking of the vessels, and tikkun', ru: 'Цимцум, разбиение сосудов и тиккун' },
      { he: 'קבלת שבת ומנהגי חסידות חדשים', en: 'Kabbalat Shabbat and new rites of piety', ru: 'Встреча субботы и новые обряды благочестия' },
      { he: 'עריכת השולחן ערוך וניסיון לחדש את הסמיכה', en: 'Compiling the Shulchan Arukh, and an attempt to revive rabbinic ordination', ru: 'Составление «Шульхан арух» и попытка возродить смиху' },
    ],
    related: [
      { key: 'hasidism', relation: 'influenced' },
      { key: 'baghdad', relation: 'influenced' },
      { key: 'morocco', relation: 'influenced' },
    ],
  },
  {
    key: 'morocco',
    name:  { he: 'חכמי מרוקו', en: 'The Sages of Morocco', ru: 'Мудрецы Марокко' },
    short: { he: 'מרוקו', en: 'Morocco', ru: 'Марокко' },
    summary: {
      he: 'מסורת התורה של יהדות מרוקו, שבנו אותה מגורשי ספרד וחכמי המקום יחד, ומרכזיה בפאס, במקנס ובסאלי. היא שילבה פסיקה ומנהג ספרדיים עם לימוד מעמיק של הזוהר והקבלה, ונשאו אותה משפחות רבנים כמו טולידאנו ואבוחצירא. עם העלייה ההמונית לישראל במאה ה־20 נשתלה מחדש בארץ.',
      en: 'The Torah tradition of Moroccan Jewry, built by Spanish exiles and native scholars together, with its centres in Fez, Meknes and Salé. It joined Sephardi law and custom to deep study of the Zohar and Kabbalah, and was carried by rabbinic families such as the Toledanos and the Abuhatzeiras. With the mass emigration to Israel in the twentieth century it was replanted there.',
      ru: 'Традиция изучения Торы марокканского еврейства, созданная совместно изгнанниками из Испании и местными мудрецами, с центрами в Фесе, Мекнесе и Сале. Она соединяла сефардскую галаху и обычай с глубоким изучением «Зоара» и каббалы, а хранили её раввинские династии, такие как Толедано и Абухацера. С массовой алиёй в Израиль в XX веке она заново укоренилась там.',
    },
    span: [1700, 1990],
    region: 'north-africa',
    place: { he: 'פאס ומקנס', en: 'Fez and Meknes', ru: 'Фес и Мекнес' },
    founders: [],
    members: [
      'רבי חיים בן עטר (בעל אור החיים)', 'רבי שלום בוזגלו', 'רבי יהודה קורייאט', 'רבי יעקב אבוחצירא',
      'רבי חביב טולידאנו', 'רבי רפאל ברוך טולידאנו', 'הרב יוסף משאש', 'רבי ישראל אבוחצירא (הבבא סאלי)',
    ],
    keyIdeas: [
      { he: 'לימוד הזוהר כחלק מחיי הקהילה', en: 'Zohar study as part of community life', ru: 'Изучение «Зоара» как часть жизни общины' },
      { he: 'משפחות רבנים השומרות על שלשלת המסורת', en: 'Rabbinic dynasties carrying the chain of tradition', ru: 'Раввинские династии — хранители цепи традиции' },
      { he: 'צדיקים, הילולות וקברי קדושים', en: 'Tzaddikim, hillulot and saints’ tombs', ru: 'Цадики, илулот и гробницы праведников' },
    ],
    related: [],
  },
  {
    key: 'beit-el',
    name:  { he: 'מקובלי בית אל', en: 'The Beit El Kabbalists', ru: 'Каббалисты Бейт-Эля' },
    short: { he: 'בית אל', en: 'Beit El', ru: 'Бейт-Эль' },
    summary: {
      he: 'ישיבת המקובלים בעיר העתיקה בירושלים, שבראשה עמד רבי שלום שרעבי (הרש״ש), יליד תימן. הרש״ש סידר את כתבי האר״י לשיטה מדויקת של כוונות לתפילה, וחבורת המקובלים שסביבו התחייבה בשטר ברית לאחווה רוחנית. דרכו נשמרה בידי תלמידי תלמידיו, ובמאה ה־20 חידש אותה רבי מרדכי שרעבי בישיבת נהר שלום.',
      en: 'The Kabbalists’ yeshiva in Jerusalem’s Old City, led by the Yemen-born Rabbi Shalom Sharabi, the Rashash. He turned the Ari’s writings into a precise system of kavvanot, meditative intentions for prayer, and the circle around him bound itself by a written covenant of spiritual fellowship. His students’ students kept the method alive, and in the twentieth century Rabbi Mordechai Sharabi renewed it at the Nahar Shalom yeshiva.',
      ru: 'Иешива каббалистов в Старом городе Иерусалима, которую возглавлял уроженец Йемена рабби Шалом Шараби (Рашаш). Он превратил писания Ари в точную систему каванот — медитативных намерений в молитве, а круг его учеников скрепил себя письменным договором о духовном братстве. Ученики его учеников сохранили этот метод, а в XX веке его возродил рабби Мордехай Шараби в иешиве «Нахар Шалом».',
    },
    span: [1740, null],
    region: 'eretz-israel',
    place: { he: 'ירושלים, העיר העתיקה', en: 'Jerusalem, Old City', ru: 'Иерусалим, Старый город' },
    founders: ['הרב שלום שרעבי (הרש״ש)'],
    members: ['החיד״א (רבי חיים יוסף דוד אזולאי)', 'הרב מרדכי שרעבי'],
    keyIdeas: [
      { he: 'כוונות התפילה לפי שיטת הרש״ש', en: 'The Rashash’s kavvanot for prayer', ru: 'Каванот молитвы по системе Рашаша' },
      { he: 'סידור כתבי האר״י לשיטה אחת', en: 'Ordering the Ari’s writings into one system', ru: 'Сведение писаний Ари в единую систему' },
      { he: 'חבורה המחויבת בשטר ברית', en: 'A fellowship bound by covenant', ru: 'Братство, скреплённое договором' },
    ],
    related: [{ key: 'safed', relation: 'grewOutOf' }],
  },
  {
    key: 'hasidism',
    name:  { he: 'החסידות', en: 'Hasidism', ru: 'Хасидизм' },
    short: { he: 'החסידות', en: 'Hasidism', ru: 'Хасидизм' },
    summary: {
      he: 'תנועת התחדשות רוחנית שקמה סביב רבי ישראל בעל שם טוב בפודוליה באמצע המאה ה־18. היא הדגישה את נוכחות האל בכל מקום, עבודת ה׳ בשמחה ובדבקות, ואת הצדיק כמנהיג הקהילה. בתוך דורות ספורים התפצלה לחצרות רבות, מחב״ד ועד ברסלב וגור, והיא פעילה עד היום.',
      en: 'A movement of spiritual renewal that formed around Rabbi Israel Baal Shem Tov in Podolia in the mid-eighteenth century. It stressed God’s presence everywhere, serving God with joy and devekut, cleaving to Him, and the tzaddik as the leader of the community. Within a few generations it branched into many courts, from Chabad to Breslov and Ger, and it is very much alive today.',
      ru: 'Движение духовного обновления, возникшее вокруг рабби Исраэля Бааль Шем Това в Подолии в середине XVIII века. Оно подчёркивало вездесущность Бога, служение Ему в радости и двекуте — прилеплении к Нему, — и роль цадика как главы общины. За несколько поколений оно разделилось на множество дворов, от Хабада до Бреслава и Гура, и живёт по сей день.',
    },
    span: [1740, null],
    region: 'east-europe',
    place: { he: 'פודוליה ווולין', en: 'Podolia and Volhynia', ru: 'Подолия и Волынь' },
    founders: ['הבעל שם טוב (רבי ישראל בעש״ט)'],
    members: [
      'רבי אברהם גרשון מקיטוב', 'רבי מאיר הגדול מפרמישלאן', 'רבי משה חיים אפרים מסדילקוב',
      'מנחם מנדל מוויטבסק', 'רבי דובער שניאורי (האדמו״ר האמצעי)', 'רבי נתן מברסלב (מנמירוב)',
      'הצמח צדק (רבי מנחם מנדל שניאורסון)', 'הרב צדוק הכהן מלובלין', 'השפת אמת', 'הרב שמואל בורנשטיין',
      'האדמו״ר מפיאסצ׳נה', 'הרב יוסף יצחק שניאורסון (הריי״צ)', 'האדמו״ר מסלונים', 'הרבי מליובאוויטש',
      'האדמו״ר מקאליב',
    ],
    keyIdeas: [
      { he: '״לית אתר פנוי מיניה״: אין מקום פנוי מן האל', en: 'No place is empty of God', ru: 'Нет места, свободного от Бога' },
      { he: 'עבודת ה׳ בשמחה ובדבקות', en: 'Serving God in joy and devekut', ru: 'Служение в радости и двекуте' },
      { he: 'הצדיק כמנהיג וכצינור לשפע', en: 'The tzaddik as leader and channel of blessing', ru: 'Цадик как вождь и проводник благословения' },
    ],
    related: [],
  },
  {
    key: 'mitnagdim',
    name:  { he: 'המתנגדים ועולם הישיבות הליטאי', en: 'The Mitnagdim and the Lithuanian Yeshivas', ru: 'Миснагеды и литовские иешивы' },
    short: { he: 'עולם הישיבות', en: 'Lithuanian yeshivas', ru: 'Литовские иешивы' },
    summary: {
      he: 'הזרם שהתגבש סביב הגאון מווילנה בהתנגדות לחסידות, והעמיד את לימוד התורה לשמה בראש החיים הדתיים. תלמידו רבי חיים מוולוז׳ין ייסד ב־1803 את ישיבת עץ חיים בוולוז׳ין, שהייתה לדגם של הישיבה הליטאית. מוולוז׳ין צמחו ישיבות ליטא, ואחרי השואה נבנו מחדש בישראל ובאמריקה.',
      en: 'The stream that formed around the Vilna Gaon in opposition to Hasidism and put Torah study for its own sake at the head of religious life. His student Rabbi Hayyim of Volozhin founded the Etz Hayyim yeshiva in Volozhin in 1803, the model for the Lithuanian yeshiva. From Volozhin grew the yeshivas of Lithuania, rebuilt after the Holocaust in Israel and America.',
      ru: 'Течение, сложившееся вокруг Виленского Гаона в противостоянии хасидизму и поставившее изучение Торы ради неё самой во главу религиозной жизни. Его ученик рабби Хаим из Воложина основал в 1803 году иешиву «Эц Хаим», ставшую образцом литовской иешивы. Из Воложина выросли иешивы Литвы, а после Катастрофы их возродили в Израиле и Америке.',
    },
    span: [1760, null],
    region: 'east-europe',
    place: { he: 'וילנה ווולוז׳ין', en: 'Vilna and Volozhin', ru: 'Вильна и Воложин' },
    founders: ['רבי אליהו בן שלמה זלמן', "רבי חיים מוולוז'ין"],
    members: [
      'הרב יצחק אייזיק חבר', 'החפץ חיים (רבי ישראל מאיר הכהן)', 'רבי מאיר שמחה הכהן מדווינסק',
      'הרב אהרן קוטלר', 'הרב יצחק הוטנר', 'רבי גדליה נדל', 'הרב חיים קניבסקי',
    ],
    keyIdeas: [
      { he: 'תלמוד תורה לשמה כעבודת ה׳ העליונה', en: 'Torah study for its own sake as the highest service', ru: 'Изучение Торы ради неё самой как высшее служение' },
      { he: 'ישיבה עצמאית שאינה תלויה בקהילה המקומית', en: 'The independent yeshiva, free of the local community', ru: 'Иешива, независимая от местной общины' },
      { he: 'למדנות מדויקת וחזרה אל מקורות התלמוד', en: 'Rigorous scholarship and a return to the Talmud’s sources', ru: 'Строгая учёность и возвращение к источникам Талмуда' },
    ],
    related: [
      { key: 'hasidism', relation: 'opposed' },
      { key: 'religious-zionism', relation: 'influenced' },
    ],
  },
  {
    key: 'wissenschaft',
    name:  { he: 'חכמת ישראל', en: 'Wissenschaft des Judentums', ru: 'Наука о еврействе' },
    short: { he: 'חכמת ישראל', en: 'Wissenschaft', ru: 'Наука о еврействе' },
    summary: {
      he: 'תנועה אינטלקטואלית שקמה בגרמניה ב־1819 וביקשה לחקור את ספרות ישראל ותולדותיו בכלים של המדע ההיסטורי והפילולוגי. מפדובה וגליציה ועד גרמניה וצרפת, חוקריה ההדירו כתבי יד, שחזרו את תולדות הספרות העברית והניחו את היסוד ללימודי היהדות האקדמיים. חלקם ראו בה דרך להגן על המסורת, ואחרים דרך לחדש אותה.',
      en: 'An intellectual movement that arose in Germany in 1819 to study Jewish literature and history with the tools of historical and philological scholarship. From Padua and Galicia to Germany and France, its scholars edited manuscripts, reconstructed the history of Hebrew literature and laid the foundations of academic Jewish studies. Some saw it as a way to defend tradition, others as a way to renew it.',
      ru: 'Интеллектуальное движение, возникшее в Германии в 1819 году, чтобы исследовать еврейскую литературу и историю методами исторической и филологической науки. От Падуи и Галиции до Германии и Франции его учёные издавали рукописи, восстанавливали историю еврейской литературы и заложили основы академической иудаики. Одни видели в нём способ защитить традицию, другие — обновить её.',
    },
    span: [1819, 1900],
    region: 'ashkenaz',
    place: { he: 'ברלין, פדובה וגליציה', en: 'Berlin, Padua and Galicia', ru: 'Берлин, Падуя и Галиция' },
    founders: [],
    members: ['רבי נחמן קרוכמל (רנ״ק)', 'יצחק שמואל רג׳יו (יש״ר מגוריציה)', 'שד״ל', 'שלמה מונק'],
    keyIdeas: [
      { he: 'חקר היסטורי־ביקורתי של המקורות', en: 'Historical-critical study of the sources', ru: 'Историко-критическое изучение источников' },
      { he: 'ההדרת כתבי יד והחזרת ספרות ימי הביניים', en: 'Editing manuscripts and recovering medieval literature', ru: 'Издание рукописей и возвращение средневековой литературы' },
      { he: 'היהדות כתרבות בעלת היסטוריה', en: 'Judaism as a culture with a history', ru: 'Иудаизм как культура, у которой есть история' },
    ],
    related: [],
  },
  {
    key: 'baghdad',
    name:  { he: 'חכמי בגדד', en: 'The Sages of Baghdad', ru: 'Мудрецы Багдада' },
    short: { he: 'בגדד', en: 'Baghdad', ru: 'Багдад' },
    summary: {
      he: 'מרכז התורה שקם מחדש בבגדד במאה ה־19 סביב רבי עבדאללה סומך וישיבת בית זילכה שבראשה עמד. תלמידו רבי יוסף חיים, בעל ה״בן איש חי״, שילב הלכה, דרוש וקבלת האר״י בספרים שנפוצו בכל קהילות המזרח. רבים מחכמי העיר עלו לירושלים, ובשנים 1950–1951 עלתה לישראל כמעט הקהילה כולה.',
      en: 'The centre of Torah learning that revived in nineteenth-century Baghdad around Rabbi Abdallah Somech and the Beit Zilkha yeshiva he headed. His student Rabbi Yosef Hayyim, the Ben Ish Hai, blended law, preaching and Lurianic Kabbalah in books read across the communities of the East. Many of its scholars settled in Jerusalem, and in 1950–1951 nearly the whole community emigrated to Israel.',
      ru: 'Центр изучения Торы, возродившийся в Багдаде XIX века вокруг рабби Абдаллы Сомеха и возглавляемой им иешивы «Бейт Зилха». Его ученик рабби Йосеф Хаим, автор «Бен Иш Хай», соединил галаху, проповедь и лурианскую каббалу в книгах, которые читали во всех общинах Востока. Многие здешние мудрецы переселились в Иерусалим, а в 1950–1951 годах в Израиль уехала почти вся община.',
    },
    span: [1840, 1951],
    region: 'mizrach',
    place: { he: 'בגדד', en: 'Baghdad', ru: 'Багдад' },
    founders: ['הרב עבדאללה סומך'],
    members: ['הבן איש חי (רבי יוסף חיים מבגדד)', 'הרב יהודה משה ישועה פתיה', 'הרב יצחק נסים'],
    keyIdeas: [
      { he: 'הלכה ודרשה בלשון בהירה ועממית', en: 'Law and preaching in plain, popular language', ru: 'Галаха и проповедь простым, доступным языком' },
      { he: 'קבלת האר״י כחלק מחיי היום־יום', en: 'Lurianic Kabbalah woven into daily life', ru: 'Лурианская каббала в повседневной жизни' },
      { he: 'שאלות ותשובות לקהילות המזרח', en: 'Responsa for communities across the East', ru: 'Респонсы для общин всего Востока' },
    ],
    related: [],
  },
  {
    key: 'mussar',
    name:  { he: 'תנועת המוסר', en: 'The Musar Movement', ru: 'Движение мусар' },
    short: { he: 'תנועת המוסר', en: 'Musar', ru: 'Мусар' },
    summary: {
      he: 'תנועה שייסד רבי ישראל סלנטר בליטא באמצע המאה ה־19, כדי לעבוד על תיקון המידות באותה רצינות שבה לומדים הלכה. היא הכניסה לישיבות לימוד מוסר יומי ומשגיח רוחני, והתפצלה לאסכולות: נובהרדוק דרשה ביטחון מוחלט ושבירת הגאווה, וסלבודקה הדגישה את גדלות האדם. אחרי השואה נמשכה דרכה בישיבות בישראל ובתפוצות.',
      en: 'A movement founded by Rabbi Israel Salanter in mid-nineteenth-century Lithuania to work on character as seriously as one studies law. It brought daily musar study and a spiritual supervisor, the mashgiach, into the yeshivas, and split into schools of its own: Novardok demanded total trust in God and the breaking of pride, while Slabodka stressed the greatness of man. After the Holocaust its way continued in yeshivas in Israel and abroad.',
      ru: 'Движение, основанное рабби Исраэлем Салантером в Литве в середине XIX века, чтобы работать над характером так же серьёзно, как изучают галаху. Оно ввело в иешивах ежедневное изучение мусара и должность духовного наставника — машгиаха — и разделилось на собственные школы: Новогрудок требовал полного упования на Бога и искоренения гордыни, а Слободка подчёркивала величие человека. После Катастрофы его путь продолжился в иешивах Израиля и диаспоры.',
    },
    span: [1845, 1950],
    region: 'east-europe',
    place: { he: 'קובנה, סלבודקה ונובהרדוק', en: 'Kovno, Slabodka and Novardok', ru: 'Ковно, Слободка и Новогрудок' },
    founders: ['רבי ישראל מסלנט'],
    members: ['הסבא מנובהרדוק', 'הרב נתן צבי פינקל (הסבא מסלבודקה)', 'הרב אליהו אליעזר דסלר'],
    keyIdeas: [
      { he: 'לימוד מוסר יומי, בקול ובהתעוררות', en: 'Daily musar study, read aloud with feeling', ru: 'Ежедневное изучение мусара — вслух и с чувством' },
      { he: 'חשבון נפש ותיקון המידות', en: 'Self-examination and refining character', ru: 'Самоанализ и исправление черт характера' },
      { he: 'גדלות האדם מול שבירת הגאווה', en: 'The greatness of man versus the breaking of pride', ru: 'Величие человека против искоренения гордыни' },
    ],
    related: [{ key: 'mitnagdim', relation: 'grewOutOf' }],
  },
  {
    key: 'religious-zionism',
    name:  { he: 'הציונות הדתית', en: 'Religious Zionism', ru: 'Религиозный сионизм' },
    short: { he: 'הציונות הדתית', en: 'Religious Zionism', ru: 'Религ. сионизм' },
    summary: {
      he: 'הזרם שראה בשיבה לארץ ישראל ובבנייתה מצווה דתית ושלב בגאולה. מבשריו, הרב יהודה אלקלעי והרב צבי הירש קלישר, קראו ליישוב הארץ כבר באמצע המאה ה־19, והרב יצחק יעקב ריינס ייסד ב־1902 את תנועת המזרחי. הרב אברהם יצחק הכהן קוק העניק לו עומק הגותי, ותלמידיו ותלמידי תלמידיו הובילו את מוסדות החינוך ואת מפעל ההתיישבות שלו.',
      en: 'The stream that saw the return to the Land of Israel and its rebuilding as a religious duty and a stage of redemption. Its forerunners, Rabbi Judah Alkalai and Rabbi Zvi Hirsch Kalischer, called for settling the land as early as the mid-nineteenth century, and Rabbi Isaac Jacob Reines founded the Mizrachi movement in 1902. Rabbi Abraham Isaac Kook gave it philosophical depth, and his students and their students led its schools and its settlement movement.',
      ru: 'Течение, увидевшее в возвращении в Землю Израиля и её отстройке религиозную заповедь и этап избавления. Его предтечи, рабби Йеуда Алкалай и рабби Цви Гирш Калишер, призывали заселять Землю уже в середине XIX века, а рабби Ицхак Яаков Рейнес в 1902 году основал движение «Мизрахи». Рабби Авраам Ицхак ха-Коэн Кук придал ему философскую глубину, а его ученики и ученики учеников возглавили его учебные заведения и поселенческое движение.',
    },
    span: [1840, null],
    region: 'eretz-israel',
    place: { he: 'ירושלים', en: 'Jerusalem', ru: 'Иерусалим' },
    founders: ['הרב יהודה אלקלעי', 'הרב צבי הירש קלישר', 'הרב יצחק יעקב ריינס'],
    members: [
      'הרב שמואל מוהליבר', 'הרב אברהם יצחק הכהן קוק', 'הרב יעקב משה חרל״פ', 'הרב צבי יהודה הכהן קוק',
      'הרב משה־צבי נריה', 'הרב שאול ישראלי', 'הרב שלמה גורן', 'הרב חיים דרוקמן', 'הרב חנן פורת',
    ],
    keyIdeas: [
      { he: 'יישוב הארץ כמצווה וכ״אתחלתא דגאולה״', en: 'Settling the land as a mitzvah and “the beginning of redemption”', ru: 'Заселение Земли как заповедь и «начало избавления»' },
      { he: 'תורה ועבודה: לימוד לצד עבודה וחיים ציבוריים', en: 'Torah and labour: learning joined to work and public life', ru: 'Тора и труд: учёба рядом с трудом и общественной жизнью' },
      { he: 'הקודש שבחול: התחייה הלאומית כביטוי אלוהי', en: 'The holy within the secular: national revival as divine expression', ru: 'Святое в мирском: национальное возрождение как проявление Божественного' },
    ],
    related: [],
  },
]

export const SCHOOL_BY_KEY: Map<string, School> = new Map(SCHOOLS.map(s => [s.key, s]))

// ── Name resolution ────────────────────────────────────────────────────────

/**
 * Canonical form of a name for matching: typographic and ASCII quotes are
 * interchangeable (the data mixes רש"י and רש״י), whitespace is collapsed.
 */
export function nameKey(name: string): string {
  return name
    .replace(/[״"“”]/g, '"')
    .replace(/[׳'‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** The canonical Hebrew label, even when a locale overlay replaced `label`. */
function hebrewLabel(sage: Sage): string {
  return sage.label_he ?? sage.label
}

export interface NameIndex {
  byLabel: Map<string, Sage[]>
  byName: Map<string, Sage[]>
}

export function buildNameIndex(sages: Sage[]): NameIndex {
  const byLabel = new Map<string, Sage[]>()
  const byName = new Map<string, Sage[]>()
  const push = (m: Map<string, Sage[]>, k: string, s: Sage) => {
    const list = m.get(k)
    if (list) list.push(s)
    else m.set(k, [s])
  }
  for (const s of sages) {
    const label = hebrewLabel(s)
    push(byLabel, nameKey(label), s)
    push(byName, nameKey(displayName(label)), s)
  }
  return { byLabel, byName }
}

/** Every sage a name could mean: an exact label match wins over a display-name match. */
export function lookupName(index: NameIndex, name: string): Sage[] {
  const k = nameKey(name)
  return index.byLabel.get(k) ?? index.byName.get(k) ?? []
}

export interface ResolvedSchool extends School {
  founderSages: Sage[]
  memberSages: Sage[]
  /** Founders and members together, deduped, founders first. */
  people: Sage[]
  /** Names that found no sage in the loaded dataset. */
  unresolved: string[]
  /** Eras the school's people belong to, in chronological order. */
  periods: Period[]
}

/** Resolve every school against the loaded sages; schools under MIN_MEMBERS are dropped. */
export function resolveSchools(sages: Sage[], min = MIN_MEMBERS): ResolvedSchool[] {
  if (!sages.length) return []
  const index = buildNameIndex(sages)
  const out: ResolvedSchool[] = []
  for (const school of SCHOOLS) {
    const seen = new Set<string>()
    const unresolved: string[] = []
    const take = (names: string[]) => {
      const list: Sage[] = []
      for (const n of names) {
        const hit = lookupName(index, n)[0]
        if (!hit) { unresolved.push(n); continue }
        if (seen.has(hit.id)) continue
        seen.add(hit.id)
        list.push(hit)
      }
      return list
    }
    const founderSages = take(school.founders)
    const memberSages = take(school.members)
    const people = [...founderSages, ...memberSages]
    if (people.length < min) continue
    const eras = new Set(people.map(p => p.period))
    out.push({
      ...school,
      founderSages,
      memberSages,
      people,
      unresolved,
      periods: ALL_PERIODS.filter(p => eras.has(p)),
    })
  }
  return out
}
