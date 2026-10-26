import { useCallback, useEffect, useRef, useState } from "react";
import { cleanTranscript, dictationErrorMessage } from "@/lib/dictation";

/** Minimal typing for the Web Speech API (Chrome/Android/Safari expose it with a webkit prefix). */
interface SpeechResult { isFinal: boolean; 0: { transcript: string } }
interface SpeechEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => Recognition;

const getRecognition = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

/** Only one field dictates at a time: starting another mic stops the previous one. */
let stopActive: (() => void) | null = null;

/**
 * Voice dictation in Spanish (the phone's speech recognition turns voice into text).
 * Calls onText with each finished, cleaned-up phrase; `interim` shows what is being heard.
 */
export const useDictation = (onText: (text: string) => void) => {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const supported = getRecognition() !== null;

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setInterim("");
    if (stopActive === stop) stopActive = null;
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    if (stopActive && stopActive !== stop) stopActive();
    stopActive = stop;
    wantRef.current = true;
    setError(null);

    const launch = () => {
      const rec = new Ctor();
      rec.lang = "es-CO";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let pending = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            const text = cleanTranscript(r[0].transcript);
            if (text) onTextRef.current(text);
          } else {
            pending += r[0].transcript;
          }
        }
        setInterim(pending.trim());
      };
      rec.onerror = (e) => {
        // Silence is normal while thinking; keep listening
        if (e.error === "no-speech" || e.error === "aborted") return;
        wantRef.current = false;
        setError(dictationErrorMessage(e.error));
      };
      // Android stops after a pause: restart until the nurse taps stop
      rec.onend = () => {
        setInterim("");
        if (wantRef.current) {
          try { launch(); return; } catch { /* no se pudo reanudar */ }
        }
        recRef.current = null;
        setListening(false);
      };
      recRef.current = rec;
      rec.start();
    };

    try {
      launch();
      setListening(true);
    } catch {
      wantRef.current = false;
      setError(dictationErrorMessage(""));
    }
  }, [stop]);

  useEffect(() => () => { wantRef.current = false; recRef.current?.stop(); }, []);

  return { supported, listening, interim, error, clearError: () => setError(null), start, stop, toggle: listening ? stop : start };
};
