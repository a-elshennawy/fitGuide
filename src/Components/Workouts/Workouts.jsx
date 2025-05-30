import { useEffect, useState, useContext } from "react";
import { UserContext } from "../Contexts/UserContext";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../Components/loadingSpinner";
import UpBtn from "../UpBtn";
import { Helmet } from "react-helmet";

export default function Workouts() {
  const { currentUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showSwitchPlanModal, setShowSwitchPlanModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedPlanType, setSelectedPlanType] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState("");
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [updatePlanError, setUpdatePlanError] = useState("");
  const [updatePlanSuccess, setUpdatePlanSuccess] = useState("");
  const [workoutPlan, setWorkoutPlan] = useState(null);

  const fetchWorkouts = async () => {
    if (!currentUser || !currentUser.token) {
      setLoading(false);
      setError("Please log in to view workouts.");
      return;
    }

    setLoading(true);
    setError("");

    const headers = {
      Authorization: `Bearer ${currentUser.token}`,
    };

    try {
      const response = await fetch(
        "https://myfirtguide.runasp.net/api/WorkOut/GetMyWorkOutPlan",
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("API Response from GetMyWorkOutPlan:", data);

        if (data && Array.isArray(data) && data.length > 0) {
          setWorkoutPlan(data[0].workOutPlan);
          if (Array.isArray(data[0].exercises)) {
            const targetExerciseIds = [39, 40, 42, 41];

            const filteredExercises = data[0].exercises.filter((ex) =>
              targetExerciseIds.includes(ex.exerciseId)
            );

            setExercises(
              filteredExercises.map((ex, index) => ({
                ...ex,
                exerciseId: ex.exerciseId || index + 1,
              }))
            );
          } else {
            setExercises([]);
          }
        } else {
          setExercises([]);
          setWorkoutPlan(null);
        }
      } else {
        console.error("Failed to fetch workouts:", response.status);
      }
    } catch (err) {
      console.error("Error fetching workouts:", err);
      setError("Failed to load workouts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, [currentUser]);

  const handleWatchTutorial = async (exerciseId) => {
    if (!currentUser || !currentUser.token) {
      alert("Please log in to watch tutorials.");
      return;
    }

    const headers = {
      Authorization: `Bearer ${currentUser.token}`,
    };

    try {
      const response = await fetch(
        `https://myfirtguide.runasp.net/api/WorkOut/WatchTutorial?id=${exerciseId}`,
        { headers }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to fetch tutorial for exercise ID ${exerciseId}:`,
          response.status,
          response.statusText,
          errorText
        );
        alert(
          `Failed to load tutorial. Status: ${response.status}. Please try again later.`
        );
        return;
      }

      const tutorialLink = await response.text();
      console.log(`Tutorial link received: ${tutorialLink}`);

      if (tutorialLink && tutorialLink.startsWith("http")) {
        window.open(tutorialLink, "_blank");
      } else {
        console.error("Invalid tutorial link received:", tutorialLink);
        alert("Invalid tutorial link received from the server.");
      }
    } catch (err) {
      console.error("Error watching tutorial:", err);
      alert(
        "An error occurred while trying to watch the tutorial. Check the console for details."
      );
    }
  };

  const handleTryIt = async (exerciseId) => {
    if (!currentUser || !currentUser.token) {
      alert("Please log in to try this workout.");
      return;
    }

    if (exerciseId == 39) {
      window.location.href = "/AI_Models/pushup/index.html";
    } else if (exerciseId == 40) {
      window.location.href = "/AI_Models/tricep/index.html";
    } else if (exerciseId == 41) {
      window.location.href = "/AI_Models/squat/index.html";
    } else if (exerciseId == 42) {
      window.location.href = "/AI_Models/bicepCurl/index.html";
    } else {
      navigate("/WorkoutNotAvailableYet");
    }
  };

  const fetchAvailablePlans = async () => {
    if (!currentUser || !currentUser.token) {
      setPlansError("Please log in to view available plans.");
      return;
    }

    setLoadingPlans(true);
    setPlansError("");

    const headers = {
      Authorization: `Bearer ${currentUser.token}`,
    };

    try {
      const response = await fetch(
        "https://myfirtguide.runasp.net/api/WorkOut/ShowAllWorkOutPlans",
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("Available Plans API Response:", data);
        setAvailablePlans(data);

        if (data.length > 0) {
          setSelectedPlanType(data[0].planType || data[0].name || data[0]);
        }
      } else {
        console.error("Failed to fetch available plans:", response.status);
        setPlansError("Failed to load available plans.");
        setAvailablePlans([]);
      }
    } catch (err) {
      console.error("Error fetching available plans:", err);
      setPlansError("An error occurred while fetching plans.");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleOpenSwitchPlanModal = () => {
    setUpdatePlanError("");
    setUpdatePlanSuccess("");
    setShowSwitchPlanModal(true);
    fetchAvailablePlans();
  };

  const handleCloseSwitchPlanModal = () => {
    setShowSwitchPlanModal(false);
    setUpdatePlanError("");
    setUpdatePlanSuccess("");
    setAvailablePlans([]);
    setSelectedPlanType("");
  };

  const handleUpdateWorkoutPlan = async () => {
    if (!currentUser || !currentUser.token) {
      setUpdatePlanError("Please log in to update your plan.");
      return;
    }
    if (!selectedPlanType) {
      setUpdatePlanError("Please select a plan type.");
      return;
    }

    setIsUpdatingPlan(true);
    setUpdatePlanError("");
    setUpdatePlanSuccess("");

    const headers = {
      Authorization: `Bearer ${currentUser.token}`,
      "Content-Type": "application/json",
    };

    const apiUrl = `https://myfirtguide.runasp.net/api/WorkOut/updateWorkOut?planType=${encodeURIComponent(
      selectedPlanType
    )}`;

    try {
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: headers,
      });

      if (response.ok) {
        setUpdatePlanSuccess("Workout plan updated successfully!");
        await fetchWorkouts();
        handleCloseSwitchPlanModal();
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to update workout plan:",
          response.status,
          errorText
        );
        setUpdatePlanError(
          `Failed to update plan: ${response.statusText}. Details: ${errorText}`
        );
      }
    } catch (err) {
      console.error("Error updating workout plan:", err);
      setUpdatePlanError("An error occurred while updating the workout plan.");
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  return (
    <>
      <Helmet>
        <title>FitGuide - Workouts</title>
      </Helmet>
      <div className="workouts">
        <div className="container-fluid">
          <div className="workoutsInner row">
            {workoutPlan && (
              <div className="workout-plan-header col-lg-10 col-12">
                <h2>{workoutPlan.name}</h2>
                {workoutPlan.alert && (
                  <div className="alert alert-warning theAlert">
                    <strong>note:</strong> {workoutPlan.alert}
                  </div>
                )}
              </div>
            )}
            <div className="workoutItems col-lg-10 col-12 row">
              {exercises.map((exercise) => (
                <div
                  key={exercise.exerciseId}
                  className="workout fromBottom row col-lg-8 col-12"
                >
                  <div className="img col-lg-1 col-5">
                    <img src="imgs/icons8-arm-50.png" alt="Arm icon" />
                  </div>
                  <div className="details col-lg-9 col-5">
                    <h4>{exercise.name}</h4>
                    <p>
                      {exercise.description ||
                        `targets ${exercise.targetMuscle}`}
                    </p>
                    <small className="text-muted">
                      Max weight: {exercise.maximumWeight} kg
                    </small>
                  </div>
                  <div className="reps col-lg-2 col-12">
                    <h4>
                      {exercise.numberOfSets} x {exercise.numberOfReps}
                    </h4>
                  </div>
                  <div className="btns row col-12">
                    <button
                      className="tryBtn col-5"
                      onClick={() => handleTryIt(exercise.exerciseId)}
                    >
                      try it
                    </button>
                    <button
                      className="watch col-5"
                      onClick={() => handleWatchTutorial(exercise.exerciseId)}
                    >
                      watch
                    </button>
                  </div>
                </div>
              ))}
              <div className="btns fromLeft col-lg-10 col-12">
                <button className="switch" onClick={handleOpenSwitchPlanModal}>
                  🔄 Switch Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showSwitchPlanModal && (
        <div
          className="modal"
          style={{
            display: "block",
            backgroundColor: "rgba(0,0,0,0.5)",
            overflowY: "auto",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Switch Workout Plan</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseSwitchPlanModal}
                ></button>
              </div>
              <div className="modal-body">
                {updatePlanError && (
                  <div className="alert alert-danger">{updatePlanError}</div>
                )}
                {updatePlanSuccess && (
                  <div className="alert alert-success">{updatePlanSuccess}</div>
                )}
                {loadingPlans ? (
                  <LoadingSpinner />
                ) : plansError ? (
                  <div className="alert alert-danger">{plansError}</div>
                ) : (
                  <div className="mb-3">
                    <label htmlFor="planSelect" className="form-label">
                      Select a new workout plan:
                    </label>
                    <select
                      id="planSelect"
                      className="form-select"
                      value={selectedPlanType}
                      onChange={(e) => setSelectedPlanType(e.target.value)}
                    >
                      <option value="">-- Please select --</option>
                      {availablePlans.map((plan, index) => (
                        <option
                          key={plan.planType || plan.name || index}
                          value={plan.planType || plan.name || plan}
                        >
                          {plan.name || plan.planType || plan}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseSwitchPlanModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleUpdateWorkoutPlan}
                  disabled={isUpdatingPlan || !selectedPlanType}
                >
                  {isUpdatingPlan ? "Switching..." : "Switch Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <UpBtn />
    </>
  );
}
