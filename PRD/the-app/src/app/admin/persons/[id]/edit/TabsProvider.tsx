'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface TabChanges {
  details: boolean;
  'person-image': boolean;
  'gallery-images': boolean;
}

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  imageUpdateTrigger: number;
  triggerImageUpdate: () => void;
  hasChanges: TabChanges;
  setHasChanges: (tab: keyof TabChanges, value: boolean) => void;
  pendingTabSwitch: string | null;
  setPendingTabSwitch: (tab: string | null) => void;
  resetTabChanges: (tab: keyof TabChanges) => void;
  hasAnyChanges: () => boolean;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function TabsProvider({ children }: { children: React.ReactNode }) {
  // Always start with 'details' to ensure server/client consistency
  const [activeTab, setActiveTabState] = useState('details');
  const [imageUpdateTrigger, setImageUpdateTrigger] = useState(0);
  const [hasChanges, setHasChangesState] = useState<TabChanges>({
    details: false,
    'person-image': false,
    'gallery-images': false,
  });
  const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null);

  // Update URL hash when tab changes
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const newUrl = new URL(window.location.href);
      if (tab === 'details') {
        // Remove hash for details tab
        newUrl.hash = '';
      } else {
        newUrl.hash = tab;
      }
      window.history.pushState({}, '', newUrl);
    }
  }, []);

  // Set initial tab based on hash after mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'person-image' || hash === 'gallery-images') {
      setActiveTabState(hash);
    }
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'person-image' || hash === 'gallery-images') {
        setActiveTabState(hash);
      } else {
        setActiveTabState('details');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const triggerImageUpdate = useCallback(() => {
    setImageUpdateTrigger(prev => prev + 1);
  }, []);

  const setHasChanges = useCallback((tab: keyof TabChanges, value: boolean) => {
    setHasChangesState(prev => ({ ...prev, [tab]: value }));
  }, []);

  const resetTabChanges = useCallback((tab: keyof TabChanges) => {
    setHasChangesState(prev => ({ ...prev, [tab]: false }));
  }, []);

  const hasAnyChanges = useCallback(() => {
    return Object.values(hasChanges).some(changed => changed);
  }, [hasChanges]);

  return (
    <TabsContext.Provider 
      value={{ 
        activeTab, 
        setActiveTab, 
        imageUpdateTrigger, 
        triggerImageUpdate,
        hasChanges,
        setHasChanges,
        pendingTabSwitch,
        setPendingTabSwitch,
        resetTabChanges,
        hasAnyChanges
      }}
    >
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
}