// The portrait atlas in the tower's data: which sage stands in which tile of public/portraits/atlas.webp
// (one picture holding every portrait as a 64 px tile, built with its atlas.json by scripts/build_portraits.py;
// never hand-edit). Pure, so the test can run it on a made-up atlas; lib/towerServer.ts feeds it the real one.
import type { TowerData, TowerFaces } from './tower'

/** public/portraits/atlas.json: `ids[k]` is the sage in tile k (row-major, the top row first); `v` the first 8 hex digits of the image's sha256. */
export interface PortraitAtlas {
  tile: number
  cols: number
  rows: number
  w: number
  h: number
  v: string
  ids: string[]
}

/** The atlas as the page ships it. `?v=` makes a new image a new address: the service worker keeps /portraits/* by full URL. */
export function facesOf(atlas: PortraitAtlas): TowerFaces {
  return { src: `/portraits/atlas.webp?v=${atlas.v}`, tile: atlas.tile, cols: atlas.cols, rows: atlas.rows, w: atlas.w, h: atlas.h }
}

/**
 * The layout with `faces` and, on each node of a sage who has a portrait (`hasFace`), `face`, his tile. A node the
 * atlas does not hold gets no face, so a face is only ever drawn from the tile of the sage it was cut for.
 */
export function attachFaces(data: TowerData, atlas: PortraitAtlas, hasFace: (id: string) => boolean): TowerData {
  const tileOf = new Map<string, number>()
  atlas.ids.forEach((id, k) => tileOf.set(id, k))
  const nodes = data.nodes.map(n => {
    const k = tileOf.get(n.id)
    return k !== undefined && hasFace(n.id) ? { ...n, face: k } : n
  })
  return { ...data, nodes, faces: facesOf(atlas) }
}
