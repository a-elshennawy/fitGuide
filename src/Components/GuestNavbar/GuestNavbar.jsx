import { Link } from "react-router-dom";
import { NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

export default function GuestNavbar() {
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
          </div>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>
        <div className="offcanvas-body">
          <div className="logBtns">
            <button className="logBtn logIn">
              <Link to={"/SignIn"}>login</Link>
            </button>
            <button className="logBtn signUp">
              <Link to={"/signUp"}>get started</Link>
            </button>
          </div>
        </div>
      </div>

      {/* navbar */}
      <div className="GnavBar">
        <div className="container-fluid">
          <div className="navinner row">
            <div className="logo col-3">
              <Link to={"/"}>
                <img src="imgs/icons8-running-48.png" />
                FitGuide
              </Link>
            </div>
            <div className="logBtns col-5">
              <button className="logBtn logIn">
                <Link to={"/SignIn"}>login</Link>
              </button>
              <button className="logBtn signUp">
                <Link to={"/signUp"}>get started</Link>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
