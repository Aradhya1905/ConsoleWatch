import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { TabBar, TabType } from './components/layout/TabBar';
import { StatusBar } from './components/layout/StatusBar';
import { EventList } from './components/events/EventList';
import { useVSCodeMessages } from './hooks/useVSCodeMessage';
import { useEventStore } from './store/eventStore';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const events = useEventStore((state) => state.events);

  // Set up message listeners
  useVSCodeMessages();

  // Calculate counts for tabs
  const counts = {
    console: events.filter((e) => e.type === 'console').length,
    network: events.filter((e) => e.type === 'network').length,
    state: events.filter((e) => e.type === 'state').length,
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      <Header />
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterLevel={filterLevel}
        onFilterChange={setFilterLevel}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <EventList
          activeTab={activeTab}
          searchQuery={searchQuery}
          filterLevel={filterLevel}
        />
      </main>
      <StatusBar />
    </div>
  );
}
