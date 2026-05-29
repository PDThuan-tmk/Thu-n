import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import * as faceapi from "face-api.js";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [page, setPage] = useState("dashboard");
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const faceMatcherRef = useRef(null);

  // ================= FIREBASE =================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      setStudents(
        snapshot.docs.map((docSnap) => ({
          firebaseId: docSnap.id,
          ...docSnap.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  // ================= LOAD MODELS =================
  useEffect(() => {
    const load = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

      setModelsLoaded(true);
    };

    load();
  }, []);

  // ================= ADD =================
  const addStudent = async () => {
    if (!name || !studentClass || !imageUrl) return;

    await addDoc(collection(db, "students"), {
      id: "HS" + Date.now().toString().slice(-6),
      name,
      class: studentClass,
      imageUrl,
      status: "Vắng",
    });

    setName("");
    setStudentClass("");
    setImageUrl("");
  };

  // ================= DELETE =================
  const deleteStudent = async (id) => {
    await deleteDoc(doc(db, "students", id));
  };

  // ================= CAMERA =================
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    await videoRef.current.play().catch(() => {});
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  // ================= IMPORT FILE =================
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      const data = event.target.result;
      let rows = [];

      if (file.name.endsWith(".csv")) {
        rows = Papa.parse(data, { header: true, skipEmptyLines: true }).data;
      } else if (file.name.endsWith(".xlsx")) {
        const wb = XLSX.read(data, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      }

      for (const row of rows) {
        if (!row.name || !row.class) continue;

        await addDoc(collection(db, "students"), {
          id: "HS" + Date.now().toString().slice(-6),
          name: row.name,
          class: row.class,
          imageUrl: row.imageUrl || "",
          status: "Vắng",
        });
      }

      alert("Import thành công!");
    };

    reader.readAsBinaryString(file);
  };

  // ================= STATS =================
  const present = students.filter((s) => s.status === "Có mặt").length;
  const absent = students.filter((s) => s.status === "Vắng").length;

  const chartData = {
    labels: ["Có mặt", "Vắng"],
    datasets: [{ data: [present, absent] }],
  };

  // ================= UI =================
  return (
    <div style={{ display: "flex", fontFamily: "Arial" }}>

      {/* SIDEBAR */}
      <div style={{ width: 220, background: "#111", color: "#fff", padding: 20 }}>
        <h3>SMART SCHOOL AI</h3>

        <p onClick={() => setPage("dashboard")} style={{ cursor: "pointer" }}>Dashboard</p>
        <p onClick={() => setPage("students")} style={{ cursor: "pointer" }}>Students</p>
        <p onClick={() => setPage("camera")} style={{ cursor: "pointer" }}>Camera AI</p>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: 20 }}>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <>
            <h2>Dashboard</h2>
            <p>Total: {students.length}</p>
            <p>Present: {present}</p>
            <p>Absent: {absent}</p>

            <div style={{ width: 300 }}>
              <Pie data={chartData} />
            </div>
          </>
        )}

        {/* STUDENTS */}
        {page === "students" && (
          <>
            <h2>Students Management</h2>

            {/* ADD STUDENT */}
            <div style={{ marginBottom: 20 }}>
              <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                placeholder="Class"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
              />
              <input
                placeholder="Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />

              <button onClick={addStudent}>Add Student</button>
            </div>

            {/* IMPORT BLOCK (RÕ RÀNG + KHÔNG ẨN) */}
            <div
              style={{
                padding: 15,
                border: "2px dashed #999",
                borderRadius: 10,
                marginBottom: 20,
                background: "#f9fafb",
              }}
            >
              <h3>📂 Import học sinh hàng loạt</h3>

              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
              />

              <p style={{ fontSize: 12, color: "gray" }}>
                File phải có cột: name, class, imageUrl
              </p>
            </div>

            {/* TABLE */}
            <table border="1" cellPadding="5">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {students.map((s) => (
                  <tr key={s.firebaseId}>
                    <td>{s.name}</td>
                    <td>{s.class}</td>
                    <td>{s.status}</td>
                    <td>
                      <button onClick={() => deleteStudent(s.firebaseId)}>
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* CAMERA */}
        {page === "camera" && (
          <>
            <h2>Camera AI</h2>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: 320, borderRadius: 10, background: "#000" }}
            />

            <div style={{ marginTop: 10 }}>
              <button onClick={startCamera}>Start</button>
              <button onClick={stopCamera}>Stop</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default App;