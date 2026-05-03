import { useEffect, useRef } from 'react';

export function useIdleTimeout(timeoutMinutes: number, onIdle: () => void) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (timeoutMinutes <= 0) return;

        const timeoutMs = timeoutMinutes * 60 * 1000;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(onIdle, timeoutMs);
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, resetTimer);
        });

        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                document.removeEventListener(event, resetTimer);
            });
        };
    }, [timeoutMinutes, onIdle]);
}
