
const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------------------------
// 1. LOGIC UNDER TEST: parseWhisperResult (Refactored)
//    (This matches what is in whisperService.ts)
// -----------------------------------------------------------------------------
// Removed structural words from noise patterns
const NOISE_PATTERNS = /^(noise|machine|whirring|humming|brrr|clicking|silence|music|applause|cheering|translated by|subtitle|caption)$/i;

const cleanLyricText = (text) => {
    if (!text) return '';
    
    // 1. Temporarily protect valid structural tags
    let processed = text.replace(/\[(instrumental|verse|chorus|bridge|intro|outro|solo|hook|break).*?\]/gi, (match) => {
        return `__KEEP_${match.replace(/[\[\]\s]/g, '')}__`; 
    });

    // 2. Remove ALL other brackets/parens and non-word chars
    processed = processed.replace(/\[.*?\]|\(.*?\)|([^\w\s'_])+/g, ' ').replace(/\s+/g, ' ').trim();

    // 3. Restore the protected tags
    processed = processed.replace(/__KEEP_(.*?)__/g, (match, p1) => {
        return `[${p1}]`;
    });
    
    // 4. Deduplicate consecutive structural tags
    processed = processed.replace(/(\[.*?\])(\s+\1)+/g, '$1');

    return processed;
};

// Simplified parser that handles the structure from `python -m whisper` (JSON output)
// Note: python -m whisper JSON structure might differ slightly from whisper.rn
function parseRealWhisperJSON(jsonData) {
    const segments = [];
    
    if (jsonData.segments && Array.isArray(jsonData.segments)) {
      jsonData.segments.forEach((segment) => {
        const words = [];
        
        // Python Whisper JSON might not have word-level timestamps unless requested
        // But for this test, we are mainly checking the TEXT cleaning.
        // If words exist, we process them.
        if (segment.words) {
             // ... word logic ... 
             // (Skipping for now as default python cli might not give words without extra flags, 
             //  but we can check segment text)
        }
        
        // 2. Process Segment text
        const rawSegmentText = (segment.text || '').trim();
        let cleanSegmentText = cleanLyricText(rawSegmentText);
        
        if (cleanSegmentText.toLowerCase().includes('translated by') || cleanSegmentText.toLowerCase().includes('captioned by')) {
            cleanSegmentText = '';
        }
        
        if (NOISE_PATTERNS.test(cleanSegmentText)) {
             cleanSegmentText = '';
        }

        if (cleanSegmentText.length > 0) {
             segments.push({
               text: cleanSegmentText,
               start: segment.start,
               end: segment.end
             });
        }
      });
    }
    return segments;
}

// -----------------------------------------------------------------------------
// 2. MAIN TEST EXECUTION
// -----------------------------------------------------------------------------
async function runTest() {
  const assetsDir = path.join(__dirname, '../testing_assets');
  const jsonPath = path.join(assetsDir, 'gracieabramsaudio.json');

  console.log('Loading real Whisper JSON...');
  let jsonData;
  try {
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    jsonData = JSON.parse(rawData);
  } catch (e) {
      console.error('JSON file not found! Did the python command finish?');
      console.error(e.message);
      process.exit(1);
  }
  
  console.log(`Loaded JSON. Full text length: ${jsonData.text.length} chars.`);

  console.log('\n--- PARSING REAL WHISPER OUTPUT ---');
  const parsedSegments = parseRealWhisperJSON(jsonData);
  
  console.log('\n--- PARSED RESULTS ---');
  parsedSegments.forEach(s => {
      console.log(`[${s.start.toFixed(2)} -> ${s.end.toFixed(2)}] ${s.text}`);
  });
  
  // CHECKS
  const hasNoise = parsedSegments.some(s => s.text.includes('[Music]') || s.text.includes('(Applause)'));
  if (hasNoise) {
      console.log('\n❌ FAIL: Found noise in output.');
  } else {
      console.log('\n✅ PASS: No noise detected.');
  }
}

runTest();
