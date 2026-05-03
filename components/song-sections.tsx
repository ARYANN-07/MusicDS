'use client';

import { SongCard } from './song-card';
import { Song } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAudio } from '@/lib/audio-context';
import { Shuffle } from 'lucide-react';

interface SectionProps {
  title: string;
  songs: Song[];
  dsLabel?: string;
  variant?: 'grid' | 'list';
  showPlayCount?: boolean;
  showRank?: boolean;
  emptyMessage?: string;
  className?: string;
  onLoadMore?: () => void;
  isLoading?: boolean;
}

export function SongSection({
  title,
  songs,
  dsLabel,
  variant = 'grid',
  showPlayCount,
  showRank,
  emptyMessage = 'No songs yet',
  className,
  onLoadMore,
  isLoading,
}: SectionProps) {
  const { playShuffled } = useAudio();
  return (
    <section className={cn('mb-8', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {songs.length > 0 && (
            <button
              onClick={() => playShuffled(songs)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors text-sm font-medium"
              title="Shuffle these songs (powered by Treap)"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle Play
            </button>
          )}
        </div>
        {dsLabel && (
          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {dsLabel}
          </span>
        )}
      </div>

      {/* Content */}
      {songs.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground bg-card rounded-lg">
          {emptyMessage}
        </div>
      ) : variant === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {songs.map((song) => (
            <SongCard key={song.trackId} song={song} contextSongs={songs} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg p-2">
          {songs.map((song, index) => (
            <SongCard
              key={song.trackId}
              song={song}
              variant="list"
              showPlayCount={showPlayCount}
              rank={showRank ? index + 1 : undefined}
              contextSongs={songs}
            />
          ))}
        </div>
      )}

      {onLoadMore && songs.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-2 bg-secondary text-foreground rounded-full hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </section>
  );
}

// Recommendations Section
interface RecommendationsSectionProps {
  songs: Song[];
  onLoadMore?: () => void;
  isLoading?: boolean;
}

export function RecommendationsSection({ songs, onLoadMore, isLoading }: RecommendationsSectionProps) {
  return (
    <SongSection
      title="Recommended For You"
      songs={songs}
      dsLabel="Fibonacci Heap"
      variant="grid"
      emptyMessage="Play some songs to get personalized recommendations"
      onLoadMore={onLoadMore}
      isLoading={isLoading}
    />
  );
}

// Top Charts Section
interface TopChartsSectionProps {
  songs: Song[];
}

export function TopChartsSection({ songs }: TopChartsSectionProps) {
  return (
    <SongSection
      title="Top Charts"
      songs={songs}
      dsLabel="Red-Black Tree"
      variant="list"
      showPlayCount
      showRank
      emptyMessage="Charts will appear as songs are played"
    />
  );
}

// Recently Played Section — Splay Tree
interface RecentlyPlayedSectionProps {
  songs: Song[];
}

export function RecentlyPlayedSection({ songs }: RecentlyPlayedSectionProps) {
  return (
    <SongSection
      title="Recently Played"
      songs={songs}
      dsLabel="Splay Tree"
      variant="grid"
      emptyMessage="Play a song to start building your history"
    />
  );
}

// All Songs Section
interface AllSongsSectionProps {
  songs: Song[];
  onLoadMore?: () => void;
  isLoading?: boolean;
}

export function AllSongsSection({ songs, onLoadMore, isLoading }: AllSongsSectionProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">All Songs</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          B+ Tree Index
        </span>
      </div>

      {songs.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground bg-card rounded-lg">
          No songs loaded yet
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {songs.map((song) => (
              <SongCard key={song.trackId} song={song} contextSongs={songs} />
            ))}
          </div>

          {onLoadMore && (
            <div className="mt-6 text-center">
              <button
                onClick={onLoadMore}
                disabled={isLoading}
                className="px-6 py-2 bg-secondary text-foreground rounded-full hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
