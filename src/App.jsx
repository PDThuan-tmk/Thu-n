import { useEffect, useMemo, useRef, useState } from "react";
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

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function App() {
  // ================= STATE =================
  const [students, setStudents] = useState([]);

  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [page, setPage] = useState("dashboard");

  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectRef = useRef(null);

  // ================= FIREBASE =================
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          firebaseId: docSnap.id,
          ...docSnap.data(),
        }));

        setStudents(data);
      }
    );

    return () => unsub();
  }, []);

  // ================= LOAD AI =================
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");

        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

        setModelsLoaded(true);

        console.log("AI Ready");
      } catch (err) {
        console.log(err);
      }
    };

    loadModels();
  }, []);

  // ================= ADD STUDENT =================
  const addStudent = async () => {
    if (!name || !studentClass) {
      alert("Vui lòng nhập đủ thông tin");
      return;
    }

    await addDoc(collection(db, "students"), {
      id: "HS" + Date.now().toString().slice(-6),

      name: name.trim(),

      class: studentClass.trim().toUpperCase(),

      imageUrl: imageUrl || "",

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
  const toggleStatus = async (id, currentStatus) => {
    await updateDoc(doc(db, "students", id), {
      status: currentStatus === "Có mặt" ? "Vắng" : "Có mặt",
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

      // CSV
      if (file.name.endsWith(".csv")) {
        rows = Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
        }).data;
      }

      // XLSX
      else if (file.name.endsWith(".xlsx")) {
        const workbook = XLSX.read(data, {
          type: "binary",
        });

        const sheet =
          workbook.Sheets[workbook.SheetNames[0]];

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

      alert("Import thành công");
    };

    reader.readAsBinaryString(file);
  };

  // ================= FACE DETECTION =================
    const detectFace = async () => {
      if (
  !videoRef.current ||
  videoRef.current.readyState !== 4
) {
  return;
}
  console.log("DETECT RUNNING");

  if (!videoRef.current) {
    console.log("NO VIDEO");
    return;
  }

  if (!modelsLoaded) {
    console.log("MODELS NOT LOADED");
    return;
  }

  try {
    const detection = await faceapi.detectSingleFace(
      videoRef.current,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.2,
      })
    );

    console.log("RESULT:", detection);

    if (detection) {
      setFaceDetected(true);
    } else {
      setFaceDetected(false);
    }

  } catch (err) {
    console.log("AI ERROR:", err);
  }
};

  // ================= START CAMERA =================
  const startCamera = async () => {
  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

    streamRef.current = stream;

    videoRef.current.srcObject = stream;

    await videoRef.current.play();

    detectRef.current = setInterval(async () => {
  await detectFace();
}, 800);

  } catch (err) {
    console.log(err);
  }
};

  // ================= STOP CAMERA =================
  const stopCamera = () => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
  }

  if (detectRef.current) {
    clearInterval(detectRef.current);
    detectRef.current = null;
  }

  setFaceDetected(false);
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

  // ================= GROUP =================
  const groupedStudents = useMemo(() => {
    const result = {};

    students.forEach((student) => {
      const cls = (student.class || "").toUpperCase();

      const block =
        cls.match(/\d+/)?.[0] || "KHÁC";

      if (!result[block]) {
        result[block] = {};
      }

      if (!result[block][cls]) {
        result[block][cls] = [];
      }

      result[block][cls].push(student);
    });

    Object.keys(result).forEach((block) => {
      Object.keys(result[block]).forEach((cls) => {
        result[block][cls].sort((a, b) =>
          a.name.localeCompare(b.name, "vi")
        );
      });
    });

    return result;
  }, [students]);

  // ================= UI =================
  return (
    <div className="min-h-screen flex bg-slate-100">

      {/* SIDEBAR */}
      <div className="w-64 bg-blue-900 text-white p-5">

        <h1 className="text-3xl font-bold mb-8">
          🏫 SMART SCHOOL AI
        </h1>

        <div className="space-y-4">

          <button
            onClick={() => {
              setPage("dashboard");
              setSelectedBlock(null);
              setSelectedClass(null);
            }}
            className="w-full bg-blue-800 p-3 rounded-lg hover:bg-blue-700"
          >
            📊 Dashboard
          </button>

          <button
            onClick={() => {
              setPage("students");
            }}
            className="w-full bg-blue-800 p-3 rounded-lg hover:bg-blue-700"
          >
            🎓 Học sinh
          </button>

          <button
            onClick={() => {
              setPage("camera");
            }}
            className="w-full bg-blue-800 p-3 rounded-lg hover:bg-blue-700"
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

            <h2 className="text-3xl font-bold mb-6">
              📊 Dashboard
            </h2>

            <div className="grid grid-cols-3 gap-5 mb-6">

              <div className="bg-white p-6 rounded-xl shadow">
                <p>Tổng học sinh</p>

                <h3 className="text-3xl font-bold">
                  {students.length}
                </h3>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <p>Có mặt</p>

                <h3 className="text-3xl font-bold text-green-600">
                  {present}
                </h3>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <p>Vắng</p>

                <h3 className="text-3xl font-bold text-red-600">
                  {absent}
                </h3>
              </div>

            </div>

            <div className="bg-white p-6 rounded-xl shadow w-96">
              <Pie data={chartData} />
            </div>

          </div>
        )}

        {/* STUDENTS */}
        {page === "students" && (
          <div>

            <h2 className="text-3xl font-bold mb-6">
              🎓 Quản lý học sinh
            </h2>

            {/* FORM */}
            <div className="bg-white p-5 rounded-xl shadow mb-6">

              <div className="grid grid-cols-3 gap-4">

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tên học sinh"
                  className="border p-3 rounded-lg"
                />

                <input
                  value={studentClass}
                  onChange={(e) =>
                    setStudentClass(e.target.value)
                  }
                  placeholder="Lớp"
                  className="border p-3 rounded-lg"
                />

                <input
                  value={imageUrl}
                  onChange={(e) =>
                    setImageUrl(e.target.value)
                  }
                  placeholder="Image URL"
                  className="border p-3 rounded-lg"
                />

              </div>

              <button
                onClick={addStudent}
                className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg"
              >
                ➕ Thêm học sinh
              </button>

              <div className="mt-5 border-2 border-dashed p-4 rounded-lg">

                <p className="font-bold mb-2">
                  📂 Import CSV/XLSX
                </p>

                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                />

              </div>

            </div>

            {/* BLOCK */}
            {!selectedBlock && (
              <div className="grid grid-cols-3 gap-5">

                {Object.keys(groupedStudents)
                  .sort()
                  .map((block) => (
                    <div
                      key={block}
                      onClick={() =>
                        setSelectedBlock(block)
                      }
                      className="bg-blue-100 hover:bg-blue-200 rounded-xl shadow p-8 text-center cursor-pointer"
                    >
                      <h3 className="text-2xl font-bold">
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
                  onClick={() =>
                    setSelectedBlock(null)
                  }
                  className="mb-5 text-blue-600"
                >
                  ← Quay lại
                </button>

                <div className="grid grid-cols-3 gap-5">

                  {Object.keys(
                    groupedStudents[selectedBlock]
                  )
                    .sort()
                    .map((cls) => (
                      <div
                        key={cls}
                        onClick={() =>
                          setSelectedClass(cls)
                        }
                        className="bg-green-100 hover:bg-green-200 rounded-xl shadow p-6 text-center cursor-pointer"
                      >
                        <h3 className="text-xl font-bold">
                          {cls}
                        </h3>
                      </div>
                    ))}

                </div>

              </div>
            )}

            {/* TABLE */}
            {selectedClass && (
              <div>

                <button
                  onClick={() =>
                    setSelectedClass(null)
                  }
                  className="mb-5 text-blue-600"
                >
                  ← Quay lại lớp
                </button>

                <div className="bg-white rounded-xl shadow overflow-hidden">

                  <table className="w-full">

                    <thead className="bg-blue-900 text-white">

                      <tr>
                        <th className="p-4 text-left">
                          Tên
                        </th>

                        <th>Lớp</th>

                        <th>Trạng thái</th>

                        <th>Xóa</th>
                      </tr>

                    </thead>

                    <tbody>

                      {groupedStudents[
                        selectedBlock
                      ][selectedClass].map(
                        (student) => (
                          <tr
                            key={
                              student.firebaseId
                            }
                            className="border-b"
                          >

                            <td className="p-4">
                              {student.name}
                            </td>

                            <td>
                              {student.class}
                            </td>

                            <td>

                              <button
                                onClick={() =>
                                  toggleStatus(
                                    student.firebaseId,
                                    student.status
                                  )
                                }
                                className={
                                  student.status ===
                                  "Có mặt"
                                    ? "bg-green-500 text-white px-4 py-2 rounded"
                                    : "bg-red-500 text-white px-4 py-2 rounded"
                                }
                              >
                                {student.status}
                              </button>

                            </td>

                            <td>

                              <button
                                onClick={() =>
                                  deleteStudent(
                                    student.firebaseId
                                  )
                                }
                                className="bg-red-600 text-white px-3 py-2 rounded"
                              >
                                X
                              </button>

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>
            )}

          </div>
        )}

        {/* CAMERA */}
        {page === "camera" && (
          <div>

            <h2 className="text-3xl font-bold mb-6">
              📷 Camera AI
            </h2>

            <div className="bg-white p-6 rounded-xl shadow w-fit">

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-[600px] rounded-xl bg-black"
              />

              <div className="flex gap-4 mt-5">

                <button
                  onClick={startCamera}
                  className="bg-green-600 text-white px-5 py-3 rounded-lg"
                >
                  ▶ Start Camera
                </button>

                <button
                  onClick={stopCamera}
                  className="bg-red-600 text-white px-5 py-3 rounded-lg"
                >
                  ⏹ Stop Camera
                </button>

              </div>

              <div className="mt-5">

                <p>
                  {modelsLoaded
                    ? "✅ AI Models Ready"
                    : "⏳ Loading AI Models..."}
                </p>

                <p className="mt-2 text-xl font-bold">

                  {faceDetected
                    ? "🟢 Đã phát hiện khuôn mặt"
                    : "🔴 Chưa phát hiện khuôn mặt"}

                </p>

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}