'use client';

import { useState, useEffect } from 'react';
import { AudioProvider, useAudio } from '@/lib/audio-context';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { MusicProvider, useMusic } from '@/lib/music-context';
import { LandingPage } from '@/components/landing-page';
import { GenreSelection } from '@/components/genre-selection';
import { Sidebar } from '@/components/sidebar';
import { SearchBar } from '@/components/search-bar';
import { Player } from '@/components/player';
import { 
  RecommendationsSection, 
  TopChartsSection, 
  RecentlyPlayedSection,
  AllSongsSection,
  SongSection,
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
    likedSongs,
    playlistSongs,
    currentPlaylistName,
    loadMoreSongs,
    refreshRecentlyPlayed,
    refreshTopCharts,
    loadPlaylist,
    // New DS features
    downloadQueue, addToDownloadQueue, popDownload, refreshDownloadQueue,
    playQueue, addToPlayQueue, popPlayQueue, refreshPlayQueue,
    collabQueue, voteForSong, refreshCollabQueue,
    suffixResults, suffixSearch,
    shuffledSongs, getShuffle, reRandomize,
    playlistVersions, undoPlaylist, refreshPlaylistHistory,
    trieNodeCount, refreshTrieStats,
    loadMoreRecommendations,
  } = useMusic();

  const { currentUser } = useAuth();
  const { useCollabQueue, toggleCollabQueue } = useAudio();

  const [activeSection, setActiveSection] = useState('home');
  const [suffixQuery, setSuffixQuery] = useState('');
  const [dlPriority, setDlPriority] = useState(1);
  const [pqPriority, setPqPriority] = useState(2);

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

  // Load playlist when section changes
  useEffect(() => {
    if (activeSection.startsWith('playlist:')) {
      const plName = activeSection.replace('playlist:', '');
      loadPlaylist(plName);
    }
  }, [activeSection, loadPlaylist]);

  // Show genre selection if not onboarded
  if (!hasOnboarded) {
    return (
      <GenreSelection 
        onComplete={handleGenreSelection}
        isLoading={isLoading}
      />
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
                    <SongCard key={song.trackId} song={song} contextSongs={searchResults} />
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
            <RecommendationsSection 
              songs={recommendations} 
              onLoadMore={loadMoreRecommendations}
              isLoading={isLoading}
            />
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

      case 'liked':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">Liked Songs</h1>
            <SongSection
              title=""
              songs={likedSongs}
              dsLabel="Bloom Filter + DLL"
              variant="list"
              emptyMessage="Like a song to see it here ❤️"
            />
          </div>
        );

      case 'download-queue':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Download Queue</h1>
                <p className="text-sm text-muted-foreground">Powered by Binomial Heap • {downloadQueue.length} songs queued</p>
              </div>
              <button onClick={popDownload} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Download Next
              </button>
            </div>
            {downloadQueue.length > 0 ? (
              <div className="space-y-2">
                {downloadQueue.map((song, i) => (
                  <div key={`${song.trackId}-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-xs font-bold text-primary w-6">#{i + 1}</span>
                    <img src={song.artworkUrl100} alt="" className="w-10 h-10 rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{song.trackName}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artistName}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">P:{(song as Record<string, unknown>)._priority as number ?? 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">Queue is empty. Add songs from the ⋮ menu on any song card!</p>
            )}
          </div>
        );

      case 'play-queue':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Priority Play Queue</h1>
                <p className="text-sm text-muted-foreground">Powered by Leftist Tree • {playQueue.length} songs</p>
              </div>
              <button onClick={popPlayQueue} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Play Next
              </button>
            </div>
            {playQueue.length > 0 ? (
              <div className="space-y-2">
                {playQueue.map((song, i) => {
                  const p = (song as Record<string, unknown>)._priority as number ?? 2;
                  const pLabel = p >= 3 ? 'High' : p >= 2 ? 'Medium' : 'Low';
                  const pColor = p >= 3 ? 'text-red-400' : p >= 2 ? 'text-yellow-400' : 'text-green-400';
                  return (
                    <div key={`${song.trackId}-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <span className="text-xs font-bold text-primary w-6">#{i + 1}</span>
                      <img src={song.artworkUrl100} alt="" className="w-10 h-10 rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{song.trackName}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artistName}</p>
                      </div>
                      <span className={`text-xs font-semibold ${pColor}`}>{pLabel}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">Play queue is empty.</p>
            )}
          </div>
        );

      case 'collab-queue':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Collaborative Queue</h1>
                <p className="text-sm text-muted-foreground">Powered by Pairing Heap • Vote to boost songs</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleCollabQueue} 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${useCollabQueue ? 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20' : 'bg-secondary text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/80'}`}
                >
                  Party Mode: {useCollabQueue ? 'ON' : 'OFF'}
                </button>
                <button onClick={refreshCollabQueue} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Refresh
                </button>
              </div>
            </div>
            {collabQueue.length > 0 ? (
              <div className="space-y-2">
                {collabQueue.map((song, i) => (
                  <div key={`${song.trackId}-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <span className="text-lg font-bold text-primary w-8">#{i + 1}</span>
                    <img src={song.artworkUrl100} alt="" className="w-10 h-10 rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{song.trackName}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artistName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{(song as Record<string, unknown>)._votes as number ?? 0} votes</span>
                      <button onClick={() => voteForSong(song)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors">
                        ↑ Vote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No songs voted yet. Vote from any song card!</p>
            )}
          </div>
        );

      case 'lyrics-search':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Substring Search</h1>
            <p className="text-sm text-muted-foreground mb-6">Powered by Suffix Array • Find songs containing any substring</p>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={suffixQuery}
                onChange={e => setSuffixQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && suffixSearch(suffixQuery)}
                placeholder="Type any substring (e.g. 'love', 'night')..."
                className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button onClick={() => suffixSearch(suffixQuery)} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Search
              </button>
            </div>
            {suffixResults.length > 0 ? (
              <div className="space-y-2">
                {suffixResults.map((song, i) => (
                  <SongCard key={`${song.trackId}-${i}`} song={song} variant="list" contextSongs={suffixResults} />
                ))}
              </div>
            ) : suffixQuery ? (
              <p className="text-muted-foreground text-center py-12">No results for &quot;{suffixQuery}&quot;</p>
            ) : (
              <p className="text-muted-foreground text-center py-12">Unlike prefix search (Trie), this finds text anywhere in the title or artist name</p>
            )}
          </div>
        );

      case 'shuffle':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Shuffle Play</h1>
                <p className="text-sm text-muted-foreground">Powered by Treap (BST + Random Heap) • {shuffledSongs.length} songs</p>
              </div>
              <div className="flex gap-2">
                <button onClick={getShuffle} className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                  Load Songs
                </button>
                <button onClick={reRandomize} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  ↻ Re-Shuffle
                </button>
              </div>
            </div>
            {shuffledSongs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {shuffledSongs.map((song, i) => (
                  <SongCard key={`${song.trackId}-${i}`} song={song} contextSongs={shuffledSongs} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">Click &quot;Load Songs&quot; to populate the Treap, then &quot;Re-Shuffle&quot; for a new random order!</p>
            )}
          </div>
        );

      default:
        // Check if it's a playlist view
        if (activeSection.startsWith('playlist:')) {
          const plName = activeSection.replace('playlist:', '');
          return (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{plName}</h1>
                  <p className="text-sm text-muted-foreground">Undo history powered by Skip List</p>
                </div>
                <button onClick={() => undoPlaylist(plName)} className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                  ↺ Undo Last Action
                </button>
              </div>
              <SongSection
                title=""
                songs={playlistSongs}
                dsLabel="Doubly Linked List"
                variant="list"
                emptyMessage="This playlist is empty. Add songs to get started!"
              />
            </div>
          );
        }

        // Home
        return (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {getGreeting()}{currentUser ? `, ${currentUser.username}` : ''}
                </h1>
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
                    <SongCard key={song.trackId} song={song} variant="compact" contextSongs={recentlyPlayed.slice(0, 4)} />
                  ))}
                </div>
              </section>
            )}

            {/* Recommendations */}
            <RecommendationsSection songs={recommendations.slice(0, 5)} />

            {/* Top Charts & Recently Played */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopChartsSection songs={topCharts.slice(0, 5)} />
              <RecentlyPlayedSection songs={recentlyPlayed.slice(0, 5)} />
            </div>

            {/* Liked Songs Preview */}
            {likedSongs.length > 0 && (
              <SongSection
                title="Liked Songs"
                songs={likedSongs.slice(0, 5)}
                dsLabel="Bloom Filter + DLL"
                variant="grid"
              />
            )}
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
        <main className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth">
          {renderContent()}
        </main>

        {/* Player */}
        <Player />
      </div>
    </div>
  );
}

function AppRouter() {
  const { isLoggedIn, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center animate-pulse">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-foreground" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LandingPage />;
  }

  return (
    <MusicProvider>
      <MusicApp />
    </MusicProvider>
  );
}

export default function Home() {
  return (
    <AudioProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </AudioProvider>
  );
}
