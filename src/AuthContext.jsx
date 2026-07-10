import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('csToken'));
  const [ready, setReady]   = useState(false);

  useEffect(() => { setReady(true); }, []);

  const login = (t) => {
    localStorage.setItem('csToken', t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('csToken');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
