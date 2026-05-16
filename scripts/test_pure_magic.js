const fs = require('fs');
const path = require('path');

// MOCK Service Logic (Copied from AutoTimestampServiceV2.ts for standalone testing)
function normalizeLyricText(text) {
    return text.trim().replace(/\s+/g, ' ');
}

function calculateSegmentConfidence(segment) {
    return segment.confidence || 0.8; // Mock
}

function convertTranscriptionToLyrics(transcription) {
    const lyrics = [];
    
    // Sort by start time just in case
    const sortedSegments = transcription.sort((a, b) => a.start - b.start);
    
    sortedSegments.forEach((segment, index) => {
      const text = segment.text.trim();
      if (!text) return; // Skip empty segments
      
      // Rule 4: Forced Split for Long Segments
      const MAX_LEN = 45;
      
      if (text.length > MAX_LEN) {
          const words = text.split(' ');
          let currentLine = "";
          let currentStart = segment.start;
          const durationPerChar = (segment.end - segment.start) / text.length;
          
          words.forEach((w) => {
              if ((currentLine.length + w.length) > MAX_LEN) {
                  lyrics.push({
                      text: normalizeLyricText(currentLine),
                      timestamp: currentStart,
                      order: lyrics.length,
                      confidence: calculateSegmentConfidence(segment)
                  });
                  currentStart += (currentLine.length * durationPerChar);
                  currentLine = w;
              } else {
                  currentLine += (currentLine ? " " : "") + w;
              }
          });
          if (currentLine) {
             lyrics.push({
                  text: normalizeLyricText(currentLine),
                  timestamp: currentStart,
                  order: lyrics.length,
                  confidence: calculateSegmentConfidence(segment)
              });
          }
          return;
      }

      const lastLyric = lyrics[lyrics.length - 1];
      
      // Merge logic: ONLY merge if very close and short to avoid chunking
      // Rule 1: Gap must be tiny (< 0.25s)
      // Rule 2: Max line length 45 chars
      // Rule 3: Do NOT merge if last line ended in punctuation
      
      if (lastLyric && 
          (segment.start - lastLyric.timestamp) < 0.25 &&
          (lastLyric.text.length + text.length) < 45 &&
          !/[.!?]$/.test(lastLyric.text) // Force split on punctuation
      ) {
         lastLyric.text += ' ' + text;
      } else {
        // Otherwise add as new line (default behavior for better granularity)
        lyrics.push({
          text: normalizeLyricText(text),
          timestamp: segment.start,
          order: lyrics.length,
          confidence: calculateSegmentConfidence(segment)
        });
      }
    });
    
    return lyrics;
}

// MAIN EXECUTION
try {
    const jsonPath = path.resolve(__dirname, '../testing_assets/gracieabramsaudio.json');
    if (!fs.existsSync(jsonPath)) {
        console.error("JSON not found");
        process.exit(1);
    }
    
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    console.log("--- PURE MAGIC GRANULARITY TEST ---");
    // Ensure we are using segments from the JSON
    const segments = jsonData.segments || [];
    console.log(`Processing ${segments.length} segments...`);
    
    const generatedLyrics = convertTranscriptionToLyrics(segments);
    
    console.log(`\nGenerated ${generatedLyrics.length} lyric lines.`);
    console.log("\nSample Output (First 20 lines):");
    generatedLyrics.slice(0, 20).forEach(l => {
        const ts = new Date(l.timestamp * 1000).toISOString().substr(14, 5);
        console.log(`[${ts}] ${l.text} (Len: ${l.text.length})`);
    });
    
    // Check for violations
    const longLines = generatedLyrics.filter(l => l.text.length > 50);
    if (longLines.length > 0) {
        console.log(`\nWARNING: Found ${longLines.length} lines > 50 chars! (Granularity fail?)`);
        longLines.forEach(l => console.log(` - [${l.text.length}] ${l.text.substring(0,40)}...`));
    } else {
        console.log("\nPASS: All lines are reasonably short.");
    }
    
} catch (e) {
    console.error("Error:", e);
}
