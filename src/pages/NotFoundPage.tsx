import { Link } from 'react-router-dom'

/**
 * Catch-all 404. Previously unknown routes (e.g. /create, /app,
 * /xyz123) rendered a blank header-only page with no content, no
 * footer and no explanation, because there was no "*" route.
 */
export default function NotFoundPage() {
  return (
    <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-10 text-center sm:px-6">
      <p
        className="font-mono text-sm font-bold"
        style={{ color: 'var(--color-laterite)' }}
      >
        404
      </p>
      <h1
        className="mt-2 text-3xl font-bold"
        style={{ letterSpacing: '-0.02em' }}
      >
        This page doesn&rsquo;t exist
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: 'var(--color-mute)' }}>
        The link may be mistyped, or the page may have moved. Your pots are safe —
        head home or go to your pots.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="btn-primary px-8">
          Go home
        </Link>
        <Link to="/pots" className="btn-ghost px-8">
          Go to my pots
        </Link>
      </div>
    </main>
  )
}
