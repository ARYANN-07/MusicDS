'use client';

import { useState } from 'react';
import { Home, Search, Library, ListMusic, TrendingUp, Clock, Heart, Plus, LogOut, Music, Trash2, Download, Layers, Users, Type, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useMusic } from '@/lib/music-context';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'All Songs', icon: Library },
];

const sections = [
  { id: 'recommendations', label: 'For You', icon: ListMusic, ds: 'Fibonacci Heap' },
  { id: 'charts', label: 'Top Charts', icon: TrendingUp, ds: 'Red-Black Tree' },
  { id: 'recent', label: 'Recently Played', icon: Clock, ds: 'Splay Tree' },
  { id: 'liked', label: 'Liked Songs', icon: Heart, ds: 'DLL' },
];

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { currentUser, logout } = useAuth();
  const { playlists, createPlaylist, deletePlaylist } = useMusic();
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylist = async () => {
    if (newPlaylistName.trim()) {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowNewPlaylist(false);
    }
  };

  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col h-full pb-6">
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary-foreground" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </span>
          MusicDS
        </h1>
      </div>

      {/* User Info */}
      {currentUser && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {currentUser.username[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-foreground truncate flex-1">
              {currentUser.username}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth">
        {/* Main Navigation */}
        <nav className="px-3 mb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  activeSection === item.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-3 border-t border-sidebar-border" />

        {/* Sections with DS Labels */}
        <div className="px-3 py-3">
          <p className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Your Music
          </p>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                  activeSection === section.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon className={cn('w-5 h-5', section.id === 'liked' && activeSection === 'liked' ? 'fill-red-500 text-red-500' : '')} />
                <span className="flex-1 text-left">{section.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {section.ds}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-sidebar-border" />

        {/* Advanced DS Sections */}
        <div className="px-3 py-3">
          <p className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Advanced DS
          </p>
          {[
            { id: 'collab-queue', label: 'Collab Queue', icon: Users, ds: 'Pairing Heap' },
            { id: 'lyrics-search', label: 'Substring Search', icon: Type, ds: 'Suffix Array' },
            { id: 'play-queue', label: 'Play Next', icon: Layers, ds: 'Leftist Tree' },
            { id: 'shuffle', label: 'Shuffle Play', icon: Shuffle, ds: 'Treap' },
            { id: 'download-queue', label: 'Download Queue', icon: Download, ds: 'Binomial Heap' },
          ].map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                  activeSection === section.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{section.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {section.ds}
                </span>
              </button>
            );
          })}
        </div>

        {/* Playlists */}
        <div className="px-3 py-3">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Playlists
            </p>
            <button
              onClick={() => setShowNewPlaylist(!showNewPlaylist)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="New Playlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* New Playlist Input */}
          {showNewPlaylist && (
            <div className="px-3 mb-2">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
                  placeholder="Playlist name"
                  className="flex-1 px-2 py-1.5 bg-secondary border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button
                  onClick={handleCreatePlaylist}
                  className="px-2 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Playlist List */}
          {playlists.map((pl) => (
            <div key={pl.name} className="flex items-center group relative mb-1">
              <button
                onClick={() => onSectionChange(`playlist:${pl.name}`)}
                className={cn(
                  'flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeSection === `playlist:${pl.name}`
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Music className="w-4 h-4" />
                <span className="flex-1 text-left truncate">{pl.name}</span>
                <span className="text-[10px] text-muted-foreground mr-4 group-hover:hidden">{pl.songCount}</span>
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete playlist "${pl.name}"?`)) {
                    await deletePlaylist(pl.name);
                    if (activeSection === `playlist:${pl.name}`) {
                      onSectionChange('home');
                    }
                  }
                }}
                className="absolute right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Playlist"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {playlists.length === 0 && !showNewPlaylist && (
            <p className="px-3 text-xs text-muted-foreground">No playlists yet</p>
          )}
        </div>
      </div>

      {/* DS Info + Logout */}
      <div className="p-3 space-y-2 mt-auto">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
