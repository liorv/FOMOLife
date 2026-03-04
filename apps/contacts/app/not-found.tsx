'use client';

import Link from 'next/link';

export default function NotFound() {
  // Redirect to framework app (main application)
  const frameworkUrl = typeof window !== 'undefined' 
    ? window.location.origin.replace(':3002', ':3001')
    : '/';

  return (
    <main className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-header">
          <span className="material-icons not-found-icon">search_off</span>
          <h1 className="not-found-title">Page Not Found</h1>
        </div>
        <p className="not-found-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="not-found-actions">
          <Link href={frameworkUrl} className="not-found-button not-found-button--primary">
            <span className="material-icons">home</span>
            Go to Main App
          </Link>
          <button
            onClick={() => window.history.back()}
            className="not-found-button not-found-button--secondary"
          >
            <span className="material-icons">arrow_back</span>
            Go Back
          </button>
        </div>
      </div>
    </main>
  );
}