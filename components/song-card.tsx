'use client';

import { Play, Pause } from 'lucide-react';
import { Song } from '@/lib/types';
import { useAudio } from '@/lib/audio-context';
import { cn } from '@/lib/utils';

interface SongCardProps {
  song: Song;
  showPlayCount?: boolean;
  rank?: number;
  variant?: 'default' | 'compact' | 'list';
}

export function SongCard({ song, showPlayCount, rank, variant = 'default' }: SongCardProps) {
  const { currentSong, isPlaying, playSong, togglePlay } = useAudio();
  const isCurrentSong = currentSong?.trackId === song.trackId;

  const handleClick = () => {
    if (isCurrentSong) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  if (variant === 'list') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-3 p-2 rounded-lg transition-colors group',
          isCurrentSong ? 'bg-primary/10' : 'hover:bg-accent'
        )}
      >
        {/* Rank or Play Button */}
        <div className="w-6 flex items-center justify-center">
          {rank !== undefined ? (
            <span className={cn(
              'text-sm font-medium',
              rank <= 3 ? 'text-primary' : 'text-muted-foreground'
            )}>
              {rank}
            </span>
          ) : (
            <div className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
              {isCurrentSong && isPlaying ? (
                <Pause className="w-4 h-4 text-primary" />
              ) : (
                <Play className="w-4 h-4 text-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Album Art */}
        <div className="relative w-10 h-10 flex-shrink-0">
          {song.artworkUrl100 ? (
            <img
              src={song.artworkUrl100}
              alt={song.trackName}
              className="w-full h-full rounded object-cover"
            />
          ) : (
            <div className="w-full h-full rounded bg-secondary" />
          )}
          {isCurrentSong && isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-primary animate-pulse" style={{ height: '40%' }} />
                <span className="w-0.5 bg-primary animate-pulse" style={{ height: '70%', animationDelay: '0.2s' }} />
                <span className="w-0.5 bg-primary animate-pulse" style={{ height: '50%', animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Song Info */}
        <div className="flex-1 min-w-0 text-left">
          <p className={cn(
            'text-sm font-medium truncate',
            isCurrentSong ? 'text-primary' : 'text-foreground'
          )}>
            {song.trackName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {song.artistName}
          </p>
        </div>

        {/* Play Count */}
        {showPlayCount && song.playCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {song.playCount.toLocaleString()} plays
          </span>
        )}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg transition-colors group',
          isCurrentSong ? 'bg-primary/10' : 'hover:bg-accent'
        )}
      >
        <div className="relative w-12 h-12 flex-shrink-0">
          {song.artworkUrl100 ? (
            <img
              src={song.artworkUrl100}
              alt={song.trackName}
              className="w-full h-full rounded object-cover"
            />
          ) : (
            <div className="w-full h-full rounded bg-secondary" />
          )}
          <div className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/50 rounded transition-opacity',
            isCurrentSong ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}>
            {isCurrentSong && isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </div>
        </div>
        <div className="min-w-0 text-left">
          <p className={cn(
            'text-sm font-medium truncate',
            isCurrentSong ? 'text-primary' : 'text-foreground'
          )}>
            {song.trackName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {song.artistName}
          </p>
        </div>
      </button>
    );
  }

  // Default card variant
  return (
    <button
      onClick={handleClick}
      className="group p-3 rounded-lg bg-card hover:bg-accent transition-colors text-left"
    >
      {/* Album Art */}
      <div className="relative aspect-square mb-3">
        {song.artworkUrl100 ? (
          <img
            src={song.artworkUrl100}
            alt={song.trackName}
            className="w-full h-full rounded-md object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-md bg-secondary" />
        )}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center bg-black/50 rounded-md transition-opacity',
          isCurrentSong && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
            {isCurrentSong && isPlaying ? (
              <Pause className="w-5 h-5 text-primary-foreground" />
            ) : (
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Song Info */}
      <p className={cn(
        'text-sm font-medium truncate',
        isCurrentSong ? 'text-primary' : 'text-foreground'
      )}>
        {song.trackName}
      </p>
      <p className="text-xs text-muted-foreground truncate">
        {song.artistName}
      </p>
    </button>
  );
}
