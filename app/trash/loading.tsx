export default function TrashLoading() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] py-12">
      <div className="container mx-auto p-8">
        <header className="mb-8">
          <div className="h-12 w-64 bg-stone-200/60 rounded-full animate-pulse mb-4" />
          <div className="h-5 w-96 bg-stone-200/40 rounded animate-pulse" />
        </header>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-stone-200/80 shadow-sm p-6 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded bg-stone-200/60" />
                  <div className="h-6 w-48 rounded bg-stone-200/60" />
                  <div className="h-6 w-24 rounded bg-stone-200/40" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-20 rounded-lg bg-stone-200/60" />
                  <div className="h-9 w-24 rounded-lg bg-stone-200/60" />
                </div>
              </div>
              <div className="mt-3 h-4 w-32 rounded bg-stone-200/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
