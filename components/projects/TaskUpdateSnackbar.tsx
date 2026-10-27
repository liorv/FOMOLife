import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './TaskUpdateSnackbar.module.css';

interface Props {
  message: string;
  onDismiss: () => void;
}

export default function TaskUpdateSnackbar({ message, onDismiss }: Props) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (hovered || focused) return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, hovered, focused]);

  return createPortal(
    <div className={styles.snackbar}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}>
      <span role="status" aria-atomic="true">{message}</span>
      <button type="button" className={styles.dismiss} aria-label="Dismiss task update" onClick={onDismiss}>
        <span className="material-icons" aria-hidden="true">close</span>
      </button>
    </div>,
    document.body,
  );
}
