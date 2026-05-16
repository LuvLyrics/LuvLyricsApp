
const NOISE_REGEX = /^(noise|machine|whirring|humming|brrr|clicking|silence|music|applause)$/i;

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

interface WhisperSegment {
  text: string;
  start: number;
  end: number;
  words?: any[];
  t0?: number;
  t1?: number;
}

function parseWhisperResult(result: any) {
    // ... (same logic as in whisperService.ts) ...
    const segments: any[] = [];
    let fullText = '';
    
    console.log('[Test] Parsing Whisper result...');
    
    // ...
}

// ... rest of the testing code ...
