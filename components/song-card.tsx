'use client';

import { Play, Pause, Heart, MoreVertical, Plus, ListMusic, Trash2, Download, ArrowUpCircle, Layers } from 'lucide-react';
import { Song } from '@/lib/types';
import { useAudio } from '@/lib/audio-context';
import { useMusic } from '@/lib/music-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface SongCardProps {
  song: Song;
  showPlayCount?: boolean;
  rank?: number;
  variant?: 'default' | 'compact' | 'list';
  contextSongs?: Song[];
}

export function SongCard({ song, showPlayCount, rank, variant = 'default', contextSongs }: SongCardProps) {
  const { currentSong, isPlaying, playSong, togglePlay, addToPlaylist: addToQueue, setPlaylist } = useAudio();
  const { isLiked, toggleLike, playlists, addToPlaylist, removeFromPlaylist, currentPlaylistName, addToDownloadQueue, addToPlayQueue, voteForSong } = useMusic();
  const isCurrentSong = currentSong?.trackId === song.trackId;
  const liked = isLiked(song.trackId);

  const handleClick = () => {
    if (isCurrentSong) {
      togglePlay();
    } else {
      if (contextSongs) {
        const index = contextSongs.findIndex(s => s.trackId === song.trackId);
        if (index !== -1) {
          setPlaylist(contextSongs, index);
        } else {
          playSong(song);
        }
      } else {
        playSong(song);
      }
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
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('400x400')) {
                  target.src = target.src.replace('400x400', '100x100');
                }
              }}
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

        {/* Like Button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
          className="ml-1 p-1 rounded-full hover:bg-secondary transition-colors"
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart className={cn('w-4 h-4', liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
        </button>

        {/* Options Menu */}
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 ml-1 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 scrollbar-hide" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); addToQueue(song); }}>
                <ListMusic className="mr-2 w-4 h-4" /> Add to Queue
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); addToPlayQueue(song); }}>
                <Layers className="mr-2 w-4 h-4" /> Add to Priority Play
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); addToDownloadQueue(song); }}>
                <Download className="mr-2 w-4 h-4" /> Add to Download Queue
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); voteForSong(song); }}>
                <ArrowUpCircle className="mr-2 w-4 h-4" /> Vote in Collab Queue
              </DropdownMenuItem>
              {playlists.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Plus className="mr-2 w-4 h-4" /> Add to Playlist
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="scrollbar-hide overflow-y-auto max-h-64">
                    {playlists.map((pl) => (
                      <DropdownMenuItem key={pl.name} onSelect={(e) => { e.stopPropagation(); addToPlaylist(pl.name, song); }}>
                        {pl.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {currentPlaylistName && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); removeFromPlaylist(currentPlaylistName, song.trackId); }} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 w-4 h-4" /> Remove from Playlist
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('400x400')) {
                  target.src = target.src.replace('400x400', '100x100');
                }
              }}
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
        <div className="min-w-0 text-left flex-1">
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
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
          className="p-1 rounded-full hover:bg-secondary transition-colors"
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart className={cn('w-4 h-4', liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
        </button>

        {/* Options Menu */}
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 ml-1 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 scrollbar-hide" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); addToQueue(song); }}>
                <ListMusic className="mr-2 w-4 h-4" /> Add to Queue
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); addToPlayQueue(song); }}>
                <Layers className="mr-2 w-4 h-4" /> Add to Priority Play
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); addToDownloadQueue(song); }}>
                <Download className="mr-2 w-4 h-4" /> Add to Download Queue
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); voteForSong(song); }}>
                <ArrowUpCircle className="mr-2 w-4 h-4" /> Vote in Collab Queue
              </DropdownMenuItem>
              {playlists.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Plus className="mr-2 w-4 h-4" /> Add to Playlist
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="scrollbar-hide overflow-y-auto max-h-64">
                    {playlists.map((pl) => (
                      <DropdownMenuItem key={pl.name} onSelect={(e) => { e.stopPropagation(); addToPlaylist(pl.name, song); }}>
                        {pl.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {currentPlaylistName && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); removeFromPlaylist(currentPlaylistName, song.trackId); }} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 w-4 h-4" /> Remove from Playlist
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('400x400')) {
                target.src = target.src.replace('400x400', '100x100');
              }
            }}
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
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
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
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
          className="ml-1 p-1 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart className={cn('w-4 h-4', liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
        </button>

        {/* Options Menu */}
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 ml-1 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 scrollbar-hide" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); addToQueue(song); }}>
                <ListMusic className="mr-2 w-4 h-4" /> Add to Queue
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); addToPlayQueue(song); }}>
                <Layers className="mr-2 w-4 h-4" /> Add to Priority Play
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); addToDownloadQueue(song); }}>
                <Download className="mr-2 w-4 h-4" /> Add to Download Queue
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); voteForSong(song); }}>
                <ArrowUpCircle className="mr-2 w-4 h-4" /> Vote in Collab Queue
              </DropdownMenuItem>
              {playlists.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Plus className="mr-2 w-4 h-4" /> Add to Playlist
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="scrollbar-hide overflow-y-auto max-h-64">
                    {playlists.map((pl) => (
                      <DropdownMenuItem key={pl.name} onSelect={(e) => { e.stopPropagation(); addToPlaylist(pl.name, song); }}>
                        {pl.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {currentPlaylistName && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); removeFromPlaylist(currentPlaylistName, song.trackId); }} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 w-4 h-4" /> Remove from Playlist
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </button>
  );
}
