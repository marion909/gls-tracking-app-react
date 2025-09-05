import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseInactivityTimeoutProps {
  timeout: number; // Timeout in Millisekunden
  onTimeout?: () => void; // Callback wenn Timeout erreicht wird
}

export const useInactivityTimeout = ({ timeout, onTimeout }: UseInactivityTimeoutProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Reset Timer
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      console.log('🔒 Benutzer inaktiv - Automatisches Logout nach 5 Minuten');
      
      // Custom callback ausführen falls vorhanden
      if (onTimeout) {
        onTimeout();
      }

      // Token entfernen
      localStorage.removeItem('token');
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Zum Login weiterleiten
      navigate('/login', { 
        replace: true,
        state: { message: 'Sie wurden aufgrund von Inaktivität automatisch abgemeldet.' }
      });
    }, timeout);
  }, [timeout, onTimeout, navigate]);

  // Event Listener für Benutzeraktivität
  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Timer beim ersten Laden starten
    resetTimer();

    // Event Listener hinzufügen
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [resetTimer]);

  // Timer manuell zurücksetzen (für API-Calls etc.)
  return { resetTimer };
};
