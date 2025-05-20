import { NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

export default function NavBar({ currentUser }) {
  const location = useLocation();

  const getInitials = (name) => {
    if (typeof name !== "string" || !name.trim()) return "U";

    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";

    return (first + second).toUpperCase() || "U";
  };

  const isActive = (path) =>
    location.pathname === path ? "navLink here" : "navLink";

  return (
    <>
      {/* offcanvas */}
      <button
        className="offCanvTriger"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#offcanvasWithBothOptions"
        aria-controls="offcanvasWithBothOptions"
      >
        <FontAwesomeIcon icon={faBars} />
      </button>

      <div
        className="offcanvas offcanvas-start"
        data-bs-scroll="true"
        tabIndex="-1"
        id="offcanvasWithBothOptions"
        aria-labelledby="offcanvasWithBothOptionsLabel"
      >
        <div className="offcanvas-header">
          <div className="logo">
            <NavLink to="/">
              <img src="imgs/icons8-running-48.png" alt="logo" />
              FitGuide
            </NavLink>
            <h6>welcome, {currentUser?.fullName}</h6>{" "}
          </div>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>
        <div className="offcanvas-body">
          <ul className="offCanList">
            <li className="offcanvItem">
              <img src="imgs/icons8-home-48.png" alt="home icon" />
              <NavLink to="/">home</NavLink>
            </li>
            <li className="offcanvItem">
              <img src="imgs/icons8-workout-40.png" alt="workout icon" />
              <NavLink to="workout">workout</NavLink>
            </li>
            <li className="offcanvItem">
              <img src="imgs/icons8-user-32.png" alt="profile icon" />
              <NavLink to="profile">profile</NavLink>
            </li>
          </ul>
        </div>
      </div>

      {/* navbar */}
      <div className="navBar">
        <div className="container-fluid">
          <div className="navinner row">
            <div className="logo col-1">
              <NavLink to="/">
                <img src="imgs/icons8-running-48.png" alt="logo" />
                FitGuide
              </NavLink>
            </div>
            <div className="navs col-8">
              <ul className="navList">
                <li className="navItem">
                  <img src="imgs/icons8-home-48.png" alt="home icon" />
                  <NavLink to="/" className={isActive("/")}>
                    home
                  </NavLink>
                </li>
                <li className="navItem">
                  <img src="imgs/icons8-workout-40.png" alt="workout icon" />
                  <NavLink to="workout" className={isActive("/workout")}>
                    workout
                  </NavLink>
                </li>
                <li className="navItem">
                  <img src="imgs/icons8-user-32.png" alt="profile icon" />
                  <NavLink to="profile" className={isActive("/profile")}>
                    {" "}
                    profile
                  </NavLink>
                </li>
              </ul>
            </div>
            <div className="profile col-3">
              <h5>{currentUser?.fullName || "User Name"}</h5>{" "}
              <span>{getInitials(currentUser?.fullName)}</span>{" "}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
