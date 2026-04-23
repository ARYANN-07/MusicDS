'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { Song } from './types';
import { playlistBST } from './data-structures/threaded-bst';
// Splay Tree (recently played) — NOT YET IMPLEMENTED in C++ backend
// Red-Black Tree (top charts) — lives in C++ backend, called via /api/backend/api/charts/increment

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
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        // Auto-play next song
        const nextSong = playlistBST.getNextByIndex(currentIndex);
        if (nextSong) {
          playSongInternal(nextSong, currentIndex + 1);
        }
      });
      
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
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
    
    audioRef.current.src = song.previewUrl;
    audioRef.current.load();
    
    audioRef.current.play()
      .then(() => {
        setCurrentSong(song);
        setCurrentIndex(index);
        setIsPlaying(true);
        
        // Splay Tree: not yet implemented — recently played tracking skipped
        // Red-Black Tree: notify C++ backend to increment play count
        fetch('/api/backend/api/charts/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song }),
        }).catch(() => { /* backend may not be running */ });
      })
      .catch((error) => {
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

  // Play next song (using Threaded BST)
  const playNext = useCallback(() => {
    if (currentIndex < 0) return;
    
    const nextSong = playlistBST.getNextByIndex(currentIndex);
    if (nextSong) {
      playSongInternal(nextSong, currentIndex + 1);
    } else {
      // Loop back to start
      const firstSong = playlistBST.getFirst();
      if (firstSong) {
        playSongInternal(firstSong, 0);
      }
    }
  }, [currentIndex, playSongInternal]);

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
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}
