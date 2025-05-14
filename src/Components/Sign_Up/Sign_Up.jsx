import { Link } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";

export default function Sign_Up() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    passWord: "",
    gender: "",
    age: "",
    country: "",
    phone: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.passWord) {
      setError("Please fill in all required fields.");
      return;
    }

    localStorage.setItem("user", JSON.stringify(formData));

    navigate("/bodymetrics");
  };

  return (
    <>
      <Helmet>
        <title>FitGuide - Sign Up</title>
      </Helmet>
      <div className="signUp">
        <div className="container-fluid">
          <div className="signUpInner">
            <button className="backHome">
              <Link to={"/"}>back to home</Link>
            </button>

            <form className="signUpForm row" onSubmit={handleSubmit}>
              <div className="formHeader col-12">
                <h3>Create Your Account</h3>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <div className="input-group">
                <span className="input-group-text">
                  <img src="imgs/icons8-person-48.png" alt="person icon" />
                </span>
                <input
                  required
                  type="text"
                  className="form-control"
                  placeholder="Full name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <img src="imgs/icons8-email-48.png" alt="email icon" />
                </span>
                <input
                  required
                  type="email"
                  className="form-control"
                  placeholder="Email address"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <img src="imgs/icons8-lock-48.png" alt="lock icon" />
                </span>
                <input
                  required
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  name="passWord"
                  value={formData.passWord}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <img src="imgs/icons8-gender-40.png" alt="gender icon" />
                </span>
                <select
                  required
                  className="form-control"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    Gender
                  </option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <img src="imgs/icons8-calendar-50.png" alt="calendar icon" />
                </span>
                <input
                  required
                  type="number"
                  className="form-control"
                  placeholder="Age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <img src="imgs/icons8-country-50.png" alt="country icon" />
                </span>
                <select
                  required
                  className="form-control"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    Country
                  </option>
                  <option value="eg">Egypt</option>
                </select>
              </div>

              <div className="input-group">
                <span className="input-group-text">
                  <img src="imgs/icons8-phone-48.png" alt="phone icon" />
                </span>
                <input
                  required
                  type="tel"
                  className="form-control"
                  placeholder="Phone number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <button className="sigUpBtn col-12" type="submit">
                Create Account
              </button>

              <div className="bott col-12">
                <h6>
                  Already have an account? <Link to={"/signIn"}>Log in</Link>
                </h6>
                <p>
                  By signing up, you agree to our&nbsp;
                  <a href="/">Terms of Service</a> and&nbsp;
                  <a href="/">Privacy Policy</a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
