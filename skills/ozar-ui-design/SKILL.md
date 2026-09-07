---
name: ozar-ui-design
description: Design or review Ozar Chachamim web interfaces in the established ink, parchment, gold and glass visual language. Use for new Next.js components, layouts, responsive states, RTL/LTR behavior, loading or empty states, and any request to change the project's UI.
---

# Ozar Ui Design

## Visual thesis

Treat Ozar Chachamim as an illuminated knowledge instrument: historical evidence and relationships are primary, while ink, parchment and restrained gold give the interface its identity.

## Build rules

1. Reuse the tokens in `nextjs-app/app/globals.css` and `nextjs-app/tailwind.config.ts`; do not introduce a competing palette.
2. Use Frank Ruhl Libre for sage names and editorial headings, Heebo for interface text, and monospace only for counts or identifiers.
3. Dark mode uses ink `#0a0806` through `#3d3226`, parchment text `#f5eed8`, and gold `#c9973a`. Light mode must use the existing inverted tokens rather than hard-coded colors.
4. Use gold to signal selection, lineage, or a primary scholarly action—not as ambient decoration.
5. Prefer layered `.glass` surfaces, fine borders, and era colors already defined in `ERA_COLORS`. Keep one visual focal point per view.
6. Preserve RTL and LTR symmetry with logical properties (`start`, `end`, `ms`, `ps`) and verify Hebrew, English and Russian copy.
7. Meet the existing mobile constraints: 44px touch targets, 56px mobile header, bottom-sheet drawers, visible focus, and reduced-motion-safe behavior.
8. Use real sage names, periods, works and relationship data in mockups. Empty and error states must tell the user what to do next.
9. Run `npm.cmd run type-check` and `npm.cmd run build` after implementation. Visually inspect desktop and mobile when layout changed.

The signature element is the live lineage or knowledge relationship itself. Decorative motifs must support that structure and never compete with it.
