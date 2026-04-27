import React, { useState } from 'react';
import styles from './ReleaseNotes.module.css';
import releaseNotesData from '../data/release-notes.json';

export default function ReleaseNotes() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className={styles.triggerButton} 
        onClick={() => setIsOpen(true)}
      >
        <span className="material-icons">campaign</span>
        What's New
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h2>Release Notes</h2>
              <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className={styles.content}>
              {releaseNotesData.releases.map((release, index) => (
                <div key={index} className={styles.releaseItem}>
                  <div className={styles.versionRow}>
                    <h3>{release.version}</h3>
                    <span className={styles.date}>{release.date}</span>
                  </div>
                  <ul>
                    {release.changes.map((change, cIdx) => (
                      <li key={cIdx}>{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
