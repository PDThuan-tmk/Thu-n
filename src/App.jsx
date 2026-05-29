import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc
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

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ================= FIREBASE =================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      let data = snapshot.docs.map((docSnap) => ({
        firebaseId: docSnap.id,
        ...docSnap.data()
      }));

      // remove duplicates by id (fix lỗi import bị lặp)
      const uniqueMap = new Map();
      data.forEach(s => {
        const key = s.id || s.firebaseId;
        if (!uniqueMap.has(key)) uniqueMap.set(key, s);
      });

      setStudents([...uniqueMap.values()]);
    });

    return () => unsub();
  }, []);

  // ================= ADD =================
  const addStudent = async () => {
    if (!name || !studentClass || !imageUrl) return;

    await addDoc(collection(db, "students"), {
      id: "HS" + Date.now().toString().slice(-6),
      name,
      class: studentClass.trim().toUpperCase(),
      imageUrl,
      status: "Vắng"
    });

    setName("");
    setStudentClass("");
    setImageUrl("");
  };

  // ================= DELETE =================
  const deleteStudent = async (id) => {
    await deleteDoc(doc(db, "students", id));
  };

  // ================= TOGGLE STATUS =================
  const toggleStatus = async (firebaseId, current) => {
    await updateDoc(doc(db, "students", firebaseId), {
      status: current === "Có mặt" ? "Vắng" : "Có mặt"
    });
  };

  // ================= CAMERA =================
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    await videoRef.current.play().catch(() => {});
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  // ================= IMPORT =================
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      const data = event.target.result;
      let rows = [];

      if (file.name.endsWith(".csv")) {
        rows = Papa.parse(data, { header: true }).data;
      } else {
        const wb = XLSX.read(data, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      }

      for (const row of rows) {
        if (!row.name || !row.class) continue;

        await addDoc(collection(db, "students"), {
          id: "HS" + Date.now().toString().slice(-6) + Math.random(),
          name: row.name,
          class: row.class.trim().toUpperCase(),
          imageUrl: row.imageUrl || "",
          status: "Vắng"
        });
      }

      alert("Import thành công!");
    };

    reader.readAsBinaryString(file);
  };

  // ================= STATS =================
  const present = students.filter(s => s.status === "Có mặt").length;
  const absent = students.filter(s => s.status === "Vắng").length;

  const chartData = {
    labels: ["Có mặt", "Vắng"],
    datasets: [{ data: [present, absent] }]
  };

  // ================= GROUP + SORT FIXED =================
  const groupedStudents = useMemo(() => {
    const sorted = [...students]
      .sort((a, b) => {
        if ((a.class || "") !== (b.class || "")) {
          return (a.class || "").localeCompare(b.class || "");
        }
        return (a.name || "").localeCompare(b.name || "", "vi");
      });

    const groups = {};

    sorted.forEach(s => {
      const key = (s.class || "Chưa phân lớp").trim().toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    return groups;
  }, [students]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50">

      {/* HEADER */}
      <div className="bg-blue-900 text-white p-4 flex justify-between items-center shadow">
        <div>
          <h1 className="text-2xl font-bold">🏫 Smart School System</h1>
          <p className="text-sm opacity-80">Quản lý học sinh chuẩn hóa theo lớp & trạng thái</p>
        </div>

        <div className="space-x-2">
          <button onClick={() => setPage("dashboard")} className="bg-white text-blue-900 px-3 py-1 rounded">Dashboard</button>
          <button onClick={() => setPage("students")} className="bg-white text-blue-900 px-3 py-1 rounded">Học sinh</button>
          <button onClick={() => setPage("camera")} className="bg-white text-blue-900 px-3 py-1 rounded">Camera</button>
        </div>
      </div>

      <div className="p-6">

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div>
            <h2 className="text-xl font-bold mb-4">📊 Tổng quan</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded shadow border-l-4 border-blue-600">Tổng: {students.length}</div>
              <div className="bg-white p-4 rounded shadow border-l-4 border-green-600">Có mặt: {present}</div>
              <div className="bg-white p-4 rounded shadow border-l-4 border-red-600">Vắng: {absent}</div>
            </div>

            <div className="bg-white p-4 rounded shadow w-80">
              <Pie data={chartData} />
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {page === "students" && (
          <div>
            <h2 className="text-xl font-bold mb-4">🎓 Danh sách học sinh (đã fix lỗi sắp xếp)</h2>

            <div className="bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <input className="border p-2 rounded" placeholder="Tên" value={name} onChange={e => setName(e.target.value)} />
              <input className="border p-2 rounded" placeholder="Lớp" value={studentClass} onChange={e => setStudentClass(e.target.value)} />
              <input className="border p-2 rounded" placeholder="Ảnh" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              <button className="bg-blue-700 text-white rounded" onClick={addStudent}>Thêm</button>
            </div>

            <div className="bg-white p-4 rounded shadow mb-4">
              <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} />
            </div>

            <div className="space-y-6">
              {Object.keys(groupedStudents).sort().map(className => (
                <div key={className} className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold text-blue-800 mb-2">📚 Lớp {className}</h3>

                  <table className="w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="p-2">Tên</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedStudents[className].map(s => (
                        <tr key={s.firebaseId} className="border-t">
                          <td className="p-2">{s.name}</td>
                          <td>
                            <button onClick={() => toggleStatus(s.firebaseId, s.status)} className={s.status === "Có mặt" ? "text-green-600" : "text-red-600"}>
                              {s.status}
                            </button>
                          </td>
                          <td>
                            <button className="text-red-600" onClick={() => deleteStudent(s.firebaseId)}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CAMERA */}
        {page === "camera" && (
          <div>
            <h2 className="text-xl font-bold mb-4">📷 AI Camera</h2>

            <video ref={videoRef} autoPlay playsInline className="w-80 rounded border-4 border-blue-300" />

            <div className="mt-4 space-x-2">
              <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={startCamera}>Start</button>
              <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={stopCamera}>Stop</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;