import { ITunesSearchResponse, Song, itunesTrackToSong } from './types';

const ITUNES_API_BASE = 'https://itunes.apple.com';

// Search for songs by term
export async function searchSongs(term: string, limit = 25): Promise<Song[]> {
  if (!term.trim()) return [];
  
  const url = `${ITUNES_API_BASE}/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch');
    
    const data: ITunesSearchResponse = await response.json();
    return data.results
      .filter(track => track.previewUrl) // Only include tracks with preview URLs
      .map(itunesTrackToSong);
  } catch (error) {
    console.error('iTunes search error:', error);
    return [];
  }
}

// Get songs by genre
export async function getSongsByGenre(genre: string, limit = 25): Promise<Song[]> {
  // iTunes doesn't have a direct genre search, so we search for genre name + popular terms
  const searchTerms = getGenreSearchTerms(genre);
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  return searchSongs(term, limit);
}

// Get multiple genres' songs
export async function getSongsByGenres(genres: string[], songsPerGenre = 10): Promise<Song[]> {
  const allSongs: Song[] = [];
  const seenIds = new Set<number>();
  
  for (const genre of genres) {
    const songs = await getSongsByGenre(genre, songsPerGenre);
    for (const song of songs) {
      if (!seenIds.has(song.trackId)) {
        seenIds.add(song.trackId);
        allSongs.push(song);
      }
    }
  }
  
  // Shuffle the results
  return shuffleArray(allSongs);
}

// Get popular/trending songs
export async function getPopularSongs(limit = 50): Promise<Song[]> {
  const popularTerms = [
    'top hits 2024',
    'popular songs',
    'chart hits',
    'trending music',
    'best songs',
  ];
  
  const term = popularTerms[Math.floor(Math.random() * popularTerms.length)];
  return searchSongs(term, limit);
}

// Helper: Get search terms for each genre
function getGenreSearchTerms(genre: string): string[] {
  const terms: Record<string, string[]> = {
    'pop': ['Taylor Swift', 'Dua Lipa', 'The Weeknd', 'Ed Sheeran', 'pop hits'],
    'hip-hop': ['Drake', 'Kendrick Lamar', 'Travis Scott', 'hip hop hits', 'rap'],
    'r-n-b': ['SZA', 'Frank Ocean', 'The Weeknd', 'r&b', 'soul music'],
    'rock': ['Foo Fighters', 'Arctic Monkeys', 'rock hits', 'alternative rock'],
    'indie': ['Tame Impala', 'Bon Iver', 'indie pop', 'indie rock'],
    'electronic': ['Calvin Harris', 'Daft Punk', 'electronic', 'EDM', 'house music'],
    'jazz': ['jazz', 'Miles Davis', 'John Coltrane', 'jazz piano'],
    'classical': ['classical', 'Beethoven', 'Mozart', 'piano classical'],
  };
  
  return terms[genre] || ['popular music'];
}

// Helper: Shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
