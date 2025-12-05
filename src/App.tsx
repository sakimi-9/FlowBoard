import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Layout } from '@/components/Layout';
import { Board } from '@/pages/Board';
import { Archive } from '@/pages/Archive';
import { RecycleBin } from '@/pages/RecycleBin';
import { CalendarPage } from '@/pages/Calendar';
import { useTaskStore } from '@/store/useTaskStore';
import { useEffect } from 'react';

function App() {
  const { checkAutoArchive } = useTaskStore();

  useEffect(() => {
    checkAutoArchive();
    // Set up interval to check periodically (e.g., every hour)
    const interval = setInterval(checkAutoArchive, 3600000);
    return () => clearInterval(interval);
  }, [checkAutoArchive]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Board />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/recycle-bin" element={<RecycleBin />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
