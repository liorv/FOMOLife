import React from 'react';
import ModalOverlay from './ModalOverlay';
import styles from './ColorPickerOverlay.module.css';

export interface ColorPickerOverlayProps {
  open: boolean;
  title?: string | undefined;
  colors: string[];
  selectedColor?: string | undefined;
  onClose: () => void;
  onSelect: (color: string) => void;
  contentRef?: React.Ref<HTMLDivElement> | undefined;
}

export default function ColorPickerOverlay({
  open,
  title = 'Choose Color',
  colors,
  selectedColor,
  onClose,
  onSelect,
  contentRef,
}: ColorPickerOverlayProps) {
  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      className={`${styles.overlay} color-picker-modal-overlay`}
      contentClassName={`${styles.modal} color-picker-modal`}
      contentRef={contentRef}
    >
      <div className={`${styles.header} color-picker-modal-header`}>
        <h3>{title}</h3>
        <button
          className={`${styles.closeButton} color-picker-modal-close`}
          onClick={onClose}
          aria-label="Close color picker"
          type="button"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
      <div className={`${styles.grid} color-picker-grid`}>
        {colors.map((color) => (
          <button
            key={color}
            className={`${styles.colorOption} color-option ${color === selectedColor ? `${styles.selected} selected` : ''}`}
            style={{ backgroundColor: color }}
            title={`Color ${color}`}
            type="button"
            onClick={() => onSelect(color)}
            aria-label={`Color ${color}`}
          >
            {color === selectedColor && <span className="material-icons">check</span>}
          </button>
        ))}
      </div>
    </ModalOverlay>
  );
}
