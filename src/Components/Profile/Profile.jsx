import UpBtn from "../UpBtn";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";

export default function Profile() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  const getInitials = (name) => {
    const parts = name?.trim().split(" ") || [];
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

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
                <span>{getInitials(currentUser?.name)}</span>
              </div>
              <div className="details col-lg-7 col-5">
                <h3>{currentUser?.name}</h3>
                <p>{currentUser?.bodyMetrics.goal || "No goal set"}</p>
              </div>
              <div className="editBtn col-lg-3 col-12">
                <button className="editPBtn">edit profile</button>
                <button className="logOut" onClick={handleLogout}>
                  log out
                </button>
              </div>
            </div>

            <div className="PSec personalInfo fromLeft col-lg-5 col-10 row">
              <h3 className="col-12">personal information</h3>

              <div className="innerSec col-12">
                <h5>
                  <img src="imgs/icons8-phone-48.png" alt="" />
                  full name
                </h5>
                <h4>{currentUser?.name}</h4>
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
                  phone number
                </h5>
                <h4>{currentUser?.phone || "N/A"}</h4>
              </div>

              <div className="innerSec col-12">
                <h5>
                  <img src="imgs/icons8-country-50.png" alt="" />
                  country
                </h5>
                <h4>{currentUser?.country || "N/A"}</h4>
              </div>
            </div>

            <div className="PSec BMetrics fromRight col-lg-5 col-10 row">
              <h3 className="col-12">body metrics</h3>

              <div className="innerSec col-5">
                <h5>
                  <img src="imgs/icons8-balance-48.png" alt="" />
                  weight
                </h5>
                <h4>{currentUser?.bodyMetrics?.weight || "N/A"} lbs</h4>
              </div>

              <div className="innerSec col-5">
                <h5>
                  <img src="imgs/icons8-ruler-40.png" alt="" />
                  height
                </h5>
                <h4>{currentUser?.bodyMetrics?.height || "N/A"} cm</h4>
              </div>

              <div className="innerSec col-5">
                <h5>
                  <img src="imgs/icons8-chemistry-48.png" alt="" />
                  fat mass
                </h5>
                <h4>{currentUser?.bodyMetrics?.fats || "N/A"} %</h4>
              </div>

              <div className="innerSec col-5">
                <h5>
                  <img src="imgs/icons8-arm-50.png" alt="" />
                  muscle mass
                </h5>
                <h4>{currentUser?.bodyMetrics?.muscleMass || "N/A"} %</h4>
              </div>

              <div className="innerSec col-5">
                <h5>
                  <img src="imgs/icons8-water-50.png" alt="" />
                  water mass
                </h5>
                <h4>{currentUser?.bodyMetrics?.waterMass || "N/A"} %</h4>
              </div>
            </div>

            <div className="PSec goals fromLeft col-lg-5 col-10 row">
              <h3 className="col-12">goals & workout plan</h3>

              <div className="innerSec col-5">
                <h5>
                  <img src="imgs/icons8-target-48.png" alt="" />
                  current goal
                </h5>
                <h4>{currentUser?.bodyMetrics.goal || "N/A"}</h4>
              </div>

              <div className="innerSec col-5">
                <h5>
                  <img src="imgs/icons8-workout-40.png" alt="" />
                  workout plan
                </h5>
                <h4>{currentUser?.bodyMetrics?.level || "N/A"}</h4>
              </div>
            </div>

            <div className="PSec metricH fromRight  col-lg-5 col-10 row">
              <h3 className="col-12">metric history</h3>
            </div>
          </div>
        </div>
      </div>
      <UpBtn />
    </>
  );
}
