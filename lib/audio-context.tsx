'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { Song } from './types';
import { playlistBST } from './data-structures/threaded-bst';
// Splay Tree (recently played) — implemented in C++ backend
// Red-Black Tree (top charts) — implemented in C++ backend

interface AudioContextType {
  // Current state
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  
  // Playlist
  playlist: Song[];
  currentIndex: number;
  
  // Actions
  playSong: (song: Song) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaylist: (songs: Song[], startIndex?: number) => void;
  addToPlaylist: (song: Song) => void;
  playShuffled: (songs: Song[]) => Promise<void>;
  useCollabQueue: boolean;
  toggleCollabQueue: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [playlist, setPlaylistState] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const lastValidIndexRef = useRef<number>(-1);
  const [useCollabQueue, setUseCollabQueue] = useState(true);
  
  const toggleCollabQueue = useCallback(() => {
    setUseCollabQueue(prev => !prev);
  }, []);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });
      
      audioRef.current.addEventListener('error', (e) => {
        // Only log actual errors, not empty objects
        const target = e.target as HTMLAudioElement;
        if (target && target.error) {
          console.error('Audio error:', target.error.message || target.error.code);
        }
        setIsPlaying(false);
      });
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Internal play function
  const playSongInternal = useCallback((song: Song, index: number) => {
    if (!audioRef.current || !song.previewUrl) return;
    
    if (index >= 0) lastValidIndexRef.current = index;
    
    audioRef.current.src = song.previewUrl;
    audioRef.current.load();
    
    audioRef.current.play()
      .then(() => {
        setCurrentSong(song);
        setCurrentIndex(index);
        setIsPlaying(true);
        
        // Splay Tree: notify C++ backend to record history
        let username = '';
        try {
          const userStr = localStorage.getItem('musicds_current_user');
          if (userStr) username = JSON.parse(userStr).username;
        } catch (e) {}

        fetch('/api/backend/api/history/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song, username }),
        }).catch(() => { /* backend may not be running */ });

        // Red-Black Tree: notify C++ backend to increment play count
        fetch('/api/backend/api/charts/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song }),
        }).catch(() => { /* backend may not be running */ });
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          // Play request was interrupted by a new load request (user clicked next quickly)
          return;
        }
        console.error('Failed to play:', error);
        setIsPlaying(false);
      });
  }, []);

  // Play a specific song
  const playSong = useCallback((song: Song) => {
    // Find song in playlist or add it
    let index = playlistBST.getIndex(song.trackId);
    
    if (index === -1) {
      // Add to playlist
      index = playlistBST.insert(song);
      setPlaylistState(playlistBST.getAllSongs());
    }
    
    playSongInternal(song, index);
  }, [playSongInternal]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  }, [isPlaying]);

  // Pause
  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Resume
  const resume = useCallback(() => {
    if (audioRef.current && !isPlaying && currentSong) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  }, [isPlaying, currentSong]);

  // Play next song (Checks Leftist Tree Priority Queue first)
  const playNext = useCallback(async () => {
    // 1. Check Priority Queue (Leftist Tree)
    try {
      const res = await fetch('/api/backend/api/playqueue/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.song) {
          playSongInternal(data.song, -1); // -1 index means it came from priority queue
          return;
        }
      }
    } catch (e) {
      // Backend not running or queue empty, fallback to normal playlist
    }

    // 2. Check Collab Queue (Pairing Heap) if enabled
    if (useCollabQueue) {
      try {
        const res = await fetch('/api/backend/api/collab/pop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.song) {
            playSongInternal(data.song, -1); 
            return;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback to normal playlist queue
    let fallbackIdx = currentIndex >= 0 ? currentIndex : lastValidIndexRef.current;

    if (fallbackIdx < 0) {
      const firstSong = playlistBST.getFirst();
      if (firstSong) playSongInternal(firstSong, 0);
      return;
    }
    
    const nextSong = playlistBST.getNextByIndex(fallbackIdx);
    if (nextSong) {
      playSongInternal(nextSong, fallbackIdx + 1);
    } else {
      // Loop back to start
      const firstSong = playlistBST.getFirst();
      if (firstSong) {
        playSongInternal(firstSong, 0);
      }
    }
  }, [currentIndex, playSongInternal, useCollabQueue]);

  // Bind playNext to the audio ended event so it always uses the latest state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = playNext;
    }
  }, [playNext]);

  // Play previous song (using Threaded BST)
  const playPrevious = useCallback(() => {
    if (currentIndex < 0) return;
    
    // If more than 3 seconds in, restart current song
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      return;
    }
    
    const prevSong = playlistBST.getPrevByIndex(currentIndex);
    if (prevSong) {
      playSongInternal(prevSong, currentIndex - 1);
    } else {
      // Go to last song
      const lastSong = playlistBST.getLast();
      if (lastSong) {
        playSongInternal(lastSong, playlistBST.size - 1);
      }
    }
  }, [currentIndex, currentTime, playSongInternal]);

  // Seek to time
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    setVolumeState(clampedVolume);
  }, []);

  // Set playlist
  const setPlaylist = useCallback((songs: Song[], startIndex = 0) => {
    playlistBST.buildFromSongs(songs);
    setPlaylistState(songs);
    
    if (songs.length > 0 && startIndex >= 0 && startIndex < songs.length) {
      playSongInternal(songs[startIndex], startIndex);
    }
  }, [playSongInternal]);

  // Add song to playlist
  const addToPlaylist = useCallback((song: Song) => {
    if (!playlistBST.has(song.trackId)) {
      playlistBST.insert(song);
      setPlaylistState(playlistBST.getAllSongs());
    }
  }, []);

  // Play Shuffled using Treap
  const playShuffled = useCallback(async (songs: Song[]) => {
    if (!songs || songs.length === 0) return;
    try {
      await fetch('/api/backend/api/shuffle/clear', { method: 'DELETE' });
      for (const song of songs) {
        await fetch('/api/backend/api/shuffle/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song, score: Math.random() * 100 }),
        });
      }
      const res = await fetch(`/api/backend/api/shuffle/get?limit=${songs.length}`);
      if (res.ok) {
        const shuffled = await res.json();
        if (shuffled && shuffled.length > 0) {
          setPlaylist(shuffled, 0);
          return;
        }
      }
    } catch (e) {
      console.error('Shuffle failed:', e);
    }
    // Fallback if backend shuffle fails
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    setPlaylist(shuffled, 0);
  }, [setPlaylist]);

  const value: AudioContextType = {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playlist,
    currentIndex,
    playSong,
    togglePlay,
    pause,
    resume,
    playNext,
    playPrevious,
    seek,
    setVolume,
    setPlaylist,
    addToPlaylist,
    playShuffled,
    useCollabQueue,
    toggleCollabQueue
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}
