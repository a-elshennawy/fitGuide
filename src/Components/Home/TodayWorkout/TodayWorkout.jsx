import { useEffect, useState, useContext } from "react";
import { UserContext } from "../../Contexts/UserContext";
import LoadingSpinner from "../../loadingSpinner";
import { Link } from "react-router-dom";

export default function TodayWorkout() {
  const { currentUser } = useContext(UserContext);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchWorkoutData = async () => {
      if (!currentUser || !currentUser.token) {
        setLoading(false);
        setError("Please log in to view today's workout.");
        return;
      }

      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${currentUser.token}`,
      };

      try {
        const workoutRes = await fetch(
          "https://myfirtguide.runasp.net/api/HomeContoller/GetFirstFiveWorkoutExercises",
          { headers }
        );
        if (workoutRes.ok) {
          const workoutData = await workoutRes.json();
          setWorkoutPlan(workoutData.workOutPlan);
          setExercises(workoutData.exercises || []);
        } else {
          console.error("Failed to fetch workout data:", workoutRes.status);
          setWorkoutPlan(null);
          setExercises([]);
        }
      } catch (err) {
        console.error("Error fetching workout data:", err);
        setError("Failed to load workout plan.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutData();
  }, [currentUser]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  if (!workoutPlan || exercises.length === 0) {
    return (
      <div className="TodayWorkout">
        <div className="container">
          <div className="todayInner row">
            <div className="innerPart row col-lg-8 col-12">
              <div className="header row col-12">
                <img
                  className="col-2"
                  src="imgs/icons8-deadlift-50.png"
                  alt=""
                />
                <h4 className="col-5">Today's Workout Plan</h4>
                <h6 className="col-6">No workout plan available.</h6>
              </div>
              <div className="text-center mt-3">
                <p>Please complete your profile to generate a workout plan.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="TodayWorkout">
        <div className="container">
          <div className="todayInner row">
            <div className="innerPart row col-lg-8 col-12">
              <div className="header row col-12">
                <img
                  className="col-2"
                  src="imgs/icons8-deadlift-50.png"
                  alt=""
                />
                <h4 className="col-5">Today's Workout Plan</h4>
                <h6 className="col-6">
                  {workoutPlan.name} ({workoutPlan.difficultyLevel})
                </h6>
              </div>
              {exercises.map((exercise, index) => (
                <div key={index} className="workout fromBottom row col-12">
                  <img
                    className="col-3"
                    src={
                      exercise.targetMuscle === "Chest"
                        ? "imgs/icons8-arm-50.png"
                        : exercise.targetMuscle === "Back"
                        ? "imgs/icons8-deadlift-50.png"
                        : exercise.targetMuscle === "Legs"
                        ? "imgs/icons8-leg-50.png"
                        : "imgs/icons8-deadlift-50.png"
                    }
                    alt={exercise.name}
                  />
                  <div className="text col-10">
                    <h4>{exercise.name}</h4>
                    <p>
                      {exercise.numberOfSets} sets x {exercise.numberOfReps}{" "}
                      reps
                    </p>
                  </div>
                </div>
              ))}
              <div className="btnSec fromRight col-12">
                <button className="startBtn">
                  <Link to={"workout"}>start workout</Link>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
