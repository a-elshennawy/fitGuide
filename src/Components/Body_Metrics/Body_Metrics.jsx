import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";

export default function Body_Metrics() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    weight: "",
    height: "",
    fats: "",
    waterMass: "",
    level: "",
    goal: "",
  });

  useEffect(() => {
    fetch("http://myfitguide.runasp.net/api/Goal/GetAllGoals")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch goals");
        }
        return res.json();
      })
      .then((data) => setGoals(data))
      .catch((err) => setError(err.message));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContinue = () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      alert("Please complete step 1 first.");
      return;
    }

    const updatedUser = {
      ...user,
      bodyMetrics: formData,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));

    navigate("/healthconditions");
  };

  return (
    <>
      <Helmet>
        <title>FitGuide - Body Metrics</title>
      </Helmet>
      <div className="bodyMetrics">
        <h6>step 2 of 4</h6>
        <div className="container-fluid">
          <div className="BMetricsInner">
            <div className="progressBar row">
              <div className="bar first col-1"></div>
              <div className="bar second col-1"></div>
              <div className="bar third col-1"></div>
              <div className="bar fourth col-1"></div>
            </div>
            <div className="bodyFrom row">
              <div className="formHeader col-12">
                <h3>Your Body Metrics</h3>
                <p>This helps us create your personalized fitness plan</p>
              </div>

              <div className="inputContainer col-5">
                <label htmlFor="weight">weight</label>
                <input
                  required
                  type="text"
                  placeholder="0.0 lbs"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                />
              </div>

              <div className="inputContainer col-5">
                <label htmlFor="height">height</label>
                <input
                  required
                  type="text"
                  placeholder="0.0 cm"
                  id="height"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                />
              </div>

              <div className="inputContainer col-5">
                <label htmlFor="fats">body fat %</label>
                <input
                  required
                  type="text"
                  placeholder="0.0 %"
                  id="fats"
                  name="fats"
                  value={formData.fats}
                  onChange={handleChange}
                />
              </div>

              <div className="inputContainer col-5">
                <label htmlFor="waterMass">water mass</label>
                <input
                  required
                  type="text"
                  placeholder="0.0 kg"
                  id="waterMass"
                  name="waterMass"
                  value={formData.waterMass}
                  onChange={handleChange}
                />
              </div>

              <label htmlFor="level">your gym experience ?</label>
              <select
                required
                className="col-12"
                name="level"
                id="level"
                value={formData.level}
                onChange={handleChange}
              >
                <option value="" disabled>
                  select your level
                </option>
                <option value="Beginner">Beginner</option>
                <option value="InterMediate">InterMediate</option>
                <option value="Professional">Professional</option>
              </select>

              <label htmlFor="goal">what's your goal ?</label>
              <select
                required
                className="col-12"
                name="goal"
                id="goal"
                value={formData.goal}
                onChange={handleChange}
              >
                <option value="" disabled>
                  select your goal
                </option>
                {goals.map((goal, index) => (
                  <option key={index} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>

              {error && (
                <p className="text-danger mt-2 col-12">
                  Failed to load goals: {error}
                </p>
              )}

              <div className="disclaimer row col-11">
                <img className="col-2" src="imgs/icons8-arm-50.png" alt="" />
                <p className="col-10">
                  Your metrics help us create the perfect workout and nutrition
                  plan for your goals. You can always update these later.
                </p>
              </div>

              <div className="btnsSec row col-11">
                <button className="backBtn col-3">
                  <Link to={"/signUp"}>back</Link>
                </button>

                <button className="continueBack col-8" onClick={handleContinue}>
                  continue
                </button>
              </div>

              <p className="col-10 m-2">Step 3: health conditions</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
