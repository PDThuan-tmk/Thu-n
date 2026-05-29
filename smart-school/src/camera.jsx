import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function Camera() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Đang khởi động...");
  const [faceMatcher, setFaceMatcher] = useState(null);

  // chống trùng điểm danh
  const marked = new Set();

  // ======================
  // LOAD AI MODELS
  // ======================
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";

      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      console.log("AI MODELS LOADED");
      setStatus("AI READY");
    };

    loadModels();
  }, []);

  // ======================
  // BẬT CAMERA
  // ======================
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
      })
      .catch(err => {
        console.log("Camera error:", err);
        setStatus("Camera lỗi");
      });
  }, []);

  // ======================
  // TRAIN FACE MATCHER TỪ FIREBASE
  // ======================
  useEffect(() => {
    const loadStudents = async () => {
      const snapshot = await getDocs(collection(db, "students"));

      const labeledDescriptors = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        try {
          const img = await faceapi.fetchImage(data.image);

          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (!detection) continue;

          labeledDescriptors.push(
            new faceapi.LabeledFaceDescriptors(data.name, [
              detection.descriptor
            ])
          );

          console.log("TRAINED:", data.name);

        } catch (err) {
          console.log("ERROR TRAIN:", data.name);
        }
      }

      const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

      console.log("FACE MATCHER READY:", labeledDescriptors.length);

      setFaceMatcher(matcher);
    };

    loadStudents();
  }, []);

  // ======================
  // HÀM ĐIỂM DANH FIREBASE
  // ======================
  const markAttendance = async (name) => {
    try {
      await addDoc(collection(db, "attendance"), {
        name: name,
        status: "present",
        time: new Date().toLocaleString()
      });

      console.log("✅ Điểm danh:", name);
    } catch (err) {
      console.log("Lỗi điểm danh:", err);
    }
  };

  // ======================
  // NHẬN DIỆN REALTIME
  // ======================
  const startDetect = () => {
    setInterval(async () => {
      if (!videoRef.current || !faceMatcher) return;

      setStatus("DETECT RUNNING");

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        setStatus("Không thấy khuôn mặt");
        return;
      }

      detections.forEach(d => {
        const result = faceMatcher.findBestMatch(d.descriptor);

        console.log("RESULT:", result.toString());

        const name = result.label;

        setStatus(result.toString());

        // ======================
        // ĐIỂM DANH TỰ ĐỘNG
        // ======================
        if (name !== "unknown" && !marked.has(name)) {
          marked.add(name);

          markAttendance(name);
        }
      });
    }, 1000);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>📷 Smart School AI</h2>

      <p>{status}</p>

      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={startDetect}
        style={{ width: "500px", borderRadius: "10px" }}
      />
    </div>
  );
}