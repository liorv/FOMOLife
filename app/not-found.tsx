import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-header">
          <div className="not-found-icon">
            <span className="material-icons">search_off</span>
          </div>
          <h1 className="not-found-title">Page Not Found</h1>
          <p className="not-found-message">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="not-found-actions">
          <Link href="/" className="not-found-button not-found-button--primary">
            <span className="material-icons">home</span>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}