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

import Papa from "papaparse";
import * as XLSX from "xlsx";

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

  // navigation for hierarchy
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ================= FIREBASE =================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const data = snapshot.docs.map(d => ({
        firebaseId: d.id,
        ...d.data()
      }));

      // remove duplicates
      const map = new Map();
      data.forEach(s => {
        const key = s.id || s.firebaseId;
        if (!map.has(key)) map.set(key, s);
      });

      setStudents([...map.values()]);
    });

    return () => unsub();
  }, []);

  // ================= CRUD =================
  const addStudent = async () => {
    if (!name || !studentClass) return;

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

  const deleteStudent = async (id) => {
    await deleteDoc(doc(db, "students", id));
  };

  const toggleStatus = async (id, current) => {
    await updateDoc(doc(db, "students", id), {
      status: current === "Có mặt" ? "Vắng" : "Có mặt"
    });
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

  // ================= HIERARCHY (BLOCK -> CLASS -> STUDENTS) =================
  const structured = useMemo(() => {
    const res = {};

    students.forEach(s => {
      const cls = (s.class || "").toUpperCase();
      const block = cls.match(/\d+/)?.[0] || "KHAC";

      if (!res[block]) res[block] = {};
      if (!res[block][cls]) res[block][cls] = [];

      res[block][cls].push(s);
    });

    Object.keys(res).forEach(b => {
      Object.keys(res[b]).forEach(c => {
        res[b][c].sort((a,b)=>
          (a.name||"").localeCompare(b.name||"","vi")
        );
      });
    });

    return res;
  }, [students]);

  // ================= UI =================
  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* SIDEBAR */}
      <div className="w-64 bg-blue-900 text-white p-4 space-y-3">
        <h1 className="text-xl font-bold">🏫 SMART SCHOOL</h1>

        <button onClick={() => setPage("dashboard")} className="block w-full text-left">📊 Dashboard</button>
        <button onClick={() => setPage("students")} className="block w-full text-left">🎓 Students</button>
        <button onClick={() => setPage("camera")} className="block w-full text-left">📷 Camera AI</button>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div>
            <h2 className="text-xl font-bold mb-4">📊 Dashboard</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded shadow">Tổng: {students.length}</div>
              <div className="bg-white p-4 rounded shadow">Có mặt: {present}</div>
              <div className="bg-white p-4 rounded shadow">Vắng: {absent}</div>
            </div>

            <div className="bg-white p-4 rounded shadow w-80">
              <Pie data={chartData} />
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {page === "students" && (
          <div>
            <h2 className="text-xl font-bold mb-4">🎓 Quản lý học sinh</h2>

            {/* ADD + IMPORT */}
            <div className="bg-white p-4 rounded shadow mb-4 grid grid-cols-3 gap-2">
              <input placeholder="Tên" className="border p-2" value={name} onChange={e=>setName(e.target.value)} />
              <input placeholder="Lớp" className="border p-2" value={studentClass} onChange={e=>setStudentClass(e.target.value)} />
              <input placeholder="Ảnh" className="border p-2" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
              <button onClick={addStudent} className="bg-blue-600 text-white p-2 col-span-3">Thêm</button>

              <input type="file" className="col-span-3" onChange={handleFileUpload} />
            </div>

            {/* LEVEL 1 - BLOCK */}
            {!selectedBlock && (
              <div className="grid grid-cols-3 gap-4">
                {Object.keys(structured).sort().map(block => (
                  <div
                    key={block}
                    onClick={() => setSelectedBlock(block)}
                    className="bg-blue-100 p-6 rounded shadow cursor-pointer text-center"
                  >
                    <h3 className="text-xl font-bold">Khối {block}</h3>
                  </div>
                ))}
              </div>
            )}

            {/* LEVEL 2 - CLASS */}
            {selectedBlock && !selectedClass && (
              <div>
                <button className="mb-4 text-blue-600" onClick={()=>setSelectedBlock(null)}>← Back</button>

                <div className="grid grid-cols-3 gap-4">
                  {Object.keys(structured[selectedBlock]).sort().map(cls => (
                    <div
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className="bg-green-100 p-4 rounded shadow cursor-pointer text-center"
                    >
                      {cls}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LEVEL 3 - STUDENTS */}
            {selectedClass && (
              <div>
                <button className="mb-4 text-blue-600" onClick={()=>setSelectedClass(null)}>← Back</button>

                <table className="w-full bg-white shadow rounded">
                  <thead>
                    <tr>
                      <th className="p-2">Tên</th>
                      <th>Trạng thái</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {structured[selectedBlock][selectedClass].map(s => (
                      <tr key={s.firebaseId}>
                        <td className="p-2">{s.name}</td>
                        <td className="cursor-pointer" onClick={()=>toggleStatus(s.firebaseId, s.status)}>
                          {s.status}
                        </td>
                        <td>
                          <button className="text-red-600" onClick={()=>deleteStudent(s.firebaseId)}>X</button>
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
            <h2 className="text-xl font-bold mb-4">📷 Camera AI</h2>

            <video ref={videoRef} autoPlay className="w-80 rounded bg-black" />
          </div>
        )}

      </div>
    </div>
  );
}

export default App;