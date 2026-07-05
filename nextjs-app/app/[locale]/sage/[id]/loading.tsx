export default function SageLoading() {
  return (
    <div className="min-h-dvh bg-ink-900 text-ink-100 font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        {/* Back nav skeleton */}
        <div className="h-8 w-24 bg-ink-800 rounded-lg mb-8" />

        {/* Hero */}
        <div className="mb-8 space-y-3">
          <div className="h-5 w-20 bg-ink-800 rounded-full" />
          <div className="h-10 w-3/4 bg-ink-800 rounded-lg" />
          <div className="h-4 w-1/2 bg-ink-800 rounded" />
          <div className="flex gap-3 pt-2">
            <div className="h-4 w-24 bg-ink-800 rounded" />
            <div className="h-4 w-32 bg-ink-800 rounded" />
          </div>
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-ink-800 rounded" style={{ width: `${70 + i * 5}%` }} />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-ink-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
