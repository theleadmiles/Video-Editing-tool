export default function AppLoading() {
  return (
    <div className="p-8">
      {/* Header skeleton */}
      <div className="mb-8 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-xl skeleton" />
          <div className="h-4 w-32 rounded-lg skeleton" />
        </div>
        <div className="h-10 w-28 rounded-xl skeleton" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="h-36 skeleton" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded skeleton" />
              <div className="h-3 w-1/2 rounded skeleton" />
              <div className="h-8 w-full rounded-xl skeleton mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
