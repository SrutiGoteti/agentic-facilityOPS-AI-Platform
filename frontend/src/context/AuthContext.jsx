import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (token && username) {
      setUser({ token, username });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await axios.post(`${API_BASE}/auth/login`, { username, password });
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("username", response.data.username);
    setUser({ token: response.data.token, username: response.data.username });
  };

  const register = async (username, email, password) => {
    const response = await axios.post(`${API_BASE}/auth/register`, { username, email, password });
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("username", response.data.username);
    setUser({ token: response.data.token, username: response.data.username });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}