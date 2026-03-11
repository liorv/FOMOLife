import React, { useState, useEffect, useCallback } from 'react';
import { ColorPickerOverlay } from '@myorg/ui';

interface ColorPickerOverlayProps {
  colors: string[];
}

export default function FrameworkColorPickerOverlay({ colors }: ColorPickerOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>();

  const handleClose = useCallback(() => {
    console.debug('[FrameworkColorPickerOverlay] handleClose invoked — closing overlay');
    setIsOpen(false);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    // Send the selected color to the framework, which will forward it to the app
    try {
      console.debug('[FrameworkColorPickerOverlay] handleColorSelect — sending color-selected', { color });
      window.postMessage({ type: 'color-selected', color }, '*');
    } catch (err) {
      console.warn('Failed to send color selection:', err);
    }
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event?.data) return;
      const { type, _from, _itemId, _itemType, selectedColor } = event.data as any;
      console.debug('[FrameworkColorPickerOverlay] received message', { type, _from, _itemId, _itemType, selectedColor, origin: event.origin });

      if (type === 'colorpicker-open') {
        // optional: framework may include the originating item for visibility
        if (typeof selectedColor === 'string') setSelectedColor(selectedColor);
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