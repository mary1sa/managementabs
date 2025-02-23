import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetch('/data/data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setUsers(data.users);
        setEmployees(data.employees);
      })
      .catch(error => {
        console.error('Erreur de chargement des utilisateurs:', error);
      });
  }, []);

  const login = (username, password) => {
    const user = users.find(
      u => u.username === username && u.password === password
    );

    if (user) {
      const userInfo = { ...user };
      delete userInfo.password;
      setCurrentUser(userInfo);
      localStorage.setItem('currentUser', JSON.stringify(userInfo));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const value = {
    currentUser,
    users,
    employees,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
