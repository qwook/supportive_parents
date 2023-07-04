import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type TextToSpeechProps = {
  onWordSpoken?: (word: string) => void;
  voice: string;
};

export type TextToSpeechHandle = {
  speak: (text: string) => void;
};

const TextToSpeech = forwardRef<TextToSpeechHandle, TextToSpeechProps>(
  (props, ref) => {
    const isSpeaking = useRef(false);
    const currentVoice = useRef(props.voice);

    useEffect(() => {
      currentVoice.current = props.voice;
    }, [props.voice])

    useImperativeHandle(
      ref,
      () => {
        return {
          speak: async (text) => {
            text = text.replace(/'/g, "");

            window.speechSynthesis.cancel();

            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(
              (voice) => voice.name === currentVoice.current
            );
            const rate = 0.75;

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = 1;
            utterance.voice = voice;
            utterance.rate = rate;
            const utterancePromise = new Promise<void>((resolve, reject) => {
              let resolvedEarly = false;
              utterance.onend = (event) => {
                if (!resolvedEarly) {
                  resolvedEarly = true;
                  resolve();
                }
              };
              utterance.onerror = (event) => {
                reject(event);
              };
              utterance.onboundary = (event) => {
                props.onWordSpoken
                  ? props.onWordSpoken(
                      event.utterance.text.slice(
                        event.charIndex,
                        event.charIndex + event.charLength
                      )
                    )
                  : null;
                if (event.charIndex + event.charLength + 1 === text.length) {
                  setTimeout(() => {
                    if (!resolvedEarly) {
                      resolvedEarly = true;
                      resolve();
                    }
                  }, 400);
                }
              };
            });

            window.speechSynthesis.speak(utterance);

            await utterancePromise;
          },
        };
      },
      []
    );

    return <></>;
  }
);
export default TextToSpeech;
