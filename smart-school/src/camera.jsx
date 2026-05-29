import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function Camera() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Đang khởi động...");
  const [faceMatcher, setFaceMatcher] = useState(null);

  // chống ghi điểm danh trùng
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
      setStatus("AI sẵn sàng");
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
        setStatus("Lỗi camera");
      });
  }, []);

  // ======================
  // LOAD HỌC SINH (nếu bạn đã có faceMatcher ở bước trước)
  // ======================
  useEffect(() => {
    // phần này bạn đã có từ trước (giữ nguyên nếu đã chạy)
  }, []);

  // ======================
  // HÀM ĐIỂM DANH
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
        const name = result.label;

        console.log("👤", result.toString());

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