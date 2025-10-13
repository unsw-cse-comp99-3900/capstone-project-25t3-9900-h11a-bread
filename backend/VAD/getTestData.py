import numpy as np, base64
sr = 16000
frame_samples = 480
t = np.arange(frame_samples)/sr
noisy = (0.2*np.sin(2*np.pi*440*t) + 0.2*np.random.randn(frame_samples)).astype(np.float32)
b64 = base64.b64encode(noisy.tobytes()).decode("utf-8")
print(b64)  # 复制到 /denoise/frame 的 frame_base64 字段