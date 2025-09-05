import React, { useState, useEffect } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { AccessTime as TimeIcon } from '@mui/icons-material';

interface SessionTimerProps {
  timeoutDuration: number; // in Millisekunden
  onActivity?: () => void; // Callback wenn Aktivität erkannt wird
}

export const SessionTimer: React.FC<SessionTimerProps> = ({ 
  timeoutDuration, 
  onActivity 
}) => {
  const [timeLeft, setTimeLeft] = useState(timeoutDuration);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Reset Timer bei Aktivität
  const resetTimer = () => {
    setLastActivity(Date.now());
    setTimeLeft(timeoutDuration);
    if (onActivity) onActivity();
  };

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

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, []);

  // Timer Update
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;
      const remaining = Math.max(0, timeoutDuration - elapsed);
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, timeoutDuration]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getColor = (): 'default' | 'warning' | 'error' => {
    const percentLeft = (timeLeft / timeoutDuration) * 100;
    if (percentLeft < 20) return 'error';
    if (percentLeft < 50) return 'warning';
    return 'default';
  };

  return (
    <Tooltip title="Verbleibende Sitzungszeit bis automatisches Logout">
      <Chip
        icon={<TimeIcon />}
        label={formatTime(timeLeft)}
        color={getColor()}
        variant="outlined"
        size="small"
      />
    </Tooltip>
  );
};
