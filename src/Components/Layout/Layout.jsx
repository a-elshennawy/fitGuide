import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import NavBar from "../NavBar/NavBar";
import Footer from "../Footer/Footer";
import GuestNavbar from "../GuestNavbar/GuestNavbar";

export default function Layout() {
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("currentUser"))
  );

  useEffect(() => {
    const syncUser = () => {
      const storedUser = JSON.parse(localStorage.getItem("currentUser"));
      setCurrentUser(storedUser);
    };

    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  return (
    <>
      {currentUser ? <NavBar currentUser={currentUser} /> : <GuestNavbar />}
      <Outlet />
      <Footer />
    </>
  );
}
