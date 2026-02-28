import React from 'react';
import { Terminal, Globe, Layers, Search, ChevronDown, Database } from 'lucide-react';

export type TabType = 'all' | 'console' | 'network' | 'state';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: {
    console: number;
    network: number;
    state: number;
  };
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filterLevel?: string;
  onFilterChange?: (level: string) => void;
}

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export function TabBar({
  activeTab,
  onTabChange,
  counts,
  searchQuery = '',
  onSearchChange,
  filterLevel = 'all',
  onFilterChange,
}: TabBarProps) {
  const totalCount = counts.console + counts.network + counts.state;

  const tabs: TabConfig[] = [
    {
      id: 'all',
      label: 'All',
      icon: <Layers size={14} className="icon" />,
      count: totalCount,
    },
    {
      id: 'console',
      label: 'Console',
      icon: <Terminal size={14} className="icon" />,
      count: counts.console,
    },
    {
      id: 'network',
      label: 'Network',
      icon: <Globe size={14} className="icon" />,
      count: counts.network,
    },
    {
      id: 'state',
      label: 'State',
      icon: <Database size={14} className="icon" />,
      count: counts.state,
    },
  ];

  return (
    <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between border-b border-border-subtle bg-bg-primary">
      {/* Tabs */}
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="count">{tab.count > 999 ? '999+' : tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            placeholder="Filter logs..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="filter-input"
          />
        </div>

        {/* Level filter */}
        <div className="relative">
          <select
            value={filterLevel}
            onChange={(e) => onFilterChange?.(e.target.value)}
            className="filter-select"
          >
            <option value="all">All levels</option>
            <option value="error">Errors only</option>
            <option value="warn">Warnings & Errors</option>
            <option value="hide-debug">Hide debug</option>
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
