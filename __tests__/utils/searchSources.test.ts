import { getSearchSourceState } from "../../utils/searchSources";

describe("getSearchSourceState", () => {
  it("shows only local results when local-only mode is selected", () => {
    const state = getSearchSourceState("lofi", true, "local");

    expect(state.trimmedQuery).toBe("lofi");
    expect(state.shouldShowLocalResults).toBe(true);
    expect(state.shouldShowOnlineResults).toBe(false);
    expect(state.shouldSearchOnline).toBe(false);
  });

  it("shows only online results when JioSaavn-only mode is selected", () => {
    const state = getSearchSourceState("lofi", true, "jiosaavn");

    expect(state.shouldShowLocalResults).toBe(false);
    expect(state.shouldShowOnlineResults).toBe(true);
    expect(state.shouldSearchOnline).toBe(true);
  });

  it("disables online search when native online mode is turned off", () => {
    const state = getSearchSourceState("lofi", false, "both");

    expect(state.shouldShowLocalResults).toBe(true);
    expect(state.shouldShowOnlineResults).toBe(false);
    expect(state.shouldSearchOnline).toBe(false);
  });
});
