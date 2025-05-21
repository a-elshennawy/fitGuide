import React from "react";

export default function WorkoutFeedBack() {
  return (
    <>
      <div className="log">
        <div className="container-fluid">
          <div className="logInner row">
            <div className="logBar row col-12">
              <h4 className="col-3">
                <strong>exercise log</strong>
              </h4>
              <button className="saveBtn">💾 save session</button>
            </div>
            <div className="logContent row col-11">
              <div className="exVid col-6">
                <div className="vidRec">
                  <video src=""></video>
                </div>
                <div className="footer">
                  <p className="text-muted">
                    Recorded on: 12 May 2025 at 4:17 PM
                  </p>
                </div>
              </div>
              <div className="exScore row col-4">
                <h4 className="col-12">
                  <strong>performance score</strong>
                </h4>
                <div className="col-12 score">
                  <h1>86%</h1>
                </div>
              </div>
              <div className="exFeedBAck row col-6">
                <h4 className="col-12">
                  <strong>AI feedback on your form</strong>
                </h4>
              </div>
              <div className="exDetails row col-4">
                <h4 className="col-12">
                  <strong>exercise details</strong>
                </h4>
                <div className="details col-12">
                  <ul>
                    <li>
                      <strong>workout name</strong>
                    </li>
                    <li>
                      <strong>volume</strong>
                    </li>
                    <li>
                      <strong>weight used</strong>
                    </li>
                    <li>
                      <strong>duration</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
