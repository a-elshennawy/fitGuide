import { Link } from "react-router-dom";

export default function Start() {
  return (
    <>
      <div className="start">
        <div className="container">
          <div className="startInner fromBottom">
            <h3>Start Your Fitness Journey Today</h3>
            <button className="startSecBtn">
              <Link to={"/signUp"}>create free account</Link>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
