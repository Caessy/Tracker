import { useEffect } from 'react';
import { useSessionStore } from '../store/useSessionStore';

export default function useWorkoutTimer() {
    const active = useSessionStore(s => s.active);
    const isPaused = useSessionStore(s => s.isPaused);
    const tick = useSessionStore(s => s.tick);

    useEffect(() => {
        if (!active || isPaused) return;
        const id = setInterval(() => tick(1), 1000);
        return () => clearInterval(id);
    }, [active, isPaused, tick]);
}