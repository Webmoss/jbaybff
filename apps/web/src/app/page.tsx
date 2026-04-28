/**
 * Public site landing page — placeholder for Step 2.
 *
 * Step 2 will replace this with the full home page (transparent-to-solid
 * mega-menu, hero, campaign progress strip, fund-allocation panel, idea
 * board teaser, etc.) using the geometric beach motifs from `image_0.png`.
 */
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-cream text-ink-900">
      <section className="container relative flex flex-col items-start gap-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-coral-500">
          Step 1 — Foundation
        </p>
        <h1 className="font-display text-6xl uppercase leading-[0.95] tracking-tight md:text-8xl">
          <span className="block text-ocean-500">Jeffreys Bay</span>
          <span className="block text-teal-500">Blue Flag</span>
          <span className="block text-coral-500">Foundation</span>
        </h1>
        <p className="max-w-xl text-lg text-ink-700">
          Earning Blue Flag status for J-Bay through cleanups, education, water-quality
          monitoring, and bold community action.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/donate"
            className="rounded-md bg-coral-500 px-6 py-3 font-heading text-sm uppercase tracking-wider text-cream transition hover:bg-coral-600"
          >
            Donate (R)
          </Link>
          <Link
            href="/campaigns"
            className="rounded-md border-2 border-ocean-500 px-6 py-3 font-heading text-sm uppercase tracking-wider text-ocean-500 transition hover:bg-ocean-500 hover:text-cream"
          >
            Campaigns
          </Link>
        </div>
        <p className="mt-12 max-w-xl text-sm text-ink-500">
          The full home page (transparent-to-solid mega menu, hero motif, campaign progress,
          fund-allocation transparency, idea board) is built in Step 2.
        </p>
      </section>
    </main>
  );
}
