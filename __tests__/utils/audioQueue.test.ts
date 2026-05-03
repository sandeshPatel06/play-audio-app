import {
  createQueueEntries,
  getNextQueueIndex,
  getPreviousQueueIndex,
  insertTracksIntoQueue,
  moveQueueEntry,
  recordRecentTrack,
  removeQueueEntryAt,
} from "../../utils/audioQueue";
import { AudioTrack } from "../../types/audio";

const createTrack = (id: string): AudioTrack => ({
  id,
  uri: `file:///tracks/${id}.mp3`,
  playableUri: `file:///tracks/${id}.mp3`,
  source: "library",
  filename: `${id}.mp3`,
  title: `Track ${id}`,
  artist: "Artist",
  artists: "Artist",
  album: "Album",
  duration: 180,
  mediaType: "audio",
  creationTime: 1,
  modificationTime: 1,
  isLocal: true,
});

describe("audioQueue", () => {
  it("inserts tracks directly after the current item for add to next", () => {
    const queue = createQueueEntries([createTrack("a"), createTrack("b")]);

    const nextQueue = insertTracksIntoQueue(queue, 0, [createTrack("c")], "next");

    expect(nextQueue.map((entry) => entry.track.id)).toEqual(["a", "c", "b"]);
  });

  it("moves the current index with the dragged queue item", () => {
    const queue = createQueueEntries([createTrack("a"), createTrack("b"), createTrack("c")]);

    const result = moveQueueEntry(queue, 1, 1, 2);

    expect(result.queue.map((entry) => entry.track.id)).toEqual(["a", "c", "b"]);
    expect(result.currentIndex).toBe(2);
  });

  it("removes the current queue item and advances safely", () => {
    const queue = createQueueEntries([createTrack("a"), createTrack("b"), createTrack("c")]);

    const result = removeQueueEntryAt(queue, 1, 1);

    expect(result.queue.map((entry) => entry.track.id)).toEqual(["a", "c"]);
    expect(result.currentIndex).toBe(1);
    expect(result.removedCurrent).toBe(true);
  });

  it("honors repeat and shuffle rules when choosing the next item", () => {
    const queue = createQueueEntries([createTrack("a"), createTrack("b"), createTrack("c")]);
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.9);

    expect(getNextQueueIndex(queue, 1, "one", false)).toBe(1);
    expect(getNextQueueIndex(queue, 1, "off", true)).toBe(2);
    expect(getNextQueueIndex(queue, 2, "all", false)).toBe(0);
    expect(getPreviousQueueIndex(queue, 0, "all")).toBe(2);

    randomSpy.mockRestore();
  });

  it("dedupes recently played tracks and caps history length", () => {
    const seedHistory = Array.from({ length: 50 }, (_, index) => ({
      ...createTrack(`seed-${index}`),
      playedAt: index,
    }));

    const nextHistory = recordRecentTrack(seedHistory, createTrack("seed-10"));

    expect(nextHistory).toHaveLength(50);
    expect(nextHistory[0].id).toBe("seed-10");
    expect(nextHistory.filter((entry) => entry.id === "seed-10")).toHaveLength(1);
  });
});
