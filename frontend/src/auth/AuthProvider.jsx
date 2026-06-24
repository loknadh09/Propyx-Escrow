import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("propyx_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  const saveUser = (u) => {
    setUser(u);
    if (u) localStorage.setItem("propyx_user", JSON.stringify(u));
    else localStorage.removeItem("propyx_user");
  };

  const logout = () => {
    saveUser(null);
  };

  useEffect(() => {}, []);

  return (
    <AuthContext.Provider value={{ user, saveUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
