import cv2
import os
import numpy as np
import face_recognition
import sqlite3
import sys

def format_email_folder(email):
    return email.replace("@", "_").replace(".", "_")

def store_encoding(email, encoding):
    conn = sqlite3.connect("face_data.db")
    cursor = conn.cursor()

    cursor.execute('''CREATE TABLE IF NOT EXISTS faces 
                      (email TEXT PRIMARY KEY, encoding BLOB)''')

    encoding_bytes = encoding.tobytes()
    cursor.execute("INSERT OR REPLACE INTO faces (email, encoding) VALUES (?, ?)", (email, encoding_bytes))
    conn.commit()
    conn.close()

def capture_frames(email, base_folder="captured_faces", num_frames=10):
    email_folder = format_email_folder(email)
    output_folder = os.path.join(base_folder, email_folder)

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Error: Could not access the webcam.")
        return

    print(f"📸 Capturing frames for {email}...")

    face_encodings = []
    frame_count = 0

    while frame_count < num_frames:
        ret, frame = cap.read()
        if not ret:
            print("❌ Error: Could not read frame.")
            break

        frame_path = os.path.join(output_folder, f"frame_{frame_count}.jpg")
        saved = cv2.imwrite(frame_path, frame)

        if saved:
            print(f"✅ Saved: {frame_path}")  # Confirm image is saved
        else:
            print(f"❌ Failed to save: {frame_path}")  # Debugging message

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(rgb_frame)

        if encodings:
            face_encodings.append(encodings[0])

        frame_count += 1

    cap.release()
    # cv2.destroyAllWindows()

    if face_encodings:
        avg_encoding = np.mean(face_encodings, axis=0)
        store_encoding(email, avg_encoding)
        print(f"✅ Face encoding stored for {email}")
    else:
        print("⚠️ No face detected. Try again.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ No email provided. Exiting.")
        sys.exit(1)

    user_email = sys.argv[1]
    capture_frames(user_email)
