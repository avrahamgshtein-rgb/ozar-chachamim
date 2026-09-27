// Skeleton in the shape of the sage page: top bar, hero, overview beside the
// related-sages card, then the research column.
export default function SageLoading() {
  return (
    <div className="h-dvh overflow-hidden bg-ink-900 font-sans text-ink-100">
      <div className="h-14 border-b border-gold-500/10 bg-ink-850/80" />
      <div className="mx-auto max-w-6xl animate-pulse px-4 pt-6 md:px-8 md:pt-10 motion-reduce:animate-none">
        {/* Hero */}
        <div className="space-y-4 rounded-3xl border border-ink-700/40 p-6 md:p-10">
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-ink-800" />
            <div className="h-6 w-24 rounded-full bg-ink-800" />
          </div>
          <div className="h-10 w-3/4 rounded-lg bg-ink-800 md:h-12" />
          <div className="h-5 w-1/2 rounded bg-ink-800" />
          <div className="flex gap-2 pt-2">
            <div className="h-9 w-40 rounded-full bg-ink-800" />
            <div className="h-9 w-36 rounded-full bg-ink-800" />
          </div>
        </div>

        {/* Overview + related */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="space-y-4">
            <div className="h-24 rounded-2xl bg-ink-800" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-4 rounded bg-ink-800" style={{ width: `${70 + i * 6}%` }} />
            ))}
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-11 rounded-xl bg-ink-800" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
