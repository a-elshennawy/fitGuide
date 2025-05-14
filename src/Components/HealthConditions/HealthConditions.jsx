import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function HealthConditions() {
  const [injuries, setInjuries] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [selectedInjury, setSelectedInjury] = useState("");
  const [selectedAllergy, setSelectedAllergy] = useState("");
  const [userInjuries, setUserInjuries] = useState([]);
  const [userAllergies, setUserAllergies] = useState([]);

  useEffect(() => {
    fetch("http://myfitguide.runasp.net/api/Injury/GetInjuries")
      .then((res) => res.json())
      .then((data) => setInjuries(data))
      .catch((err) => console.error("Failed to load injuries:", err));

    fetch("http://myfitguide.runasp.net/api/Allergy/Show All Allergies")
      .then((res) => res.json())
      .then((data) => setAllergies(data))
      .catch((err) => console.error("Failed to load allergies:", err));
  }, []);

  const saveToLocalStorage = (updatedInjuries, updatedAllergies) => {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    user.injuries = updatedInjuries;
    user.allergies = updatedAllergies;
    localStorage.setItem("user", JSON.stringify(user));
  };

  const handleAddInjury = () => {
    if (selectedInjury === "None") {
      setUserInjuries([]);
      saveToLocalStorage([], userAllergies);
    } else if (selectedInjury && !userInjuries.includes(selectedInjury)) {
      const updated = [...userInjuries, selectedInjury];
      setUserInjuries(updated);
      saveToLocalStorage(updated, userAllergies);
    }
  };

  const handleAddAllergy = () => {
    if (selectedAllergy === "None") {
      setUserAllergies([]);
      saveToLocalStorage(userInjuries, []);
    } else if (selectedAllergy && !userAllergies.includes(selectedAllergy)) {
      const updated = [...userAllergies, selectedAllergy];
      setUserAllergies(updated);
      saveToLocalStorage(userInjuries, updated);
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
                  onChange={(e) => setSelectedInjury(e.target.value)}
                >
                  <option value="None">None</option>
                  {injuries.map((injury, index) => (
                    <option key={index} value={injury}>
                      {injury}
                    </option>
                  ))}
                </select>
                <button className="addBtn" onClick={handleAddInjury}>
                  add
                </button>
                <ul>
                  {userInjuries.map((injury, index) => (
                    <li key={index}>{injury}</li>
                  ))}
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
                  onChange={(e) => setSelectedAllergy(e.target.value)}
                >
                  <option value="None">None</option>
                  {allergies.map((allergy) => (
                    <option key={allergy.id} value={allergy.name}>
                      {allergy.name}
                    </option>
                  ))}
                </select>
                <button className="addBtn" onClick={handleAddAllergy}>
                  add
                </button>
                <ul>
                  {userAllergies.map((allergy, index) => (
                    <li key={index}>{allergy}</li>
                  ))}
                </ul>
              </div>

              <div className="btnsSec row col-12">
                <button className="backBtn col-3">
                  <Link to={"/bodymetrics"}>back</Link>
                </button>
                <button className="continueBack col-8">
                  <Link to={"/weightloss"}>continue</Link>
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
