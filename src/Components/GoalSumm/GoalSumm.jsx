import { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../Contexts/UserContext";
import LoadingSpinner from "../../Components/loadingSpinner";

export default function GoalSumm() {
  const { currentUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [userGoal, setUserGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMetricsAndGoal = async () => {
      setLoading(true);
      setError("");
      try {
        const headers = {
          Authorization: `Bearer ${currentUser.token}`,
        };

        const metricsRes = await fetch(
          "https://myfirtguide.runasp.net/api/UserMetrics/GetAllUserMetrices",
          { headers }
        );
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          if (
            metricsData &&
            metricsData.length > 0 &&
            metricsData[0].userMetrics.length > 0
          ) {
            setCurrentMetrics(
              metricsData[0].userMetrics[metricsData[0].userMetrics.length - 1]
            );
          } else {
            setError("No user metrics found.");
          }
        } else {
          console.error("Failed to fetch user metrics:", metricsRes.status);
          setError("Failed to load user metrics.");
        }

        const goalRes = await fetch(
          "https://myfirtguide.runasp.net/api/Goal/GetUserGoal",
          { headers }
        );
        if (goalRes.ok) {
          const goalData = await goalRes.json();
          setUserGoal(goalData.userGoal);
        } else {
          console.error("Failed to fetch user goal:", goalRes.status);
          setError("Failed to load user goal.");
        }
      } catch (err) {
        setError(err.message || "Failed to load data.");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.token) {
      fetchMetricsAndGoal();
    } else {
      setLoading(false);
      setError("Please log in to view your summary.");
    }
  }, [currentUser?.token]);

  const handleStartJourney = async () => {
    if (!currentUser?.token) {
      setError("You are not logged in. Please sign in to start your journey.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${currentUser.token}`,
      };

      const nutritionPlanRes = await fetch(
        "https://myfirtguide.runasp.net/api/NutritionPlan/GenerateNutritionPlan",
        { method: "POST", headers }
      );
      if (!nutritionPlanRes.ok) {
        throw new Error("Failed to generate nutrition plan.");
      }
      console.log("Nutrition plan generated successfully.");

      const workoutPlanRes = await fetch(
        "https://myfirtguide.runasp.net/api/WorkOut/GenerateWorkOut",
        { method: "POST", headers }
      );
      if (!workoutPlanRes.ok) {
        throw new Error("Failed to generate workout plan.");
      }
      console.log("Workout plan generated successfully.");

      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to generate plans.");
      console.error("Error generating plans:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  if (!currentMetrics || !userGoal) {
    return (
      <div>
        Could not load your summary. Please ensure you have metrics and a goal
        set.
      </div>
    );
  }

  const weightChange = (userGoal.targetWeight - currentMetrics.weight).toFixed(
    2
  );
  const bmiChange = (userGoal.targetBMI - currentMetrics.currentBBMI).toFixed(
    2
  );
  const muscleMassChange = (
    userGoal.targetMuscleMass - currentMetrics.muscleMass
  ).toFixed(2);
  const fatChange = (userGoal.targetFat - currentMetrics.fat).toFixed(2);

  const isWeightNegative = weightChange < 0;
  const isBmiNegative = bmiChange < 0;
  const isMuscleMassPositive = muscleMassChange > 0;
  const isFatNegative = fatChange < 0;

  return (
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
              <h4>
                <img src="imgs/icons8-check-50.png" alt="" />
                {userGoal.name}
              </h4>
              <p>
                Your personalized plan has been created based on your profile
                and goals.
              </p>
            </div>

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
                    className={isBmiNegative ? "Negativechange" : "Pluschange"}
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
                      isMuscleMassPositive ? "Pluschange" : "Negativechange"
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
                    className={isFatNegative ? "Negativechange" : "Pluschange"}
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

            <div className="btnsSec row col-lg-8 col-10">
              <button className="backBtn col-3">
                <Link to={"/healthconditions"}>back</Link>
              </button>

              <button
                className="continueBack col-8"
                onClick={handleStartJourney}
              >
                start your journey
              </button>
            </div>

            <p className="col-lg-8 col-10 m-2">
              You can always adjust these goals from your profile settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
