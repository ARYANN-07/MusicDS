'use client';

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/lib/audio-context';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function Player() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    setVolume,
  } = useAudio();

  if (!currentSong) {
    return (
      <div className="h-20 bg-card border-t border-border px-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No song playing</p>
      </div>
    );
  }

  return (
    <div className="h-20 bg-card border-t border-border px-4 flex items-center gap-4">
      {/* Song Info */}
      <div className="flex items-center gap-3 w-64 flex-shrink-0">
        {currentSong.artworkUrl100 ? (
          <img
            src={currentSong.artworkUrl100}
            alt={currentSong.trackName}
            className="w-14 h-14 rounded object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('400x400')) {
                target.src = target.src.replace('400x400', '100x100');
              }
            }}
          />
        ) : (
          <div className="w-14 h-14 rounded bg-secondary" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {currentSong.trackName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {currentSong.artistName}
          </p>
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex-1 flex flex-col items-center gap-1 max-w-xl">
        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={playPrevious}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous song"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-background" />
            ) : (
              <Play className="w-5 h-5 text-background ml-0.5" />
            )}
          </button>
          
          <button
            onClick={playNext}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next song"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 30}
            step={0.1}
            onValueChange={([value]) => seek(value)}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(duration || 30)}
          </span>
        </div>

        {/* DS Badge */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Next/Prev via Threaded BST
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <button
          onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
        >
          {volume === 0 ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
        <Slider
          value={[volume * 100]}
          max={100}
          step={1}
          onValueChange={([value]) => setVolume(value / 100)}
          className="flex-1"
        />
      </div>
    </div>
  );
}
