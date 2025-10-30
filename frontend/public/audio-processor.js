const TARGET_SR = 16000;
const FRAME_SAMPLES = Math.round(TARGET_SR * 0.02); // 20ms => 320 samples

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // internal float buffer (mono @ TARGET_SR)
    this._buf = new Float32Array(0);
    this._tmp = []; // chunk collector to avoid frequent allocations
    this._srcSR = sampleRate; // AudioContext sampleRate
  }

  // simple linear resampler mono -> TARGET_SR
  _resampleToTargetSR(float32Mono, srcSR) {
    if (srcSR === TARGET_SR) return float32Mono;

    const ratio = TARGET_SR / srcSR;
    const outLen = Math.floor(float32Mono.length * ratio);
    const out = new Float32Array(outLen);

    let pos = 0;
    for (let i = 0; i < outLen; i++) {
      const srcPos = i / ratio;
      const i0 = Math.floor(srcPos);
      const i1 = Math.min(i0 + 1, float32Mono.length - 1);
      const t = srcPos - i0;
      out[i] = float32Mono[i0] * (1 - t) + float32Mono[i1] * t;
    }
    return out;
  }

  _appendToBuf(f32) {
    if (this._buf.length === 0) {
      this._buf = f32;
      return;
    }
    // concatenate without too many allocations
    this._tmp.length = 0;
    this._tmp.push(this._buf, f32);
    const total = this._buf.length + f32.length;
    const joined = new Float32Array(total);
    let offset = 0;
    for (const a of this._tmp) {
      joined.set(a, offset);
      offset += a.length;
    }
    this._buf = joined;
  }

  _flushFrames() {
    while (this._buf.length >= FRAME_SAMPLES) {
      const frameF32 = this._buf.subarray(0, FRAME_SAMPLES);

      // Float32 [-1,1] -> Int16 PCM
      const int16 = new Int16Array(FRAME_SAMPLES);
      for (let i = 0; i < FRAME_SAMPLES; i++) {
        const s = Math.max(-1, Math.min(1, frameF32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // transfer the underlying buffer (zero-copy)
      this.port.postMessage(int16.buffer, [int16.buffer]);

      // keep remainder in buffer
      this._buf = this._buf.subarray(FRAME_SAMPLES);
    }
  }

  process(inputs, _outputs, _parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    // take mono from channel 0; if missing, do nothing
    const ch0 = input[0];
    if (!ch0) return true;

    // resample if needed to 16 kHz
    const mono16k = this._resampleToTargetSR(ch0, this._srcSR);

    // append and flush in fixed 20 ms packets
    this._appendToBuf(mono16k);
    this._flushFrames();

    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);