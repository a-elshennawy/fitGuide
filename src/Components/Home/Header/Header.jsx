import { Link } from "react-router-dom";

export default function Header() {
  return (
    <>
      <div className="header">
        <div className="container-fluid">
          <div className="headerInner row">
            <div className="textPart col-12">
              <h2 className="title">your AI-Powered</h2>
              <h2 className="subTitle">fitness companion</h2>
              <p className="para">
                personalized workout plans, real-time form correction, and
                nutrition guidance tailored to your goals and needs
              </p>
              <button className="headerBtn">
                <Link to={"/signUp"}>start your fitness journy</Link>
              </button>
            </div>
            <div className="cardsPart row col-12">
              <div className="itemCard fromLeft row col-10 col-lg-3">
                <div className="cardIcon col-12">
                  <img src="imgs/icons8-target-48.png" alt="" />
                </div>
                <div className="cardText">
                  <h4>Smart Workout Plans</h4>
                  <p>
                    Customized training programs that adapt to your fitness
                    level, goals, and any injuries or limitations.
                  </p>
                </div>
              </div>
              <div className="itemCard fromBottom row col-10 col-lg-3">
                <div className="cardIcon col-12">
                  <img src="imgs/icons8-robot-64.png" alt="" />
                </div>
                <div className="cardText">
                  <h4>AI Form Correction</h4>
                  <p>
                    Real-time pose estimation and feedback to ensure proper
                    exercise form and maximize results while preventing
                    injuries.
                  </p>
                </div>
              </div>
              <div className="itemCard fromRight row col-10 col-lg-3">
                <div className="cardIcon col-12">
                  <img src="imgs/icons8-salad-64.png" alt="" />
                </div>
                <div className="cardText">
                  <h4>Nutrition Planning</h4>
                  <p>
                    Personalized meal recommendations and macro tracking to
                    support your fitness goals and dietary preferences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
