import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import {
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [faceMatcher, setFaceMatcher] =
    useState(null);

  const marked = useRef(new Set());

  // ====================
  // LOAD FACE DATA
  // ====================

  const loadFaceData = async () => {
    const snapshot = await getDocs(
      collection(db, "students")
    );

    const labeledDescriptors = [];

    console.log(
      "FIREBASE DOCS:",
      snapshot.docs.length
    );

    for (const docSnap of snapshot.docs) {
      const student = docSnap.data();

      try {
        if (!student.imageUrl) {
          console.log(
            "NO IMAGE:",
            student.name
          );
          continue;
        }

        console.log(
          "TRAINING:",
          student.name
        );

        const img =
          await faceapi.fetchImage(
            student.imageUrl
          );

        const detection =
          await faceapi
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
            "NO FACE:",
            student.name
          );
          continue;
        }

        labeledDescriptors.push(
          new faceapi.LabeledFaceDescriptors(
            student.name,
            [detection.descriptor]
          )
        );

        console.log(
          "TRAINED:",
          student.name
        );
      } catch (err) {
        console.log(
          "ERROR:",
          student.name,
          err
        );
      }
    }

    return labeledDescriptors;
  };

  // ====================
  // START CAMERA
  // ====================

  const startCamera = async () => {
    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

    videoRef.current.srcObject =
      stream;

    streamRef.current = stream;

    const track =
      stream.getVideoTracks()[0];

    console.log(
      "CAMERA SETTINGS:"
    );

    console.log(
      track.getSettings()
    );
  };

  // ====================
  // LOAD MODEL
  // ====================

  useEffect(() => {
    const start = async () => {
      try {
        console.log(
          "START LOAD MODELS"
        );

        await faceapi.nets.tinyFaceDetector.loadFromUri(
          "/models"
        );

        await faceapi.nets.faceLandmark68Net.loadFromUri(
          "/models"
        );

        await faceapi.nets.faceRecognitionNet.loadFromUri(
          "/models"
        );

        console.log("AI READY");

        await startCamera();

        const labeled =
          await loadFaceData();

        console.log(
          "TRAINED TOTAL:",
          labeled.length
        );

        if (
          labeled.length === 0
        ) {
          console.log(
            "KHÔNG CÓ DỮ LIỆU TRAIN"
          );
          return;
        }

        const matcher =
          new faceapi.FaceMatcher(
            labeled,
            0.45
          );

        setFaceMatcher(
          matcher
        );

        console.log(
          "FACE MATCHER READY"
        );
      } catch (err) {
        console.log(err);
      }
    };

    start();

    return () => {
      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  // ====================
  // REALTIME DETECT
  // ====================

  useEffect(() => {
    if (!faceMatcher) return;

    const interval =
      setInterval(
        async () => {
          if (
            !videoRef.current
          )
            return;

          const detections =
            await faceapi
              .detectAllFaces(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions(
                  {
                    inputSize: 608,
                    scoreThreshold:
                      0.15,
                  }
                )
              )
              .withFaceLandmarks()
              .withFaceDescriptors();

          console.log(
            "FACES:",
            detections.length
          );

          detections.forEach(
            async (
              face
            ) => {
              const box =
                face.detection.box;

              console.log(
                "Face size:",
                Math.round(
                  box.width
                ),
                "x",
                Math.round(
                  box.height
                )
              );

              // bỏ qua mặt quá nhỏ
              if (
                box.width <
                80
              )
                return;

              const result =
                faceMatcher.findBestMatch(
                  face.descriptor
                );

              console.log(
                "MATCH:",
                result.label,
                "(" +
                  result.distance.toFixed(
                    2
                  ) +
                  ")"
              );

              const name =
                result.label;

              if (
                name !==
                  "unknown" &&
                !marked.current.has(
                  name
                )
              ) {
                marked.current.add(
                  name
                );

                await addDoc(
                  collection(
                    db,
                    "attendances"
                  ),
                  {
                    name,
                    status:
                      "present",
                    time:
                      new Date().toLocaleString(),
                  }
                );

                console.log(
                  "✅ ĐIỂM DANH:",
                  name
                );
              }
            }
          );
        },
        800
      );

    return () =>
      clearInterval(
        interval
      );
  }, [faceMatcher]);

  return (
    <div
      style={{
        textAlign:
          "center",
      }}
    >
      <h2>
        Smart School AI
      </h2>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width="900"
        height="600"
        style={{
          border:
            "2px solid #ccc",
          borderRadius:
            "10px",
        }}
      />
    </div>
  );
}