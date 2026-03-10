import React, { useState, useEffect, useCallback } from 'react';
import { ColorPickerOverlay } from '@myorg/ui';

interface ColorPickerOverlayProps {
  colors: string[];
}

export default function FrameworkColorPickerOverlay({ colors }: ColorPickerOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    // Send the selected color to the framework, which will forward it to the app
    try {
      window.postMessage({
        type: 'color-selected',
        color: color
      }, '*');
    } catch (err) {
      console.warn('Failed to send color selection:', err);
    }
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event?.data) return;

      const { type } = event.data;

      if (type === 'colorpicker-open') {
        setIsOpen(true);
      } else if (type === 'colorpicker-close') {
        handleClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleClose]);

  return (
    <ColorPickerOverlay
      open={isOpen}
      colors={colors}
      selectedColor={selectedColor}
      onClose={handleClose}
      onSelect={handleColorSelect}
    />
  );
}