import React, { useEffect, useId, useRef, useState } from 'react';
import { ModalOverlay } from '@myorg/ui';
import styles from './ReleaseNotes.module.css';
import releaseNotesData from '../data/release-notes.json';

export default function ReleaseNotes() {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button 
        ref={triggerRef}
        type="button"
        aria-label="What's New"
        aria-haspopup="dialog"
        className={styles.triggerButton} 
        onClick={() => setIsOpen(true)}
      >
        <span className="material-icons" aria-hidden="true">campaign</span>
        <span className="btn-label">What&apos;s New</span>
      </button>

      <ModalOverlay open={isOpen} onClose={() => setIsOpen(false)}
        className={styles.overlay} contentClassName={styles.modal} ariaLabelledby={titleId}>
            <div className={styles.header}>
              <h2 id={titleId}>Release Notes</h2>
              <button ref={closeRef} type="button" aria-label="Close release notes"
                className={styles.closeButton} onClick={() => setIsOpen(false)}>
                <span className="material-icons" aria-hidden="true">close</span>
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
      </ModalOverlay>
    </>
  );
}
