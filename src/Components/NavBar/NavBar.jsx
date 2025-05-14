import { NavLink, useLocation } from "react-router-dom";

export default function NavBar() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const location = useLocation();

  const getInitials = (name) => {
    const parts = name?.trim().split(" ") || [];
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const isActive = (path) =>
    location.pathname === path ? "navLink here" : "navLink";

  return (
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
                  profile
                </NavLink>
              </li>
            </ul>
          </div>
          <div className="profile col-3">
            <h5>{currentUser?.name || "User Name"}</h5>
            <span>{getInitials(currentUser?.name)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
