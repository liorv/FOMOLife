'use client';

import React, { useEffect, useState } from 'react';
import styles from './DismissibleHint.module.css';

interface DismissibleHintProps {
  /** localStorage key — once dismissed, this key is set to '1' */
  storageKey: string;
  /** Lines of text to show */
  lines: string[];
  /** Arrow orientation:
   *  - 'horizontal' (default): left + right arrows flanking the text, inline
   *  - 'up': single upward arrow above the text block, stacked vertically
   */
  direction?: 'horizontal' | 'up' | 'down';
  /** Optional extra className for the wrapper */
  className?: string | undefined;
}

export default function DismissibleHint({ storageKey, lines, direction = 'horizontal', className }: DismissibleHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — stay hidden
    }

    const onDismiss = (e: Event) => {
      if ((e as CustomEvent).detail === storageKey) {
        setVisible(false);
      }
    };
    window.addEventListener('hint-dismissed', onDismiss);
    return () => window.removeEventListener('hint-dismissed', onDismiss);
  }, [storageKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('hint-dismissed', { detail: storageKey }));
    setVisible(false);
  };

  if (!visible) return null;

  if (direction === 'down') {
    return (
      <div className={`${styles.hintUp}${className ? ` ${className}` : ''}`}>
        <span className={styles.textUp}>
          {lines.map((l, i) => (
            <span key={i} className={i === 0 ? styles.line1 : styles.lineN}>{l}</span>
          ))}
        </span>
        {/* Hand-drawn downward arrow */}
        <svg className={styles.arrowUp} viewBox="0 0 20 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M10 2 C7 10 13 18 9 26 C6 33 12 38 10 43" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M4 35 C6 40 9 43 10 43 C11 43 14 40 16 35" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <button
          className={styles.dismiss}
          onClick={dismiss}
          title="Got it"
          aria-label="Dismiss hint"
        >
          got it
        </button>
      </div>
    );
  }

  if (direction === 'up') {
    return (
      <div className={`${styles.hintUp}${className ? ` ${className}` : ''}`}>
        {/* Hand-drawn upward arrow */}
        <svg className={styles.arrowUp} viewBox="0 0 20 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M10 46 C13 38 7 30 11 22 C14 15 8 10 10 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M4 13 C6 8 9 5 10 5 C11 5 14 8 16 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span className={styles.textUp}>
          {lines.map((l, i) => (
            <span key={i} className={i === 0 ? styles.line1 : styles.lineN}>{l}</span>
          ))}
        </span>
        <button
          className={styles.dismiss}
          onClick={dismiss}
          title="Got it"
          aria-label="Dismiss hint"
        >
          got it
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.hint}${className ? ` ${className}` : ''}`}>
      {/* Hand-drawn left arrow */}
      <svg className={styles.arrowSvg} viewBox="0 0 44 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M42 10 C34 9 20 8 6 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M12 4 C8 7 5 9 6 10 C7 11 9 13 12 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>

      <span className={styles.text}>
        {lines.map((l, i) => (
          <span key={i} className={i === 0 ? styles.line1 : styles.lineN}>{l}</span>
        ))}
      </span>

      {/* Hand-drawn right arrow */}
      <svg className={styles.arrowSvg} viewBox="0 0 44 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 10 C10 11 26 12 38 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M32 4 C36 7 39 9 38 10 C37 11 35 13 32 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>

      <button
        className={styles.dismiss}
        onClick={dismiss}
        title="Got it"
        aria-label="Dismiss hint"
      >
        got it
      </button>
    </div>
  );
}
