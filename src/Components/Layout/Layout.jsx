import { Outlet } from "react-router-dom";
import { useContext } from "react";
import NavBar from "../NavBar/NavBar";
import Footer from "../Footer/Footer";
import GuestNavbar from "../GuestNavbar/GuestNavbar";
import { UserContext } from "../Contexts/UserContext";

export default function Layout() {
  const { currentUser } = useContext(UserContext);

  return (
    <>
      {currentUser ? <NavBar currentUser={currentUser} /> : <GuestNavbar />}
      <Outlet />
      <Footer />
    </>
  );
}
