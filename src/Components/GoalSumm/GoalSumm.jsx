import { useEffect, useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import LoadingSpinner from "../../Components/loadingSpinner";

// import context to assure sharing across app
import { UserContext } from "../Contexts/UserContext";

export default function GoalSumm() {
  const { currentUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [userGoal, setUserGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWorkoutPlanName, setSelectedWorkoutPlanName] = useState(null);
  const [displayedInjuries, setDisplayedInjuries] = useState([]);
  const [displayedAllergies, setDisplayedAllergies] = useState([]);
  const [weightChange, setWeightChange] = useState(0);
  const [bmiChange, setBmiChange] = useState(0);
  const [muscleMassChange, setMuscleMassChange] = useState(0);
  const [fatChange, setFatChange] = useState(0);
  const [isWeightNegative, setIsWeightNegative] = useState(false);
  const [isBmiNegative, setIsBmiNegative] = useState(false);
  const [isMuscleMassPositive, setIsMuscleMassPositive] = useState(false);
  const [isFatNegative, setIsFatNegative] = useState(false);

  useEffect(() => {
    const fetchMetricsAndGoal = async () => {
      setLoading(true);
      setError("");

      // no user
      try {
        if (!currentUser?.token) {
          throw new Error("User token not available. Please log in.");
        }
        const headers = {
          Authorization: `Bearer ${currentUser.token}`,
        };

        // /api/UserMetrics/GetAllUserMetrices to view stored metrics
        const [metricsRes, goalRes] = await Promise.all([
          fetch(
            "https://myfirtguide.runasp.net/api/UserMetrics/GetAllUserMetrices",

            { headers }
          ),

          // /api/Goal/GetUserGoal to view stored goal
          fetch("https://myfirtguide.runasp.net/api/Goal/GetUserGoal", {
            headers,
          }),
        ]);

        // if no user metrics
        if (!metricsRes.ok) {
          const errorText = await metricsRes.text();

          throw new Error(
            `Failed to fetch metrics: ${metricsRes.status} - ${errorText}`
          );
        }

        // if no user goal
        if (!goalRes.ok) {
          const errorText = await goalRes.text();

          throw new Error(
            `Failed to fetch goal: ${goalRes.status} - ${errorText}`
          );
        }

        const metricsData = await metricsRes.json();
        const goalData = await goalRes.json();

        // assure metrics exists
        if (
          metricsData &&
          metricsData.length > 0 &&
          metricsData[0].userMetrics.length > 0
        ) {
          const latestMetrics =
            metricsData[0].userMetrics[metricsData[0].userMetrics.length - 1];

          setCurrentMetrics(latestMetrics);
        } else {
          throw new Error("No user metrics found");
        }

        // assure goal exists
        if (goalData.userGoal) {
          setUserGoal(goalData.userGoal);
        } else {
          throw new Error("No user goal found");
        }
      } catch (err) {
        setError(err.message);

        console.error("GoalSumm: Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    // assure user token
    if (currentUser?.token) {
      fetchMetricsAndGoal();
    } else {
      setLoading(false);
      setError("Please log in to view your summary.");
    }

    // assure what's passed
    if (location.state) {
      if (location.state.workoutPlanName) {
        setSelectedWorkoutPlanName(location.state.workoutPlanName);

        console.log(
          "GoalSumm: Received workoutPlanName from HealthConditions:",
          location.state.workoutPlanName
        );
      }

      if (location.state.userInjuries) {
        setDisplayedInjuries(location.state.userInjuries);

        console.log(
          "GoalSumm: Received userInjuries:",
          location.state.userInjuries
        );
      }

      if (location.state.userAllergies) {
        setDisplayedAllergies(location.state.userAllergies);
        console.log(
          "GoalSumm: Received userAllergies:",

          location.state.userAllergies
        );
      }
    } else {
      console.warn(
        "GoalSumm: No state information received from previous page."
      );
    }
  }, [currentUser?.token, location.state]);

  useEffect(() => {
    if (currentMetrics && userGoal) {
      const weightDiff = userGoal.targetWeight - currentMetrics.weight;

      setWeightChange(Math.abs(weightDiff).toFixed(2));
      setIsWeightNegative(weightDiff < 0);

      const bmiDiff = userGoal.targetBMI - currentMetrics.currentBBMI;

      setBmiChange(Math.abs(bmiDiff).toFixed(1));
      setIsBmiNegative(bmiDiff < 0);

      const muscleMassDiff =
        userGoal.targetMuscleMass - currentMetrics.muscleMass;

      setMuscleMassChange(Math.abs(muscleMassDiff).toFixed(1));
      setIsMuscleMassPositive(muscleMassDiff > 0);

      const fatDiff = userGoal.targetFat - currentMetrics.fat;

      setFatChange(Math.abs(fatDiff).toFixed(1));
      setIsFatNegative(fatDiff < 0);
    }
  }, [currentMetrics, userGoal]);

  // if no user token found
  const handleStartJourney = async () => {
    if (!currentUser?.token) {
      setError("You are not logged in. Please sign in to start your journey.");

      return;
    }

    if (!selectedWorkoutPlanName) {
      setError(
        "Workout plan is missing. Please ensure all previous steps are completed correctly."
      );

      return;
    }

    setLoading(true);
    setError("");

    // generate needed at start
    try {
      const headers = {
        Authorization: `Bearer ${currentUser.token}`,
        "Content-Type": "application/json",
      };

      const nutritionPlanRes = await fetch(
        "https://myfirtguide.runasp.net/api/NutritionPlan/GenerateNutritionPlan",

        {
          method: "POST",

          headers,

          body: JSON.stringify({}),
        }
      );

      if (!nutritionPlanRes.ok) {
        const errorText = await nutritionPlanRes.text();

        throw new Error(
          `Nutrition plan error: ${nutritionPlanRes.status} - ${errorText}`
        );
      }

      console.log("GoalSumm: Nutrition plan generated successfully");

      const workoutUrl = new URL(
        "https://myfirtguide.runasp.net/api/WorkOut/GenerateWorkOut"
      );

      workoutUrl.searchParams.append("planType", selectedWorkoutPlanName);

      console.log(
        "GoalSumm: Attempting to generate workout plan with URL:",
        workoutUrl.toString()
      );

      const workoutPlanRes = await fetch(workoutUrl.toString(), {
        method: "POST",
        headers,
      });

      if (!workoutPlanRes.ok) {
        const errorText = await workoutPlanRes.text();

        throw new Error(
          `Workout plan error: ${workoutPlanRes.status} - ${errorText}`
        );
      }

      // all done .. sign in
      console.log("GoalSumm: Workout plan generated successfully");
      navigate("/SignIn");
    } catch (err) {
      setError(err.message);

      console.error("GoalSumm: Error generating plans:", {
        message: err.message,
        stack: err.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!userGoal || !currentMetrics) {
    return (
      <div className="goalSummary">
        <div className="container-fluid">
          <div className="goalSummaryInner row">
            <div className="innerPart col-lg-6 col-12 row">
              <div className="section topSec col-lg-8 col-10">
                <p className="text-danger mt-2 col-12">
                  {error ||
                    "Missing user goal or metrics data. Please ensure you have completed previous steps and are logged in."}
                </p>
                <button className="backBtn col-3">
                  <Link to={"/bodymetrics"}>back</Link>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>FitGuide - Goal Summary</title>
      </Helmet>
      <div className="GoalSumm">
        <h6>step 4 of 4</h6>
        <div className="container-fluid">
          <div className="GoalSummInner row">
            <div className="progressBar col-10 row">
              <div className="bar col-1"></div>
              <div className="bar col-1"></div>
              <div className="bar col-1"></div>
              <div className="bar col-1"></div>
            </div>
            <div className="innerPart col-lg-6 col-12 row">
              <div className="section topSec col-lg-8 col-10">
                {userGoal && (
                  <>
                    <h4>
                      <img src="imgs/icons8-check-50.png" alt="" />
                      {userGoal.name}
                    </h4>
                    <p>
                      Your personalized plan has been created based on your
                      profile and goals.
                    </p>
                  </>
                )}
              </div>
              {currentMetrics && userGoal && (
                <>
                  <div className="section col-lg-8 col-10">
                    <div className="header">
                      <h4>Weight Goal</h4>
                    </div>
                    <div className="content row">
                      <div className="part col-4">
                        <h5>current</h5>
                        <h4>{currentMetrics.weight} kg</h4>
                      </div>
                      <div className="part col-4">
                        <h5>change</h5>
                        <h4
                          className={
                            isWeightNegative ? "Negativechange" : "Pluschange"
                          }
                        >
                          {weightChange} kg
                        </h4>
                      </div>
                      <div className="part col-4">
                        <h5>target</h5>
                        <h4>{userGoal.targetWeight.toFixed(2)} kg</h4>
                      </div>
                    </div>
                  </div>
                  <div className="section col-lg-8 col-10">
                    <div className="header">
                      <h4>BMI Target</h4>
                    </div>
                    <div className="content row">
                      <div className="part col-4">
                        <h5>current</h5>
                        <h4>{currentMetrics.currentBBMI.toFixed(1)}</h4>
                      </div>
                      <div className="part col-4">
                        <h5>change</h5>
                        <h4
                          className={
                            isBmiNegative ? "Negativechange" : "Pluschange"
                          }
                        >
                          {bmiChange}
                        </h4>
                      </div>
                      <div className="part col-4">
                        <h5>target</h5>
                        <h4>{userGoal.targetBMI.toFixed(1)}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="section col-lg-8 col-10">
                    <div className="header">
                      <h4>Muscle Mass Target</h4>
                    </div>
                    <div className="content row">
                      <div className="part col-4">
                        <h5>current</h5>
                        <h4>{currentMetrics.muscleMass}%</h4>
                      </div>
                      <div className="part col-4">
                        <h5>change</h5>
                        <h4
                          className={
                            isMuscleMassPositive
                              ? "Pluschange"
                              : "Negativechange"
                          }
                        >
                          {muscleMassChange}%
                        </h4>
                      </div>
                      <div className="part col-4">
                        <h5>target</h5>
                        <h4>{userGoal.targetMuscleMass.toFixed(1)}%</h4>
                      </div>
                    </div>
                  </div>
                  <div className="section col-lg-8 col-10">
                    <div className="header">
                      <h4>Fats Target</h4>
                    </div>
                    <div className="content row">
                      <div className="part col-4">
                        <h5>current</h5>
                        <h4>{currentMetrics.fat}%</h4>
                      </div>
                      <div className="part col-4">
                        <h5>change</h5>
                        <h4
                          className={
                            isFatNegative ? "Negativechange" : "Pluschange"
                          }
                        >
                          {fatChange}%
                        </h4>
                      </div>
                      <div className="part col-4">
                        <h5>target</h5>
                        <h4>{userGoal.targetFat.toFixed(1)}%</h4>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {error && (
                <p className="text-danger mt-2 col-lg-8 col-10">{error}</p>
              )}
              <div className="btnsSec row col-lg-8 col-10">
                <button className="backBtn col-3">
                  <Link to={"/healthconditions"}>back</Link>
                </button>
                <button
                  className="continueBack col-8"
                  onClick={handleStartJourney}
                  disabled={loading}
                >
                  {loading ? "Generating Plans..." : "start your journey"}
                </button>
              </div>
              <p className="col-lg-8 col-10 m-2">
                You can always adjust these goals from your profile settings
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
