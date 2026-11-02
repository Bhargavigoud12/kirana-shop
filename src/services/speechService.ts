/**
 * Browser Web Speech API service for offline Speech Recognition and Speech Synthesis.
 */

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private currentLanguage = 'hi-IN'; // Default Hinglish/Hindi, can be 'te-IN' or 'en-IN'

  public isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!window.speechSynthesis;
  }

  public setLanguage(lang: 'hi-IN' | 'te-IN' | 'en-IN' | 'en-US') {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Start listening for voice commands
   */
  public startListening(callbacks: SpeechRecognitionCallbacks): boolean {
    if (!this.isRecognitionSupported()) {
      callbacks.onError?.('Web Speech Recognition is not supported in this browser. You can use the manual typing fallback below.');
      return false;
    }

    // If already listening, stop previous session
    this.stopListening();

    try {
      const SpeechRecognitionConstructor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = false; // Turn-based command listening
      this.recognition.interimResults = true; // Stream interim words in real-time
      this.recognition.lang = this.currentLanguage;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        callbacks.onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const transcript = finalTranscript || interimTranscript;
        const isFinal = !!finalTranscript;
        callbacks.onResult?.(transcript, isFinal);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        let message = event.error || 'Speech recognition error';
        if (event.error === 'not-allowed') {
          message = 'Microphone permission was denied. Please allow microphone access or use the text fallback.';
        } else if (event.error === 'no-speech') {
          message = 'No speech detected. Please speak clearly or try again.';
        }
        callbacks.onError?.(message);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        callbacks.onEnd?.();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      this.isListening = false;
      callbacks.onError?.(err.message || 'Failed to start speech recognition');
      return false;
    }
  }

  /**
   * Stop speech recognition
   */
  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore stop error
      }
    }
    this.isListening = false;
  }

  /**
   * Speak aloud confirmation prompt or status message using SpeechSynthesis
   */
  public speak(text: string, lang: string = 'hi-IN'): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSynthesisSupported()) {
        resolve();
        return;
      }

      try {
        // Cancel any pending speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to pick an appropriate voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find((v) => v.lang.startsWith(lang.split('-')[0]));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis failed:', err);
        resolve();
      }
    });
  }

  public cancelSpeech(): void {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechService = new SpeechService();
