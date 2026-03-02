import React from 'react';
import ReactDOM from 'react-dom';
import styles from './ModalOverlay.module.css';

export interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string | undefined;
  contentClassName?: string | undefined;
  contentRef?: React.Ref<HTMLDivElement> | undefined;
}

export default function ModalOverlay({
  open,
  onClose,
  children,
  className,
  contentClassName,
  contentRef,
}: ModalOverlayProps) {
  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className={[styles.overlay, className].filter(Boolean).join(' ')}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className={[styles.content, contentClassName].filter(Boolean).join(' ')}
        onClick={(event) => event.stopPropagation()}
        ref={contentRef}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
