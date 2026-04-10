import { useState } from 'react';

export function useVoiceSearch(onResult) {
  const [isListening, setIsListening] = useState(false);

  const startVoiceSearch = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser. Please use a modern browser like Google Chrome.');
      return;
    }

    // Try to explicitly request microphone permission first to be more robust
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Microphone permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('Microphone access is blocked. \n\nTo fix this:\n1. Click the camera/microphone icon in your browser address bar.\n2. Select "Always allow".\n3. Refresh the page and try again.');
        return;
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'hi-IN'; 
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice search started');
    };
    
    recognition.onend = () => {
      setIsListening(false);
      console.log('Voice search ended');
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      if (event.results[0].isFinal) {
        console.log('Final transcript:', transcript);
        onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          alert('Microphone access is blocked. \n\nTo fix this:\n1. Click the camera/microphone icon in your browser address bar.\n2. Select "Always allow".\n3. Refresh the page and try again.');
          break;
        case 'network':
          alert('A network error occurred. Please check your internet connection and try again.');
          break;
        case 'no-speech':
          console.log('No speech detected');
          break;
        case 'aborted':
          console.log('Speech recognition aborted');
          break;
        case 'service-not-allowed':
          alert('Speech recognition service is not allowed by the browser.');
          break;
        default:
          console.warn(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.start();
  };

  return { isListening, startVoiceSearch };
}
