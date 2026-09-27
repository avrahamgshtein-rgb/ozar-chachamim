// About copy, he/en/ru. Every claim here is checked against the code and data:
// figures are passed in from lib/siteStats.ts, never written into the text.
import type { Locale, Tab } from '@/lib/types'

type N = (n: string) => string

export interface AboutCopy {
  eyebrow: string
  lede: string
  audience: string
  stats: { sages: string; research: string; connections: string; episodes: string }
  asOf: string
  researchTitle: string
  researchBody: (sages: string, research: string) => string
  researchHow: string
  viewsTitle: string
  viewsIntro: string
  views: Partial<Record<Tab, string>>
  openView: string
  moreTitle: string
  listenTitle: string
  listenBody: N
  askTitle: string
  askBody: string
  searchTitle: string
  searchBody: string
  langsTitle: string
  langsBody: string
  citeTitle: string
  citeIntro: string
  citeSiteLabel: string
  citeSageLabel: string
  citeSite: (url: string, date: string) => string
  citeSage: (url: string, date: string) => string
  citeSageName: string
  citeSageId: string
  copy: string
  copied: string
  dataTitle: string
  dataBody: string
  dataDates: string
  dataInvite: string
  dataSubject: string
  creditsTitle: string
  creditsRole: string
  spirit: string
}

