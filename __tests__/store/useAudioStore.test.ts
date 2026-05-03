import { migratePersistedAudioState } from "../../store/useAudioStore";

describe("migratePersistedAudioState", () => {
  it("migrates legacy playlist assetIds into trackIds and preserves settings", () => {
    const migrated = migratePersistedAudioState({
      likedIds: ["track-1"],
      playlists: [
        {
          id: 42,
          name: "Drive Mix",
          assetIds: ["track-1", "track-2"],
        },
      ],
      repeatMode: "all",
      playbackRate: 1.25,
      onlineSourcePreference: "local",
      crossfadeEnabled: true,
      crossfadeDurationSec: 5,
    });

    expect(migrated.likedIds).toEqual(["track-1"]);
    expect(migrated.playlists).toEqual([
      {
        id: "42",
        name: "Drive Mix",
        trackIds: ["track-1", "track-2"],
      },
    ]);
    expect(migrated.repeatMode).toBe("all");
    expect(migrated.playbackRate).toBe(1.25);
    expect(migrated.onlineSourcePreference).toBe("local");
    expect(migrated.crossfadeEnabled).toBe(true);
    expect(migrated.crossfadeDurationSec).toBe(5);
    expect(migrated.gaplessPlaybackEnabled).toBe(true);
  });

  it("falls back to safe defaults for malformed persisted values", () => {
    const migrated = migratePersistedAudioState({
      repeatMode: "broken",
      onlineSourcePreference: "invalid",
      crossfadeDurationSec: "slow",
    });

    expect(migrated.repeatMode).toBe("off");
    expect(migrated.onlineSourcePreference).toBe("both");
    expect(migrated.crossfadeDurationSec).toBe(3);
    expect(migrated.autoOpenPlayerOnPlay).toBe(true);
  });
});
