import { Link } from "react-router-dom";

export default function WeightLoss() {
  return (
    <>
      <div className="weightLoss">
        <h6>step 4 of 4</h6>
        <div className="container-fluid">
          <div className="weightLossInner row">
            <div className="progressBar col-10 row">
              <div className="bar col-1"></div>
              <div className="bar col-1"></div>
              <div className="bar col-1"></div>
              <div className="bar col-1"></div>
            </div>

            <div className="innerPart col-6 row">
              <div className="section topSec col-8">
                <h4>
                  <img src="imgs/icons8-check-50.png" alt="" />
                  weight loss
                </h4>
                <p>
                  Your personalized plan has been created based on your profile
                  and goals.
                </p>
              </div>

              <div className="section col-8">
                <div className="header">
                  <h4>Weight Goal</h4>
                </div>

                <div className="content row">
                  <div className="part col-4">
                    <h5>current</h5>
                    <h4>185 lbs</h4>
                  </div>
                  <div className="part col-4">
                    <h5>change</h5>
                    <h4 className="Negativechange">-20 lbs</h4>
                  </div>
                  <div className="part col-4">
                    <h5>target</h5>
                    <h4>165 lbs</h4>
                  </div>
                </div>
              </div>

              <div className="section col-8">
                <div className="header">
                  <h4>BMI Target</h4>
                </div>
                <div className="content row">
                  <div className="part col-4">
                    <h5>current</h5>
                    <h4>27.2</h4>
                  </div>
                  <div className="part col-4">
                    <h5>change</h5>
                    <h4 className="Negativechange">-3.1</h4>
                  </div>
                  <div className="part col-4">
                    <h5>target</h5>
                    <h4>24.1</h4>
                  </div>
                </div>
              </div>

              <div className="section col-8">
                <div className="header">
                  <h4>Muscle Mass Target</h4>
                </div>
                <div className="content row">
                  <div className="part col-4">
                    <h5>current</h5>
                    <h4>28%</h4>
                  </div>
                  <div className="part col-4">
                    <h5>change</h5>
                    <h4 className="Pluschange">+4%</h4>
                  </div>
                  <div className="part col-4">
                    <h5>target</h5>
                    <h4>32%</h4>
                  </div>
                </div>
              </div>

              <div className="btnsSec row col-8">
                <button className="backBtn col-3">
                  <Link to={"/healthconditions"}>back</Link>
                </button>

                <button className="continueBack col-8">
                  <Link to={"/SignIn"}>start your journy</Link>
                </button>
              </div>

              <p className="col-8 m-2">
                You can always adjust these goals from your profile settings
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
