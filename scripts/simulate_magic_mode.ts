
import * as fs from 'fs';
import * as path from 'path';

// Mocks for internal types
interface LyricLine {
  text: string;
  time?: number; // In seconds
}

// -----------------------------------------------------------------------------
// 1. HELPER: Parse LRC to get Ground Truth
// -----------------------------------------------------------------------------
function parseLRC(lrcContent: string): LyricLine[] {
  const lines: LyricLine[] = [];
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
// 2. HELPER: Generate Simulated Whisper Output from Ground Truth
//    (Simulating what Whisper MIGHT output for this audio)
// -----------------------------------------------------------------------------
function simulateWhisperOutput(groundTruth: LyricLine[]) {
  const segments: any[] = [];
  
  // Create Whisper segments based on ground truth, but slightly "messy"
  // to test the robustness of our parser/aligner.
  groundTruth.forEach(line => {
     if (!line.time) return;
     
     // Simulate 30% chance of noise segment before a line
    if (Math.random() < 0.3) {
      segments.push({
        text: " [Music] ",
        t0: (line.time - 2) * 100,
        t1: (line.time - 1) * 100,
        words: []
      });
    }

    // Split line into words for detailed simulation
    const words = line.text.split(' ');
    const duration = 2.0; // Assume 2 seconds per line roughly
    const wordDuration = duration / words.length;
    
    const segmentWords = words.map((w, i) => ({
      word: w,
      t0: (line.time! + (i * wordDuration)) * 100,
      t1: (line.time! + ((i + 1) * wordDuration)) * 100,
      p: 0.9 // High confidence
    }));

    segments.push({
      text: line.text,
      t0: line.time! * 100,
      t1: (line.time! + duration) * 100,
      words: segmentWords
    });

    // Simulate 10% chance of a "hallucination" or extra segment
    if (Math.random() < 0.1) {
       segments.push({
         text: " (Applause) ",
         t0: (line.time! + duration + 0.5) * 100,
         t1: (line.time! + duration + 1.5) * 100,
         words: []
       });
    }
  });

  return { segments };
}

// -----------------------------------------------------------------------------
// 3. LOGIC UNDER TEST: parseWhisperResult (From whisperService.ts)
// -----------------------------------------------------------------------------
// ... Insert the Refactored parsing logic here ...
const NOISE_PATTERNS = /^(noise|machine|whirring|humming|brrr|clicking|silence|music|applause|instrumental|intro|outro|solo|break)$/i;
const cleanLyricText = (text: string) => text.replace(/\[.*?\]|\(.*?\)|([^\w\s']|_)+/g, ' ').replace(/\s+/g, ' ').trim();

function parseWhisperResult(result: any) {
    const segments: any[] = [];
    
    if (result.segments && Array.isArray(result.segments)) {
      result.segments.forEach((segment: any) => {
        const words: any[] = [];
        
        // 1. Process Words
        if (segment.words) {
          segment.words.forEach((wordData: any) => {
            const rawWord = (wordData.word || wordData.text || '').trim();
            const cleanWord = cleanLyricText(rawWord);
            const isBracketed = rawWord.startsWith('[') || rawWord.startsWith('(');
            
            if (cleanWord.length > 0 && !isBracketed) {
              words.push({
                word: rawWord,
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
  const plainTextPath = path.join(assetsDir, 'gracieabramswithouttimestamp.txt');
  const truthPath = path.join(assetsDir, 'gracieabramslyricswithtimestamp.txt');

  console.log('Loading assets...');
  const plainText = fs.readFileSync(plainTextPath, 'utf-8');
  const truthText = fs.readFileSync(truthPath, 'utf-8');
  
  const groundTruth = parseLRC(truthText);
  console.log(`Loaded ${groundTruth.length} ground truth lines.`);

  console.log('\n--- SIMULATING WHISPER OUTPUT ---');
  // Generate "raw" whisper output based on the truth, but with noise added
  const simulatedWhisperRaw = simulateWhisperOutput(groundTruth);
  console.log(`Simulated ${simulatedWhisperRaw.segments.length} raw segments (including noise).`);

  console.log('\n--- TESTING PARSER ---');
  const parsedSegments = parseWhisperResult(simulatedWhisperRaw);
  console.log(`Parsed ${parsedSegments.length} valid segments.`);

  // ---------------------------------------------------------------------------
  // TEST REPORT
  // ---------------------------------------------------------------------------
  console.log('\n--- COMPARISON REPORT ---');
  let matchCount = 0;
  let driftSum = 0;

  // Simple comparison: Check if the parsed output roughly aligns with ground truth
  // Note: Since we generated Whisper FROM ground truth, checking alignment is circular 
  // unless we're testing the NOISE FILTERING specifically.
  
  // Real check: Did we filter out the [Music] and (Applause)?
  const noiseCheck = parsedSegments.some(s => s.text.includes('[Music]') || s.text.includes('Applause'));
  if (noiseCheck) {
      console.error('FAIL: Noise segments detected in parsed output!');
  } else {
      console.log('PASS: No noise segments found.');
  }

  // Check Alignment accuracy (drift)
  // We compare the first 5 lines
  for (let i = 0; i < Math.min(5, groundTruth.length, parsedSegments.length); i++) {
      const truth = groundTruth[i];
      const parsed = parsedSegments[i];
      
      const drift = Math.abs((parsed.start) - (truth.time || 0));
      driftSum += drift;
      
      console.log(`Line ${i+1}:`);
      console.log(`  Truth : [${truth.time?.toFixed(2)}] "${truth.text}"`);
      console.log(`  Parsed: [${parsed.start.toFixed(2)}] "${parsed.text}"`);
      console.log(`  Drift : ${drift.toFixed(3)}s`);
      
      if (drift < 0.5) matchCount++;
  }
  
  console.log(`\nAccuracy: ${matchCount}/5 lines within 0.5s drift.`);
}

runTest();
