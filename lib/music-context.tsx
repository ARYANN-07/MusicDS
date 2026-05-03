'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Song, UserPreferences } from './types';
import { searchSongs, getSongsByGenres, getPopularSongs } from './itunes-api';
import { useAuth } from './auth-context';

// ─── Backend API helpers ────────────────────────────────────────────────────

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

interface PlaylistInfo {
  name: string;
  songCount: number;
}

interface MusicContextType {
  selectedGenres: string[];
  hasOnboarded: boolean;
  isLoading: boolean;
  backendAvailable: boolean;

  allSongs: Song[];
  recommendations: Song[];
  topCharts: Song[];
  recentlyPlayed: Song[];
  searchResults: Song[];
  likedSongs: Song[];
  playlists: PlaylistInfo[];
  playlistSongs: Song[];
  currentPlaylistName: string;

  setSelectedGenres: (genres: string[]) => void;
  completeOnboarding: () => Promise<void>;
  search: (query: string) => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  loadMoreRecommendations: () => Promise<void>;
  refreshTopCharts: () => Promise<void>;
  refreshRecentlyPlayed: () => Promise<void>;
  loadMoreSongs: () => Promise<void>;

  // Liked songs
  toggleLike: (song: Song) => Promise<void>;
  isLiked: (trackId: number) => boolean;
  refreshLikedSongs: () => Promise<void>;

  // Playlists
  createPlaylist: (name: string) => Promise<void>;
  addToPlaylist: (playlistName: string, song: Song) => Promise<void>;
  removeFromPlaylist: (playlistName: string, trackId: number) => Promise<void>;
  deletePlaylist: (playlistName: string) => Promise<void>;
  loadPlaylist: (playlistName: string) => Promise<void>;
  refreshPlaylists: () => Promise<void>;

  // Binomial Heap — Download Queue
  downloadQueue: Song[];
  addToDownloadQueue: (song: Song, priority?: number) => Promise<void>;
  popDownload: () => Promise<Song | null>;
  refreshDownloadQueue: () => Promise<void>;

  // Leftist Tree — Priority Play Queue
  playQueue: Song[];
  addToPlayQueue: (song: Song, priority?: number) => Promise<void>;
  popPlayQueue: () => Promise<Song | null>;
  refreshPlayQueue: () => Promise<void>;

  // Pairing Heap — Collaborative Queue
  collabQueue: Song[];
  voteForSong: (song: Song) => Promise<void>;
  refreshCollabQueue: () => Promise<void>;

  // Suffix Array — Substring Search
  suffixResults: Song[];
  suffixSearch: (query: string) => Promise<void>;

  // Treap — Shuffle
  shuffledSongs: Song[];
  getShuffle: () => Promise<void>;
  reRandomize: () => Promise<void>;

  // Skip List — Playlist History
  playlistVersions: { version: number; songCount: number }[];
  undoPlaylist: (playlistName: string) => Promise<void>;
  refreshPlaylistHistory: (playlistName: string) => Promise<void>;

  // Patricia Trie stats
  trieNodeCount: number;
  refreshTrieStats: () => Promise<void>;
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
  const { currentUser, isLoggedIn } = useAuth();
  const username = currentUser?.username || '';

  const [selectedGenres, setSelectedGenresState] = useState<string[]>([]);
  const [hasOnboarded, setHasOnboarded]          = useState(true);
  const [isLoading, setIsLoading]                = useState(false);
  const [backendAvailable, setBackendAvailable]  = useState(false);

  const [allSongs, setAllSongs]               = useState<Song[]>([]);
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [topCharts, setTopCharts]             = useState<Song[]>([]);
  const [searchResults, setSearchResults]     = useState<Song[]>([]);
  const [recentlyPlayed, setRecentlyPlayed]   = useState<Song[]>([]);
  const [likedSongs, setLikedSongs]           = useState<Song[]>([]);
  const [likedSet, setLikedSet]               = useState<Set<number>>(new Set());
  const [playlists, setPlaylists]             = useState<PlaylistInfo[]>([]);
  const [playlistSongs, setPlaylistSongs]     = useState<Song[]>([]);
  const [currentPlaylistName, setCurrentPlaylistName] = useState('');

