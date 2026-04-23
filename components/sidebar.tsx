'use client';

import { Home, Search, Library, ListMusic, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
];

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary-foreground" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </span>
          MusicDS
        </h1>
      </div>

      {/* Main Navigation */}
      <nav className="px-3 mb-6">
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
      <div className="px-3 py-4 flex-1">
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
              <Icon className="w-5 h-5" />
              <span className="flex-1 text-left">{section.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {section.ds}
              </span>
            </button>
          );
        })}
      </div>

      {/* DS Info Footer */}
      <div className="p-4 mx-3 mb-3 rounded-lg bg-secondary/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Every feature powered by a hand-coded data structure. Hover over sections to see which DS is used.
        </p>
      </div>
    </aside>
  );
}
