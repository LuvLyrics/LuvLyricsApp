
const NOISE_REGEX = /^(noise|machine|whirring|humming|brrr|clicking|silence|music|applause)$/i;


// Refactored logic from whisperService.ts
function parseWhisperResult(result) {
    const segments = [];
    let fullText = '';
    
    console.log('[Test] Parsing Whisper result...');
    
    // Improved Noise Regex: Matches common non-lyrical descriptions
    const NOISE_PATTERNS = /^(noise|machine|whirring|humming|brrr|clicking|silence|music|applause|instrumental|intro|outro|solo|break)$/i;
    
    // Helper to clean text: Remove brackets, parens, and trim
    const cleanLyricText = (text) => {
      if (!text) return '';
      // Remove content in brackets [] or parens ()
      return text.replace(/\[.*?\]|\(.*?\)|([^\w\s']|_)+/g, ' ').replace(/\s+/g, ' ').trim();
    };

    if (result.segments && Array.isArray(result.segments)) {
      result.segments.forEach((segment, segmentIndex) => {
        const words = [];
        
        // --- 1. Process Words (Validating & Cleaning) ---
        if (segment.words && Array.isArray(segment.words)) {
          segment.words.forEach((wordData) => {
            const rawWord = (wordData.word || wordData.text || '').trim();
            const cleanWord = cleanLyricText(rawWord);
            
            const isBracketed = rawWord.startsWith('[') || rawWord.startsWith('(');
            
            if (cleanWord.length > 0 && !isBracketed) {
              words.push({
                word: rawWord, 
                start: (wordData.t0 != null ? wordData.t0 / 100 : wordData.start || 0),
                end: (wordData.t1 != null ? wordData.t1 / 100 : wordData.end || 0),
                probability: wordData.p ?? wordData.probability ?? 0.8
              });
            }
          });
        } else {
          // --- Fallback: Estimate Word Timestamps ---
          const text = segment.text || '';
          const wordTexts = text.split(/\s+/).filter((w) => cleanLyricText(w).length > 0);
          
          if (wordTexts.length > 0) {
            const segmentStart = (segment.t0 != null ? segment.t0 / 100 : segment.start || 0);
            const segmentEnd = (segment.t1 != null ? segment.t1 / 100 : segment.end || 0);
            const duration = segmentEnd - segmentStart;
            const timePerWord = duration / wordTexts.length;
            
            console.log(`[Test] Segment ${segmentIndex}: Estimating timestamps for ${wordTexts.length} words`);
            
            wordTexts.forEach((wordText, index) => {
              const start = segmentStart + (index * timePerWord);
              const end = start + timePerWord;
              
              const isBracketed = wordText.startsWith('[') || wordText.startsWith('(');
              if (!isBracketed) {
                words.push({
                  word: wordText.trim(),
                  start,
                  end,
                  probability: 0.8
                });
              }
            });
          }
        }
        
        // --- 2. Process Segment Text ---
        const rawSegmentText = (segment.text || '').trim();
        let cleanSegmentText = cleanLyricText(rawSegmentText);
        
        if (NOISE_PATTERNS.test(cleanSegmentText)) {
          console.log(`[Test] Detected noise segment: "${cleanSegmentText}"`);
          cleanSegmentText = ''; 
        }
        
        // --- 3. Construct Final Segment ---
        if (words.length > 0) {
           const reconstructedText = words.map(w => w.word).join(' ').trim();
           
           if (reconstructedText.length > 0) {
             segments.push({
                text: reconstructedText,
                start: words[0].start,
                end: words[words.length - 1].end,
                words
             });
             fullText += reconstructedText + ' ';
           }
        } else if (cleanSegmentText.length > 0) {
             segments.push({
               text: cleanSegmentText,
               start: (segment.t0 != null ? segment.t0 / 100 : segment.start || 0),
               end: (segment.t1 != null ? segment.t1 / 100 : segment.end || 0),
               words: [] 
             });
             fullText += cleanSegmentText + ' ';
        } else {
             console.log(`[Test] Dropped empty/noise segment from: "${rawSegmentText}"`);
        }
      });
    }
    
    return { segments, fullText };
}

// SIMULATE BAD INPUTS
const badInputs = {
    segments: [
        { text: "[Music]", start: 0, end: 5 }, // Case 1: Pure noise brackets
        { text: "[Music] Hello world", start: 5, end: 10 }, // Case 2: Mixed content
        { text: "This is a test", start: 10, end: 15 }, // Case 3: Normal
        { text: "(Applause)", start: 15, end: 20 }, // Case 4: Parentheses
        { text: "Machine whirring", start: 20, end: 25 }, // Case 5: Noise keywords
        { text: "   ", start: 25, end: 30 }, // Case 6: Whitespace
        { text: " [Uncertain] ", start: 30, end: 35 } // Case 7: Unknown bracket
    ]
};

const result = parseWhisperResult(badInputs);
console.log('Final Segment Count:', result.segments.length);
console.log('Final Segments:', JSON.stringify(result.segments, null, 2));
