import { useState, useEffect } from 'react';
import { CheckIcon, AlertTriangleIcon, XIcon } from './Icons';

interface ToastProps {
  message: string;
  linkText?: string;
  linkUrl?: string;
  duration?: number;
  type?: 'success' | 'warning';
  onClose: () => void;
}

export default function Toast({
  message,
  linkText,
  linkUrl,
  duration = 5000,
  type = 'success',
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`toast ${isVisible ? 'toast-visible' : 'toast-hidden'}`}>
      <div
        className={`toast-icon${type === 'warning' ? ' toast-icon--warning' : ''}`}
      >
        {type === 'warning' ? (
          <AlertTriangleIcon size={20} />
        ) : (
          <CheckIcon size={20} />
        )}
      </div>
      <div className="toast-content">
        <p className="toast-message">{message}</p>
        {linkText && linkUrl && (
          <a href={linkUrl} className="toast-link">
            {linkText} →
          </a>
        )}
      </div>
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Cerrar notificación"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}
