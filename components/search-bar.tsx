'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMusic } from '@/lib/music-context';
import { useAudio } from '@/lib/audio-context';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onFocus?: () => void;
}

export function SearchBar({ onFocus }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { search, searchResults, isLoading } = useMusic();
  const { playSong } = useAudio();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        search(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    setIsOpen(true);
    onFocus?.();
  };

  const handleSelect = (song: typeof searchResults[0]) => {
    playSong(song);
    setIsOpen(false);
    setQuery('');
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search songs, artists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          className="pl-10 pr-10 bg-secondary border-none h-10 rounded-full"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {/* DS Notice */}
          <div className="px-3 py-2 border-b border-border bg-primary/5">
            <span className="text-xs text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Trie (autocomplete)
            </span>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              searchResults.map((song) => (
                <button
                  key={song.trackId}
                  onClick={() => handleSelect(song)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left'
                  )}
                >
                  {song.artworkUrl100 ? (
                    <img
                      src={song.artworkUrl100}
                      alt={song.trackName}
                      className="w-10 h-10 rounded object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src.includes('400x400')) {
                          target.src = target.src.replace('400x400', '100x100');
                        }
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                      <Search className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {song.trackName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {song.artistName}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
