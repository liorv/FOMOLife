import React, { useState, useEffect, useCallback } from 'react';
import { ColorPickerOverlay } from '@myorg/ui';

interface ColorPickerOverlayProps {
  colors: string[];
}

export default function FrameworkColorPickerOverlay({ colors }: ColorPickerOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const selectedItemIdRef = React.useRef<string | null>(null);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    // Send the selected color to the framework, which will forward it to the app
    try {
      const message: any = { type: 'color-selected', color };
      if (selectedItemIdRef.current) message.projectId = selectedItemIdRef.current;
      window.postMessage(message, '*');
    } catch (err) {
      console.warn('Failed to send color selection:', err);
    }
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event?.data) return;

      const { type, projectId, selectedColor: incomingColor } = event.data as any;

      if (type === 'colorpicker-open') {
        // remember which project/subproject opened the picker so selection can be forwarded
        selectedItemIdRef.current = projectId ?? null;
        if (typeof incomingColor === 'string') setSelectedColor(incomingColor);
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