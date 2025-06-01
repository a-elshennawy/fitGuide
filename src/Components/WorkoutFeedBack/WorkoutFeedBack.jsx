import { useEffect, useState, useContext } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../loadingSpinner";
import { UserContext } from "../Contexts/UserContext";

export default function WorkoutFeedBack() {
  const [workoutData, setWorkoutData] = useState();
  const [error, setError] = useState(null);
  const { currentUser } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("current user:", currentUser);
    const storedData = localStorage.getItem("workoutBackup");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setWorkoutData(parsedData[parsedData.length - 1]);
        }
      } catch (error) {
        console.error("Error parsing workouts from local storage", error);
      }
    }
  }, []);

  const handleSaveSession = async () => {
    setError(null);
    if (!currentUser?.token) {
      setError("Please sign up first.");
      return;
    }

    if (!workoutData) {
      setError("No workout data to save.");
      return;
    }

    let exerciseId;
    switch (workoutData.workoutName) {
      case "Bicep Curl":
        exerciseId = 42;
        break;
      case "Squat":
        exerciseId = 41;
        break;
      case "Push-up":
        exerciseId = 39;
        break;
      case "Tricep":
        exerciseId = 40;
        break;
      default:
        setError("Unknown workout name. Cannot save session.");
        return;
    }

    const feedbackArray = workoutData.rep_feedback || [];
    let feedbackToSend;

    const nonGoodFormFeedback = feedbackArray.filter(
      (feedback) => feedback.toLowerCase() !== "good form"
    );

    if (nonGoodFormFeedback.length > 0) {
      feedbackToSend = [...new Set(nonGoodFormFeedback)];
    } else {
      feedbackToSend = ["Good form"];
    }

    const payload = {
      exerciseId: exerciseId,
      feedbackText: feedbackToSend,
    };

    try {
      const response = await fetch(
        "https://myfirtguide.runasp.net/api/ExerciseLog/Save Feedback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save session.");
      }

      console.log("Session saved successfully!");

      navigate("/workout");
    } catch (error) {
      console.error("error saving your session:", error);
      setError(`Failed to save session: ${error.message}`);
    }
  };

  if (!workoutData) {
    console.log("still loading...");
    return (
      <div className="log">
        <div className="container-fluid">
          <div className="logInner row">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  const [hours, minutes, seconds] = workoutData.time.split(":");
  const dataParts = workoutData.date.split("/");

  const workoutDateTime = new Date(
    dataParts[2],
    dataParts[0] - 1,
    dataParts[1],
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds.split(" ")[0])
  );
  workoutDateTime.setHours(workoutDateTime.getHours() + 3);

  const adjustedTime = workoutDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const formattedDate = workoutDateTime.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const feedbackArray = workoutData.rep_feedback || [];
  const uniqueNonGoodFeedback = [
    ...new Set(
      feedbackArray.filter((feedback) => feedback.toLowerCase() !== "good form")
    ),
  ];

  let displayFeedback;
  if (uniqueNonGoodFeedback.length > 0) {
    displayFeedback = uniqueNonGoodFeedback.join(" - ");
  } else {
    displayFeedback = "Good form";
  }

  return (
    <>
      <Helmet>
        <title>FitGuide - Workout feedback</title>
      </Helmet>
      <div className="log">
        <div className="container-fluid">
          <div className="logInner row">
            <div className="logBar row col-12">
              <h4 className="col-3">
                <strong>exercise log</strong>
              </h4>
              <button className="saveBtn" onClick={handleSaveSession}>
                💾 save session
              </button>
            </div>
            <div className="logContent row col-11">
              <div className="exScore row col-12 col-lg-4">
                <h4 className="col-12">
                  <strong>performance score</strong>
                </h4>
                <div className="col-12 score">
                  <h1>{workoutData.performanceScore}%</h1>
                </div>
              </div>

              <div className="detSide col-12 col-lg-5 row">
                <div className="exDetails row col-12 ">
                  <h4 className="col-12">
                    <strong>exercise details</strong>
                  </h4>
                  <div className="details col-12">
                    <ul>
                      <li>
                        <strong>🏋️‍♂️ workout name : </strong>
                        {workoutData.workoutName}
                      </li>
                      <li>
                        <strong>🔁 volume : </strong>
                        {workoutData.sets || 0}&nbsp;sets&nbsp;/&nbsp;
                        {workoutData.reps?.total || 0}
                        &nbsp;reps
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="exFeedBAck row col-12 ">
                  <h4 className="col-12">
                    <strong>AI feedback on your form</strong>
                  </h4>
                  <div className="feedBack col-12">{displayFeedback}</div>
                  <div className="dateTime col-12">
                    {formattedDate} at {adjustedTime}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
