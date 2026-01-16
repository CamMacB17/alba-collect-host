import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl mb-6" style={{ color: "#FFFFE0" }}>
            Collect payments for golf group events. Instantly.
          </h1>
          
          <p className="text-xl mb-12 max-w-xl mx-auto" style={{ color: "#FFFFE0", opacity: 0.9 }}>
            Create your golf event, share a link, guests pay via Stripe, and attendance is tracked automatically.
          </p>

          <div className="mb-12 text-left max-w-lg mx-auto">
            <ul className="space-y-4 text-lg" style={{ color: "#FFFFE0" }}>
              <li className="flex items-start">
                <span className="mr-3 font-bold" style={{ color: "#FBB924" }}>✓</span>
                <span>Pay to join via Stripe</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold" style={{ color: "#FBB924" }}>✓</span>
                <span>Automatic attendance list with CSV export</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold" style={{ color: "#FBB924" }}>✓</span>
                <span>Refund controls and audit log</span>
              </li>
            </ul>
          </div>

          <div className="mb-8 text-sm space-y-1" style={{ color: "#FFFFE0", opacity: 0.8 }}>
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
