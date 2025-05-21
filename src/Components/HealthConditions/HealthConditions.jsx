import { useEffect, useState, useContext } from "react";

import { Helmet } from "react-helmet";

import { Link, useNavigate, useLocation } from "react-router-dom";

import { UserContext } from "../Contexts/UserContext";

export default function HealthConditions() {
  const { currentUser } = useContext(UserContext);

  const navigate = useNavigate();

  const location = useLocation();

  const [injuries, setInjuries] = useState([]);

  const [allergies, setAllergies] = useState([]);

  const [selectedInjuryId, setSelectedInjuryId] = useState("");

  const [selectedAllergyId, setSelectedAllergyId] = useState("");

  const [userInjuries, setUserInjuries] = useState([]);

  const [userAllergies, setUserAllergies] = useState([]);

  const [error, setError] = useState("");

  const [workoutPlanNameFromPrev, setWorkoutPlanNameFromPrev] = useState(null);

  useEffect(() => {
    fetch("https://myfirtguide.runasp.net/api/Injury/GetAllInjuries")
      .then((res) => res.json())

      .then((data) =>
        setInjuries(
          data.map((injury, index) => ({ id: index + 1, name: injury }))
        )
      )

      .catch((err) =>
        console.error("HealthConditions: Failed to load injuries:", err)
      );

    fetch("https://myfirtguide.runasp.net/api/Allergy/Show All Allergies")
      .then((res) => res.json())

      .then((data) =>
        setAllergies(
          data.map((allergy, index) => ({ id: index + 1, name: allergy }))
        )
      )

      .catch((err) =>
        console.error("HealthConditions: Failed to load allergies:", err)
      );

    if (location.state && location.state.workoutPlanName) {
      setWorkoutPlanNameFromPrev(location.state.workoutPlanName);

      console.log(
        "HealthConditions: Received workoutPlanName from Body_Metrics:",

        location.state.workoutPlanName
      );
    } else {
      setError(
        "Workout plan information is missing. Please go back to Body Metrics."
      );

      console.warn(
        "HealthConditions: workoutPlanName was NOT passed from Body_Metrics."
      );
    }
  }, [location.state]);

  const handleAddInjury = () => {
    if (selectedInjuryId === "None") {
      setUserInjuries([]);
    } else if (selectedInjuryId && !userInjuries.includes(selectedInjuryId)) {
      setUserInjuries((prev) => [...prev, selectedInjuryId]);
    }

    setSelectedInjuryId("");
  };

  const handleAddAllergy = () => {
    if (selectedAllergyId === "None") {
      setUserAllergies([]);
    } else if (
      selectedAllergyId &&
      !userAllergies.includes(selectedAllergyId)
    ) {
      setUserAllergies((prev) => [...prev, selectedAllergyId]);
    }

    setSelectedAllergyId("");
  };

  const handleContinue = async () => {
    if (!currentUser?.token) {
      setError("Please sign up first.");

      return;
    }

    if (!workoutPlanNameFromPrev) {
      setError(
        "Cannot proceed: Workout plan information is missing from the previous step."
      );

      return;
    }

    try {
      for (const injuryId of userInjuries) {
        if (injuryId === "None") continue;

        const url = new URL(
          "https://myfirtguide.runasp.net/api/Injury/AddInjury"
        );

        url.searchParams.append("id", injuryId);

        const resInjury = await fetch(url.toString(), {
          method: "POST",

          headers: { Authorization: `Bearer ${currentUser.token}` },
        });

        if (!resInjury.ok) {
          const errorText = await resInjury.text();

          if (errorText.includes("already added")) {
            console.warn(
              `HealthConditions: Injury already added (ignoring): ${injuryId}`
            );
          } else {
            const injuryObject = injuries.find(
              (i) => i.id === parseInt(injuryId)
            );

            throw new Error(
              `Failed to add injury: ${
                injuryObject?.name || injuryId
              } - ${errorText}`
            );
          }
        }
      }

      for (const allergyId of userAllergies) {
        if (allergyId === "None") continue;

        const url = new URL(
          "https://myfirtguide.runasp.net/api/Allergy/AddAllergy"
        );

        url.searchParams.append("id", allergyId);

        const resAllergy = await fetch(url.toString(), {
          method: "POST",

          headers: { Authorization: `Bearer ${currentUser.token}` },
        });

        if (!resAllergy.ok) {
          const errorText = await resAllergy.text();

          if (errorText.includes("already added")) {
            console.warn(
              `HealthConditions: Allergy already added (ignoring): ${allergyId}`
            );
          } else {
            const allergyObject = allergies.find(
              (a) => a.id === parseInt(allergyId)
            );

            throw new Error(
              `Failed to add allergy: ${
                allergyObject?.name || allergyId
              } - ${errorText}`
            );
          }
        }
      }

      const injuryNamesToPass = userInjuries

        .map((id) => injuries.find((i) => i.id === parseInt(id))?.name)

        .filter(Boolean);

      const allergyNamesToPass = userAllergies

        .map((id) => allergies.find((a) => a.id === parseInt(id))?.name)

        .filter(Boolean);

      navigate("/GoalSumm", {
        state: {
          workoutPlanName: workoutPlanNameFromPrev,

          userInjuries: injuryNamesToPass,

          userAllergies: allergyNamesToPass,
        },

        replace: true,
      });

      console.log(
        "HealthConditions: Navigating to /GoalSumm with workoutPlanName:",

        workoutPlanNameFromPrev
      );

      console.log("HealthConditions: Passing userInjuries:", injuryNamesToPass);

      console.log(
        "HealthConditions: Passing userAllergies:",

        allergyNamesToPass
      );

      setError("");
    } catch (err) {
      setError(err.message || "Failed to save health conditions.");

      console.error("Health conditions error:", err);
    }
  };

  return (
    <>
      <Helmet>
        <title>FitGuide - Health Conditions</title>
      </Helmet>
      <div className="healthCs">
        <h6>step 3 of 4</h6>
        <div className="container-fluid">
          <div className="healthInner">
            <div className="progressBar row">
              <div className="bar first col-1"></div>
              <div className="bar second col-1"></div>
              <div className="bar third col-1"></div>
              <div className="bar fourth col-1"></div>
            </div>
            <div className="innerPart row">
              <div className="header col-12">
                <h3>Health Conditions</h3>
                <p>Let us know about any injuries or allergies</p>
              </div>
              <div className="section col-12">
                <h4>
                  injuries
                  <img src="imgs/icons8-face-with-head-bandage-48.png" alt="" />
                </h4>
                <select
                  name="injuries"
                  id="injuries"
                  onChange={(e) => setSelectedInjuryId(e.target.value)}
                  value={selectedInjuryId}
                >
                  <option value="" disabled>
                    Select an injury
                  </option>
                  <option value="None">None</option>
                  {injuries.map((injury) => (
                    <option key={injury.id} value={injury.id}>
                      {injury.name}
                    </option>
                  ))}
                </select>
                <button className="addBtn" onClick={handleAddInjury}>
                  add
                </button>
                <ul>
                  {userInjuries.map((injuryId) => {
                    const injury = injuries.find(
                      (i) => i.id === parseInt(injuryId)
                    );

                    return injury ? (
                      <li key={injury.id}>{injury.name}</li>
                    ) : null;
                  })}
                </ul>
              </div>
              <div className="section col-12">
                <h4>
                  allergies
                  <img src="imgs/icons8-sneezing-face-94.png" alt="" />
                </h4>
                <select
                  name="allergies"
                  id="allergies"
                  onChange={(e) => setSelectedAllergyId(e.target.value)}
                  value={selectedAllergyId}
                >
                  <option value="" disabled>
                    Select an allergy
                  </option>
                  <option value="None">None</option>
                  {allergies.map((allergy) => (
                    <option key={allergy.id} value={allergy.id}>
                      {allergy.name}
                    </option>
                  ))}
                </select>
                <button className="addBtn" onClick={handleAddAllergy}>
                  add
                </button>
                <ul>
                  {userAllergies.map((allergyId) => {
                    const allergy = allergies.find(
                      (a) => a.id === parseInt(allergyId)
                    );

                    return allergy ? (
                      <li key={allergy.id}>{allergy.name}</li>
                    ) : null;
                  })}
                </ul>
              </div>
              {error && <p className="text-danger mt-2 col-12">{error}</p>}
              <div className="btnsSec row col-12">
                <button className="backBtn col-3">
                  <Link to={"/bodymetrics"}>back</Link>
                </button>
                <button className="continueBack col-8" onClick={handleContinue}>
                  continue
                </button>
              </div>
              <p className="col-12 m-2">
                You can always update these in your profile settings
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
