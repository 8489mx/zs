import cv2
import os

out_dir = r"C:\Users\Mahmoud\Downloads\kuwait_pos_products"
os.makedirs(out_dir, exist_ok=True)

f0 = cv2.imread(r"D:\screen\pos_cv2_frame0.jpg")
f6 = cv2.imread(r"D:\screen\frame_sec_6.jpg")

crops = [
    # (name, frame, (y1, y2, x1, x2))
    ("01_Cherry_Pop_All_Over_Spray.jpg", f0, (268, 335, 155, 230)),
    ("02_Leather_Touch_All_Over_Spray.jpg", f0, (268, 335, 245, 320)),
    ("03_Morning_Pages_All_Over_Spray.jpg", f0, (268, 335, 335, 410)),

    ("04_Musk_Hour_All_Over_Spray.jpg", f0, (386, 452, 155, 230)),
    ("05_Morning_Light_Home_Spray.jpg", f0, (386, 452, 245, 320)),
    ("06_Open_Doors_Home_Spray.jpg", f0, (386, 452, 335, 410)),

    ("07_Baby_Bloom_Perfume_50ml.jpg", f0, (504, 565, 155, 230)),
    ("08_First_Cuddle_Perfume_50ml.jpg", f0, (504, 565, 245, 320)),
    ("09_After_Rain_Perfume_100ml.jpg", f0, (504, 565, 335, 410)),

    ("10_Desert_Light_Perfume_100ml.jpg", f6, (502, 565, 168, 243)),
    ("11_Gentle_Skin_Perfume_100ml.jpg", f6, (502, 565, 255, 330)),
    ("12_Open_Air_Perfume_100ml.jpg", f6, (502, 565, 342, 417)),
]

for filename, frame, (y1, y2, x1, x2) in crops:
    cropped = frame[y1:y2, x1:x2]
    resized = cv2.resize(cropped, (350, 350), interpolation=cv2.INTER_CUBIC)
    save_path = os.path.join(out_dir, filename)
    cv2.imwrite(save_path, resized)

print("Updated 12 photos.")
