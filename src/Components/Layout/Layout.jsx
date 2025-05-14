import { Outlet } from "react-router-dom";
import NavBar from "../NavBar/NavBar";
import Footer from "../Footer/Footer";
import GuestNavbar from "../GuestNavbar/GuestNavbar";

export default function Layout() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  return (
    <>
      {currentUser ? <NavBar /> : <GuestNavbar />}
      <Outlet />
      <Footer />
    </>
  );
}
