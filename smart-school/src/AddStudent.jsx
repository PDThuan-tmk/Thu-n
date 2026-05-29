import { useState } from "react";
import { db, storage } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AddStudent() {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [file, setFile] = useState(null);

  const handleAdd = async () => {
    if (!file) return alert("Chọn ảnh trước");

    // 1. Upload ảnh lên Firebase Storage
    const storageRef = ref(storage, "students/" + file.name);
    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);

    // 2. Lưu thông tin học sinh vào Firestore
    await addDoc(collection(db, "students"), {
      name,
      class: className,
      image: imageUrl,
      createdAt: new Date()
    });

    alert("Thêm học sinh thành công!");

    // reset form
    setName("");
    setClassName("");
    setFile(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>➕ Thêm học sinh</h2>

      <input
        placeholder="Tên học sinh"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Lớp"
        value={className}
        onChange={(e) => setClassName(e.target.value)}
      />

      <br /><br />

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={handleAdd}>
        Thêm học sinh
      </button>
    </div>
  );
}