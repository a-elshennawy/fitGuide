import { Link } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";

// import user context to share all data across App
import { UserContext } from "../Contexts/UserContext";

export default function Body_Metrics() {
  const { currentUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [error, setError] = useState("");

  // getting data from the form
  const [formData, setFormData] = useState({
    weight: "",
    height: "",
    fats: "",
    waterMass: "",
    level: "",
    goal: "",
    MuscleMass: "",
    GymFrequency: "",
    workoutPlan: "",
  });

  useEffect(() => {
    // log to assure data are assign to user context
    console.log("Body_Metrics: Current User:", currentUser);

    // using /api/Goal/GetAllGoals to get all goals for user to choose from
    const fetchGoals = async () => {
      try {
        const res = await fetch(
          "https://myfirtguide.runasp.net/api/Goal/GetAllGoals"
        );

        if (!res.ok) throw new Error("Failed to fetch goals");
        const data = await res.json();

        setGoals(data);
        setError("");
      } catch (err) {
        setError("Failed to load goals. Please try again later.");
        console.error("Body_Metrics: Fetch goals error:", err);
      }
    };

    const fetchWorkoutPlans = async () => {
      // in case no user registered
      if (!currentUser?.token) {
        console.warn(
          "Body_Metrics: No token found for fetching workout plans."
        );

        return;
      }
      // using /api/WorkOut/ShowAllWorkOutPlans to get workout plans for user to choose
      try {
        const res = await fetch(
          "https://myfirtguide.runasp.net/api/WorkOut/ShowAllWorkOutPlans",

          {
            headers: {
              // user token from the context
              Authorization: `Bearer ${currentUser.token}`,
            },
          }
        );

        // in case end point failed
        if (!res.ok) {
          const errorText = await res.text();

          throw new Error(
            `Failed to fetch workout plans: ${res.status} - ${errorText}`
          );
        }

        const data = await res.json();

        // assign workout plan
        setWorkoutPlans(data);
      } catch (err) {
        console.error("Body_Metrics: Fetch workout plans error:", err);

        setError("Failed to load workout plans. Please try again later.");
      }
    };

    // call fetchs
    fetchGoals();
    fetchWorkoutPlans();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,

      [name]: value,
    }));
  };

  // moving to next page
  const handleContinue = async () => {
    // in case no user registered
    if (!currentUser?.token) {
      setError("Please sign up first.");

      return;
    }

    // in case user skipped workout plan select
    if (!formData.workoutPlan) {
      setError("Please select a workout plan before continuing.");

      return;
    }

    // declair the params from the form
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

      // using /api/UserMetrics/EnterMetrics to assign metrics to user using token
      const resMetrics = await fetch(
        `https://myfirtguide.runasp.net/api/UserMetrics/EnterMetrics?${queryParams.toString()}`,

        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
            Accept: "application/json",
          },
        }
      );

      // in case end point failed
      if (!resMetrics.ok) {
        const errorText = await resMetrics.text();

        throw new Error(`Failed to save metrics: ${errorText}`);
      }

      // using /api/Goal/SelectGoal to assign goal
      const urlGoal = new URL(
        "https://myfirtguide.runasp.net/api/Goal/SelectGoal"
      );

      urlGoal.searchParams.append("GoalName", formData.goal);
      const resGoal = await fetch(urlGoal.toString(), {
        method: "POST",

        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      // in case end point failed
      if (!resGoal.ok) {
        const errorText = await resGoal.text();

        throw new Error(
          `Failed to select goal: ${formData.goal} - ${errorText}`
        );
      }

      // moving to next page with state of current workout plan
      navigate("/healthconditions", {
        state: { workoutPlanName: formData.workoutPlan },
      });

      // assure what's passed to next page
      console.log(
        "Body_Metrics: Navigating to /healthconditions with workoutPlanName:",
        formData.workoutPlan
      );
    } catch (err) {
      setError(err.message || "Failed to save metrics or select goal.");
      console.error("Body_Metrics: Metrics/Goal error:", err);
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
                <select
                  required
                  className="col-12"
                  name="GymFrequency"
                  id="GymFrequency"
                  value={formData.GymFrequency}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    select your frequency
                  </option>
                  <option value="OneToTwo">1 - 2 days</option>
                  <option value="ThreeToFour">3 - 4 days</option>
                  <option value="FiveToSix">5 - 6 days</option>
                  <option value="Everyday">Everyday</option>
                </select>
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
              <label htmlFor="workoutPlan">
                choose a prefered workout plan
              </label>
              <select
                name="workoutPlan"
                id="workoutPlan"
                value={formData.workoutPlan}
                onChange={handleChange}
                className="col-12"
              >
                <option value="" disabled>
                  select your workout plan
                </option>
                {workoutPlans.map((plan) => (
                  <option key={plan.id} value={plan.name}>
                    {plan.name}
                  </option>
                ))}
              </select>
              {error && (
                <p className="text-danger mt-2 col-12">Error: {error}</p>
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
