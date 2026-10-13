Fonts and image for the share card (`app/[locale]/sage/[id]/opengraph-image.tsx`), read with fs at request time.

- `FrankRuhlLibre-Bold.ttf`, `Heebo-Medium.ttf`, `PTSerif-Bold.ttf`, `PTSans-Regular.ttf`: static instances from Google Fonts, all under the SIL Open Font License 1.1. PT Serif / PT Sans carry the Cyrillic the Hebrew faces lack.
- `medallion-400.png`: `public/images/temple-medallion.png` scaled to 400 px (keeps the card under WhatsApp's ~300 KB preview limit).
