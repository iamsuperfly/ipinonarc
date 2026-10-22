import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import WrongChainBanner from './components/WrongChainBanner'
import LandingPage from './pages/LandingPage'
import PotsPage from './pages/PotsPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'

  return (
    <div className="min-h-dvh">
      <Header />
      <WrongChainBanner />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pots" element={<PotsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>

      {/* Footer — landing only */}
      {isLanding && (
        <footer
          className="relative z-10 border-t px-5 py-12 text-sm"
          style={{ borderColor: 'rgba(27,24,19,0.10)', color: 'var(--color-mute)' }}
        >
          <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2">
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-laterite)' }}>IPIN</p>
              <p className="mt-3 max-w-sm">A share is a share. Paid once.</p>
              <a
                href="https://x.com/iamsuperflly"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border"
                style={{ borderColor: 'rgba(27,24,19,0.10)', color: 'var(--color-ink)' }}
                aria-label="X"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M18.2 2H21l-6.5 7.4L22 22h-6.8l-4.3-6.6L6 22H3.2l7-8L2 2h6.9l3.9 6.1L18.2 2Zm-1.2 18h1.8L7.1 3.9H5.2L17 20Z" />
                </svg>
              </a>
            </div>
            <div>
              <p style={{ color: 'var(--color-ink)' }}>Contact</p>
              <a href="mailto:iamsuperfly02@gmail.com" className="mt-3 block hover:underline">
                iamsuperfly02@gmail.com
              </a>
            </div>
          </div>
          <p className="mx-auto mt-10 max-w-6xl">
            © 2026 IPIN —{' '}
            <a className="hover:underline" style={{ color: 'var(--color-ink)' }} href="https://x.com/iamsuperflly" target="_blank" rel="noreferrer">
              Superfly
            </a>
          </p>
        </footer>
      )}
    </div>
  )
}
