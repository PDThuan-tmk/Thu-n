```jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "./firebase";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as faceapi from "face-api.js";

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  // ================= STATE =================
  const [students, setStudents] = useState([]);

  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [page, setPage] = useState("dashboard");

  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  // ================= FIREBASE =================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        firebaseId: docSnap.id,
        ...docSnap.data(),
      }));

      setStudents(data);
    });

    return () => unsub();
  }, []);

  // ================= LOAD AI MODELS =================
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");

        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

        setModelsLoaded(true);

        console.log("✅ AI Models Loaded");
      } catch (err) {
        console.log(err);
      }
    };

    loadModels();
  }, []);

  // ================= ADD STUDENT =================
  const addStudent = async () => {
    if (!name || !studentClass) return;

    await addDoc(collection(db, "students"), {
      id: "HS" + Date.now().toString().slice(-6),
      name,
      class: studentClass.trim().toUpperCase(),
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

  // ================= TOGGLE STATUS =================
  const toggleStatus = async (id, current) => {
    await updateDoc(doc(db, "students", id), {
      status: current === "Có mặt" ? "Vắng" : "Có mặt",
    });
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
        rows = Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
        }).data;
      } else if (file.name.endsWith(".xlsx")) {
        const wb = XLSX.read(data, { type: "binary" });

        const sheet = wb.Sheets[wb.SheetNames[0]];

        rows = XLSX.utils.sheet_to_json(sheet);
      }

      for (const row of rows) {
        if (!row.name || !row.class) continue;

        await addDoc(collection(db, "students"), {
          id:
            "HS" +
            Date.now().toString().slice(-6) +
            Math.floor(Math.random() * 1000),

          name: row.name,

          class: row.class.trim().toUpperCase(),

          imageUrl: row.imageUrl || "",

          status: "Vắng",
        });
      }

      alert("✅ Import thành công!");
    };

    reader.readAsBinaryString(file);
  };

  // ================= CAMERA =================
  const detectFace = async () => {
    if (!videoRef.current || !modelsLoaded) return;

    const detections = await faceapi.detectAllFaces(
      videoRef.current,
      new faceapi.TinyFaceDetectorOptions()
    );

    console.log("Faces:", detections.length);

    if (detections.length > 0) {
      console.log("✅ Đã phát hiện khuôn mặt");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      videoRef.current.srcObject = stream;

      await videoRef.current.play();

      intervalRef.current = setInterval(() => {
        detectFace();
      }, 2000);

    } catch (err) {
      console.log(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // ================= STATS =================
  const present = students.filter(
    (s) => s.status === "Có mặt"
  ).length;

  const absent = students.filter(
    (s) => s.status === "Vắng"
  ).length;

  const chartData = {
    labels: ["Có mặt", "Vắng"],
    datasets: [
      {
        data: [present, absent],
      },
    ],
  };

  // ================= GROUP DATA =================
  const structured = useMemo(() => {
    const res = {};

    students.forEach((s) => {
      const cls = (s.class || "").toUpperCase();

      const block = cls.match(/\d+/)?.[0] || "KHÁC";

      if (!res[block]) res[block] = {};

      if (!res[block][cls]) {
        res[block][cls] = [];
      }

      res[block][cls].push(s);
    });

    Object.keys(res).forEach((block) => {
      Object.keys(res[block]).forEach((cls) => {
        res[block][cls].sort((a, b) =>
          (a.name || "").localeCompare(
            b.name || "",
            "vi"
          )
        );
      });
    });

    return res;
  }, [students]);

  // ================= UI =================
  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* SIDEBAR */}
      <div className="w-64 bg-blue-900 text-white p-5">

        <h1 className="text-2xl font-bold mb-6">
          🏫 SMART SCHOOL AI
        </h1>

        <div className="space-y-3">

          <button
            onClick={() => setPage("dashboard")}
            className="w-full bg-blue-800 p-3 rounded"
          >
            📊 Dashboard
          </button>

          <button
            onClick={() => setPage("students")}
            className="w-full bg-blue-800 p-3 rounded"
          >
            🎓 Students
          </button>

          <button
            onClick={() => setPage("camera")}
            className="w-full bg-blue-800 p-3 rounded"
          >
            📷 Camera AI
          </button>

        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div>

            <h2 className="text-2xl font-bold mb-5">
              📊 Dashboard
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">

              <div className="bg-white p-5 rounded shadow">
                Tổng học sinh: {students.length}
              </div>

              <div className="bg-white p-5 rounded shadow">
                Có mặt: {present}
              </div>

              <div className="bg-white p-5 rounded shadow">
                Vắng: {absent}
              </div>

            </div>

            <div className="bg-white p-5 rounded shadow w-80">
              <Pie data={chartData} />
            </div>

          </div>
        )}

        {/* STUDENTS */}
        {page === "students" && (
          <div>

            <h2 className="text-2xl font-bold mb-5">
              🎓 Quản lý học sinh
            </h2>

            {/* ADD */}
            <div className="bg-white p-5 rounded shadow mb-5 grid grid-cols-3 gap-3">

              <input
                className="border p-3 rounded"
                placeholder="Tên học sinh"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className="border p-3 rounded"
                placeholder="Lớp"
                value={studentClass}
                onChange={(e) =>
                  setStudentClass(e.target.value)
                }
              />

              <input
                className="border p-3 rounded"
                placeholder="Image URL"
                value={imageUrl}
                onChange={(e) =>
                  setImageUrl(e.target.value)
                }
              />

              <button
                onClick={addStudent}
                className="bg-blue-600 text-white p-3 rounded col-span-3"
              >
                ➕ Thêm học sinh
              </button>

              <input
                type="file"
                onChange={handleFileUpload}
                className="col-span-3"
              />

            </div>

            {/* BLOCK */}
            {!selectedBlock && (
              <div className="grid grid-cols-3 gap-4">

                {Object.keys(structured)
                  .sort()
                  .map((block) => (

                    <div
                      key={block}
                      onClick={() =>
                        setSelectedBlock(block)
                      }
                      className="bg-blue-100 p-6 rounded shadow cursor-pointer text-center hover:bg-blue-200"
                    >
                      <h3 className="text-xl font-bold">
                        Khối {block}
                      </h3>
                    </div>

                  ))}

              </div>
            )}

            {/* CLASS */}
            {selectedBlock && !selectedClass && (
              <div>

                <button
                  onClick={() => setSelectedBlock(null)}
                  className="mb-4 text-blue-600"
                >
                  ← Quay lại
                </button>

                <div className="grid grid-cols-3 gap-4">

                  {Object.keys(structured[selectedBlock])
                    .sort()
                    .map((cls) => (

                      <div
                        key={cls}
                        onClick={() =>
                          setSelectedClass(cls)
                        }
                        className="bg-green-100 p-5 rounded shadow cursor-pointer text-center hover:bg-green-200"
                      >
                        {cls}
                      </div>

                    ))}

                </div>

              </div>
            )}

            {/* STUDENTS LIST */}
            {selectedClass && (
              <div>

                <button
                  onClick={() => setSelectedClass(null)}
                  className="mb-4 text-blue-600"
                >
                  ← Quay lại lớp
                </button>

                <table className="w-full bg-white shadow rounded">

                  <thead className="bg-blue-900 text-white">

                    <tr>
                      <th className="p-3">Tên</th>
                      <th>Lớp</th>
                      <th>Trạng thái</th>
                      <th>Xóa</th>
                    </tr>

                  </thead>

                  <tbody>

                    {structured[selectedBlock][selectedClass]
                      .map((s) => (

                        <tr
                          key={s.firebaseId}
                          className="border-b"
                        >

                          <td className="p-3">
                            {s.name}
                          </td>

                          <td>{s.class}</td>

                          <td
                            className="cursor-pointer"
                            onClick={() =>
                              toggleStatus(
                                s.firebaseId,
                                s.status
                              )
                            }
                          >
                            {s.status}
                          </td>

                          <td>
                            <button
                              onClick={() =>
                                deleteStudent(
                                  s.firebaseId
                                )
                              }
                              className="text-red-600"
                            >
                              X
                            </button>
                          </td>

                        </tr>

                      ))}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        )}

        {/* CAMERA */}
        {page === "camera" && (
          <div>

            <h2 className="text-2xl font-bold mb-5">
              📷 Camera AI
            </h2>

            <div className="bg-white p-5 rounded shadow w-fit">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-[500px] rounded bg-black"
              />

              <div className="mt-4 flex gap-3">

                <button
                  onClick={startCamera}
                  className="bg-green-600 text-white px-5 py-2 rounded"
                >
                  ▶ Start Camera
                </button>

                <button
                  onClick={stopCamera}
                  className="bg-red-600 text-white px-5 py-2 rounded"
                >
                  ⏹ Stop Camera
                </button>

              </div>

              <p className="mt-3 text-gray-600">
                {modelsLoaded
                  ? "✅ AI đã sẵn sàng"
                  : "⏳ Đang tải AI models..."}
              </p>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default App;
```
