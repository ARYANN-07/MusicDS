'use client';

import { useState } from 'react';
import { GENRES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GenreSelectionProps {
  onComplete: (genres: string[]) => void;
  isLoading?: boolean;
}

export function GenreSelection({ onComplete, isLoading }: GenreSelectionProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleGenre = (genreId: string) => {
    setSelected(prev => 
      prev.includes(genreId)
        ? prev.filter(g => g !== genreId)
        : [...prev, genreId]
    );
  };

  const handleContinue = () => {
    if (selected.length > 0) {
      onComplete(selected);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">MusicDS</h1>
          <p className="text-muted-foreground">Data Structure Powered Music</p>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Pick what you like
        </h2>
        <p className="text-muted-foreground mb-8">
          Select at least one genre to personalize your experience
        </p>

        {/* Genre Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {GENRES.map((genre) => (
            <button
              key={genre.id}
              onClick={() => toggleGenre(genre.id)}
              className={cn(
                'relative p-4 rounded-lg font-medium transition-all duration-200',
                'border-2 hover:scale-105',
                selected.includes(genre.id)
                  ? 'border-primary bg-primary/20 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'
              )}
            >
              <span className="relative z-10">{genre.name}</span>
              {selected.includes(genre.id) && (
                <div className="absolute top-2 right-2">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* DS Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Preferences stored in AVL Tree
        </div>

        {/* Continue Button */}
        <div>
          <Button
            onClick={handleContinue}
            disabled={selected.length === 0 || isLoading}
            size="lg"
            className="w-full sm:w-auto px-12"
          >
            {isLoading ? 'Loading your music...' : `Continue with ${selected.length} genre${selected.length !== 1 ? 's' : ''}`}
          </Button>
        </div>

        {/* Selected count */}
        <p className="mt-4 text-sm text-muted-foreground">
          {selected.length === 0 
            ? 'Select genres to continue' 
            : `${selected.length} selected`}
        </p>
      </div>
    </div>
  );
}
