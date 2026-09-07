# File Map — nextjs-app

78 source files, 11006 lines total. Paths are relative to `nextjs-app/`.

`boundary` = whether the file carries the `use client` directive (React Server Component by default in the Next.js App Router).


## `app/`

| file | lines | boundary | main exports |
|---|---:|---|---|
| `app/[locale]/about/page.tsx` | 202 | server | `AboutPage` |
| `app/[locale]/auth/login/page.tsx` | 33 | server | `LoginPage` |
| `app/[locale]/auth/signup/page.tsx` | 33 | server | `SignupPage` |
| `app/[locale]/error.tsx` | 118 | client | `Error` |
| `app/[locale]/icon.tsx` | 30 | server | `size`, `contentType`, `Icon` |
| `app/[locale]/layout.tsx` | 46 | server | `generateStaticParams`, `generateMetadata`, `LocaleLayout` |
| `app/[locale]/page.tsx` | 31 | server | `MainPage` |
| `app/[locale]/sage/[id]/loading.tsx` | 36 | server | `SageLoading` |
| `app/[locale]/sage/[id]/page.tsx` | 349 | server | `generateMetadata`, `SagePage` |
| `app/api/chat/route.ts` | 261 | server | `runtime`, `GET`, `POST` |
| `app/api/research/[id]/route.ts` | 50 | server | `runtime`, `revalidate`, `GET` |
| `app/auth/callback/route.ts` | 22 | server | `GET` |
| `app/global-error.tsx` | 122 | client | `GlobalError` |
| `app/globals.css` | 258 | server | — |
| `app/icon.tsx` | 30 | server | `size`, `contentType`, `Icon` |
| `app/layout.tsx` | 68 | server | `metadata`, `viewport`, `RootLayout` |
| `app/page.tsx` | 8 | server | `RootPage` |
| `app/sitemap.ts` | 36 | server | `sitemap` |

## `components/`

| file | lines | boundary | main exports |
|---|---:|---|---|
| `components/about/AboutContent.tsx` | 245 | client | `AboutContent` |
| `components/auth/AuthStatus.tsx` | 69 | client | `AuthStatus` |
| `components/auth/LoginForm.tsx` | 101 | client | `LoginForm` |
| `components/auth/SignupForm.tsx` | 105 | client | `SignupForm` |
| `components/auth/UserMenu.tsx` | 95 | client | `UserMenu` |
| `components/chat/ChatWidget.tsx` | 258 | client | `ChatWidget` |
| `components/layout/AppShell.tsx` | 316 | client | `AppShell` |
| `components/layout/Drawer.tsx` | 106 | client | `Drawer` |
| `components/layout/Header.tsx` | 278 | client | `Header` |
| `components/layout/TabBar.tsx` | 81 | client | `TabBar` |
| `components/providers/LocaleProvider.tsx` | 22 | client | `LocaleProvider` |
| `components/sages/ResearchSection.tsx` | 99 | client | `ResearchSection` |
| `components/sages/SageCard.tsx` | 528 | client | `SageCard` |
| `components/sages/SageFilters.tsx` | 174 | client | `SageFilters` |
| `components/sages/SageMiniMap.tsx` | 128 | client | `SageMiniMap` |
| `components/ui/Badge.tsx` | 46 | client | `DataBadge` |
| `components/ui/EmptyState.tsx` | 95 | server | `EmptyState` |
| `components/ui/EraChip.tsx` | 39 | client | `EraChip` |
| `components/ui/FAB.tsx` | 52 | client | `FAB` |
| `components/ui/OnboardingTour.tsx` | 210 | client | `OnboardingTour` |
| `components/ui/ReadingControls.tsx` | 85 | client | `ReadingPrefs`, `useReadingPrefs`, `readingStyle`, `ReadingControls` |
| `components/ui/SearchBar.tsx` | 213 | client | `SearchBar` |
| `components/ui/VizSkeleton.tsx` | 48 | client | `VizSkeleton` |
| `components/viz/Comparator.tsx` | 316 | client | `Comparator` |
| `components/viz/FilterChips.tsx` | 110 | client | `FilterChips` |
| `components/viz/GenealogyTree.tsx` | 302 | client | `GenealogyTree` |
| `components/viz/GeoMap.tsx` | 478 | client | `GeoMap` |
| `components/viz/MapLegend.tsx` | 79 | client | `MapLegend` |
| `components/viz/NetworkGraph.tsx` | 812 | client | `NetworkGraph` |
| `components/viz/PathFinder.tsx` | 302 | client | `PathFinder` |
| `components/viz/SagesTable.tsx` | 225 | client | `SagesTable` |
| `components/viz/Timeline.tsx` | 557 | client | `Timeline` |
| `components/viz/Traditions.tsx` | 164 | client | `Traditions` |