export const ABOUT_COPY: Record<Locale, AboutCopy> = {
  he: {
    eyebrow: 'אודות',
    lede:
      'מפת ידע של חכמי ישראל לדורותיהם, מאבות האומה ועד גדולי הדור האחרון. על כל חכם נכתבה עבודת מחקר, וסביבו נפרשת רשת של רבותיו, תלמידיו, בני דורו ובני משפחתו.',
    audience:
      'האתר נבנה לתלמידי ישיבות ובוגריהן, למורים ולכל מי שמבקש להכיר את החכמים מקרוב: לא כשמות על כריכות של ספרים, אלא כאנשים שלמדו זה מזה, נחלקו זה עם זה והשפיעו זה על זה.',
    stats: {
      sages: 'חכמים',
      research: 'עם עבודת מחקר',
      connections: 'קשרים מתועדים',
      episodes: 'פרקי האזנה',
    },
    asOf: 'הנתונים נכון ל־',
    researchTitle: 'לב האתר: עבודת מחקר על כל חכם',
    researchBody: (sages, research) =>
      `עבודות מחקר נכתבו כבר על ${research} מתוך ${sages} החכמים שבמאגר. כל עבודה פורשת את תולדות החכם, את משנתו ואת חיבוריו, ואת מקומו בשלשלת הדורות. לצידה מוצגים פרטי החכם, תקופה, מקום ותחום, וכל הקשרים שלו לחכמים אחרים, כשכל קשר מוביל לדף נוסף.`,
    researchHow: 'בחרו חכם באחת התצוגות, ומהכרטיס שלו עברו אל הדף המלא.',
    viewsTitle: 'שש דרכים להתבונן',
    viewsIntro: 'אותם חכמים מזוויות שונות. בכל אחת מהן אפשר לבחור חכם ולהמשיך אל הדף שלו.',
    views: {
      graph: 'כל חכם הוא צומת, וכל קו הוא קשר מתועד: רב ותלמיד, בני משפחה, עמיתים, השפעה ומחלוקת. בחרו חכם כדי לראות את הסובבים אותו.',
      map: 'היכן חיו ופעלו, ואיך נדדו בין קהילות: מארץ ישראל ובבל ועד ספרד, אשכנז ומזרח אירופה.',
      traditions: 'החכמים לפי בתי המדרש, הזרמים והמסורות שאליהם השתייכו.',
      timeline: 'הדורות על ציר זמן אחד, מהאבות ועד ימינו, תקופה אחר תקופה.',
      genealogy: 'שושלות של רב ותלמיד ושל אב ובן, דור אחר דור.',
      ideas: 'כל החכמים בטבלה אחת, למיון ולסינון לפי תקופה, מקום ותחום.',
    },
    openView: 'לתצוגה',
    moreTitle: 'ועוד',
    listenTitle: 'האזנה',
    listenBody: n => `${n} פרקי פודקאסט בספוטיפיי מלווים את החכמים. הקישור לפרק מופיע בכרטיס החכם.`,
    askTitle: 'שאלו את החכמים',
    askBody:
      'עוזר מבוסס בינה מלאכותית עונה על שאלות מתוך עבודות המחקר שבאתר, ובמידת הצורך גם מספריא ומוויקיפדיה, ומציין לכל טענה את המקור שעליו היא נשענת. כשהמקורות אינם עונים על השאלה, הוא אומר זאת במפורש. הכפתור נמצא בפינת המסך בדף הראשי.',
    searchTitle: 'חיפוש שמבין עברית',
    searchBody: 'רמבם, רמב״ם ורמב"ם מובילים לאותו חכם: החיפוש מתעלם מניקוד, מגרשיים ומאותיות סופיות.',
    langsTitle: 'עברית, English, Русский',
    langsBody: 'האתר זמין בשלוש שפות. תרגום תוכן החכמים עדיין נמשך, ובינתיים מוצג במקומות רבים המקור העברי.',
    citeTitle: 'איך לצטט',
    citeIntro: 'אפשר לצטט את האתר כולו או את הדף של חכם מסוים. כתובות דפי החכמים קבועות, ולכן אפשר להפנות אליהן ישירות.',
    citeSiteLabel: 'האתר',
    citeSageLabel: 'דף של חכם',
    citeSite: (url, date) => `אוצר חכמים: גרף הידע של חכמי ישראל. ${url}. אוחזר ב־${date}.`,
    citeSage: (url, date) => `"‹שם החכם›", אוצר חכמים. ${url}. אוחזר ב־${date}.`,
    citeSageName: 'שם החכם',
    citeSageId: 'מזהה',
    copy: 'העתקה',
    copied: 'הועתק',
    dataTitle: 'על הנתונים',
    dataBody:
      'המאגר נאסף ונערך ביד, חכם אחר חכם. שנים, מקומות וקשרים נבדקים ומתוקנים כל העת, ועדיין עלולות ליפול בו טעויות.',
    dataDates: 'כשהמקורות יודעים רק את המאה שבה חי חכם, האתר מציג את המאה ולא שנה מדויקת שאין לה מקור.',
    dataInvite: 'מצאתם טעות, או חכם שחסר במאגר? נשמח לשמוע:',
    dataSubject: 'אוצר חכמים: תיקון או הצעה',
    creditsTitle: 'מאחורי הפרויקט',
    creditsRole: 'מנהל הפרויקט, תכנון המערכת והקמתה',
    spirit:
      'חכמי ישראל אינם שמות בספר, אלא דמויות חיות, קשורות זו בזו בלימוד, במחלוקת ובהשפעה. האתר מבקש לשמור על תורתם ולקרב אותה אל הדור הבא של הלומדים.',
  },

  en: {
    eyebrow: 'About',
    lede:
      'A knowledge map of the Jewish sages across the generations, from the Patriarchs to the great figures of the last generation. Each sage has a research paper, and around each one spreads a network of teachers, students, contemporaries and family.',
    audience:
      'It was built for yeshiva students and graduates, for teachers, and for anyone who wants to know the sages up close: not as names on the spines of books, but as people who learned from one another, disagreed with one another and shaped one another.',
    stats: {
      sages: 'Sages',
      research: 'With a research paper',
      connections: 'Documented connections',
      episodes: 'Podcast episodes',
    },
    asOf: 'Data as of ',
    researchTitle: 'At the heart: a research paper on each sage',
    researchBody: (sages, research) =>
      `Research papers have been written on ${research} of the ${sages} sages in the collection. Each one traces the sage's life, teachings and works, and his place in the chain of generations. Alongside it are the sage's details, era, place and field, and all of his connections to other sages, each one a link to another page.`,
    researchHow: 'Pick a sage in any view, then open the full page from the sage card.',
    viewsTitle: 'Six ways to look',
    viewsIntro: 'The same sages from different angles. In each of them you can pick a sage and go on to his page.',
    views: {
      graph: 'Every sage is a node, and every line a documented connection: teacher and student, family, colleagues, influence and dispute. Pick a sage to see the people around him.',
      map: 'Where they lived and worked, and how they moved between communities: from the Land of Israel and Babylonia to Spain, Ashkenaz and Eastern Europe.',
      traditions: 'The sages by the schools, movements and traditions they belonged to.',
      timeline: 'The generations on one timeline, from the Patriarchs to our own day, era by era.',
      genealogy: 'Lineages of teacher and student, and of father and son, generation after generation.',
      ideas: 'Every sage in a single table, to sort and filter by era, place and field.',
    },
    openView: 'Open view',
    moreTitle: 'And more',
    listenTitle: 'Listen',
    listenBody: n => `${n} podcast episodes on Spotify accompany the sages. The episode link is on each sage's card.`,
    askTitle: 'Ask the sages',
    askBody:
      "An AI assistant answers questions from the site's research papers, drawing on Sefaria and Wikipedia where needed, and names the source behind each claim. When the sources do not answer a question, it says so plainly. You'll find the button in the corner of the main page.",
    searchTitle: 'Search that reads Hebrew',
    searchBody: 'In the Hebrew interface, search ignores vowel points, gershayim and final letter forms, so רמבם and רמב״ם find the same sage.',
    langsTitle: 'עברית, English, Русский',
    langsBody: 'The site is available in three languages. Translation of the sage content is still under way, so in many places the Hebrew original is shown for now.',
    citeTitle: 'How to cite',
    citeIntro: "You can cite the site as a whole or a particular sage's page. Sage page addresses are permanent, so you can link to them directly.",
    citeSiteLabel: 'The site',
    citeSageLabel: "A sage's page",
    citeSite: (url, date) => `Ozar Chachamim: The Knowledge Graph of Jewish Sages. ${url}. Accessed ${date}.`,
    citeSage: (url, date) => `"‹Sage name›." Ozar Chachamim. ${url}. Accessed ${date}.`,
    citeSageName: 'Sage name',
    citeSageId: 'id',
    copy: 'Copy',
    copied: 'Copied',
    dataTitle: 'About the data',
    dataBody:
      'The collection is gathered and edited by hand, one sage at a time. Dates, places and connections are checked and corrected continually, and mistakes may still remain.',
    dataDates: 'Where the sources give only the century a sage lived in, the site shows the century rather than a precise year no source supports.',
    dataInvite: 'Found a mistake, or a sage who is missing? We would be glad to hear from you:',
    dataSubject: 'Ozar Chachamim: correction or suggestion',
    creditsTitle: 'Behind the project',
    creditsRole: 'Project lead, system design and implementation',
    spirit:
      'The sages of Israel are not names in a book but living figures, bound to one another through learning, debate and influence. This project seeks to preserve their teaching and bring it closer to the next generation of learners.',
  },

  ru: {
    eyebrow: 'О проекте',
    lede:
      'Карта знаний о еврейских мудрецах разных поколений, от праотцев до великих людей последнего поколения. О каждом мудреце написано исследование, а вокруг него раскрывается сеть учителей, учеников, современников и родных.',
    audience:
      'Сайт создан для учащихся и выпускников ешив, для преподавателей и для всех, кто хочет узнать мудрецов ближе: не как имена на корешках книг, а как людей, которые учились друг у друга, спорили друг с другом и влияли друг на друга.',
    stats: {
      sages: 'Мудрецов',
      research: 'С исследованием',
      connections: 'Документированных связей',
      episodes: 'Выпусков подкаста',
    },
    asOf: 'Данные на ',
    researchTitle: 'Главное: исследование о каждом мудреце',
    researchBody: (sages, research) =>
      `Исследования уже написаны о ${research} из ${sages} мудрецов собрания. Каждое прослеживает жизнь мудреца, его учение и сочинения, его место в цепи поколений. Рядом приведены сведения о мудреце, эпоха, место и область, и все его связи с другими мудрецами, каждая из которых ведёт на другую страницу.`,
    researchHow: 'Выберите мудреца в любом виде и откройте полную страницу из его карточки.',
    viewsTitle: 'Шесть способов посмотреть',
    viewsIntro: 'Одни и те же мудрецы под разными углами. В каждом виде можно выбрать мудреца и перейти на его страницу.',
    views: {
      graph: 'Каждый мудрец — узел, каждая линия — документированная связь: учитель и ученик, родство, коллеги, влияние и спор. Выберите мудреца, чтобы увидеть его окружение.',
      map: 'Где они жили и действовали и как переходили из общины в общину: от Земли Израиля и Вавилонии до Испании, Ашкеназа и Восточной Европы.',
      traditions: 'Мудрецы по школам, течениям и традициям, к которым они принадлежали.',
      timeline: 'Поколения на одной временной шкале, от праотцев до наших дней, эпоха за эпохой.',
      genealogy: 'Цепочки учителей и учеников, отцов и сыновей, поколение за поколением.',
      ideas: 'Все мудрецы в одной таблице: сортировка и фильтры по эпохе, месту и области.',
    },
    openView: 'Открыть',
    moreTitle: 'А также',
    listenTitle: 'Слушать',
    listenBody: n => `${n} выпусков подкаста на Spotify сопровождают мудрецов. Ссылка на выпуск есть в карточке мудреца.`,
    askTitle: 'Спросите мудрецов',
    askBody:
      'ИИ-ассистент отвечает на вопросы по исследованиям сайта, при необходимости привлекая Sefaria и Википедию, и указывает источник каждого утверждения. Если источники не отвечают на вопрос, он прямо об этом говорит. Кнопка находится в углу главной страницы.',
    searchTitle: 'Поиск, понимающий иврит',
    searchBody: 'В ивритском интерфейсе поиск не учитывает огласовки, гершаим и конечные формы букв, поэтому רמבם и רמב״ם находят одного и того же мудреца.',
    langsTitle: 'עברית, English, Русский',
    langsBody: 'Сайт доступен на трёх языках. Перевод материалов о мудрецах ещё продолжается, поэтому пока во многих местах показан ивритский оригинал.',
    citeTitle: 'Как цитировать',
    citeIntro: 'Можно ссылаться на сайт целиком или на страницу конкретного мудреца. Адреса страниц мудрецов постоянны, на них можно ссылаться напрямую.',
    citeSiteLabel: 'Сайт',
    citeSageLabel: 'Страница мудреца',
    citeSite: (url, date) => `Оцар Хахамим: граф знаний еврейских мудрецов. URL: ${url} (дата обращения: ${date}).`,
    citeSage: (url, date) => `«‹Имя мудреца›» // Оцар Хахамим. URL: ${url} (дата обращения: ${date}).`,
    citeSageName: 'Имя мудреца',
    citeSageId: 'id',
    copy: 'Копировать',
    copied: 'Скопировано',
    dataTitle: 'О данных',
    dataBody:
      'Собрание составляется и редактируется вручную, мудрец за мудрецом. Даты, места и связи постоянно проверяются и исправляются, и всё же ошибки возможны.',
    dataDates: 'Если источники называют только век, в котором жил мудрец, сайт показывает век, а не точный год, которого нет в источниках.',
    dataInvite: 'Нашли ошибку или заметили, что какого-то мудреца не хватает? Будем рады письму:',
    dataSubject: 'Оцар Хахамим: исправление или предложение',
    creditsTitle: 'Кто стоит за проектом',
    creditsRole: 'Руководитель проекта, проектирование и разработка системы',
    spirit:
      'Мудрецы Израиля — не имена в книге, а живые люди, связанные друг с другом учёбой, спором и влиянием. Проект стремится сохранить их учение и приблизить его к следующему поколению учащихся.',
  },
}

/** "26 בספטמבר 2026" / "26 September 2026" / "26.09.2026". */
export function formatAboutDate(date: Date, locale: Locale): string {
  if (locale === 'ru') {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  }
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(date)
}
