'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Song, GENRES, UserPreferences } from './types';
import { searchSongs, getSongsByGenres, getPopularSongs } from './itunes-api';

// ─── Backend API helpers ────────────────────────────────────────────────────
// All data structure logic lives in the C++ backend (localhost:8080).
// These helpers call the Next.js proxy at /api/backend/...

async function backendGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/backend/${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function backendPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`/api/backend/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Context types ──────────────────────────────────────────────────────────

interface MusicContextType {
  selectedGenres: string[];
  hasOnboarded: boolean;
  isLoading: boolean;
  backendAvailable: boolean;

  allSongs: Song[];
  recommendations: Song[];
  topCharts: Song[];
  recentlyPlayed: Song[];   // Always [] — Splay Tree not yet implemented
  searchResults: Song[];

  setSelectedGenres: (genres: string[]) => void;
  completeOnboarding: () => Promise<void>;
  search: (query: string) => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  refreshTopCharts: () => Promise<void>;
  refreshRecentlyPlayed: () => void;   // no-op placeholder
  loadMoreSongs: () => Promise<void>;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
}

// ─── Provider ───────────────────────────────────────────────────────────────

const STORAGE_KEY_ONBOARDED = 'musicds_has_onboarded';
const STORAGE_KEY_GENRES    = 'musicds_genres';

export function MusicProvider({ children }: { children: ReactNode }) {
  const [selectedGenres, setSelectedGenresState] = useState<string[]>([]);
  const [hasOnboarded, setHasOnboarded]          = useState(true);
  const [isLoading, setIsLoading]                = useState(false);
  const [backendAvailable, setBackendAvailable]  = useState(false);

  const [allSongs, setAllSongs]               = useState<Song[]>([]);
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [topCharts, setTopCharts]             = useState<Song[]>([]);
  const [searchResults, setSearchResults]     = useState<Song[]>([]);

  // Splay Tree not yet implemented — recently played is always empty
  const recentlyPlayed: Song[] = [];

  // ── Check backend health on mount ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const health = await backendGet<{ status: string }>('api/health');
      setBackendAvailable(health?.status === 'ok');
    })();
  }, []);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onboarded = localStorage.getItem(STORAGE_KEY_ONBOARDED);
    setHasOnboarded(onboarded === 'true');

    const savedGenres = localStorage.getItem(STORAGE_KEY_GENRES);
    if (savedGenres) {
      try { setSelectedGenresState(JSON.parse(savedGenres)); } catch {}
    }
  }, []);

  // ── Fetch stored preferences from AVL Tree (C++) ─────────────────────────
  useEffect(() => {
    if (!backendAvailable) return;
    (async () => {
      const prefs = await backendGet<UserPreferences>('api/preferences/default');
      if (prefs?.selectedGenres?.length) {
        setSelectedGenresState(prefs.selectedGenres);
      }
    })();
  }, [backendAvailable]);

  // ── Refresh top charts from Red-Black Tree (C++) on mount ────────────────
  useEffect(() => {
    if (!backendAvailable) return;
    (async () => {
      const charts = await backendGet<{ song: Song }[]>('api/charts/top?limit=10');
      if (charts && charts.length > 0) {
        setTopCharts(charts.map(e => e.song));
      }
    })();
  }, [backendAvailable]);

  // ── Refresh recommendations from Fibonacci Heap (C++) on mount ───────────
  useEffect(() => {
    if (!backendAvailable) return;
    (async () => {
      const recs = await backendGet<{ song: Song }[]>('api/recommendations/top?limit=10');
      if (recs && recs.length > 0) {
        setRecommendations(recs.map(e => e.song));
      }
    })();
  }, [backendAvailable]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const setSelectedGenres = useCallback((genres: string[]) => {
    setSelectedGenresState(genres);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_GENRES, JSON.stringify(genres));
    }
    // Persist to AVL Tree (C++ backend)
    if (backendAvailable) {
      const prefs: UserPreferences = {
        userId: 'default',
        selectedGenres: genres,
        volume: 0.7,
        lastLogin: Date.now(),
      };
      backendPost('api/preferences', prefs);
    }
  }, [backendAvailable]);

  const completeOnboarding = useCallback(async () => {
    if (selectedGenres.length === 0) return;
    setIsLoading(true);

    try {
      // 1. Fetch genre songs from iTunes
      const songs = await getSongsByGenres(selectedGenres, 15);
      setAllSongs(songs);

      // 2. Add to Fibonacci Heap (C++ recommendations)
      if (backendAvailable) {
        for (const song of songs) {
          const genreBoost = selectedGenres.includes(song.primaryGenreName.toLowerCase()) ? 20 : 0;
          await backendPost('api/recommendations/add', {
            song,
            score: 50 + Math.random() * 30,
            genreBoost,
          });
        }
        const recs = await backendGet<{ song: Song }[]>('api/recommendations/top?limit=10');
        if (recs) setRecommendations(recs.map(e => e.song));
      }

      // 3. Fetch popular songs → Red-Black Tree (C++ top charts)
      const popular = await getPopularSongs(20);
      if (backendAvailable) {
        for (const song of popular) {
          const randomPlays = Math.floor(Math.random() * 100) + 1;
          for (let i = 0; i < randomPlays; i++) {
            await backendPost('api/charts/increment', { song });
          }
        }
        const charts = await backendGet<{ song: Song }[]>('api/charts/top?limit=10');
        if (charts) setTopCharts(charts.map(e => e.song));
      }

      // 4. Merge popular songs into allSongs
      const ids = new Set(songs.map(s => s.trackId));
      const extra = popular.filter(s => !ids.has(s.trackId));
      setAllSongs(prev => [...prev, ...extra]);

      // 5. Save preferences (AVL Tree)
      if (backendAvailable) {
        await backendPost('api/preferences', {
          userId: 'default',
          selectedGenres,
          volume: 0.7,
          lastLogin: Date.now(),
        });
      }

      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
      setHasOnboarded(true);
    } catch (err) {
      console.error('completeOnboarding error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenres, backendAvailable]);

  // Search — uses iTunes API only (Trie not yet implemented)
  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsLoading(true);
    try {
      const results = await searchSongs(query, 20);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshRecommendations = useCallback(async () => {
    if (!backendAvailable) return;
    const recs = await backendGet<{ song: Song }[]>('api/recommendations/top?limit=10');
    if (recs) setRecommendations(recs.map(e => e.song));
  }, [backendAvailable]);

  const refreshTopCharts = useCallback(async () => {
    if (!backendAvailable) return;
    const charts = await backendGet<{ song: Song }[]>('api/charts/top?limit=10');
    if (charts) setTopCharts(charts.map(e => e.song));
  }, [backendAvailable]);

  // Splay Tree not implemented — no-op
  const refreshRecentlyPlayed = useCallback(() => {}, []);

  const loadMoreSongs = useCallback(async () => {
    if (selectedGenres.length === 0) return;
    setIsLoading(true);
    try {
      const more = await getSongsByGenres(selectedGenres, 10);
      const ids  = new Set(allSongs.map(s => s.trackId));
      setAllSongs(prev => [...prev, ...more.filter(s => !ids.has(s.trackId))]);
    } catch (err) {
      console.error('loadMoreSongs error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenres, allSongs]);

  // Auto-reload if already onboarded
  useEffect(() => {
    if (hasOnboarded && allSongs.length === 0 && selectedGenres.length > 0) {
      completeOnboarding();
    }
  }, [hasOnboarded, allSongs.length, selectedGenres.length]);

  const value: MusicContextType = {
    selectedGenres,
    hasOnboarded,
    isLoading,
    backendAvailable,
    allSongs,
    recommendations,
    topCharts,
    recentlyPlayed,
    searchResults,
    setSelectedGenres,
    completeOnboarding,
    search,
    refreshRecommendations,
    refreshTopCharts,
    refreshRecentlyPlayed,
    loadMoreSongs,
  };

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}
