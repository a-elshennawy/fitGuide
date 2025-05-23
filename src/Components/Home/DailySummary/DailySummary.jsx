import { useEffect, useState, useContext } from "react";
import { UserContext } from "../../Contexts/UserContext";
import LoadingSpinner from "../../loadingSpinner";

export default function DailySummary() {
  const { currentUser } = useContext(UserContext);
  const [dailySummary, setDailySummary] = useState(null);
  const [weightData, setWeightData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showUpdateMetricsModal, setShowUpdateMetricsModal] = useState(false);
  const [inputWeight, setInputWeight] = useState("");
  const [inputHeight, setInputHeight] = useState("");
  const [inputFat, setInputFat] = useState("");
  const [inputMuscleMass, setInputMuscleMass] = useState("");
  const [inputWaterMass, setInputWaterMass] = useState("");
  const [inputFitnessLevel, setInputFitnessLevel] = useState("Beginner");
  const [inputGymFrequency, setInputGymFrequency] = useState("");
  const [isUpdatingMetrics, setIsUpdatingMetrics] = useState(false);
  const [updateMetricsError, setUpdateMetricsError] = useState("");
  const [updateMetricsSuccess, setUpdateMetricsSuccess] = useState("");

  const fetchData = async () => {
    if (!currentUser || !currentUser.token) {
      setLoading(false);
      setError("Please log in to view your daily summary.");
      return;
    }

    setLoading(true);
    setError("");

    const headers = {
      Authorization: `Bearer ${currentUser.token}`,
    };

    try {
      const dailySummaryRes = await fetch(
        "https://myfirtguide.runasp.net/api/HomeContoller/DailySummary",
        { headers }
      );
      if (dailySummaryRes.ok) {
        const summaryData = await dailySummaryRes.json();
        console.log("Daily Summary API Response:", summaryData);
        setDailySummary(summaryData);
      } else {
        console.error("Failed to fetch daily summary:", dailySummaryRes.status);
        setDailySummary(null);
      }

      const weightRes = await fetch(
        "https://myfirtguide.runasp.net/api/HomeContoller/WeightTracker",
        { headers }
      );
      if (weightRes.ok) {
        const weightTrackerData = await weightRes.json();
        console.log("Weight Tracker API Response:", weightTrackerData);
        if (weightTrackerData && weightTrackerData.length > 0) {
          setWeightData(weightTrackerData[0]);
        } else {
          setWeightData(null);
        }
      } else {
        console.error("Failed to fetch weight tracker data:", weightRes.status);
        setWeightData(null);
      }
    } catch (err) {
      console.error("Error fetching daily summary data:", err);
      setError("Failed to load daily summary data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleOpenUpdateModal = () => {
    setInputWeight(weightData !== null ? weightData.toFixed(2) : "");

    setInputHeight("");
    setInputFat("");
    setInputMuscleMass("");
    setInputWaterMass("");
    setInputFitnessLevel("Beginner");
    setInputGymFrequency("");

    setUpdateMetricsError("");
    setUpdateMetricsSuccess("");
    setShowUpdateMetricsModal(true);
  };

  const handleCloseUpdateModal = () => {
    setShowUpdateMetricsModal(false);
    setUpdateMetricsError("");
    setUpdateMetricsSuccess("");
  };

  const handleUpdateMetrics = async () => {
    if (!currentUser || !currentUser.token) {
      setUpdateMetricsError("Please log in to update metrics.");
      return;
    }

    setIsUpdatingMetrics(true);
    setUpdateMetricsError("");
    setUpdateMetricsSuccess("");

    const headers = {
      Authorization: `Bearer ${currentUser.token}`,
    };

    const params = new URLSearchParams();
    if (inputWeight !== "") params.append("Weight", parseFloat(inputWeight));
    if (inputHeight !== "") params.append("Height", parseFloat(inputHeight));
    if (inputFat !== "") params.append("Fat", parseFloat(inputFat));
    if (inputMuscleMass !== "")
      params.append("MuscleMass", parseFloat(inputMuscleMass));
    if (inputWaterMass !== "")
      params.append("WaterMass", parseFloat(inputWaterMass));

    if (inputFitnessLevel) params.append("fitnessLevel", inputFitnessLevel);
    if (inputGymFrequency !== "")
      params.append("GymFrequency", parseFloat(inputGymFrequency));

    const apiUrl = `https://myfirtguide.runasp.net/api/UserMetrics/UpdateMetrics?${params.toString()}`;

    try {
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: headers,
      });

      if (response.ok) {
        setUpdateMetricsSuccess("Metrics updated successfully!");
        await fetchData();
        handleCloseUpdateModal();
      } else {
        const errorText = await response.text();
        console.error("Failed to update metrics:", response.status, errorText);
        setUpdateMetricsError(
          `Failed to update metrics: ${response.statusText}. Details: ${errorText}`
        );
      }
    } catch (err) {
      console.error("Error updating metrics:", err);
      setUpdateMetricsError("An error occurred while updating metrics.");
    } finally {
      setIsUpdatingMetrics(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  const calculateProgress = (current, total) => {
    if (!total || total === 0) return 0;
    return ((current / total) * 100).toFixed(2);
  };

  const proteinProgress = calculateProgress(
    dailySummary?.foodIntakeProtein,
    dailySummary?.totalProtein
  );
  const carbsProgress = calculateProgress(
    dailySummary?.foodIntakeCarbs,
    dailySummary?.totalCarbs
  );
  const fatsProgress = calculateProgress(
    dailySummary?.foodIntakeFats,
    dailySummary?.totalFat
  );

  return (
    <>
      <div className="daily">
        <div className="container-fluid">
          <div className="innerPart row">
            <div className="dailySummary fromLeft col-12 col-lg-5 row">
              <h3 className="col-10">daily summary</h3>

              <div className="targs row col-lg-10 col-12">
                <div className="goal col-4">
                  <img src="imgs/icons8-target-48.png" alt="" />
                  <p>goal</p>
                  <h4>{(dailySummary?.totalCalories || 0).toFixed(2)} kcal</h4>
                </div>
                <div className="food col-4">
                  <img
                    src="imgs/icons8-fork-and-knife-with-plate-48.png"
                    alt=""
                  />
                  <p>food intake</p>
                  <h4>{(dailySummary?.foofIntake || 0).toFixed(2)} kcal</h4>
                </div>
                <div className="running col-4">
                  <img src="imgs/icons8-running-48.png" alt="" />
                  <p>remaining</p>
                  <h4>
                    {(dailySummary?.remainingCalories || 0).toFixed(2)} kcal
                  </h4>
                </div>
              </div>

              <div className="tracs row col-lg-10 col-12">
                <div className="protein col-3">
                  <p>protein</p>
                  <h4>
                    <span>
                      {(dailySummary?.foodIntakeProtein || 0).toFixed(2)}g
                    </span>
                    /{(dailySummary?.totalProtein || 0).toFixed(2)}g
                  </h4>
                  <div className="progBar">
                    <div
                      className="progress-fill"
                      style={{ width: `${proteinProgress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="carbs col-3">
                  <p>carbs</p>
                  <h4>
                    <span>
                      {(dailySummary?.foodIntakeCarbs || 0).toFixed(2)}g
                    </span>
                    /{(dailySummary?.totalCarbs || 0).toFixed(2)}g
                  </h4>
                  <div className="progBar">
                    <div
                      className="progress-fill"
                      style={{ width: `${carbsProgress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="fats col-3">
                  <p>fats</p>
                  <h4>
                    <span>
                      {(dailySummary?.foodIntakeFats || 0).toFixed(2)}g
                    </span>
                    /{(dailySummary?.totalFat || 0).toFixed(2)}g
                  </h4>
                  <div className="progBar">
                    <div
                      className="progress-fill"
                      style={{ width: `${fatsProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="weightTrack fromRight col-lg-5 col-12">
              <h3>
                <img src="imgs/icons8-balance-48.png" alt="" /> weight tracker
              </h3>
              <h2>
                {weightData !== null ? `${weightData.toFixed(2)} kg` : "N/A"}
              </h2>
              {/* Removed the previous weight paragraph entirely */}
              <button className="updateW" onClick={handleOpenUpdateModal}>
                update weight
              </button>
            </div>
          </div>
        </div>
      </div>

      {showUpdateMetricsModal && (
        <div
          className="modal"
          style={{
            display: "block",
            backgroundColor: "rgba(0,0,0,0.5)",
            overflowY: "auto",
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            {" "}
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Your Metrics</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseUpdateModal}
                ></button>
              </div>
              <div className="modal-body">
                {updateMetricsError && (
                  <div className="alert alert-danger">{updateMetricsError}</div>
                )}
                {updateMetricsSuccess && (
                  <div className="alert alert-success">
                    {updateMetricsSuccess}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Height (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={inputHeight}
                    onChange={(e) => setInputHeight(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Fat (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={inputFat}
                    onChange={(e) => setInputFat(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Muscle Mass (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={inputMuscleMass}
                    onChange={(e) => setInputMuscleMass(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Water Mass (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={inputWaterMass}
                    onChange={(e) => setInputWaterMass(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Fitness Level</label>
                  <select
                    className="form-select"
                    value={inputFitnessLevel}
                    onChange={(e) => setInputFitnessLevel(e.target.value)}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="InterMediate">InterMediate</option>
                    <option value="Professional">Professional</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Gym Frequency</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control"
                    value={inputGymFrequency}
                    onChange={(e) => setInputGymFrequency(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseUpdateModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleUpdateMetrics}
                  disabled={isUpdatingMetrics}
                >
                  {isUpdatingMetrics ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
