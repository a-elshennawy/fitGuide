import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("currentUser");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Failed to parse currentUser from localStorage", error);
      return null;
    }
  });

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("currentUser");
      }
    } catch (error) {
      console.error("Failed to save currentUser to localStorage", error);
    }
  }, [currentUser]);

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {" "}
      {children}
    </UserContext.Provider>
  );
};
