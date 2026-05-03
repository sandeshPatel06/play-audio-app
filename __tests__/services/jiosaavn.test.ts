import { createJioSaavnClient, mapApiResponseToSong } from "../../services/jiosaavn";

const mockSongPayload = {
  id: "123",
  title: "Golden Hour",
  album: "Sunset Tapes",
  images: {
    "500x500": "https://img.example/cover.jpg",
  },
  more_info: {
    singers: "JVKE",
    vlink: "https://stream.example/song.mp3",
    year: "2022",
    language: "english",
  },
  perma_url: "https://example.com/song",
};

describe("jiosaavn service", () => {
  it("maps modern API payloads into a stable song shape", () => {
    expect(mapApiResponseToSong(mockSongPayload)).toEqual({
      id: "123",
      title: "Golden Hour",
      subtitle: "JVKE",
      artists: "JVKE",
      album: "Sunset Tapes",
      imageUrl: "https://img.example/cover.jpg",
      streamingUrl: "https://stream.example/song.mp3",
      duration: 0,
      year: "2022",
      language: "english",
      permaUrl: "https://example.com/song",
    });
  });

  it("searches, limits results, and converts songs into normalized audio tracks", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [mockSongPayload, { ...mockSongPayload, id: "124" }] }),
    });

    global.fetch = fetchMock as typeof fetch;

    const client = createJioSaavnClient("https://api.example");
    const result = await client.search("golden", 1);
    const track = client.toTrack(result.results[0]);

    expect(fetchMock).toHaveBeenCalledWith("https://api.example/search?query=golden&limit=1");
    expect(result.totalResults).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(track.source).toBe("jiosaavn");
    expect(track.uri).toBe("https://stream.example/song.mp3");
    expect(track.imageUrl).toBe("https://img.example/cover.jpg");
  });
});
