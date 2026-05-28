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

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  // ================= STATE =================
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState("dashboard");

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ================= FIREBASE =================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        firebaseId: docSnap.id,
        ...docSnap.data(),
      }));
      setStudents(list);
    });

    return () => unsub();
  }, []);

  // ================= ADD =================
  const addStudent = async () => {
    if (!name || !studentClass) return;

    await addDoc(collection(db, "students"), {
      id: "HS" + Date.now().toString().slice(-6),
      name,
      class: studentClass,
      status: "Vắng",
    });

    setName("");
    setStudentClass("");
  };

  // ================= DELETE =================
  const deleteStudent = async (id) => {
    await deleteDoc(doc(db, "students", id));
  };

  // ================= TOGGLE STATUS =================
  const toggleStatus = async (s) => {
    await updateDoc(doc(db, "students", s.firebaseId), {
      status: s.status === "Có mặt" ? "Vắng" : "Có mặt",
    });
  };

  // ================= CAMERA (FIXED) =================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // camera trước
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // mirror giống selfie
        videoRef.current.style.transform = "scaleX(-1)";
      }
    } catch (err) {
      console.error(err);
      alert("Không mở được camera");
    }
  };

  // ================= CLEANUP CAMERA =================
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ================= FILTER =================
  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.class.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  // ================= CHART =================
  const present = students.filter((s) => s.status === "Có mặt").length;
  const absent = students.filter((s) => s.status === "Vắng").length;

  const chartData = {
    labels: ["Có mặt", "Vắng"],
    datasets: [
      {
        data: [present, absent],
        backgroundColor: ["#22c55e", "#ef4444"],
      },
    ],
  };

  // ================= UI =================
  return (
    <div style={{ display: "flex", fontFamily: "Arial" }}>

      {/* SIDEBAR */}
      <div style={{ width: 250, background: "#1e293b", color: "white", padding: 20 }}>
        <h2>SMART SCHOOL</h2>

        <p onClick={() => setPage("dashboard")} style={{ cursor: "pointer" }}>
          🏠 Dashboard
        </p>

        <p onClick={() => setPage("students")} style={{ cursor: "pointer" }}>
          👨‍🎓 Học sinh
        </p>

        <p onClick={() => setPage("camera")} style={{ cursor: "pointer" }}>
          📷 Camera AI
        </p>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: 30, background: "#f1f5f9" }}>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div>
            <h1>Dashboard</h1>

            <div style={{ display: "flex", gap: 20 }}>
              <div>Tổng: {students.length}</div>
              <div>Có mặt: {present}</div>
              <div>Vắng: {absent}</div>
            </div>

            <div style={{ width: 400, marginTop: 20 }}>
              <Pie data={chartData} />
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {page === "students" && (
          <div>
            <h1>Học sinh</h1>

            <input
              placeholder="Tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Lớp"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
            />

            <button onClick={addStudent}>Thêm</button>

            <br /><br />

            <input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <table style={{ width: "100%", marginTop: 20 }}>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên</th>
                  <th>Lớp</th>
                  <th>Trạng thái</th>
                  <th>Xóa</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((s) => (
                  <tr key={s.firebaseId}>
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                    <td>{s.class}</td>

                    <td>
                      <button onClick={() => toggleStatus(s)}>
                        {s.status}
                      </button>
                    </td>

                    <td>
                      <button onClick={() => deleteStudent(s.firebaseId)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CAMERA */}
        {page === "camera" && (
          <div>
            <h1>📷 Camera AI</h1>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: "300px",
                borderRadius: 12,
                background: "black",
              }}
            />

            <br />

            <button onClick={startCamera} style={{ marginTop: 10 }}>
              Bật camera
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;