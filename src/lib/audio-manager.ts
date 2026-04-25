
import { floatTo16BitPCM, pcm16ToFloat32, base64ToBuffer } from './audio-utils';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;
  private onAudioData: ((base64Data: string) => void) | null = null;
  private isCapturing = false;
  private playbackStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor() {}

  async initialize() {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    await this.audioContext.resume();
  }

  async startCapture(onAudioData: (base64Data: string) => void) {
    if (this.isCapturing) return;

    if (!this.audioContext) {
      await this.initialize();
    }

    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext!.createMediaStreamSource(this.microphoneStream);
      
      this.processor = this.audioContext!.createScriptProcessor(2048, 1, 1);
      this.onAudioData = onAudioData;

      this.processor.onaudioprocess = (e) => {
        if (!this.isCapturing) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(inputData);
        
        // Convert pcm16 ArrayBuffer to base64
        const bytes = new Uint8Array(pcm16);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        if (this.onAudioData) {
          this.onAudioData(base64);
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext!.destination);
      this.isCapturing = true;
    } catch (err) {
      console.error('Error starting microphone capture:', err);
      throw err;
    }
  }

  stopCapture() {
    this.isCapturing = false;
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
  }

  async playAudioChunk(base64Data: string) {
    if (!this.audioContext) return;

    const arrayBuffer = base64ToBuffer(base64Data);
    const float32Data = pcm16ToFloat32(arrayBuffer);
    
    // The Live API response is 24kHz
    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    if (this.playbackStartTime < now) {
      this.playbackStartTime = now + 0.1; // Small buffer
    }

    source.start(this.playbackStartTime);
    this.activeSources.push(source);
    
    const duration = audioBuffer.duration;
    this.playbackStartTime += duration;

    source.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== source);
    };
  }

  stopAllPlayback() {
    this.activeSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source might have already stopped
      }
    });
    this.activeSources = [];
    this.playbackStartTime = 0;
  }
}
