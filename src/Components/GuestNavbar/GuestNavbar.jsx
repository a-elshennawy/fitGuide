import { Link } from "react-router-dom";

export default function GuestNavbar() {
  return (
    <>
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
