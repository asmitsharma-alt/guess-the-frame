import React, { useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import SoundManager from '../../services/soundManager';

export const BottomSheetDrawer = ({
  isOpen,
  onClose,
  id,
  title,
  badgeText,
  children,
  boxClassName = ''
}) => {
  const overlayRef = useRef(null);
  const boxRef = useRef(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  // Trigger subtle haptic feedback on supported devices
  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([10]);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      triggerHaptic();
      // Prevent body scroll when drawer is active on mobile
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, triggerHaptic]);

  // Touch drag-to-dismiss gesture handling
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchCurrentY.current = e.touches[0].clientY;
    const diff = touchCurrentY.current - touchStartY.current;
    if (diff > 0 && boxRef.current) {
      boxRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    const diff = touchCurrentY.current - touchStartY.current;
    if (boxRef.current) {
      boxRef.current.style.transform = '';
    }
    if (diff > 70) {
      triggerHaptic();
      SoundManager.playClick();
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === overlayRef.current) {
      triggerHaptic();
      SoundManager.playClick();
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      id={id}
      className={`nb-drawer-overlay ${isOpen ? 'active' : ''}`}
      onClick={handleBackdropClick}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={boxRef}
        className={`nb-drawer-box ${boxClassName}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile Pull / Drag Handle */}
        <div className="nb-drawer-handle-bar" aria-label="Swipe down to close" />

        {/* Neobrutalist Header Bar */}
        {(title || badgeText) && (
          <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-black">
            <div className="flex items-center gap-2">
              {title && (
                <span className="font-black text-base uppercase tracking-tight font-display">
                  {title}
                </span>
              )}
              {badgeText && (
                <span className="nb-badge bg-yellow-300">
                  {badgeText}
                </span>
              )}
            </div>
            <button
              type="button"
              className="nb-btn p-1.5 min-w-[36px] min-h-[36px] bg-red-400 text-white font-bold text-sm"
              onClick={() => {
                triggerHaptic();
                SoundManager.playClick();
                onClose();
              }}
              aria-label="Close dialog"
            >
              <X size={16} strokeWidth={3} />
            </button>
          </div>
        )}

        {/* Drawer / Modal Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheetDrawer;
