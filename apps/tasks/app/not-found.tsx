import Link from 'next/link'

export default function NotFound() {
  // Redirect to framework app (main application)
  const frameworkUrl = typeof window !== 'undefined' 
    ? window.location.origin.replace(':3004', ':3001')
    : '/';

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
          <Link href={frameworkUrl} className="not-found-button not-found-button--primary">
            <span className="material-icons">home</span>
            Go to Main App
          </Link>
          <Link href={`${frameworkUrl}/projects`} className="not-found-button not-found-button--secondary">
            <span className="material-icons">folder</span>
            View Projects
          </Link>
          <Link href={`${frameworkUrl}/tasks`} className="not-found-button not-found-button--secondary">
            <span className="material-icons">checklist</span>
            View Tasks
          </Link>
        </div>
      </div>
    </div>
  )
}