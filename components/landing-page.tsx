'use client';

import { useState } from 'react';
import { AuthModal } from './auth-modal';

export function LandingPage() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary-foreground" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </span>
          <span className="text-xl font-bold text-foreground">MusicDS</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAuthMode('login')}
            className="px-5 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => setAuthMode('signup')}
            className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-sm text-muted-foreground mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Powered by 14 Hand-Coded Data Structures
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-foreground tracking-tight leading-tight mb-6">
            Music Streaming,{' '}
            <span className="text-primary">Reimagined</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Experience a highly efficient music app where every feature — from search to recommendations — 
            is built from scratch using advanced data structures.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <button
              onClick={() => setAuthMode('signup')}
              className="px-8 py-3.5 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-all hover:scale-105"
            >
              Get Started — It&apos;s Free
            </button>
            <button
              onClick={() => setAuthMode('login')}
              className="px-8 py-3.5 text-sm font-semibold border border-border text-foreground rounded-full hover:bg-secondary transition-all hover:scale-105"
            >
              I Have an Account
            </button>
          </div>
        </div>

        {/* Data Structure Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { name: 'B+ Tree', use: 'Authentication', color: 'text-emerald-400' },
            { name: 'AVL Tree', use: 'Preferences', color: 'text-blue-400' },
            { name: 'Red-Black Tree', use: 'Top Charts', color: 'text-red-400' },
            { name: 'Fibonacci Heap', use: 'Recommendations', color: 'text-amber-400' },
            { name: 'Trie', use: 'Search', color: 'text-violet-400' },
            { name: 'Splay Tree', use: 'Recently Played', color: 'text-pink-400' },
            { name: 'Doubly LL', use: 'Playlists', color: 'text-cyan-400' },
            { name: 'Bloom Filter', use: 'Liked Songs', color: 'text-orange-400' },
          ].map((ds) => (
            <div
              key={ds.name}
              className="group p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
            >
              <p className={`text-sm font-bold ${ds.color} mb-1`}>{ds.name}</p>
              <p className="text-xs text-muted-foreground">{ds.use}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authMode !== null}
        onClose={() => setAuthMode(null)}
        initialMode={authMode || 'login'}
      />
    </div>
  );
}
