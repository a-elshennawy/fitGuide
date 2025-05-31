import UpBtn from "../UpBtn";
import { Helmet } from "react-helmet";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../Contexts/UserContext";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../Components/loadingSpinner";

export default function Profile() {
  const { currentUser, logout } = useContext(UserContext);
  const navigate = useNavigate();

  const [userMetrics, setUserMetrics] = useState(null);
  const [userGoal, setUserGoal] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!currentUser || !currentUser.token) {
        setLoading(false);
        setError("Please log in to view your profile.");
        if (!currentUser && !loading) {
          navigate("/SignIn");
        }
        return;
      }

      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${currentUser.token}`,
      };

      try {
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
            setUserMetrics(
              metricsData[0].userMetrics[metricsData[0].userMetrics.length - 1]
            );
          } else {
            setUserMetrics(null);
          }
        } else {
          console.error("Failed to fetch user metrics:", metricsRes.status);
          setUserMetrics(null);
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
          setUserGoal(null);
        }

        const workoutRes = await fetch(
          "https://myfirtguide.runasp.net/api/WorkOut/GetMyWorkOutPlan",
          { headers }
        );
        if (workoutRes.ok) {
          const workoutData = await workoutRes.json();

          if (
            workoutData &&
            Array.isArray(workoutData) &&
            workoutData.length > 0 &&
            workoutData[0].workOutPlan
          ) {
            setWorkoutPlan(workoutData[0].workOutPlan);
          } else {
            setWorkoutPlan(null);
          }
        } else {
          console.warn("Failed to fetch workout plan, setting to N/A.");
          setWorkoutPlan(null);
        }
      } catch (err) {
        console.error("Error fetching profile data:", err);
        setError("Failed to load some profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [currentUser, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = (name) => {
    if (typeof name !== "string" || !name.trim()) return "U";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase() || "U";
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser && !loading) {
    return (
      <div className="text-danger">
        {error || "You need to log in to view this page."}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>FitGuide - Profile</title>
      </Helmet>
      <div className="profile">
        <div className="container-fluid">
          <div className="profileInner row">
            <div className="PSec profileEdit fromBottom row col-lg-10 col-12">
              <div className="img col-lg-1 col-5">
                <span>{getInitials(currentUser?.fullName)}</span>
              </div>
              <div className="details col-lg-7 col-5">
                <h3>{currentUser?.fullName}</h3>
                <p>{userGoal?.name || "No goal set"}</p>
              </div>
              <div className="Btns col-lg-3 col-12">
                <button className="logOut" onClick={handleLogout}>
                  log out
                </button>
              </div>
            </div>

            <div className="PSec personalInfo fromLeft col-lg-5 col-12 row">
              <h3 className="col-12">personal information</h3>
              <div className="innerSec col-12">
                <h5>
                  <img src="imgs/icons8-person-48.png" alt="" />
                  full name
                </h5>
                <h4>{currentUser?.fullName}</h4>
              </div>

              <div className="innerSec col-12">
                <h5>
                  <img src="imgs/icons8-email-48.png" alt="" />
                  email
                </h5>
                <h4>{currentUser?.email}</h4>
              </div>

              <div className="innerSec col-12">
                <h5>
                  <img src="imgs/icons8-phone-48.png" alt="" />
                  phone
                </h5>
                <h4>{currentUser?.phoneNumber}</h4>
              </div>

              <div className="innerSec col-12">
                <h5>
                  <img src="imgs/icons8-country-50.png" alt="" />
                  country
                </h5>
                <h4>{currentUser?.country}</h4>
              </div>
            </div>

            <div className="rightSide row col-12 col-lg-5">
              <div className="PSec BMetrics fromRight col-12 row">
                <h3 className="col-12">body metrics</h3>
                <div className="innerSec col-5">
                  <h5>
                    <img src="imgs/icons8-balance-48.png" alt="" />
                    weight
                  </h5>
                  <h4>{userMetrics?.weight || "N/A"} kg</h4>
                </div>
                <div className="innerSec col-5">
                  <h5>
                    <img src="imgs/icons8-ruler-40.png" alt="" />
                    height
                  </h5>
                  <h4>{userMetrics?.height || "N/A"} cm</h4>
                </div>
                <div className="innerSec col-5">
                  <h5>
                    <img src="imgs/icons8-chemistry-48.png" alt="" />
                    fat mass
                  </h5>
                  <h4>{userMetrics?.fat || "N/A"} %</h4>
                </div>
                <div className="innerSec col-5">
                  <h5>
                    <img src="imgs/icons8-arm-50.png" alt="" />
                    muscle mass
                  </h5>
                  <h4>{userMetrics?.muscleMass || "N/A"} %</h4>
                </div>
                <div className="innerSec col-5">
                  <h5>
                    <img src="imgs/icons8-water-50.png" alt="" />
                    water mass
                  </h5>
                  <h4>{userMetrics?.waterMass || "N/A"} %</h4>
                </div>
              </div>

              <div className="PSec goals fromLeft col-12 row">
                <h3 className="col-12">goals & workout plan</h3>
                <div className="innerSec col-5">
                  <h5>
                    <img src="imgs/icons8-target-48.png" alt="" />
                    current goal
                  </h5>
                  <h4>{userGoal?.name || "N/A"}</h4>
                </div>
                <div className="innerSec col-5">
                  <h5>
                    <img src="imgs/icons8-workout-40.png" alt="" />
                    workout plan
                  </h5>
                  <h4>{workoutPlan?.name || "N/A"}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <UpBtn />
    </>
  );
}
