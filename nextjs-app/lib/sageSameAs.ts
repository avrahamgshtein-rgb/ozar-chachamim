// Server-only: the `sameAs` of a sage's JSON-LD Person, the pages elsewhere that are about the same
// person. Only links the site already holds and shows on the page (the exact Wikipedia articles
// and Wikisource author page of public/data-wikipedia.json, Sefaria's topic page of
// public/data-sefaria.json, both matched by name and checked against his years, and the podcast
// episode); never a search URL, never a guess.
import { getSefaria, sefariaTopicUrl } from './sefaria'
import { wikiLinks, wikipediaUrl, wikisourceUrl } from './wikipedia'

export function sageSameAs(sageId: string, spotifyUrl?: string): string[] {
  const sefaria = getSefaria(sageId)
  const wiki = wikiLinks(sageId, sefaria)
  const out: string[] = []
  if (wiki.he) out.push(wikipediaUrl('he', wiki.he))
  if (wiki.en) out.push(wikipediaUrl('en', wiki.en))
  if (sefaria) out.push(sefariaTopicUrl(sefaria.slug))
  if (wiki.wikisource) out.push(wikisourceUrl(wiki.wikisource))
  // an episode address only: six sages hold a spotifycreators-web.app.link short link, which is not a page about him
  if (spotifyUrl && /^https:\/\/open\.spotify\.com\/episode\//.test(spotifyUrl)) out.push(spotifyUrl)
  return [...new Set(out)]
}
