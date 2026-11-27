import { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { api } from './services/api';

export function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('redcell_token'));

  const handleLogout = () => {
    api.logout();
    setToken(null);
  };

  if (!token) {
    return <LoginPage onSuccess={(jwt) => setToken(jwt)} />;
  }

  return <DashboardPage onUnauthorized={handleLogout} />;
}

export default App;