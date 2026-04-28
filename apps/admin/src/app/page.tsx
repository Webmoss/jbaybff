/**
 * Admin dashboard root — placeholder for Step 4.
 *
 * Step 4 will replace this with the metrics dashboard:
 *   • Total Funds Raised (ZAR)
 *   • Mailing List Signups
 *   • Active Campaigns
 *   • Pending Orders
 *   • Donations-over-time chart
 *   • Campaign progress comparison
 */

export default function AdminHome() {
  const cards = [
    { label: 'Total Funds Raised', value: 'R 0', token: 'ocean' },
    { label: 'Mailing List Signups', value: '0', token: 'teal' },
    { label: 'Active Campaigns', value: '0', token: 'coral' },
    { label: 'Pending Orders', value: '0', token: 'sand' },
  ] as const;

  return (
    <main className="min-h-screen bg-cream p-10 text-ink-900">
      <header className="mb-10 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-coral-500">
            Admin Dashboard
          </p>
          <h1 className="font-display text-5xl uppercase text-ocean-500">JBay BFF Control</h1>
        </div>
        <p className="text-sm text-ink-500">Step 4 will populate live metrics from Prisma.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border-2 border-ocean-500/20 bg-card p-6 shadow-sm"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-ink-500">
              {card.label}
            </p>
            <p className="mt-3 font-display text-4xl text-ocean-500">{card.value}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
