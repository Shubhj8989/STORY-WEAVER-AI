import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Story } from '../api/client';
import { getStories } from '../api/client';

interface StoryContextType {
  stories: Story[];
  activeStory: Story | null;
  setActiveStory: (story: Story | null) => void;
  refreshStories: () => Promise<void>;
  loading: boolean;
}

const StoryContext = createContext<StoryContextType>({
  stories: [],
  activeStory: null,
  setActiveStory: () => {},
  refreshStories: async () => {},
  loading: false,
});

export const useStory = () => useContext(StoryContext);

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStories = async () => {
    setLoading(true);
    try {
      const res = await getStories();
      setStories(res.data);
      if (res.data.length > 0 && !activeStory) {
        setActiveStory(res.data[0]);
      }
    } catch (e) {
      console.error('Failed to load stories', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStories();
  }, []);

  return (
    <StoryContext.Provider value={{ stories, activeStory, setActiveStory, refreshStories, loading }}>
      {children}
    </StoryContext.Provider>
  );
};
