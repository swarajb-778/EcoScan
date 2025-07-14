import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import VoiceInput from '$lib/components/VoiceInput.svelte';

// Mock Speech Recognition API
const createMockSpeechRecognition = () => {
  const mockRecognition = {
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    maxAlternatives: 1,
    onstart: null,
    onend: null,
    onerror: null,
    onresult: null,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  return mockRecognition;
};

describe('VoiceInput Edge Cases Tests', () => {
  let mockSpeechRecognition: any;

  beforeEach(() => {
    mockSpeechRecognition = createMockSpeechRecognition();
    
    global.SpeechRecognition = vi.fn(() => mockSpeechRecognition);
    global.webkitSpeechRecognition = global.SpeechRecognition;

    // Mock other browser APIs
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getAudioTracks: () => [{ stop: vi.fn() }]
      })
    } as any;

    global.AudioContext = vi.fn().mockImplementation(() => ({
      createAnalyser: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        getByteFrequencyData: vi.fn(),
        frequencyBinCount: 1024,
        fftSize: 2048
      })),
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn()
      })),
      state: 'running',
      close: vi.fn()
    }));

    global.webkitAudioContext = global.AudioContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Audio Input Edge Cases', () => {
    it('should handle microphone permission denied', async () => {
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
        new Error('Permission denied')
      );

      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/microphone access denied/i)).toBeInTheDocument();
      });
    });

    it('should handle no microphone available', async () => {
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
        new Error('No audio input devices')
      );

      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/no microphone found/i)).toBeInTheDocument();
      });
    });

    it('should handle microphone already in use', async () => {
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
        new Error('Device in use')
      );

      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/microphone is busy/i)).toBeInTheDocument();
      });
    });

    it('should handle audio hardware failures', async () => {
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
        new Error('Hardware failure')
      );

      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/microphone hardware error/i)).toBeInTheDocument();
      });
    });

    it('should handle audio context creation failure', async () => {
      global.AudioContext = vi.fn().mockImplementation(() => {
        throw new Error('AudioContext not supported');
      });

      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/audio processing not supported/i)).toBeInTheDocument();
      });
    });
  });

  describe('Speech Recognition Edge Cases', () => {
    it('should handle speech recognition not supported', async () => {
      delete (global as any).SpeechRecognition;
      delete (global as any).webkitSpeechRecognition;

      render(VoiceInput);

      await waitFor(() => {
        expect(screen.getByText(/speech recognition not supported/i)).toBeInTheDocument();
      });
    });

    it('should handle speech recognition initialization failure', async () => {
      global.SpeechRecognition = vi.fn().mockImplementation(() => {
        throw new Error('SpeechRecognition failed to initialize');
      });

      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/speech recognition failed to start/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors during speech recognition', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate network error
      const errorEvent = { error: 'network' };
      mockSpeechRecognition.onerror(errorEvent);

      await waitFor(() => {
        expect(screen.getByText(/network error during speech recognition/i)).toBeInTheDocument();
      });
    });

    it('should handle service unavailable errors', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate service unavailable
      const errorEvent = { error: 'service-not-allowed' };
      mockSpeechRecognition.onerror(errorEvent);

      await waitFor(() => {
        expect(screen.getByText(/speech service unavailable/i)).toBeInTheDocument();
      });
    });

    it('should handle language not supported errors', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate language not supported
      const errorEvent = { error: 'language-not-supported' };
      mockSpeechRecognition.onerror(errorEvent);

      await waitFor(() => {
        expect(screen.getByText(/language not supported/i)).toBeInTheDocument();
      });
    });
  });

  describe('Audio Quality Edge Cases', () => {
    it('should handle extremely low volume input', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate very quiet speech
      const quietEvent = {
        results: [{
          0: { transcript: 'whisper', confidence: 0.2 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(quietEvent);

      await waitFor(() => {
        expect(screen.getByText(/volume too low/i)).toBeInTheDocument();
      });
    });

    it('should handle excessive background noise', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate noisy environment
      const noisyEvent = {
        results: [{
          0: { transcript: 'bottle noise static interference', confidence: 0.1 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(noisyEvent);

      await waitFor(() => {
        expect(screen.getByText(/too much background noise/i)).toBeInTheDocument();
      });
    });

    it('should handle audio clipping and distortion', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate distorted audio
      const distortedEvent = {
        results: [{
          0: { transcript: 'botllllle', confidence: 0.3 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(distortedEvent);

      await waitFor(() => {
        expect(screen.getByText(/audio quality poor/i)).toBeInTheDocument();
      });
    });

    it('should handle intermittent audio drops', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate intermittent results
      const incompleteEvent = {
        results: [{
          0: { transcript: 'plas...tle...rec...', confidence: 0.4 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(incompleteEvent);

      await waitFor(() => {
        expect(screen.getByText(/incomplete audio/i)).toBeInTheDocument();
      });
    });
  });

  describe('Content Processing Edge Cases', () => {
    it('should handle empty speech input', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate empty result
      const emptyEvent = {
        results: [{
          0: { transcript: '', confidence: 0.8 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(emptyEvent);

      await waitFor(() => {
        expect(screen.getByText(/no speech detected/i)).toBeInTheDocument();
      });
    });

    it('should handle only whitespace input', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate whitespace-only result
      const whitespaceEvent = {
        results: [{
          0: { transcript: '   \n\t   ', confidence: 0.8 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(whitespaceEvent);

      await waitFor(() => {
        expect(screen.getByText(/no meaningful content/i)).toBeInTheDocument();
      });
    });

    it('should handle extremely long speech input', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate very long input
      const longTranscript = 'plastic bottle '.repeat(500);
      const longEvent = {
        results: [{
          0: { transcript: longTranscript, confidence: 0.8 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(longEvent);

      await waitFor(() => {
        expect(screen.getByText(/input too long/i)).toBeInTheDocument();
      });
    });

    it('should handle special characters and symbols', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate special characters
      const specialEvent = {
        results: [{
          0: { transcript: '@#$%^&*()_+ bottle 12345', confidence: 0.8 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(specialEvent);

      await waitFor(() => {
        expect(screen.getByText(/bottle/i)).toBeInTheDocument();
        // Should extract meaningful content
      });
    });

    it('should handle mixed case and punctuation', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate mixed formatting
      const mixedEvent = {
        results: [{
          0: { transcript: 'PLASTIC, bottle! water... container?', confidence: 0.8 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(mixedEvent);

      await waitFor(() => {
        expect(screen.getByText(/plastic bottle/i)).toBeInTheDocument();
      });
    });
  });

  describe('Language and Locale Edge Cases', () => {
    it('should handle unsupported language detection', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate non-English speech
      const foreignEvent = {
        results: [{
          0: { transcript: 'bouteille en plastique', confidence: 0.8 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(foreignEvent);

      await waitFor(() => {
        expect(screen.getByText(/language not supported/i)).toBeInTheDocument();
      });
    });

    it('should handle accented English', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate accented pronunciation
      const accentedEvent = {
        results: [{
          0: { transcript: 'bottel plastik', confidence: 0.6 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(accentedEvent);

      await waitFor(() => {
        expect(screen.getByText(/bottle plastic/i)).toBeInTheDocument();
        // Should handle pronunciation variations
      });
    });

    it('should handle speech impediments and unclear pronunciation', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate unclear pronunciation
      const unclearEvent = {
        results: [{
          0: { transcript: 'pwastic bwottle', confidence: 0.5 },
          isFinal: true
        }]
      };

      mockSpeechRecognition.onresult(unclearEvent);

      await waitFor(() => {
        expect(screen.getByText(/plastic bottle/i)).toBeInTheDocument();
        // Should handle speech variations
      });
    });
  });

  describe('Timing and Concurrency Edge Cases', () => {
    it('should handle rapid start/stop cycles', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      // Rapid clicking
      for (let i = 0; i < 10; i++) {
        fireEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await waitFor(() => {
        expect(screen.getByText(/please wait before trying again/i)).toBeInTheDocument();
      });
    });

    it('should handle overlapping recognition sessions', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);
      
      // Start second session before first ends
      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/recognition already in progress/i)).toBeInTheDocument();
      });
    });

    it('should handle session timeout', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate timeout
      setTimeout(() => {
        mockSpeechRecognition.onend();
      }, 100);

      await waitFor(() => {
        expect(screen.getByText(/recording timeout/i)).toBeInTheDocument();
      });
    });

    it('should handle browser tab becoming inactive', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true
      });

      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);

      await waitFor(() => {
        expect(screen.getByText(/recording paused/i)).toBeInTheDocument();
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle memory pressure during recording', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate memory pressure
      const memoryEvent = new CustomEvent('memory-pressure', {
        detail: { level: 'critical' }
      });
      window.dispatchEvent(memoryEvent);

      await waitFor(() => {
        expect(screen.getByText(/stopping recording due to memory pressure/i)).toBeInTheDocument();
      });
    });

    it('should handle slow processing performance', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Mock slow processing
      const slowEvent = {
        results: [{
          0: { transcript: 'bottle', confidence: 0.8 },
          isFinal: true
        }]
      };

      // Simulate delay in processing
      setTimeout(() => {
        mockSpeechRecognition.onresult(slowEvent);
      }, 5000);

      await waitFor(() => {
        expect(screen.getByText(/processing may take a moment/i)).toBeInTheDocument();
      });
    });

    it('should handle audio buffer overflow', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate buffer overflow
      const errorEvent = { error: 'audio-capture' };
      mockSpeechRecognition.onerror(errorEvent);

      await waitFor(() => {
        expect(screen.getByText(/audio buffer overflow/i)).toBeInTheDocument();
      });
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle partial Web Speech API support', async () => {
      // Mock browser with limited support
      global.SpeechRecognition = undefined;
      global.webkitSpeechRecognition = vi.fn(() => ({
        ...mockSpeechRecognition,
        continuous: undefined // Some properties not supported
      }));

      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/limited speech recognition support/i)).toBeInTheDocument();
      });
    });

    it('should handle autoplay policy restrictions', async () => {
      global.AudioContext = vi.fn().mockImplementation(() => ({
        ...new (vi.fn())(),
        state: 'suspended'
      }));

      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/click to enable audio/i)).toBeInTheDocument();
      });
    });

    it('should handle secure context requirements', async () => {
      // Mock insecure context
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        writable: true
      });

      render(VoiceInput);

      await waitFor(() => {
        expect(screen.getByText(/secure connection required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Recovery and Fallback Edge Cases', () => {
    it('should provide text input fallback', async () => {
      delete (global as any).SpeechRecognition;
      delete (global as any).webkitSpeechRecognition;

      render(VoiceInput);

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /type your item/i })).toBeInTheDocument();
      });
    });

    it('should recover from temporary failures', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      // First attempt fails
      mockSpeechRecognition.start.mockImplementationOnce(() => {
        throw new Error('Temporary failure');
      });

      fireEvent.click(micButton);

      await waitFor(() => {
        expect(screen.getByText(/retrying.../i)).toBeInTheDocument();
      });

      // Second attempt succeeds
      mockSpeechRecognition.start.mockImplementation(() => {
        mockSpeechRecognition.onstart();
      });

      await waitFor(() => {
        expect(screen.getByText(/listening.../i)).toBeInTheDocument();
      });
    });

    it('should maintain state during intermittent connectivity', async () => {
      render(VoiceInput);
      const micButton = screen.getByRole('button', { name: /microphone/i });

      fireEvent.click(micButton);

      // Simulate network disconnection
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      window.dispatchEvent(new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
      });

      // Simulate network restoration
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });

      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(screen.getByText(/back online/i)).toBeInTheDocument();
      });
    });
  });
}); 