import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

// get the user to assure sign in authenticated
import { UserContext } from "../Contexts/UserContext";

export default function Sign_In() {
  const [email, setEmail] = useState("");
  const [passWord, setPassWord] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setCurrentUser } = useContext(UserContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // /api/Account/LogIn?EmailAddress to log in auth
    try {
      const response = await fetch(
        `https://myfirtguide.runasp.net/api/Account/LogIn?EmailAddress=${encodeURIComponent(
          email
        )}&Password=${encodeURIComponent(passWord)}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Login failed. Please check your credentials.");
      }

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Unexpected response format.");
      }

      console.log("Login success:", data);

      // assign current user
      setCurrentUser(data);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <>
      <Helmet>
        <title>FitGuide - Sign In</title>
      </Helmet>
      <div className="signIn">
        <div className="container-fluid">
          <div className="signInInner">
            <button className="backHome">
              <a href="/">back to home</a>
            </button>
            <form className="signInForm row" onSubmit={handleLogin}>
              <div className="formHeader col-12">
                <h3>sign in</h3>
                <p>Track your progress and achieve your fitness goals</p>
              </div>

              {error && (
                <div className="alert alert-danger col-12" role="alert">
                  {error}
                </div>
              )}

              <div className="input-group">
                <span className="input-group-text">
                  <img src="imgs/icons8-email-48.png" alt="email icon" />
                </span>
                <input
                  required
                  type="email"
                  className="form-control"
                  placeholder="email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <img src="imgs/icons8-lock-48.png" alt="lock icon" />
                </span>
                <input
                  required
                  className="form-control"
                  type="password"
                  placeholder="password"
                  value={passWord}
                  onChange={(e) => setPassWord(e.target.value)}
                />
              </div>

              <label className="col-5">
                <input type="checkbox" /> Remember Me
              </label>

              <button className="toReg col-6" type="button">
                <Link to={"/signUp"}>don't have an account ?</Link>
              </button>

              <button className="sigInBtn col-12" type="submit">
                sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
