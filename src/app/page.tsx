import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl mb-6">
            Collect payments for group events. Instantly.
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Create an event, share a link, get paid via Stripe. No accounts, no hassle.
          </p>

          <div className="mb-12 text-left max-w-xl mx-auto">
            <ul className="space-y-4 text-lg text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-3 font-bold">✓</span>
                <span>Pay-to-join via Stripe</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 font-bold">✓</span>
                <span>Automatic attendance tracking</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-3 font-bold">✓</span>
                <span>Refunds and admin controls built in</span>
              </li>
            </ul>
          </div>

          <Link
            href="/create"
            className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create an event
          </Link>
        </div>
      </div>
    </main>
  );
}
