import asyncio, json, struct
import numpy as np
import websockets

SR = 16000
FRAME_MS = 30
FRAME_SAMPLES = SR * FRAME_MS // 1000

async def main():
    uri = "ws://localhost:8000/ws/denoise"
    async with websockets.connect(uri, max_size=None) as ws:
        # 1) 发送配置
        cfg = {"sr": SR, "frame_samples": FRAME_SAMPLES, "subtract_scale": 1.0}
        await ws.send(json.dumps(cfg))
        print(await ws.recv())  # "OK: ready"

        # 2) 模拟发送 100 帧（正弦 + 噪声）
        t = np.arange(FRAME_SAMPLES) / SR
        for i in range(100):
            tone = 0.2 * np.sin(2 * np.pi * 440 * t).astype(np.float32)
            noise = 0.2 * np.random.randn(FRAME_SAMPLES).astype(np.float32)
            noisy = np.clip(tone + noise, -1, 1).astype(np.float32)

            await ws.send(noisy.tobytes())       # 发二进制帧
            cleaned_bin = await ws.recv()         # 收二进制帧
            if isinstance(cleaned_bin, str):
                print("SERVER:", cleaned_bin)     # 可能是错误文本
                continue

            cleaned = np.frombuffer(cleaned_bin, dtype=np.float32)
            # 这里你可以把 cleaned 送入本地声卡/写文件/做可视化

asyncio.run(main())
