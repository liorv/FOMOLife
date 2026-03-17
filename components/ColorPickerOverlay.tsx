import React, { useState, useEffect, useCallback } from 'react';
import { ColorPickerOverlay } from '@myorg/ui';

interface ColorPickerOverlayProps {
  colors: string[];
  // Controlled props — when provided the overlay will be controlled by the
  // parent instead of listening for window messages.
  open?: boolean;
  selectedColor?: string;
  onSelect?: (color: string) => void;
  onClose?: () => void;
}

export default function FrameworkColorPickerOverlay({ colors, open: controlledOpen, selectedColor: controlledSelectedColor, onSelect, onClose }: ColorPickerOverlayProps) {
  const [isOpen, setIsOpen] = useState<boolean>(!!controlledOpen);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(controlledSelectedColor);
  const [contextData, setContextData] = useState<any>(null);

  const isControlled = typeof controlledOpen === 'boolean';

  useEffect(() => {
    if (isControlled) {
      setIsOpen(!!controlledOpen);
    }
  }, [controlledOpen, isControlled]);

  useEffect(() => {
    if (typeof controlledSelectedColor === 'string') {
      setSelectedColor(controlledSelectedColor);
    }
  }, [controlledSelectedColor]);

  const handleClose = useCallback(() => {
    console.debug('[ColorPickerOverlay] close', { controlled: !!onClose });
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
  }, [onClose]);

  const handleColorSelect = useCallback((color: string) => {
    console.debug('[ColorPickerOverlay] select', { color, controlled: !!onSelect });
    if (onSelect) {
      onSelect(color);
    } else {
      // Legacy behavior: post message to window so host can forward it
      try {
        window.postMessage({ type: 'color-selected', color, ...(contextData || {}) }, '*');
      } catch (err) {
        console.warn('Failed to send color selection:', err);
      }
    }
    handleClose();
  }, [handleClose, onSelect]);

  // If not controlled, listen for window messages for backwards-compatibility
  useEffect(() => {
    if (isControlled) return;
    const handleMessage = (event: MessageEvent) => {
      if (!event?.data) return;
      const { type } = event.data as any;
      // Only handle colorpicker control messages here — ignore other app messages
      if (type !== 'colorpicker-open' && type !== 'colorpicker-close') return;
      const { _from, _itemId, _itemType, selectedColor } = event.data as any;
      // received colorpicker control message
      console.debug('[ColorPickerOverlay] message', { type, origin: event.origin, selectedColor });

      if (type === 'colorpicker-open') {
        if (typeof selectedColor === 'string') setSelectedColor(selectedColor);
        // Save the event data so we can pass context (like subprojectId) back
        setContextData(event.data);
        setIsOpen(true);
      } else if (type === 'colorpicker-close') {
        handleClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleClose, isControlled]);

  return (
    <ColorPickerOverlay
      open={isOpen}
      colors={colors}
      selectedColor={selectedColor ?? ''}
      onClose={handleClose}
      onSelect={handleColorSelect}
    />
  );
}