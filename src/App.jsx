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
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [page, setPage] = useState("students");

  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ firebaseId: d.id, ...d.data() }));

      const map = new Map();
      data.forEach(s => {
        const key = s.id || s.firebaseId;
        if (!map.has(key)) map.set(key, s);
      });

      setStudents([...map.values()]);
    });

    return () => unsub();
  }, []);

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
        res[b][c].sort((a,b)=> (a.name||"").localeCompare(b.name||"","vi"));
      });
    });

    return res;
  }, [students]);

  return (
    <div className="min-h-screen bg-sky-50 p-6">

      <h1 className="text-xl font-bold mb-4">🏫 Smart School</h1>

      {page === "students" && (
        <div>

          {!selectedBlock && (
            <div className="grid grid-cols-3 gap-4">
              {Object.keys(structured).sort().map(b => (
                <div key={b} onClick={()=>setSelectedBlock(b)} className="p-4 bg-blue-100 rounded cursor-pointer">
                  Khối {b}
                </div>
              ))}
            </div>
          )}

          {selectedBlock && !selectedClass && (
            <div>
              <button onClick={()=>setSelectedBlock(null)}>← Back</button>
              <div className="grid grid-cols-3 gap-4">
                {Object.keys(structured[selectedBlock]).sort().map(c => (
                  <div key={c} onClick={()=>setSelectedClass(c)} className="p-4 bg-green-100 rounded cursor-pointer">
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedClass && (
            <div>
              <button onClick={()=>setSelectedClass(null)}>← Back</button>

              <table className="w-full bg-white">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Trạng thái</th>
                    <th>Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {structured[selectedBlock][selectedClass].map(s => (
                    <tr key={s.firebaseId}>
                      <td>{s.name}</td>
                      <td onClick={()=>toggleStatus(s.firebaseId,s.status)} className="cursor-pointer">
                        {s.status}
                      </td>
                      <td>
                        <button onClick={()=>deleteStudent(s.firebaseId)}>X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default App;