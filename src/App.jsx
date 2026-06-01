import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "./firebase";
import SchoolMap from "./components/SchoolMap";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  getDocs,
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
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [studentName, setStudentName] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectRef = useRef(null);
  const markedStudents = useRef(new Set());

  // ================= FIREBASE =================
  useEffect(() => {
  const unsub = onSnapshot(
    collection(db, "students"),
    (snapshot) => {

      console.log(
        "FIREBASE DOCS:",
        snapshot.docs.length
      );

      snapshot.docs.forEach((docSnap) => {
        console.log(
          "DOC:",
          docSnap.id,
          docSnap.data()
        );
      });

      const data = snapshot.docs.map((docSnap) => ({
        firebaseId: docSnap.id,
        ...docSnap.data(),
      }));

      setStudents(data);
    }
  );

  return () => unsub();
}, []);

  const loadFaceData = async () => {
  const snapshot = await getDocs(
    collection(db, "students")
  );

  const labeledDescriptors = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    try {
      if (!data.imageUrl) {
        console.log("NO IMAGE:", data.name);
        continue;
      }

      console.log("TRAINING:", data.name);

      const img = await faceapi.fetchImage(
        data.imageUrl
      );

      console.log("IMAGE OK:", data.name);

      const detection = await faceapi
        .detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.2,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.log(
          "NO FACE FOUND:",
          data.name
        );
        continue;
      }

      labeledDescriptors.push(
        new faceapi.LabeledFaceDescriptors(
          data.name,
          [detection.descriptor]
        )
      );

      console.log(
        "TRAINED:",
        data.name
      );

    } catch (err) {
      console.log(
        "ERROR:",
        data.name,
        err
      );
    }
  }

  return labeledDescriptors;
};
  // ================= LOAD AI =================
  useEffect(() => {
  const loadModels = async () => {
  try {
    console.log("START LOAD MODELS");

    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    console.log("LOADED tinyFaceDetector");

    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    console.log("LOADED faceLandmark68Net");

    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    console.log("LOADED faceRecognitionNet");

    setModelsLoaded(true);
    console.log("AI READY TRUE");
    const labeled = await loadFaceData();

console.log("TRAINED STUDENTS:", labeled.length);

const matcher = new faceapi.FaceMatcher(
  labeled,
  0.6
);

setFaceMatcher(matcher);

console.log("FACE MATCHER READY");
    

  } catch (err) {
    console.log("MODEL LOAD ERROR:", err);
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
  if (!modelsLoaded || !faceMatcher) return;

  if (!videoRef.current || videoRef.current.readyState !== 4) {
    return;
  }

  try {
    const detection = await faceapi
      .detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.2,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setFaceDetected(false);
      setStudentName("");
      return;
    }

    setFaceDetected(true);

    const result = faceMatcher.findBestMatch(
      detection.descriptor
    );

    console.log("MATCH:", result.toString());

    if (result.label !== "unknown") {

  setStudentName(result.label);

  if (!markedStudents.current.has(result.label)) {

    markedStudents.current.add(result.label);

    console.log("✅ NHẬN DIỆN:", result.label);

    const snapshot = await getDocs(
      collection(db, "students")
    );

    for (const docSnap of snapshot.docs) {

      const data = docSnap.data();

      if (data.name === result.label) {

        await updateDoc(
          doc(db, "students", docSnap.id),
          {
            status: "Có mặt"
          }
        );

        console.log(
          "✅ Đã cập nhật trạng thái:",
          result.label
        );

        break;
      }
    }
  }

} else {

  setStudentName("Không xác định");

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
    streamRef.current.getTracks().forEach(track => track.stop());
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
      backgroundColor: ["#22c55e", "#ef4444"],
    },
  ],
};
  const classStats = useMemo(() => {
  const result = {};

  students.forEach((s) => {
    const cls = s.class || "KHÁC";

    if (!result[cls]) {
      result[cls] = {
        total: 0,
        present: 0,
        absent: 0,
      };
    }

    result[cls].total += 1;

    if (s.status === "Có mặt") {
      result[cls].present += 1;
    } else {
      result[cls].absent += 1;
    }
  });

  return result;
}, [students]);
const classRanking = useMemo(() => {
  return Object.entries(classStats).map(([cls, data]) => {

    const rate =
      data.total === 0
        ? 0
        : (data.present / data.total) * 100;

    return {
      className: cls,
      total: data.total,
      present: data.present,
      absent: data.absent,
      rate: Number(rate.toFixed(1)),
    };
  }).sort((a, b) => b.rate - a.rate);

}, [classStats]);


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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex pt-16">
    {/* TOP HEADER */}
<div className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-900 to-blue-700 text-white flex items-center justify-between px-6 shadow-lg z-50">

  <div className="flex items-center gap-3">
    <div className="text-2xl">🏫</div>

    <div>
      <div className="font-bold text-sm">
        THPT SỐ 1 TƯ NGHĨA
      </div>
      <div className="text-xs opacity-80">
        Smart School AI Management System
      </div>
    </div>
  </div>

  <div className="text-sm">
    📅 {new Date().toLocaleDateString("vi-VN")}
  </div>

</div>
    <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-4 text-center font-bold text-lg shadow-md tracking-wide">
      🎓 TRƯỜNG THPT SỐ 1 TƯ NGHĨA - HỆ THỐNG SMART SCHOOL AI
    </div>

      {/* SIDEBAR */}
      <div className="w-64 min-h-screen bg-gradient-to-b from-blue-950 to-blue-800 text-white p-5 shadow-2xl">

  {/* LOGO TRƯỜNG */}
  <div className="text-center mb-10">
    <div className="text-4xl mb-2">🎓</div>

    <h1 className="text-lg font-bold">
      THPT SỐ 1
      <br />
      <span className="text-yellow-300">TƯ NGHĨA</span>
    </h1>

    <p className="text-xs text-blue-200 mt-2">
      Smart School AI System
    </p>
  </div>

  {/* MENU */}
  <div className="space-y-3">

    <button
      onClick={() => setPage("dashboard")}
      className="w-full flex items-center gap-3 bg-blue-800 p-3 rounded-xl hover:bg-blue-700 transition"
    >
      📊 Dashboard
    </button>

    <button
      onClick={() => setPage("students")}
      className="w-full flex items-center gap-3 bg-blue-800 p-3 rounded-xl hover:bg-blue-700 transition"
    >
      🎓 Học sinh
    </button>

    <button
      onClick={() => setPage("camera")}
      className="w-full flex items-center gap-3 bg-blue-800 p-3 rounded-xl hover:bg-blue-700 transition"
    >
      📷 Camera AI
    </button>

    <button
      onClick={() => setPage("map")}
      className="w-full flex items-center gap-3 bg-blue-800 p-3 rounded-lg hover:bg-blue-700 transition"
    >
      🗺 Bản đồ trường học
    </button>

  </div>
</div>
      {/* MAIN */}
      <div className="flex-1 p-6">

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold mb-6">
              📊 Dashboard
            </h2>
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 rounded-2xl mb-6 shadow-lg">

              <h2 className="text-2xl font-bold">
                🎓 TRƯỜNG THPT SỐ 1 TƯ NGHĨA
              </h2>

              <p className="text-blue-100 mt-1">
                Hệ thống quản lý học sinh & điểm danh thông minh
              </p>

            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">

  {/* TOTAL */}
  <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-blue-600 hover:scale-[1.02] transition">
    <p className="text-gray-500">Tổng học sinh</p>
    <h3 className="text-3xl font-bold text-blue-600">
      {students.length}
    </h3>
    <p className="text-xs text-gray-400 mt-1">
      Toàn trường
    </p>
  </div>

  {/* PRESENT */}
  <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-green-600 hover:scale-[1.02] transition">
    <p className="text-gray-500">Có mặt</p>
    <h3 className="text-3xl font-bold text-green-600">
      {present}
    </h3>
    <p className="text-xs text-gray-400 mt-1">
      Đang học
    </p>
  </div>

  {/* ABSENT */}
  <div className="bg-white rounded-2xl shadow-xl p-6 border-l-4 border-red-600 hover:scale-[1.02] transition">
    <p className="text-gray-500">Vắng</p>
    <h3 className="text-3xl font-bold text-red-600">
      {absent}
    </h3>
    <p className="text-xs text-gray-400 mt-1">
      Không có mặt
    </p>
  </div>

</div>

            <div className="bg-white p-6 rounded-2xl shadow-lg w-96">
              <h3 className="text-lg font-bold mb-4 text-blue-900">
                📊 Tỷ lệ điểm danh
              </h3>
            
              <Pie data={chartData} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">

  <h3 className="text-lg font-bold mb-4 text-green-700">
    🏆 Lớp chuyên cần nhất
  </h3>

  {classRanking.length > 0 && (
    <div className="text-center">

      <p className="text-2xl font-bold text-blue-900">
        {classRanking[0].className}
      </p>

      <p className="text-green-600 font-bold mt-2">
        {classRanking[0].rate}% có mặt
      </p>

      <p className="text-sm text-gray-500 mt-1">
        Tổng: {classRanking[0].total} học sinh
      </p>

    </div>
  )}

</div>
<div className="bg-white rounded-2xl shadow-lg p-6 mt-6">

  <h3 className="text-lg font-bold mb-4 text-red-700">
    ⚠️ Lớp vắng nhiều nhất
  </h3>

  {classRanking.length > 0 && (
    <div className="text-center">

      <p className="text-2xl font-bold text-blue-900">
        {classRanking[classRanking.length - 1].className}
      </p>

      <p className="text-red-600 font-bold mt-2">
        {(100 - classRanking[classRanking.length - 1].rate).toFixed(1)}% vắng
      </p>

      <p className="text-sm text-gray-500 mt-1">
        Tổng: {classRanking[classRanking.length - 1].total} học sinh
      </p>

    </div>
  )}

</div>
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">

              <h3 className="text-lg font-bold mb-4 text-blue-900">
                🏫 Thống kê theo lớp
              </h3>

              <table className="w-full text-left">

                <thead>
                  <tr className="border-b">
                    <th className="p-2">Lớp</th>
                    <th className="p-2">Tổng</th>
                    <th className="p-2 text-green-600">Có mặt</th>
                    <th className="p-2 text-red-600">Vắng</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(classStats).map(([cls, data]) => (
                    <tr key={cls} className="border-b hover:bg-gray-50">

                      <td className="p-2 font-semibold">
                        {cls}
                      </td>

                      <td className="p-2">
                        {data.total}
                      </td>

                      <td className="p-2 text-green-600 font-bold">
                        {data.present}
                      </td>

                      <td className="p-2 text-red-600 font-bold">
                        {data.absent}
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>

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

                <p className="mt-3 text-2xl font-bold text-blue-600">
                  {studentName}
                </p>

              </div>

            </div>

          </div>
        )}
        {page === "map" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">
              🗺 Bản đồ Drone AI
            </h2>

            <SchoolMap />
          </div>
        )}

      </div> {/* end flex container */}
    </div>
  );
}