  // New DS state
  const [downloadQueue, setDownloadQueue]     = useState<Song[]>([]);
  const [playQueue, setPlayQueue]             = useState<Song[]>([]);
  const [collabQueue, setCollabQueue]         = useState<Song[]>([]);
  const [suffixResults, setSuffixResults]     = useState<Song[]>([]);
  const [shuffledSongs, setShuffledSongs]     = useState<Song[]>([]);
  const [playlistVersions, setPlaylistVersions] = useState<{version:number;songCount:number}[]>([]);
  const [trieNodeCount, setTrieNodeCount]     = useState(0);

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
      try { setSelectedGenresState(JSON.parse(savedGenres)); } catch { /* ignore */ }
    }
  }, []);

  // ── Load user data when logged in ─────────────────────────────────────────
  useEffect(() => {
    if (!backendAvailable || !isLoggedIn || !username) return;

    (async () => {
      // Preferences from AVL Tree
      const prefs = await backendGet<UserPreferences>(`api/preferences/${username}`);
      let currentGenres: string[] = [];
      if (prefs?.selectedGenres?.length) {
        setSelectedGenresState(prefs.selectedGenres);
        currentGenres = prefs.selectedGenres;
        setHasOnboarded(true);
      } else {
        // Check B+ Tree user record for saved genres
        const user = await backendGet<{ selectedGenres: string[] }>(`api/auth/user/${username}`);
        if (user?.selectedGenres?.length) {
          setSelectedGenresState(user.selectedGenres);
          currentGenres = user.selectedGenres;
          setHasOnboarded(true);
        } else {
          setHasOnboarded(false);
          setSelectedGenresState([]);
          localStorage.removeItem(STORAGE_KEY_ONBOARDED);
          localStorage.removeItem(STORAGE_KEY_GENRES);
        }
      }

      // Top charts from Red-Black Tree
      const charts = await backendGet<{ song: Song }[]>('api/charts/top?limit=10');
      if (charts && charts.length > 0) setTopCharts(charts.map(e => e.song));

      // Recommendations from Fibonacci Heap
      let recs = await backendGet<{ song: Song }[]>('api/recommendations/top?limit=10');
      
      // Auto-regenerate recommendations if the heap is empty (e.g. after server restart)
      if ((!recs || recs.length === 0) && currentGenres.length > 0) {
        try {
          const songs = await getSongsByGenres(currentGenres, 15);
          for (const song of songs) {
            const genreBoost = currentGenres.includes(song.primaryGenreName.toLowerCase()) ? 20 : 0;
            await backendPost('api/recommendations/add', {
              song,
              score: 50 + Math.random() * 30,
              genreBoost,
            });
          }
          recs = await backendGet<{ song: Song }[]>('api/recommendations/top?limit=10');
        } catch (e) {
          console.error('Failed to regenerate recommendations on login', e);
        }
      }

      if (recs && recs.length > 0) setRecommendations(recs.map(e => e.song));

      // Recently played from Splay Tree
      const recent = await backendGet<{ song: Song }[]>('api/history/recent?limit=10');
      if (recent && recent.length > 0) setRecentlyPlayed(recent.map(e => e.song));

      // Liked songs
      const liked = await backendGet<Song[]>(`api/liked/${username}`);
      if (liked) {
        setLikedSongs(liked);
        setLikedSet(new Set(liked.map(s => s.trackId)));
      }

      // Playlists
      const pls = await backendGet<PlaylistInfo[]>(`api/playlists/${username}`);
      if (pls) setPlaylists(pls);

      // Auto-populate allSongs and Search Indexes if empty (fresh session)
      if (currentGenres.length > 0) {
        try {
          const baseSongs = await getSongsByGenres(currentGenres, 30);
          setAllSongs(baseSongs);
          // Re-index to ensure Search and Substring Search work immediately
          backendPost('api/search/index', { songs: baseSongs }).catch(() => {});
          backendPost('api/search/index-compressed', { songs: baseSongs }).catch(() => {});
          backendPost('api/lyrics/index', { songs: baseSongs }).catch(() => {});
        } catch (e) {
          console.error('Failed to populate base songs', e);
        }
      }
    })();
  }, [backendAvailable, isLoggedIn, username]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const setSelectedGenres = useCallback((genres: string[]) => {
    setSelectedGenresState(genres);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_GENRES, JSON.stringify(genres));
    }
    if (backendAvailable && username) {
      const prefs: UserPreferences = {
        userId: username,
        selectedGenres: genres,
        volume: 0.7,
        lastLogin: Date.now(),
      };
      backendPost('api/preferences', prefs);
    }
  }, [backendAvailable, username]);

  const completeOnboarding = useCallback(async () => {
    if (selectedGenres.length === 0) return;
    setIsLoading(true);

    try {
      const songs = await getSongsByGenres(selectedGenres, 15);
      setAllSongs(songs);

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

      const ids = new Set(songs.map(s => s.trackId));
      const extra = popular.filter(s => !ids.has(s.trackId));
      const finalSongs = [...songs, ...extra];
      setAllSongs(finalSongs);

      if (backendAvailable) {
        await backendPost('api/search/index', { songs: finalSongs });
        // Index into Patricia Trie, Suffix Array, and Treap
        await backendPost('api/search/index-compressed', { songs: finalSongs });
        await backendPost('api/lyrics/index', { songs: finalSongs });
        for (const song of finalSongs) {
          await backendPost('api/shuffle/add', { song, score: 50 + Math.random() * 50 });
        }
      }

      if (backendAvailable && username) {
        await backendPost('api/preferences', {
          userId: username,
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
  }, [selectedGenres, backendAvailable, username]);

  // Search — Trie with iTunes fallback
  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsLoading(true);
    try {
      if (backendAvailable) {
        const localResults = await backendGet<Song[]>(`api/search/autocomplete?q=${encodeURIComponent(query)}&limit=10`);
        if (localResults && localResults.length > 0) {
          setSearchResults(localResults);
          setIsLoading(false);
          return;
        }
      }
      const results = await searchSongs(query, 20);
      setSearchResults(results);
      if (backendAvailable && results.length > 0) {
        backendPost('api/search/index', { songs: results }).catch(() => {});
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [backendAvailable]);

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

  const refreshRecentlyPlayed = useCallback(async () => {
    if (!backendAvailable || !username) return;
    const recent = await backendGet<{ song: Song }[]>(`api/history/recent?username=${encodeURIComponent(username)}&limit=10`);
    if (recent) setRecentlyPlayed(recent.map(e => e.song));
  }, [backendAvailable, username]);

  const loadMoreRecommendations = useCallback(async () => {
    if (selectedGenres.length === 0 || !backendAvailable) return;
    setIsLoading(true);
    try {
      // Fetch fresh songs and score them
      const songs = await getSongsByGenres(selectedGenres, 15);
      for (const song of songs) {
        const genreBoost = selectedGenres.includes(song.primaryGenreName.toLowerCase()) ? 20 : 0;
        await backendPost('api/recommendations/add', {
          song,
          score: 50 + Math.random() * 30,
          genreBoost,
        });
      }
      // Get an expanded top list (add 10 to current size, max 50)
      const newLimit = Math.min(recommendations.length + 10, 50);
      const recs = await backendGet<{ song: Song }[]>(`api/recommendations/top?limit=${newLimit}`);
      if (recs) setRecommendations(recs.map(e => e.song));
    } catch (err) {
      console.error('loadMoreRecommendations error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenres, backendAvailable, recommendations.length]);

  const loadMoreSongs = useCallback(async () => {
    if (selectedGenres.length === 0) return;
    setIsLoading(true);
    try {
      const more = await getSongsByGenres(selectedGenres, 10);
      const ids  = new Set(allSongs.map(s => s.trackId));
      const newSongs = more.filter(s => !ids.has(s.trackId));
      const updatedSongs = [...allSongs, ...newSongs];
      
      setAllSongs(updatedSongs);
      
      if (backendAvailable && newSongs.length > 0) {
        // Tries can handle incremental insertions
        backendPost('api/search/index', { songs: newSongs }).catch(() => {});
        backendPost('api/search/index-compressed', { songs: newSongs }).catch(() => {});
        
        // Suffix Array needs all songs to rebuild the index
        backendPost('api/lyrics/index', { songs: updatedSongs }).catch(() => {});
        
        for (const song of newSongs) {
          backendPost('api/shuffle/add', { song, score: 50 + Math.random() * 50 }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('loadMoreSongs error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenres, allSongs, backendAvailable]);

  // ── Liked songs ───────────────────────────────────────────────────────────

  const isLiked = useCallback((trackId: number) => {
    return likedSet.has(trackId);
  }, [likedSet]);

  const toggleLike = useCallback(async (song: Song) => {
    if (!backendAvailable || !username) return;
    const result = await backendPost<{ ok: boolean; liked: boolean }>('api/liked/toggle', {
      username,
      song,
    });
    if (result) {
      if (result.liked) {
        setLikedSongs(prev => [song, ...prev]);
        setLikedSet(prev => new Set([...prev, song.trackId]));
      } else {
        setLikedSongs(prev => prev.filter(s => s.trackId !== song.trackId));
        setLikedSet(prev => { const next = new Set(prev); next.delete(song.trackId); return next; });
      }
    }
  }, [backendAvailable, username]);

  const refreshLikedSongs = useCallback(async () => {
    if (!backendAvailable || !username) return;
    const liked = await backendGet<Song[]>(`api/liked/${username}`);
    if (liked) {
      setLikedSongs(liked);
      setLikedSet(new Set(liked.map(s => s.trackId)));
    }
  }, [backendAvailable, username]);

  // ── Playlists ─────────────────────────────────────────────────────────────

  const refreshPlaylists = useCallback(async () => {
    if (!backendAvailable || !username) return;
    const pls = await backendGet<PlaylistInfo[]>(`api/playlists/${username}`);
    if (pls) setPlaylists(pls);
  }, [backendAvailable, username]);

  const createPlaylist = useCallback(async (name: string) => {
    if (!backendAvailable || !username) return;
    await backendPost('api/playlists/create', { username, name });
    await refreshPlaylists();
  }, [backendAvailable, username, refreshPlaylists]);

  const addToPlaylist = useCallback(async (playlistName: string, song: Song) => {
    if (!backendAvailable || !username) return;
    await backendPost('api/playlists/add', { username, playlistName, song });
    await refreshPlaylists();
    if (currentPlaylistName === playlistName) {
      const songs = await backendGet<Song[]>(`api/playlists/${username}/${playlistName}`);
      if (songs) setPlaylistSongs(songs);
    }
  }, [backendAvailable, username, refreshPlaylists, currentPlaylistName]);

  const removeFromPlaylist = useCallback(async (playlistName: string, trackId: number) => {
    if (!backendAvailable || !username) return;
    await backendPost('api/playlists/remove', { username, playlistName, trackId });
    await refreshPlaylists();
    if (currentPlaylistName === playlistName) {
      setPlaylistSongs(prev => prev.filter(s => s.trackId !== trackId));
    }
  }, [backendAvailable, username, refreshPlaylists, currentPlaylistName]);

  const deletePlaylist = useCallback(async (playlistName: string) => {
    if (!backendAvailable || !username) return;
    await backendPost('api/playlists/delete', { username, playlistName });
    await refreshPlaylists();
    if (currentPlaylistName === playlistName) {
      setCurrentPlaylistName('');
      setPlaylistSongs([]);
    }
  }, [backendAvailable, username, refreshPlaylists, currentPlaylistName]);

  const loadPlaylist = useCallback(async (playlistName: string) => {
    if (!backendAvailable || !username) return;
    setCurrentPlaylistName(playlistName);
    const songs = await backendGet<Song[]>(`api/playlists/${username}/${playlistName}`);
    if (songs) setPlaylistSongs(songs);
  }, [backendAvailable, username]);

  // Auto-reload if already onboarded
  useEffect(() => {
    if (hasOnboarded && allSongs.length === 0 && selectedGenres.length > 0 && isLoggedIn) {
      completeOnboarding();
    }
  }, [hasOnboarded, allSongs.length, selectedGenres.length, isLoggedIn]);

  // ── Binomial Heap — Download Queue ────────────────────────────────────────

  const refreshDownloadQueue = useCallback(async () => {
    if (!backendAvailable) return;
    const q = await backendGet<Song[]>('api/download/queue?limit=50');
    if (q) setDownloadQueue(q);
  }, [backendAvailable]);

  const addToDownloadQueue = useCallback(async (song: Song, priority = 1) => {
    if (!backendAvailable) return;
    await backendPost('api/download/add', { song, priority });
    await refreshDownloadQueue();
  }, [backendAvailable, refreshDownloadQueue]);

  const popDownload = useCallback(async (): Promise<Song | null> => {
    if (!backendAvailable) return null;
    const r = await backendPost<{ ok: boolean; song: Song }>('api/download/next', {});
    if (r?.ok) { await refreshDownloadQueue(); return r.song; }
    return null;
  }, [backendAvailable, refreshDownloadQueue]);

  // ── Leftist Tree — Priority Play Queue ────────────────────────────────────

  const refreshPlayQueue = useCallback(async () => {
    if (!backendAvailable) return;
    const q = await backendGet<Song[]>('api/playqueue?limit=50');
    if (q) setPlayQueue(q);
  }, [backendAvailable]);

  const addToPlayQueue = useCallback(async (song: Song, priority = 2) => {
    if (!backendAvailable) return;
    await backendPost('api/playqueue/add', { song, priority });
    await refreshPlayQueue();
  }, [backendAvailable, refreshPlayQueue]);

  const popPlayQueue = useCallback(async (): Promise<Song | null> => {
    if (!backendAvailable) return null;
    const r = await backendPost<{ ok: boolean; song: Song }>('api/playqueue/next', {});
    if (r?.ok) { await refreshPlayQueue(); return r.song; }
    return null;
  }, [backendAvailable, refreshPlayQueue]);

  // ── Pairing Heap — Collaborative Queue ────────────────────────────────────

  const refreshCollabQueue = useCallback(async () => {
    if (!backendAvailable) return;
    const q = await backendGet<Song[]>('api/collab/queue?limit=50');
    if (q) setCollabQueue(q);
  }, [backendAvailable]);

  const voteForSong = useCallback(async (song: Song) => {
    if (!backendAvailable) return;
    await backendPost('api/collab/vote', { song });
    await refreshCollabQueue();
  }, [backendAvailable, refreshCollabQueue]);

  // ── Suffix Array — Substring Search ───────────────────────────────────────

  const suffixSearch = useCallback(async (query: string) => {
    if (!backendAvailable || !query.trim()) { setSuffixResults([]); return; }
    const r = await backendGet<Song[]>(`api/lyrics/search?q=${encodeURIComponent(query)}&limit=20`);
    if (r) setSuffixResults(r);
  }, [backendAvailable]);

  // ── Treap — Shuffle ───────────────────────────────────────────────────────

  const getShuffle = useCallback(async () => {
    if (!backendAvailable || allSongs.length === 0) return;
    
    // Pick up to 20 random songs from allSongs
    const shuffledCopy = [...allSongs].sort(() => Math.random() - 0.5);
    const sample = shuffledCopy.slice(0, 20);

    // Load them into the Treap
    await fetch('/api/backend/api/shuffle/clear', { method: 'DELETE' });
    for (const song of sample) {
      await fetch('/api/backend/api/shuffle/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song, score: Math.random() * 100 }),
      });
    }

    // Retrieve from Treap
    const r = await backendGet<Song[]>('api/shuffle/get?limit=20');
    if (r) setShuffledSongs(r);
  }, [backendAvailable, allSongs]);

  const reRandomize = useCallback(async () => {
    if (!backendAvailable) return;
    await backendPost('api/shuffle/rerandomize', {});
    await getShuffle();
  }, [backendAvailable, getShuffle]);

  // ── Skip List — Playlist History ──────────────────────────────────────────

  const refreshPlaylistHistory = useCallback(async (playlistName: string) => {
    if (!backendAvailable || !username) return;
    const r = await backendGet<{ versions: {version:number;songCount:number}[] }>(`api/playlists/history/${username}/${playlistName}`);
    if (r?.versions) setPlaylistVersions(r.versions);
  }, [backendAvailable, username]);

  const undoPlaylist = useCallback(async (playlistName: string) => {
    if (!backendAvailable || !username) return;
    const r = await backendPost<{ ok: boolean; songs: Song[] }>(`api/playlists/undo/${username}/${playlistName}`, {});
    if (r?.ok && currentPlaylistName === playlistName) {
      setPlaylistSongs(r.songs);
    }
    await refreshPlaylists();
    await refreshPlaylistHistory(playlistName);
  }, [backendAvailable, username, currentPlaylistName, refreshPlaylists, refreshPlaylistHistory]);

  // ── Patricia Trie Stats ───────────────────────────────────────────────────

  const refreshTrieStats = useCallback(async () => {
    if (!backendAvailable) return;
    const r = await backendGet<{ nodeCount: number }>('api/search/trie-stats');
    if (r) setTrieNodeCount(r.nodeCount);
  }, [backendAvailable]);

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
    likedSongs,
    playlists,
    playlistSongs,
    currentPlaylistName,
    setSelectedGenres,
    completeOnboarding,
    search,
    refreshRecommendations,
    loadMoreRecommendations,
    refreshTopCharts,
    refreshRecentlyPlayed,
    loadMoreSongs,
    toggleLike,
    isLiked,
    refreshLikedSongs,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    deletePlaylist,
    loadPlaylist,
    refreshPlaylists,
    downloadQueue,
    addToDownloadQueue,
    popDownload,
    refreshDownloadQueue,
    playQueue,
    addToPlayQueue,
    popPlayQueue,
    refreshPlayQueue,
    collabQueue,
    voteForSong,
    refreshCollabQueue,
    suffixResults,
    suffixSearch,
    shuffledSongs,
    getShuffle,
    reRandomize,
    playlistVersions,
    undoPlaylist,
    refreshPlaylistHistory,
    trieNodeCount,
    refreshTrieStats,
  };

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}
