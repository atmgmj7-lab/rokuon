export default function RecordingsLoading() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12">
      <div className="container mx-auto p-8">
        <header className="mb-8">
          <div className="h-12 w-64 bg-stone-200/60 rounded-full animate-pulse mb-4" />
          <div className="h-5 w-96 bg-stone-200/40 rounded animate-pulse" />
        </header>

        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-stone-200/80 shadow-sm p-6 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded bg-stone-200/60" />
                  <div className="h-6 w-48 rounded bg-stone-200/60" />
                  <div className="h-6 w-24 rounded bg-stone-200/40" />
                </div>
              </div>
              <div className="h-4 w-full max-w-md rounded bg-stone-200/40 mb-4" />
              <div className="h-10 w-full rounded-lg bg-stone-200/60 mb-4" />
              <div className="flex gap-4">
                <div className="h-4 w-16 rounded bg-stone-200/40" />
                <div className="h-4 w-20 rounded bg-stone-200/40" />
              </div>
              <div className="mt-4 pt-4 border-t border-stone-200/60">
                <div className="h-4 w-32 rounded bg-stone-200/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
