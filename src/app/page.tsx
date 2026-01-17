import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-5xl mx-auto w-full">
        <div className="card">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 leading-tight">
              Alba Host
            </h1>
            
            <p className="text-base sm:text-lg mb-8 max-w-3xl mx-auto opacity-90">
              Collect payments for golf group events.
            </p>

            {/* How it works */}
            <div className="mb-6 w-full">
              <h2 className="text-label mb-4">How it works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="p-4 rounded-lg" style={{ background: "var(--alba-bg)" }}>
                  <div className="text-xl font-semibold mb-2" style={{ color: "var(--alba-accent)" }}>1</div>
                  <div className="text-sm font-medium mb-1">Create event</div>
                  <div className="text-xs opacity-70">
                    Set price, spots, and organiser details
                  </div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: "var(--alba-bg)" }}>
                  <div className="text-xl font-semibold mb-2" style={{ color: "var(--alba-accent)" }}>2</div>
                  <div className="text-sm font-medium mb-1">Share link</div>
                  <div className="text-xs opacity-70">
                    Send the event link to your guests
                  </div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: "var(--alba-bg)" }}>
                  <div className="text-xl font-semibold mb-2" style={{ color: "var(--alba-accent)" }}>3</div>
                  <div className="text-sm font-medium mb-1">Guests pay</div>
                  <div className="text-xs opacity-70">
                    Secure payments via Stripe checkout
                  </div>
                </div>
              </div>
            </div>

            {/* Feature list - centered */}
            <div className="mb-8 w-full">
              <ul className="mx-auto w-fit text-center space-y-2.5 text-sm sm:text-base">
                <li className="flex items-center justify-center gap-3">
                  <span className="font-semibold w-5 flex-shrink-0 leading-none" style={{ color: "var(--alba-yellow)" }}>✓</span>
                  <span>Pay to join via Stripe</span>
                </li>
                <li className="flex items-center justify-center gap-3">
                  <span className="font-semibold w-5 flex-shrink-0 leading-none" style={{ color: "var(--alba-yellow)" }}>✓</span>
                  <span>Attendance list with CSV export</span>
                </li>
                <li className="flex items-center justify-center gap-3">
                  <span className="font-semibold w-5 flex-shrink-0 leading-none" style={{ color: "var(--alba-yellow)" }}>✓</span>
                  <span>Refund controls and audit log</span>
                </li>
              </ul>
            </div>

            <div className="mb-6 text-xs sm:text-sm space-y-0.5 text-center opacity-70">
              <p>No accounts needed for guests.</p>
              <p>You are marked paid only after Stripe confirms payment.</p>
            </div>

            <Link
              href="/create"
              className="btn-primary inline-block px-6 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg font-semibold"
            >
              Create an event
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
