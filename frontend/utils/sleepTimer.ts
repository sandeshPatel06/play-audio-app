import { SleepTimerState } from '../types/audio';

export const DEFAULT_SLEEP_TIMER_FADE_MS = 5 * 60 * 1000;

export const DEFAULT_SLEEP_TIMER: SleepTimerState = {
    enabled: false,
    startedAt: null,
    endsAt: null,
    fadeWindowMs: DEFAULT_SLEEP_TIMER_FADE_MS,
    presetMinutes: null,
};

export const createSleepTimerState = (
    minutes: number,
    now = Date.now(),
    fadeWindowMs = DEFAULT_SLEEP_TIMER_FADE_MS
): SleepTimerState => ({
    enabled: true,
    startedAt: now,
    endsAt: now + minutes * 60 * 1000,
    fadeWindowMs,
    presetMinutes: minutes,
});

export const getRemainingSleepTimerMs = (
    sleepTimer: SleepTimerState,
    now = Date.now()
) => {
    if (!sleepTimer.enabled || !sleepTimer.endsAt) {
        return null;
    }

    return sleepTimer.endsAt - now;
};

export const isSleepTimerExpired = (
    sleepTimer: SleepTimerState,
    now = Date.now()
) => {
    const remainingMs = getRemainingSleepTimerMs(sleepTimer, now);
    return remainingMs !== null && remainingMs <= 0;
};

export const getSleepTimerVolume = (
    sleepTimer: SleepTimerState,
    now = Date.now()
) => {
    const remainingMs = getRemainingSleepTimerMs(sleepTimer, now);
    if (remainingMs === null) {
        return 1;
    }

    if (remainingMs <= 0) {
        return 0;
    }

    if (remainingMs > sleepTimer.fadeWindowMs) {
        return 1;
    }

    const safeFadeWindow = Math.max(1, sleepTimer.fadeWindowMs);
    return Math.max(0, Math.min(1, remainingMs / safeFadeWindow));
};

export const formatSleepTimerLabel = (
    sleepTimer: SleepTimerState,
    now = Date.now()
) => {
    const remainingMs = getRemainingSleepTimerMs(sleepTimer, now);
    if (remainingMs === null) {
        return 'Off';
    }

    return `${Math.max(1, Math.ceil(Math.max(0, remainingMs) / 60000))} min left`;
};
