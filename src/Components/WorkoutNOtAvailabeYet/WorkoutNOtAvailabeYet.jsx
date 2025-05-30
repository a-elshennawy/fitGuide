import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function WorkoutNOtAvailabeYet() {
  return (
    <>
      <Helmet>
        <title>FitGuide - Workouts not found</title>
      </Helmet>
      <div className="soon">
        <div className="container-fluid">
          <div className="soonInner">
            <div className="soonText">
              <img src="/imgs/icons8-gears-100.png" alt="" />
              <h1>coming soon</h1>
              <h4>the workout you're trying currently has no AI model</h4>
              <div className="btns">
                <button>
                  <Link to={"/"}>home</Link>
                </button>
                <button>
                  <Link to={"/workout"}>workouts</Link>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
