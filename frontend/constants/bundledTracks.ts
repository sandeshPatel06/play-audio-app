// Add bundled audio files here to include them even if MediaLibrary does not index them.
// Example:
// export const BUNDLED_SUGGESTED_TRACKS = [
//   { id: 'bundle-night-1', module: require('../assets/audio/suggested/night1.mp3'), filename: 'night1.mp3' },
// ];

export interface BundledTrack {
    id: string;
    module: number;
    filename: string;
}

export const BUNDLED_SUGGESTED_TRACKS: BundledTrack[] = [];
