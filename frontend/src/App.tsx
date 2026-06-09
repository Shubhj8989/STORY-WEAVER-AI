import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { StoryProvider } from './context/StoryContext';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import BiblePage from './pages/BiblePage';
import GraphPage from './pages/GraphPage';
import TimelinePage from './pages/TimelinePage';
import ContinuityPage from './pages/ContinuityPage';
import ChatPage from './pages/ChatPage';
import CreativePage from './pages/CreativePage';
import './index.css';

const App: React.FC = () => {
  return (
    <StoryProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/bible" element={<BiblePage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/continuity" element={<ContinuityPage />} />
              <Route path="/creative" element={<CreativePage />} />
              <Route path="/chat" element={<ChatPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </StoryProvider>
  );
};

export default App;
