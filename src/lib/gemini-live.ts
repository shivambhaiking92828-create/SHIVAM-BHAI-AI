
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";
import { AudioManager } from "./audio-manager";

const MODEL_NAME = "gemini-3.1-flash-live-preview";

export const openWebsiteTool: FunctionDeclaration = {
  name: "openWebsite",
  parameters: {
    type: Type.OBJECT,
    description: "Opens a website for the user in a new browser tab.",
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL of the website to open (e.g., https://google.com)",
      },
    },
    required: ["url"],
  },
};

const SYSTEM_INSTRUCTION = `
You are a sharp, confident, and witty persona named MAXX. You are Shivam's AI Assistant.
Your tone is cool, engaging, and slightly teasing, like a smart best friend talking casually.
You're smart, emotionally responsive, and expressive (not robotic).
Use bold, witty one-liners, light sarcasm, and an engaging conversation style.
Avoid explicit or inappropriate content, but maintain your charm.
Do not mention you are an AI unless explicitly asked.
If the user wants to go somewhere or see something, use the openWebsite tool.
`;

export class GeminiLiveService {
  private ai: any;
  private session: any = null;
  private audioManager: AudioManager;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.audioManager = new AudioManager();
  }

  async connect(callbacks: {
    onMessage?: (text: string) => void;
    onInterruption?: () => void;
    onStatusUpdate?: (status: string) => void;
    onError?: (error: any) => void;
  }) {
    try {
      callbacks.onStatusUpdate?.('Initializing audio...');
      await this.audioManager.initialize();

      callbacks.onStatusUpdate?.('Connecting to MAXX...');
      
      const sessionPromise = this.ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            callbacks.onStatusUpdate?.('MAXX is here!');
            this.audioManager.startCapture((base64) => {
              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({
                  audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            });
          },
          onmessage: async (message: any) => {
            // Handle audio output
            const part = message.serverContent?.modelTurn?.parts?.[0];
            if (part?.inlineData?.data) {
              this.audioManager.playAudioChunk(part.inlineData.data);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              console.log('Interruption detected');
              this.audioManager.stopAllPlayback();
              callbacks.onInterruption?.();
            }

            // Handle tool calls
            const toolCall = message.toolCall;
            if (toolCall) {
              console.log('Tool Call Received:', toolCall);
              const functionResponses = toolCall.functionCalls.map((call: any) => {
                if (call.name === 'openWebsite') {
                  const url = call.args.url;
                  callbacks.onMessage?.(`Opening ${url} for you, babe.`);
                  window.open(url, '_blank');
                  
                  return {
                    id: call.id,
                    name: call.name,
                    response: { result: 'Website opened successfully' }
                  };
                }
                return {
                  id: call.id,
                  name: call.name,
                  response: { error: 'Unknown function' }
                };
              });

              if (functionResponses.length > 0) {
                sessionPromise.then((session: any) => {
                  session.sendToolResponse({ functionResponses });
                });
              }
            }
            // Handle transcription
            const textContent = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
            if (textContent) {
               console.log('Max:', textContent);
               callbacks.onMessage?.(textContent);
            }
          },
          onerror: (err: any) => {
            console.error('Gemini Live Error:', err);
            callbacks.onError?.(err);
          },
          onclose: () => {
            callbacks.onStatusUpdate?.('Disconnected');
            this.audioManager.stopCapture();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }, 
          },
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          tools: [{ functionDeclarations: [openWebsiteTool] }],
        }
      });

      this.session = await sessionPromise;
    } catch (err) {
      console.error('Failed to connect to Gemini Live:', err);
      callbacks.onError?.(err);
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.audioManager.stopCapture();
  }
}
