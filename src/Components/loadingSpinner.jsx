import HashLoader from "react-spinners/HashLoader";

export default function LoadingSpinner() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <HashLoader color="#3cb371" cssOverride={{}} speedMultiplier={1} />
    </div>
  );
}
