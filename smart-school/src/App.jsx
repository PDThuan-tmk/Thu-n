import AddStudent from "./AddStudent";
import Camera from "./camera";

export default function App() {
  return (
    <div style={{ textAlign: "center" }}>
      <h1>Smart School AI</h1>

      <AddStudent />

      <hr />

      <Camera />
    </div>
  );
}