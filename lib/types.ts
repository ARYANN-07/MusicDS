// Core song type matching iTunes API response
export interface Song {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl100: string;
  primaryGenreName: string;
  trackTimeMillis: number;
  playCount?: number;
  lastPlayed?: number;
}

// Genre type for onboarding
export interface Genre {
  id: string;
  name: string;
  color: string;
}

// User preferences stored in AVL Tree
export interface UserPreferences {
  userId: string;
  selectedGenres: string[];
  volume: number;
  lastLogin: number;
}

// Search result for Trie autocomplete
export interface SearchSuggestion {
  type: 'song' | 'artist';
  value: string;
  trackId?: number;
}

// Play history entry for Splay Tree
export interface PlayHistoryEntry {
  trackId: number;
  timestamp: number;
  song: Song;
}

// Chart entry for Red-Black Tree
export interface ChartEntry {
  trackId: number;
  playCount: number;
  song: Song;
}

// Recommendation entry for Fibonacci Heap
export interface RecommendationEntry {
  trackId: number;
  score: number;
  song: Song;
}

// Available genres for selection
export const GENRES: Genre[] = [
  { id: 'pop', name: 'Pop', color: 'bg-pink-500' },
  { id: 'hip-hop', name: 'Hip-Hop', color: 'bg-orange-500' },
  { id: 'r-n-b', name: 'R&B', color: 'bg-purple-500' },
  { id: 'rock', name: 'Rock', color: 'bg-red-500' },
  { id: 'indie', name: 'Indie', color: 'bg-teal-500' },
  { id: 'electronic', name: 'Electronic', color: 'bg-blue-500' },
  { id: 'jazz', name: 'Jazz', color: 'bg-amber-500' },
  { id: 'classical', name: 'Classical', color: 'bg-slate-500' },
];

// iTunes API response type
export interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesTrack[];
}

export interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl100: string;
  primaryGenreName: string;
  trackTimeMillis: number;
}

// Convert iTunes track to our Song type
export function itunesTrackToSong(track: ITunesTrack): Song {
  return {
    trackId: track.trackId,
    trackName: track.trackName,
    artistName: track.artistName,
    collectionName: track.collectionName || 'Unknown Album',
    previewUrl: track.previewUrl,
    artworkUrl100: track.artworkUrl100?.replace('100x100', '400x400') || '',
    primaryGenreName: track.primaryGenreName,
    trackTimeMillis: track.trackTimeMillis || 30000,
    playCount: 0,
    lastPlayed: undefined,
  };
}
