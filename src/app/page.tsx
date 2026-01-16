import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center" style={{ background: "#2C2C2F" }}>
      <div className="max-w-5xl mx-auto w-full">
        <div className="card text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 leading-tight" style={{ color: "#FFFFE0" }}>
            Collect payments for golf group events.
          </h1>
          
          <p className="text-lg sm:text-xl mb-8 max-w-3xl mx-auto" style={{ color: "#FFFFE0", opacity: 0.9 }}>
            Create your golf event, share a link, guests pay via Stripe, and attendance is tracked automatically.
          </p>

          {/* How it works */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-5" style={{ color: "#FFFFE0", opacity: 0.7 }}>
              How it works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
              <div className="p-4 rounded-lg" style={{ background: "#2C2C2F" }}>
                <div className="text-2xl font-semibold mb-2" style={{ color: "#F78222" }}>1</div>
                <div className="text-base font-medium mb-1" style={{ color: "#FFFFE0" }}>Create event</div>
                <div className="text-sm" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                  Set price, spots, and organiser details
                </div>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "#2C2C2F" }}>
                <div className="text-2xl font-semibold mb-2" style={{ color: "#F78222" }}>2</div>
                <div className="text-base font-medium mb-1" style={{ color: "#FFFFE0" }}>Share link</div>
                <div className="text-sm" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                  Send the event link to your guests
                </div>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "#2C2C2F" }}>
                <div className="text-2xl font-semibold mb-2" style={{ color: "#F78222" }}>3</div>
                <div className="text-base font-medium mb-1" style={{ color: "#FFFFE0" }}>Guests pay</div>
                <div className="text-sm" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                  Secure payments via Stripe checkout
                </div>
              </div>
            </div>
          </div>

          {/* Feature list - centered */}
          <div className="mb-8">
            <ul className="space-y-2.5 text-base mx-auto inline-block" style={{ color: "#FFFFE0" }}>
              <li className="flex items-center justify-center gap-2">
                <span className="font-semibold" style={{ color: "#FBB924" }}>✓</span>
                <span>Pay to join via Stripe</span>
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="font-semibold" style={{ color: "#FBB924" }}>✓</span>
                <span>Automatic attendance list with CSV export</span>
              </li>
              <li className="flex items-center justify-center gap-2">
                <span className="font-semibold" style={{ color: "#FBB924" }}>✓</span>
                <span>Refund controls and audit log</span>
              </li>
            </ul>
          </div>

          <div className="mb-6 text-sm space-y-1" style={{ color: "#FFFFE0", opacity: 0.7 }}>
            <p>No accounts needed for guests.</p>
            <p>You are marked paid only after Stripe confirms payment.</p>
          </div>

          <Link
            href="/create"
            className="inline-block px-8 py-4 text-lg font-semibold rounded-lg transition-all hover:opacity-90"
            style={{ 
              background: "#F78222",
              color: "white"
            }}
          >
            Create an event
          </Link>
        </div>
      </div>
    </main>
  );
}
