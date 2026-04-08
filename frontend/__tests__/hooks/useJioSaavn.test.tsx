import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React, { PropsWithChildren } from "react";
import { useJioSaavnSearch } from "../../hooks/useJioSaavn";
import { jioSaavn } from "../../services/jiosaavn";

jest.mock("../../services/jiosaavn", () => {
  const actual = jest.requireActual("../../services/jiosaavn");

  return {
    ...actual,
    jioSaavn: {
      ...actual.jioSaavn,
      search: jest.fn(),
    },
  };
});

const mockedJioSaavn = jioSaavn as typeof jioSaavn & {
  search: jest.Mock;
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  const Wrapper = ({ children }: PropsWithChildren) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  return {
    Wrapper,
    queryClient,
  };
};

describe("useJioSaavnSearch", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("writes successful search results to AsyncStorage cache", async () => {
    mockedJioSaavn.search.mockResolvedValueOnce({
      results: [
        {
          id: "track-1",
          title: "Night Drive",
          subtitle: "Artist",
          artists: "Artist",
          album: "Album",
          imageUrl: "https://img.example/1.jpg",
          streamingUrl: "https://stream.example/1.mp3",
          duration: 120,
          year: "2024",
          language: "english",
          permaUrl: "https://example.com/1",
        },
      ],
      totalResults: 1,
    });

    const { Wrapper, queryClient } = createWrapper();
    const { result, unmount } = renderHook(() => useJioSaavnSearch("night"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.results).toHaveLength(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "play.jiosaavn.search.night",
      expect.stringContaining("\"track-1\"")
    );

    unmount();
    queryClient.clear();
  });

  it("falls back to cached search results when the network request fails", async () => {
    mockedJioSaavn.search.mockRejectedValueOnce(new Error("offline"));
    await AsyncStorage.setItem(
      "play.jiosaavn.search.lofi",
      JSON.stringify({
        value: [
          {
            id: "cached-1",
            title: "Cached Song",
            subtitle: "Artist",
            artists: "Artist",
            album: "Album",
            imageUrl: "https://img.example/cached.jpg",
            streamingUrl: "https://stream.example/cached.mp3",
            duration: 180,
            year: "2023",
            language: "english",
            permaUrl: "https://example.com/cached",
          },
        ],
        updatedAt: 123,
      })
    );

    const { Wrapper, queryClient } = createWrapper();
    const { result, unmount } = renderHook(() => useJioSaavnSearch("lofi"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual([
      {
        id: "cached-1",
        title: "Cached Song",
        subtitle: "Artist",
        artists: "Artist",
        album: "Album",
        imageUrl: "https://img.example/cached.jpg",
        streamingUrl: "https://stream.example/cached.mp3",
        duration: 180,
        year: "2023",
        language: "english",
        permaUrl: "https://example.com/cached",
      },
    ]);

    unmount();
    queryClient.clear();
  });
});
