// src/components/VoiceNavigation.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import i18n from '../i18n/i18n';

export default function VoiceNavigation() {
  const { transcript, resetTranscript } = useSpeechRecognition();
  const navigate = useNavigate();

  useEffect(() => {
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      console.warn('Speech recognition not supported');
      return;
    }

    SpeechRecognition.startListening({ continuous: true, language: i18n.language });

    const commands = {
      'go to dashboard': '/dashboard',
      'go to catch log': '/log-catch',
      'go to market': '/market',
      'go to profile': '/profile',
      'go to feedback': '/feedback',
    };

    for (const [command, path] of Object.entries(commands)) {
      if (transcript.toLowerCase().includes(command)) {
        navigate(path);
        resetTranscript();
      }
    }

    return () => SpeechRecognition.stopListening();
  }, [transcript, navigate, resetTranscript]);

  return null;
}
