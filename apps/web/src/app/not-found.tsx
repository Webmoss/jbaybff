import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container flex min-h-screen flex-col items-start justify-center gap-4 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-coral-500">404</p>
      <h1 className="font-display text-6xl uppercase text-ocean-500">Off the map</h1>
      <p className="max-w-md text-ink-700">
        That wave broke before it reached us. Let's head back to shore.
      </p>
      <Link
        href="/"
        className="rounded-md bg-ocean-500 px-6 py-3 font-heading text-sm uppercase tracking-wider text-cream"
      >
        Back home
      </Link>
    </main>
  );
}