## `lib/`

| file | lines | boundary | main exports |
|---|---:|---|---|
| `lib/analytics.ts` | 79 | client | `AnalyticsEvent`, `trackEvent`, `trackSageViewed`, `trackTabSwitched`, `trackFilterApplied`, `trackSearchQuery` |
| `lib/contentOverlay.ts` | 48 | server | `SageOverlayEntry`, `SageOverlay`, `fetchContentOverlay`, `applyOverlay` |
| `lib/hooks/useD3ForceWorker.ts` | 92 | server | `useD3ForceWorker` |
| `lib/i18n.ts` | 148 | server | `LOCALES`, `DEFAULT_LOCALE`, `LOCALE_NAMES`, `LOCALE_SHORT`, `isValidLocale`, `getDirection` |
| `lib/locationCoords.ts` | 235 | server | `LOCATION_COORDS`, `coordsForName`, `resolveCoords` |
| `lib/milestones.ts` | 131 | server | `Milestone`, `MILESTONES` |
| `lib/optimizedForceSimulation.ts` | 129 | server | `OptimizedSimulationOptions`, `createOptimizedForceSimulation`, `createFastForceSimulation` |
| `lib/personal.ts` | 53 | server | `currentUser`, `recordSageView`, `loadSageMemory`, `setSageBookmark`, `saveSageNote` |
| `lib/rag/anonymousSession.ts` | 74 | server | `ANON_SESSION_COOKIE`, `generateSessionToken`, `hashSessionToken`, `AnonymousQuotaStatus`, `getOrCreateAnonymousSession` |
| `lib/rag/buildContext.ts` | 93 | server | `SageContext`, `RagContext`, `buildRagContext`, `formatContextForPrompt` |
| `lib/rag/claude.ts` | 75 | server | `ChatMessage`, `ClaudeResponse`, `ClaudeApiError`, `callClaude`, `estimateCost` |
| `lib/rag/entityExtraction.ts` | 94 | server | `EntityMatch`, `extractMentionedSages` |
| `lib/rag/sefaria.ts` | 63 | server | `SefariaTopic`, `fetchSefariaTopic`, `SefariaSearchHit`, `searchSefaria` |
| `lib/rag/systemPrompt.ts` | 38 | server | `buildSystemPrompt` |
| `lib/rag/wikipedia.ts` | 45 | server | `fetchWikipediaSummary` |
| `lib/regions.ts` | 88 | server | `LOCATION_REGION_MAP`, `locationToRegion`, `regionsOf`, `CONNECTION_TYPE_COLORS` |
| `lib/search.ts` | 58 | server | `normalizeHe`, `fuzzyIncludes`, `searchSagesLocal` |
| `lib/serverData.ts` | 122 | server | `getSageById`, `getAllSages`, `getSageConnections`, `ResearchDoc`, `getResearchDocs` |
| `lib/structuredData.ts` | 77 | server | `getWebsiteSchema`, `getSageSchema`, `getOrganizationSchema`, `getBreadcrumbSchema` |
| `lib/supabase-auth/client.ts` | 14 | client | `createClient` |
| `lib/supabase-auth/server.ts` | 33 | server | `createClient` |
| `lib/supabase-auth/serviceRole.ts` | 19 | server | `createServiceRoleClient` |
| `lib/supabase.ts` | 201 | server | `isSupabaseConfigured`, `supabase`, `fetchSages`, `fetchConnections`, `fetchSageById`, `searchSages` |
| `lib/types.ts` | 174 | server | `Period`, `ALL_PERIODS`, `Region`, `ConnectionType`, `Locale`, `Tab` |
| `lib/utils.ts` | 24 | server | `cn`, `formatYearRange`, `slugify` |
| `lib/workers/d3-force-worker.ts` | 115 | server | — |

## `store/`

| file | lines | boundary | main exports |
|---|---:|---|---|
| `store/useAppStore.ts` | 213 | client | `useAppStore` |
