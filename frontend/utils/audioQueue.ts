import { AudioTrack, QueueEntry, RecentTrack, RepeatMode } from '../types/audio';

const createQueueEntryId = (trackId: string, index: number) =>
    `${trackId}:${Date.now().toString(36)}:${index}:${Math.random().toString(36).slice(2, 8)}`;

export const createQueueEntries = (tracks: AudioTrack[]): QueueEntry[] =>
    tracks.map((track, index) => ({
        id: createQueueEntryId(track.id, index),
        addedAt: Date.now() + index,
        track,
    }));

export const moveArrayItem = <T>(items: T[], from: number, to: number): T[] => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
};

export const moveQueueEntry = (
    queue: QueueEntry[],
    currentIndex: number,
    from: number,
    to: number
) => {
    if (
        from < 0 ||
        to < 0 ||
        from >= queue.length ||
        to >= queue.length ||
        from === to
    ) {
        return { queue, currentIndex };
    }

    let nextCurrentIndex = currentIndex;
    if (from === currentIndex) {
        nextCurrentIndex = to;
    } else if (from < currentIndex && to >= currentIndex) {
        nextCurrentIndex -= 1;
    } else if (from > currentIndex && to <= currentIndex) {
        nextCurrentIndex += 1;
    }

    return {
        queue: moveArrayItem(queue, from, to),
        currentIndex: nextCurrentIndex,
    };
};

export const removeQueueEntryAt = (
    queue: QueueEntry[],
    currentIndex: number,
    removeIndex: number
) => {
    if (removeIndex < 0 || removeIndex >= queue.length) {
        return { queue, currentIndex, removedCurrent: false };
    }

    const nextQueue = queue.filter((_, index) => index !== removeIndex);
    const removedCurrent = removeIndex === currentIndex;

    if (nextQueue.length === 0) {
        return {
            queue: nextQueue,
            currentIndex: -1,
            removedCurrent,
        };
    }

    if (removeIndex < currentIndex) {
        return {
            queue: nextQueue,
            currentIndex: currentIndex - 1,
            removedCurrent,
        };
    }

    if (removedCurrent) {
        return {
            queue: nextQueue,
            currentIndex: Math.min(currentIndex, nextQueue.length - 1),
            removedCurrent,
        };
    }

    return {
        queue: nextQueue,
        currentIndex,
        removedCurrent,
    };
};

export const insertTracksIntoQueue = (
    queue: QueueEntry[],
    currentIndex: number,
    tracks: AudioTrack[],
    position: 'next' | 'end'
) => {
    if (tracks.length === 0) {
        return queue;
    }

    const nextEntries = createQueueEntries(tracks);
    if (position === 'end' || currentIndex < 0 || currentIndex >= queue.length) {
        return [...queue, ...nextEntries];
    }

    const insertionIndex = currentIndex + 1;
    return [
        ...queue.slice(0, insertionIndex),
        ...nextEntries,
        ...queue.slice(insertionIndex),
    ];
};

export const getNextQueueIndex = (
    queue: QueueEntry[],
    currentIndex: number,
    repeatMode: RepeatMode,
    shuffle: boolean
) => {
    if (queue.length === 0) {
        return -1;
    }

    if (repeatMode === 'one' && currentIndex >= 0) {
        return currentIndex;
    }

    if (shuffle) {
        if (queue.length === 1) {
            return 0;
        }

        let nextIndex = currentIndex;
        while (nextIndex === currentIndex) {
            nextIndex = Math.floor(Math.random() * queue.length);
        }
        return nextIndex;
    }

    const sequentialIndex = currentIndex + 1;
    if (sequentialIndex < queue.length) {
        return sequentialIndex;
    }

    return repeatMode === 'all' ? 0 : -1;
};

export const getPreviousQueueIndex = (
    queue: QueueEntry[],
    currentIndex: number,
    repeatMode: RepeatMode
) => {
    if (queue.length === 0) {
        return -1;
    }

    const sequentialIndex = currentIndex - 1;
    if (sequentialIndex >= 0) {
        return sequentialIndex;
    }

    return repeatMode === 'all' ? queue.length - 1 : 0;
};

export const recordRecentTrack = (
    recent: RecentTrack[],
    track: AudioTrack,
    maxEntries = 50
) => {
    const playedAt = Date.now();
    const deduped = recent.filter((entry) => entry.id !== track.id);
    return [{ ...track, playedAt }, ...deduped].slice(0, maxEntries);
};
