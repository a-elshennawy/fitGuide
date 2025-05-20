import { Link } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../Contexts/UserContext";

export default function Body_Metrics() {
  const { currentUser } = useContext(UserContext);
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
    MuscleMass: "",
    GymFrequency: "",
  });

  useEffect(() => {
    console.log("Current User in Body_Metrics:", currentUser);

    const fetchGoals = async () => {
      try {
        const res = await fetch(
          "http://myfitguide.runasp.net/api/Goal/GetAllGoals"
        );
        if (!res.ok) throw new Error("Failed to fetch goals");
        const data = await res.json();
        setGoals(data);
        setError("");
      } catch (err) {
        setError("Failed to load goals. Please try again later.");
        console.error("Fetch goals error:", err);
      }
    };

    fetchGoals();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContinue = async () => {
    if (!currentUser?.token) {
      setError("Please sign up first.");
      return;
    }

    try {
      const queryParams = new URLSearchParams({
        Weight: formData.weight,
        Height: formData.height,
        fitnessLevel: formData.level,
        Fat: formData.fats || 0,
        WaterMass: formData.waterMass || 0,
        MuscleMass: formData.MuscleMass || 0,
        GymFrequency: formData.GymFrequency || 0,
      });

      const resMetrics = await fetch(
        `http://myfitguide.runasp.net/api/UserMetrics/EnterMetrics?${queryParams.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
            Accept: "application/json",
          },
        }
      );

      if (!resMetrics.ok) throw new Error(await resMetrics.text());

      const urlGoal = new URL(
        "http://myfitguide.runasp.net/api/Goal/SelectGoal"
      );
      urlGoal.searchParams.append("GoalName", formData.goal);

      const resGoal = await fetch(urlGoal.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      if (!resGoal.ok) {
        const errorText = await resGoal.text();
        throw new Error(
          `Failed to select goal: ${formData.goal} - ${errorText}`
        );
      }

      navigate("/healthconditions");
    } catch (err) {
      setError(err.message || "Failed to save metrics.");
      console.error("Metrics error:", err);
    }
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

              <div className="inputContainer col-lg-5 col-10">
                <label htmlFor="weight">weight</label>
                <input
                  required
                  type="text"
                  placeholder="0.0 kg"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                />
              </div>

              <div className="inputContainer col-lg-5 col-10">
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

              <div className="inputContainer col-lg-5 col-10">
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

              <div className="inputContainer col-lg-5 col-10">
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

              <div className="inputContainer col-lg-5 col-10">
                <label htmlFor="MuscleMass">muscle mass</label>
                <input
                  required
                  type="text"
                  placeholder="0.0 kg"
                  id="MuscleMass"
                  name="MuscleMass"
                  value={formData.MuscleMass}
                  onChange={handleChange}
                />
              </div>

              <div className="inputContainer col-lg-5 col-10">
                <label htmlFor="GymFrequency">gym frequency</label>
                <input
                  required
                  type="text"
                  placeholder="0.0"
                  id="GymFrequency"
                  name="GymFrequency"
                  value={formData.GymFrequency}
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
                {goals.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>

              {error && (
                <p className="text-danger mt-2 col-12">
                  Failed to load goals: {error}
                </p>
              )}

              <div className="disclaimer row col-12">
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
