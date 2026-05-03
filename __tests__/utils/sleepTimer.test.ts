import {
  DEFAULT_SLEEP_TIMER,
  createSleepTimerState,
  formatSleepTimerLabel,
  getRemainingSleepTimerMs,
  getSleepTimerVolume,
  isSleepTimerExpired,
} from "../../utils/sleepTimer";

describe("sleepTimer", () => {
  it("creates a timer window with the requested preset", () => {
    const sleepTimer = createSleepTimerState(30, 1_000, 120_000);

    expect(sleepTimer).toEqual({
      enabled: true,
      startedAt: 1_000,
      endsAt: 1_801_000,
      fadeWindowMs: 120_000,
      presetMinutes: 30,
    });
  });

  it("keeps full volume until fade window and then fades proportionally", () => {
    const sleepTimer = createSleepTimerState(10, 0, 120_000);

    expect(getSleepTimerVolume(sleepTimer, 300_000)).toBe(1);
    expect(getSleepTimerVolume(sleepTimer, 540_000)).toBeCloseTo(0.5, 3);
    expect(getSleepTimerVolume(sleepTimer, 600_000)).toBe(0);
  });

  it("formats labels and expiration safely", () => {
    const sleepTimer = createSleepTimerState(15, 0);

    expect(formatSleepTimerLabel(sleepTimer, 60_000)).toBe("14 min left");
    expect(getRemainingSleepTimerMs(sleepTimer, 60_000)).toBe(840_000);
    expect(isSleepTimerExpired(sleepTimer, 901_000)).toBe(true);
    expect(formatSleepTimerLabel(DEFAULT_SLEEP_TIMER)).toBe("Off");
  });
});
