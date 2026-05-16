
const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------------------------
// 1. HELPER: Parse LRC to get Ground Truth
// -----------------------------------------------------------------------------
function parseLRC(lrcContent) {
  const lines = [];
  const regex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\](.*)/;
  
  lrcContent.split('\n').forEach(line => {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        lines.push({
          time: minutes * 60 + seconds,
          text
        });
      }
    }
  });
  return lines;
}

// -----------------------------------------------------------------------------
// 2. HELPER: Generate Simulated Whisper Output (Pure Magic Scenarios)
// -----------------------------------------------------------------------------
function simulateWhisperOutput(groundTruth) {
  const segments = [];
  
  groundTruth.forEach((line, index) => {
     if (!line.time) return;
     
     // Scenario 1: Duplicate Line (Whisper often repeats lines at end of segments)
     // Happening at index 3 for testing
     if (index === 3) {
        segments.push({
            text: line.text + " " + line.text, // Repeated text in one segment
            t0: line.time * 100,
            t1: (line.time + 4) * 100,
            words: [] // Simplified for this test
        });
        return;
     }

     // Scenario 2: Hallucination of Credits/Intro
     if (index === 0) {
         segments.push({
             text: "Translated by Amara.org",
             t0: 0,
             t1: 100,
             words: []
         });
     }

     // Default good segment
    const words = line.text.split(' ');
    const duration = 2.0; 
    const wordDuration = duration / words.length;
    
    const segmentWords = words.map((w, i) => ({
      word: w,
      t0: (line.time + (i * wordDuration)) * 100,
      t1: (line.time + ((i + 1) * wordDuration)) * 100,
      p: 0.9 
    }));

    segments.push({
      text: line.text,
      t0: line.time * 100,
      t1: (line.time + duration) * 100,
      words: segmentWords
    });
  });

  return { segments };
}

// -----------------------------------------------------------------------------
// 3. LOGIC UNDER TEST: parseWhisperResult (Refactored)
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// 3. LOGIC UNDER TEST: parseWhisperResult (Refactored)
// -----------------------------------------------------------------------------
// Removed structural words (instrumental, intro, outro, solo, break) from noise patterns
const NOISE_PATTERNS = /^(noise|machine|whirring|humming|brrr|clicking|silence|music|applause|cheering|translated by|subtitle|caption)$/i;

// Helper to clean text: Remove brackets/parens BUT preserve structural ones
const cleanLyricText = (text) => {
    if (!text) return '';
    
    // 1. Temporarily protect valid structural tags
    // We want to keep [Instrumental], [Verse], [Chorus], [Bridge], [Intro], [Outro], [Solo], [Hook]
    // Case-insensitive match for these specific tags
    let processed = text.replace(/\[(instrumental|verse|chorus|bridge|intro|outro|solo|hook|break).*?\]/gi, (match) => {
        return `__KEEP_${match.replace(/[\[\]\s]/g, '')}__`; // e.g. __KEEP_Instrumental__
    });

    // 2. Remove ALL other brackets/parens and non-word chars (standard cleaning)
    // Note: We allow underscores now to preserve our placeholders
    processed = processed.replace(/\[.*?\]|\(.*?\)|([^\w\s'_])+/g, ' ').replace(/\s+/g, ' ').trim();

    // 3. Restore the protected tags (adding brackets back)
    processed = processed.replace(/__KEEP_(.*?)__/g, (match, p1) => {
        return `[${p1}]`;
    });
    
    // 4. Deduplicate consecutive structural tags (e.g. [Instrumental] [Instrumental] -> [Instrumental])
    // This fixes the issue where duplicates are preserved
    processed = processed.replace(/(\[.*?\])(\s+\1)+/g, '$1');

    return processed;
};

function parseWhisperResult(result) {
    const segments = [];
    
    if (result.segments && Array.isArray(result.segments)) {
      result.segments.forEach((segment) => {
        const words = [];
        
        // 1. Process Words
        if (segment.words) {
          segment.words.forEach((wordData) => {
            const rawWord = (wordData.word || wordData.text || '').trim();
            const cleanWord = cleanLyricText(rawWord);
            
            // Check if it's a bracketed word (that wasn't protected/restored)
            // If it starts with [ after cleaning, it's a protected tag, so we keep it.
            // If it was stripped, it's empty.
            // If it was valid text, we keep it.
            
            // Note: Our cleanLyricText restores brackets for valid tags like [Instrumental]
            const isProtectedTag = cleanWord.startsWith('[');
            const isNoise = NOISE_PATTERNS.test(cleanWord);
            
            if (cleanWord.length > 0 && !isNoise) {
               // If it's a protected tag, we keep it as a "word"
               // If it's normal text, we keep it.
               // We filtered out "bad" brackets in the cleaning step already.
               words.push({
                word: isProtectedTag ? cleanWord : rawWord, // Use clean word for tags to normalize, raw for text
                start: wordData.t0 / 100,
                end: wordData.t1 / 100,
                probability: wordData.p ?? 0.8
              });
            }
          });
        }
        
        // 2. Process Segment text
        const rawSegmentText = (segment.text || '').trim();
        let cleanSegmentText = cleanLyricText(rawSegmentText);
        
        // NEW: Check for common subtitle credits
        if (cleanSegmentText.toLowerCase().includes('translated by') || cleanSegmentText.toLowerCase().includes('captioned by')) {
            cleanSegmentText = '';
        }
        
        if (NOISE_PATTERNS.test(cleanSegmentText)) {
             cleanSegmentText = '';
        }

        // 3. Construct Final Segment
        if (words.length > 0) {
           const reconstructed = words.map(w => w.word).join(' ').trim();
           if (reconstructed.length > 0) {
             segments.push({
                text: reconstructed,
                start: words[0].start,
                end: words[words.length - 1].end,
                words
             });
           }
        } else if (cleanSegmentText.length > 0) {
             segments.push({
               text: cleanSegmentText,
               start: segment.t0 / 100,
               end: segment.t1 / 100,
               words: []
             });
        }
      });
    }
    return segments;
}

// -----------------------------------------------------------------------------
// 4. MAIN TEST EXECUTION
// -----------------------------------------------------------------------------
async function runTest() {
  const assetsDir = path.join(__dirname, '../testing_assets');
  const truthPath = path.join(assetsDir, 'gracieabramslyricswithtimestamp.txt');

  console.log('Loading assets...');
  let truthText;
  try {
    truthText = fs.readFileSync(truthPath, 'utf-8');
  } catch (e) {
      console.error('Files not found!');
      process.exit(1);
  }
  
  const groundTruth = parseLRC(truthText);

  console.log('\n--- SIMULATING PURE MAGIC ISSUES ---');
  const simulatedWhisperRaw = simulateWhisperOutput(groundTruth);
  
  console.log('\n--- TESTING PARSER ---');
  const parsedSegments = parseWhisperResult(simulatedWhisperRaw);
  
  // INSPECTION
  console.log('--- OUTPUT INSPECTION ---');
  parsedSegments.forEach((s, i) => {
      console.log(`[${s.start.toFixed(2)}] ${s.text}`);
  });
  
  // CHECK FOR CREDIT HALLUCINATION
  const hasCredits = parsedSegments.some(s => s.text.toLowerCase().includes('translated by'));
  if (hasCredits) {
      console.error('FAIL: "Translated by..." hallucination was NOT filtered.');
  } else {
      console.log('PASS: Credit hallucinations filtered.');
  }
}

runTest();
