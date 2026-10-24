// The words of the sage index page (/<locale>/sages) and of the skip link to it that every page carries.
// No data imports: the root layout reads this.
import type { Locale } from './types'

/** The page's words. */
export const SAGE_INDEX_TEXT: Record<Locale, {
  title: string
  heading: string
  lede: (n: number) => string
  description: (n: number) => string
  erasNav: string
  openApp: string
  /** The skip link on every page: to this list. */
  skip: string
}> = {
  he: {
    title: 'כל החכמים: האינדקס',
    heading: 'כל החכמים לפי תקופות',
    lede: n => `${n} החכמים שבאוצר חכמים, לפי סדר הדורות. כל שם הוא קישור לדף החכם: קורות חייו, רעיונותיו והמחקר עליו.`,
    description: n => `${n} חכמים לפי תקופות, מהאבות ועד ימינו: שם, שנות חיים וקישור לדף של כל אחד.`,
    erasNav: 'תקופות',
    openApp: 'לחיפוש לפי שם, מקום או תקופה, ולרשת הקשרים, המפה וציר הזמן',
    skip: 'לרשימת כל החכמים',
  },
  en: {
    title: 'All sages: the index',
    heading: 'All the sages, by era',
    lede: n => `The ${n} sages of Ozar Chachamim in the order of the generations. Each name links to the sage's page: his life, his ideas and the research on him.`,
    description: n => `${n} sages by era, from the Patriarchs to today: the name, years and a link to each one's page.`,
    erasNav: 'Eras',
    openApp: 'To search by name, place or era, and for the network, the map and the timeline',
    skip: 'Go to the list of all sages',
  },
  ru: {
    title: 'Все мудрецы: указатель',
    heading: 'Все мудрецы по эпохам',
    lede: n => `${n} мудрецов «Оцар Хахамим» в порядке поколений. Каждое имя ведёт на страницу мудреца: его жизнь, идеи и исследование о нём.`,
    description: n => `${n} мудрецов по эпохам, от праотцев до наших дней: имя, годы жизни и ссылка на страницу каждого.`,
    erasNav: 'Эпохи',
    openApp: 'Поиск по имени, месту или эпохе, сеть связей, карта и хронология',
    skip: 'К списку всех мудрецов',
  },
}
