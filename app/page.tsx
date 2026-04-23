'use client';

import { useState, useEffect } from 'react';
import { AudioProvider } from '@/lib/audio-context';
import { MusicProvider, useMusic } from '@/lib/music-context';
import { GenreSelection } from '@/components/genre-selection';
import { Sidebar } from '@/components/sidebar';
import { SearchBar } from '@/components/search-bar';
import { Player } from '@/components/player';
import { 
  RecommendationsSection, 
  TopChartsSection, 
  RecentlyPlayedSection,
  AllSongsSection 
} from '@/components/song-sections';
import { SongCard } from '@/components/song-card';

function MusicApp() {
  const { 
    hasOnboarded, 
    isLoading,
    selectedGenres,
    setSelectedGenres,
    completeOnboarding,
    allSongs,
    recommendations,
    topCharts,
    recentlyPlayed,
    searchResults,
    loadMoreSongs,
    refreshRecentlyPlayed,
    refreshTopCharts,
  } = useMusic();

  const [activeSection, setActiveSection] = useState('home');

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRecentlyPlayed();
      refreshTopCharts();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshRecentlyPlayed, refreshTopCharts]);

  // Handle onboarding
  const handleGenreSelection = async (genres: string[]) => {
    setSelectedGenres(genres);
    await completeOnboarding();
  };

  // Show genre selection if not onboarded
  if (!hasOnboarded) {
    return (
      <GenreSelection 
        onComplete={handleGenreSelection}
        isLoading={isLoading}
      />
    );
  }

  // Render main content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'search':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">Search</h1>
            <div className="mb-8">
              <SearchBar />
            </div>
            {searchResults.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">Results</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {searchResults.map((song) => (
                    <SongCard key={song.trackId} song={song} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'library':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">All Songs</h1>
            <AllSongsSection 
              songs={allSongs} 
              onLoadMore={loadMoreSongs}
              isLoading={isLoading}
            />
          </div>
        );

      case 'recommendations':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">Recommended For You</h1>
            <RecommendationsSection songs={recommendations} />
          </div>
        );

      case 'charts':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">Top Charts</h1>
            <TopChartsSection songs={topCharts} />
          </div>
        );

      case 'recent':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">Recently Played</h1>
            <RecentlyPlayedSection songs={recentlyPlayed} />
          </div>
        );

      default: // home
        return (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Good evening</h1>
                <p className="text-muted-foreground">
                  {selectedGenres.length} genre{selectedGenres.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <SearchBar />
            </div>

            {/* Recently Played Quick Access */}
            {recentlyPlayed.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4">Jump back in</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {recentlyPlayed.slice(0, 4).map((song) => (
                    <SongCard key={song.trackId} song={song} variant="compact" />
                  ))}
                </div>
              </section>
            )}

            {/* Recommendations */}
            <RecommendationsSection songs={recommendations.slice(0, 5)} />

            {/* Top Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopChartsSection songs={topCharts.slice(0, 5)} />
              <RecentlyPlayedSection songs={recentlyPlayed.slice(0, 5)} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>

        {/* Player */}
        <Player />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AudioProvider>
      <MusicProvider>
        <MusicApp />
      </MusicProvider>
    </AudioProvider>
  );
}
