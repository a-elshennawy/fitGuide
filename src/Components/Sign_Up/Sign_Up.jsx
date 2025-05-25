import { Link } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";

// import user context to share all data across App
import { UserContext } from "../Contexts/UserContext";

export default function Sign_Up() {
  const [loading, setLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailError, setEmailError] = useState("");
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);

  // grab data from the sign up form
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    passWord: "",
    gender: "",
    age: "",
    country: "",
    phone: "",
    MuscleMass: "",
    GymFrequency: "",
  });
  const [error, setError] = useState("");
  const { setCurrentUser } = useContext(UserContext);

  // live validation for email
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // using /api/Account/emailExist to avoid existing email
  const checkEmailExists = async (email) => {
    if (!email) return false;

    setEmailChecking(true);
    setEmailError("");

    try {
      const response = await fetch(
        `https://myfirtguide.runasp.net/api/Account/emailExist?email=${encodeURIComponent(
          email
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // in case end point failed
      if (!response.ok) {
        throw new Error("Failed to check email");
      }

      const exists = await response.json();
      return exists;
    } catch (err) {
      console.error("Email check error:", err);
      return false;
    } finally {
      setEmailChecking(false);
    }
  };

  const handleEmailBlur = async () => {
    if (!formData.email) return;

    const exists = await checkEmailExists(formData.email);
    if (exists) {
      setEmailError("Email already exists");
    } else {
      setEmailError("");
    }
  };

  // form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || emailChecking) return;

    const exists = await checkEmailExists(formData.email);
    if (exists) {
      setEmailError("Email already exists");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // get first & las name frm full name
      const firstName = formData.name.split(" ")[0] || formData.name;
      const lastName = formData.name.split(" ")[1] || "";

      // declair params from form data
      const queryParams = new URLSearchParams({
        Email: formData.email,
        FirstName: firstName,
        LastName: lastName,
        FullName: formData.name,
        Gender: formData.gender,
        PhoneNumber: formData.phone,
        // to assure valid age
        Age: parseInt(formData.age),
        Country: formData.country,
        Password: formData.passWord,
      });

      // send to end point /api/Account/Register
      const response = await fetch(
        `https://myfirtguide.runasp.net/api/Account/Register?${queryParams.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      // in case end point failed
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.message || "Failed to register.");
      }

      const data = await response.json();

      // log the token
      console.log("Token received:", data.token);

      // assign data to context
      setCurrentUser(data);
      navigate("/bodymetrics");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      console.error("Sign-up error:", err);
    } finally {
      setLoading(false);
    }
  };

  // get countries
  useEffect(() => {
    fetch("https://restcountries.com/v3.1/all")
      .then((res) => res.json())
      .then((data) => {
        const countryNames = data
          .map((country) => country.name.common)
          .sort((a, b) => a.localeCompare(b));
        setCountries(countryNames);
      })
      .catch((err) => console.error("Error fetching countries:", err));
  }, []);

  return (
    <>
      <Helmet>
        <title>FitGuide - Sign Up</title>
      </Helmet>
      <div className="signUp">
        <div className="container-fluid">
          <div className="signUpInner">
            <button className="backHome">
              <Link to={"/"}> back to home </Link>
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
                  className={`form-control ${emailError ? "is-invalid" : ""}`}
                  placeholder="Email address"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  disabled={emailChecking}
                />
                {emailChecking && (
                  <span className="input-group-text">
                    <div
                      className="spinner-border spinner-border-sm"
                      role="status"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </span>
                )}
                {emailError && (
                  <div className="invalid-feedback">{emailError}</div>
                )}
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
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
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
                {loading ? "Creating Account..." : "Create Account"}
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
