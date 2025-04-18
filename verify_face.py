import os
import cv2
import face_recognition
import psycopg2
import numpy as np
import sys

# Force UTF-8 encoding to avoid UnicodeEncodeError
sys.stdout.reconfigure(encoding="utf-8")


def get_registered_faces(): 
    """Fetch stored face encodings and corresponding mail IDs from the database."""
    
    # Step 1️⃣: ✅ Connect to PostgreSQL Database
    try:
        conn = psycopg2.connect(
            dbname="smartvoting", user="postgres", password="vamsi@123", host="localhost", port="5432"
        )
        cursor = conn.cursor()
        print("✅ Database connected successfully!")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return [], []

    # Step 2️⃣: ✅ Fetch face folder paths and emails
    cursor.execute("SELECT face_folder, mailid FROM users")
    rows = cursor.fetchall()
    
    if not rows:
        print("❌ No users found in the database!")
        return [], []

    known_encodings = []
    known_mailids = []
    
    for row in rows:
        face_folder = row[0]

        # Step 3️⃣: ✅ Convert memoryview to string if needed
        if isinstance(face_folder, memoryview):
            face_folder = face_folder.tobytes().decode("utf-8")  # Convert memoryview to string
        
        # Step 4️⃣: ✅ Check if the folder exists
        if not os.path.exists(face_folder):
            print(f"❌ Face folder not found: {face_folder}")
            continue  # Skip this user
        
        print(f"📂 Checking folder: {face_folder}")

        for file in os.listdir(face_folder):
            if file.endswith(".jpg") or file.endswith(".png"):
                image_path = os.path.join(face_folder, file)

                # Step 5️⃣: ✅ Check if image exists
                if not os.path.exists(image_path):
                    print(f"❌ Image file not found: {image_path}")
                    continue

                print(f"🖼️ Processing image: {image_path}")

                # Step 6️⃣: ✅ Load Image & Resize
                image = cv2.imread(image_path)
                if image is None:
                    print(f"❌ Could not load image: {image_path}")
                    continue

                image = cv2.resize(image, (500, 500))  # Resize for better processing
                cv2.imwrite(image_path, image)  # Overwrite image with resized version

                # Step 7️⃣: ✅ Check Face Encodings
                try:
                    face_image = face_recognition.load_image_file(image_path)
                    encoding = face_recognition.face_encodings(face_image)

                    if encoding:
                        known_encodings.append(encoding[0])
                        known_mailids.append(row[1])
                        print(f"✅ Face encoding generated for {file}")
                    else:
                        print(f"❌ No face detected in {file}. Check image quality.")

                except Exception as e:
                    print(f"❌ Error processing {file}: {e}")

    cursor.close()
    conn.close()

    print(f"✅ Total registered faces loaded: {len(known_encodings)}")
    
    return known_encodings, known_mailids

def verify_face():
    """Captures a live image and compares it against registered faces."""
    known_encodings, known_mailids = get_registered_faces()

    if not known_encodings:
        print("❌ No registered faces found.")
        return "No registered faces found."

    video_capture = cv2.VideoCapture(0)

    if not video_capture.isOpened():
        print("❌ Error: Could not open webcam.")
        return "Error: Could not open webcam."

    print("📷 Capturing image for verification...")
    ret, frame = video_capture.read()
    video_capture.release()

    if not ret:
        print("❌ Error: Could not capture image.")
        return "Error: Could not capture image."

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)  # Convert BGR to RGB

    # ✅ Step 1: Detect faces first
    face_locations = face_recognition.face_locations(rgb_frame)

    if not face_locations:
        print("❌ No face detected in the captured image.")
        return "No face detected."

    # ✅ Step 2: Get encodings from detected faces
    unknown_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    if not unknown_encodings:
        print("❌ Could not generate face encoding.")
        return "Could not generate face encoding."

    unknown_encoding = unknown_encodings[0]

    for i, known_encoding in enumerate(known_encodings):
        match = face_recognition.compare_faces([known_encoding], unknown_encoding, tolerance=0.5)  # Lowered tolerance to 0.5

        if match[0]:
            print(f"✅ Face recognized: {known_mailids[i]}")
            return f"Face recognized: {known_mailids[i]}"

    print("❌ No matching face found.")
    return "No user found."


if __name__ == "__main__":
    print(get_registered_faces())
    result = verify_face()
    print(result)

#     ..........................


# import cv2
# import face_recognition

# image_path = r"C:\Users\pusul\OneDrive\Desktop\Smart Voting New\captured_faces\frame_0.jpg"
# image = face_recognition.load_image_file(image_path)
# face_locations = face_recognition.face_locations(image)

# if face_locations:
#     print(f"✅ Found {len(face_locations)} face(s) in the image.")
# else:
#     print("❌ No face detected. Try capturing another image.")

# # Draw rectangles around detected faces
# image_bgr = cv2.imread(image_path)
# for (top, right, bottom, left) in face_locations:
#     cv2.rectangle(image_bgr, (left, top), (right, bottom), (0, 255, 0), 2)

# cv2.imshow("Detected Faces", image_bgr)
# cv2.waitKey(0)
# cv2.destroyAllWindows()
