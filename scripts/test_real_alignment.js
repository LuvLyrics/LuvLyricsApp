const fs = require('fs');

// ============================================================================
// PART 1: MOCK DATA (High Fidelity from Gracie Abrams "I Love You, I'm Sorry")
// ============================================================================

const LYRIC_LINES = [
"Two Augusts ago",
"I told the truth, oh, but you didn't like it, you went home",
"You're in your Benz, I'm by the gate",
"Now you go alone",
"Charm all the people you train for, you mean well but aim low",
"And I'll make it known like I'm getting paid",
"That's just the way life goes",
"I like to slam doors closed",
"Trust me, I know it's always about me",
"I love you, I'm sorry",
"Two summers from now",
"We'll have been talking",
"But not all that often, we're cool now",
"I'll be on a boat",
"You're on a plane",
"Going somewhere, same",
"And I'll have a drink",
"Wistfully lean out my window and watch the sun set on the lake",
"I might not feel real",
"But it's okay, mm",
"Cause that's just the way life goes",
"I push my luck, it shows",
"Thankful you don't send someone to kill me",
"I love you, I'm sorry",
"You were the best but you were the worst",
"As sick as it sounds, I loved you first",
"I was a dick, it is what it is",
"A habit to kick, the age-old curse",
"I tend to laugh whenever I'm sad",
"I stare at the crash, it actually works",
"Making amends, this shit never ends",
"I'm wrong again, wrong again",
"The way life goes",
"Joyriding down our road",
"Lay on the horn to prove that it haunts me",
"I love you, I'm sorry",
"You were the best but you were the worst (The way life goes)",
"I wanna speak in code",
"Hope that I don't, won't make it about me",
"I love you, I'm sorry"
];

const WHISPER_WORDS = [
    { word: ' Two', start: 0.82, end: 1.62, probability: 0.84 },
    { word: ' Augusts', start: 1.62, end: 2.18, probability: 0.84 },
    { word: ' ago,', start: 2.18, end: 3.3, probability: 0.91 },
    { word: ' I', start: 3.8, end: 3.94, probability: 0.98 },
    { word: ' told', start: 3.94, end: 4.24, probability: 0.98 },
    { word: ' the', start: 4.24, end: 4.46, probability: 0.98 },
    { word: ' truth,', start: 4.46, end: 4.9, probability: 0.99 },
    { word: ' oh,', start: 5.0, end: 5.3, probability: 0.85 },
    { word: ' but', start: 5.38, end: 5.54, probability: 0.88 },
    { word: ' you', start: 5.54, end: 5.7, probability: 0.98 },
    { word: ' didn\'t', start: 5.7, end: 6.0, probability: 0.99 },
    { word: ' like', start: 6.0, end: 6.22, probability: 0.99 },
    { word: ' it,', start: 6.22, end: 6.4, probability: 0.99 },
    { word: ' you', start: 6.64, end: 6.84, probability: 0.96 },
    { word: ' went', start: 6.84, end: 7.14, probability: 0.99 },
    { word: ' home', start: 7.14, end: 7.64, probability: 0.99 },
    // "Benz" - The problematic line that used to jump
    { word: ' You\'re', start: 9.42, end: 9.62, probability: 0.35 }, // Low confidence
    { word: ' in', start: 9.62, end: 9.76, probability: 0.32 },
    { word: ' your', start: 9.76, end: 9.92, probability: 0.38 },
    { word: ' Benz,', start: 9.92, end: 10.42, probability: 0.28 }, // Very low confidence "Benz"
    { word: ' I\'m', start: 10.5, end: 10.7, probability: 0.45 },
    { word: ' by', start: 10.7, end: 10.9, probability: 0.5 },
    { word: ' the', start: 10.9, end: 11.0, probability: 0.5 },
    { word: ' gate', start: 11.0, end: 11.5, probability: 0.55 },
    // ... skipping some easy middle parts ...
    { word: ' Now', start: 17.32, end: 17.5, probability: 0.97 },
    { word: ' you', start: 17.5, end: 17.64, probability: 0.98 },
    { word: ' go', start: 17.64, end: 17.88, probability: 0.98 },
    { word: ' alone', start: 17.88, end: 18.5, probability: 0.99 },
    { word: ' Charm', start: 20.86, end: 21.2, probability: 0.82 },
    { word: ' all', start: 21.2, end: 21.36, probability: 0.88 },
    { word: ' the', start: 21.36, end: 21.46, probability: 0.9 },
    { word: ' people', start: 21.46, end: 21.82, probability: 0.95 },
    { word: ' you', start: 21.82, end: 21.96, probability: 0.98 },
    { word: ' train', start: 21.96, end: 22.34, probability: 0.98 },
    { word: ' for,', start: 22.34, end: 22.68, probability: 0.9 },
    { word: ' you', start: 23.32, end: 23.46, probability: 0.95 },
    { word: ' mean', start: 23.46, end: 23.68, probability: 0.96 },
    { word: ' well', start: 23.68, end: 24.0, probability: 0.97 },
    { word: ' but', start: 24.0, end: 24.22, probability: 0.85 },
    { word: ' aim', start: 24.22, end: 24.52, probability: 0.8 },
    { word: ' low', start: 24.52, end: 25.0, probability: 0.75 },
    { word: ' And', start: 25.6, end: 25.76, probability: 0.82 }, 
    { word: ' I\'ll', start: 25.76, end: 25.96, probability: 0.82 },
    { word: ' make', start: 25.96, end: 26.16, probability: 0.9 },
    { word: ' it', start: 26.16, end: 26.28, probability: 0.95 },
    { word: ' known', start: 26.28, end: 26.68, probability: 0.95 },
    { word: ' like', start: 26.68, end: 26.86, probability: 0.9 },
    { word: ' I\'m', start: 26.86, end: 27.06, probability: 0.95 },
    { word: ' getting', start: 27.06, end: 27.38, probability: 0.98 },
    { word: ' paid', start: 27.38, end: 27.8, probability: 0.99 },
    { word: ' That\'s', start: 31.94, end: 32.14, probability: 0.87 },
    { word: ' just', start: 32.14, end: 32.32, probability: 0.9 },
    { word: ' the', start: 32.32, end: 32.44, probability: 0.9 },
    { word: ' way', start: 32.44, end: 32.7, probability: 0.95 },
    { word: ' life', start: 32.7, end: 33.1, probability: 0.95 },
    { word: ' goes', start: 33.1, end: 33.58, probability: 0.95 },
    { word: ' I', start: 36.82, end: 36.96, probability: 0.98 },
    { word: ' like', start: 36.96, end: 37.18, probability: 0.98 },
    { word: ' to', start: 37.18, end: 37.3, probability: 0.98 },
    { word: ' slam', start: 37.3, end: 37.66, probability: 0.99 },
    { word: ' doors', start: 37.66, end: 38.06, probability: 0.99 },
    { word: ' closed', start: 38.06, end: 38.62, probability: 0.99 },
    { word: ' Trust', start: 40.54, end: 40.82, probability: 0.9 },
    { word: ' me,', start: 40.82, end: 41.14, probability: 0.95 },
    { word: ' I', start: 41.34, end: 41.48, probability: 0.95 },
    { word: ' know', start: 41.48, end: 41.7, probability: 0.98 },
    { word: ' it\'s', start: 41.7, end: 41.9, probability: 0.9 },
    { word: ' always', start: 41.9, end: 42.26, probability: 0.95 },
    { word: ' about', start: 42.26, end: 42.54, probability: 0.98 },
    { word: ' me', start: 42.54, end: 42.9, probability: 0.99 },
    { word: ' I', start: 47.26, end: 47.42, probability: 0.88 },
    { word: ' love', start: 47.42, end: 47.7, probability: 0.88 },
    { word: ' you,', start: 47.7, end: 48.06, probability: 0.88 },
    { word: ' I\'m', start: 48.64, end: 48.86, probability: 0.9 },
    { word: ' sorry', start: 48.86, end: 49.6, probability: 0.95 },
    { word: ' Two', start: 51.16, end: 51.42, probability: 0.95 },
    { word: ' summers', start: 51.42, end: 51.78, probability: 0.95 },
    { word: ' from', start: 51.78, end: 51.98, probability: 0.95 },
    { word: ' now', start: 51.98, end: 52.4, probability: 0.95 },
    { word: ' We\'ll', start: 52.84, end: 53.06, probability: 0.75 },
    { word: ' have', start: 53.06, end: 53.22, probability: 0.75 },
    { word: ' been', start: 53.22, end: 53.4, probability: 0.75 },
    { word: ' talking', start: 53.4, end: 53.86, probability: 0.9 },
    { word: ' But', start: 54.78, end: 54.92, probability: 0.84 },
    { word: ' not', start: 54.92, end: 55.14, probability: 0.84 },
    { word: ' all', start: 55.14, end: 55.28, probability: 0.84 },
    { word: ' that', start: 55.28, end: 55.44, probability: 0.84 },
    { word: ' often,', start: 55.44, end: 55.84, probability: 0.84 },
    { word: ' we\'re', start: 56.12, end: 56.32, probability: 0.9 },
    { word: ' cool', start: 56.32, end: 56.62, probability: 0.95 },
    { word: ' now', start: 56.62, end: 57.0, probability: 0.98 },
    { word: ' I\'ll', start: 58.82, end: 59.04, probability: 0.87 },
    { word: ' be', start: 59.04, end: 59.18, probability: 0.87 },
    { word: ' on', start: 59.18, end: 59.32, probability: 0.87 },
    { word: ' a', start: 59.32, end: 59.38, probability: 0.87 },
    { word: ' boat', start: 59.38, end: 59.8, probability: 0.9 },
    { word: ' You\'re', start: 61.2, end: 61.4, probability: 0.86 },
    { word: ' on', start: 61.4, end: 61.54, probability: 0.86 },
    { word: ' a', start: 61.54, end: 61.6, probability: 0.86 },
    { word: ' plane', start: 61.6, end: 62.0, probability: 0.9 },
    { word: ' Going', start: 63.54, end: 63.82, probability: 0.86 },
    { word: ' somewhere,', start: 63.82, end: 64.3, probability: 0.86 },
    { word: ' same', start: 64.56, end: 65.0, probability: 0.9 },
    { word: ' And', start: 67.38, end: 67.54, probability: 0.85 },
    { word: ' I\'ll', start: 67.54, end: 67.7, probability: 0.85 },
    { word: ' have', start: 67.7, end: 67.88, probability: 0.85 },
    { word: ' a', start: 67.88, end: 67.94, probability: 0.85 },
    { word: ' drink', start: 67.94, end: 68.3, probability: 0.9 },
    { word: ' Wistfully', start: 70.4, end: 70.9, probability: 0.88 }, // ANCHOR START FOR GAP
    { word: ' lean', start: 70.9, end: 71.1, probability: 0.88 },
    { word: ' out', start: 71.1, end: 71.26, probability: 0.88 },
    { word: ' my', start: 71.26, end: 71.4, probability: 0.88 },
    { word: ' window', start: 71.4, end: 71.8, probability: 0.88 },
    { word: ' and', start: 71.8, end: 71.94, probability: 0.88 },
    { word: ' watch', start: 71.94, end: 72.22, probability: 0.88 },
    { word: ' the', start: 72.22, end: 72.32, probability: 0.88 },
    { word: ' sun', start: 72.32, end: 72.58, probability: 0.88 },
    { word: ' set', start: 72.58, end: 72.82, probability: 0.88 },
    { word: ' on', start: 72.82, end: 72.96, probability: 0.88 },
    { word: ' the', start: 72.96, end: 73.08, probability: 0.88 },
    { word: ' lake', start: 73.08, end: 73.5, probability: 0.9 },
    
    // --- THE GAP (Messy Middle) ---
    // Simulating Whisper failing/hallucinating/missing lines during the bridge
    // Real lyrics happen at ~1:16, 1:18, 1:22, 1:26, 1:30
    // But Whisper outputs garbage or silence here
    { word: ' [Silence]', start: 80.0, end: 90.0, probability: 0.0 },

    // ... SUDDENLY RESUMING AT THE END OF THE BRIDGE ...
    // Pile-up of low confidence words that used to crash the system
    { word: ' crush', start: 110.1, end: 110.5, probability: 0.65 }, // Misheard "Crash"
    { word: ' works', start: 110.5, end: 111.0, probability: 0.85 }, // ANCHOR END FOR GAP (1:51)

    { word: ' Making', start: 112.4, end: 112.7, probability: 0.69 },
    { word: ' amends,', start: 112.7, end: 113.2, probability: 0.69 },
    { word: ' this', start: 113.2, end: 113.4, probability: 0.69 },
    { word: ' shit', start: 113.4, end: 113.7, probability: 0.69 },
    { word: ' never', start: 113.7, end: 114.0, probability: 0.69 },
    { word: ' ends', start: 114.0, end: 114.36, probability: 0.8 },
    { word: ' I\'m', start: 114.36, end: 114.54, probability: 0.78 },
    { word: ' wrong', start: 114.54, end: 114.86, probability: 0.85 },
    { word: ' again,', start: 114.86, end: 115.3, probability: 0.9 },
    { word: ' wrong', start: 115.54, end: 115.8, probability: 0.9 },
    { word: ' again', start: 115.8, end: 116.3, probability: 0.95 },
    { word: ' The', start: 116.14, end: 116.26, probability: 0.73 },
    { word: ' way', start: 116.26, end: 116.5, probability: 0.8 },
    { word: ' life', start: 116.5, end: 116.8, probability: 0.8 },
    { word: ' goes', start: 116.8, end: 117.2, probability: 0.85 },
    { word: ' Joyriding', start: 120.1, end: 120.7, probability: 0.66 },
    { word: ' down', start: 120.7, end: 120.9, probability: 0.66 },
    { word: ' our', start: 120.9, end: 121.1, probability: 0.66 },
    { word: ' road', start: 121.1, end: 121.5, probability: 0.8 },
    { word: ' Lay', start: 123.4, end: 123.6, probability: 0.84 },
    { word: ' on', start: 123.6, end: 123.74, probability: 0.84 },
    { word: ' the', start: 123.74, end: 123.86, probability: 0.84 },
    { word: ' horn', start: 123.86, end: 124.2, probability: 0.9 },
    { word: ' to', start: 124.2, end: 124.34, probability: 0.9 },
    { word: ' prove', start: 124.34, end: 124.6, probability: 0.9 },
    { word: ' that', start: 124.6, end: 124.74, probability: 0.9 },
    { word: ' it', start: 124.74, end: 124.84, probability: 0.9 },
    { word: ' haunts', start: 124.84, end: 125.26, probability: 0.9 },
    { word: ' me', start: 125.26, end: 125.6, probability: 0.95 },
    { word: ' I', start: 130.1, end: 130.24, probability: 0.65 }, // Late Gap
    { word: ' love', start: 130.24, end: 130.5, probability: 0.65 },
    { word: ' you,', start: 130.5, end: 130.8, probability: 0.65 },
    { word: ' I\'m', start: 131.2, end: 131.4, probability: 0.65 },
    { word: ' sorry', start: 131.4, end: 131.9, probability: 0.65 },
    { word: ' You', start: 132.5, end: 132.64, probability: 0.61 }, // Fake duplicates for pile up test
    { word: ' were', start: 132.64, end: 132.8, probability: 0.61 },
    { word: ' the', start: 132.8, end: 132.9, probability: 0.61 },
    { word: ' best', start: 132.9, end: 133.3, probability: 0.61 },
    { word: ' I', start: 136.12, end: 136.26, probability: 0.75 },
    { word: ' wanna', start: 136.26, end: 136.5, probability: 0.75 },
    { word: ' speak', start: 136.5, end: 136.8, probability: 0.75 },
    { word: ' in', start: 136.8, end: 136.94, probability: 0.75 },
    { word: ' code', start: 136.94, end: 137.4, probability: 0.85 },
    { word: ' Hope', start: 140.16, end: 140.4, probability: 0.77 },
    { word: ' that', start: 140.4, end: 140.54, probability: 0.77 },
    { word: ' I', start: 140.54, end: 140.66, probability: 0.77 },
    { word: ' don\'t,', start: 140.66, end: 141.0, probability: 0.77 },
    { word: ' won\'t', start: 141.2, end: 141.5, probability: 0.77 },
    { word: ' make', start: 141.5, end: 141.7, probability: 0.77 },
    { word: ' it', start: 141.7, end: 141.82, probability: 0.77 },
    { word: ' about', start: 141.82, end: 142.1, probability: 0.77 },
    { word: ' me', start: 142.1, end: 142.5, probability: 0.85 },
    { word: ' I', start: 147.36, end: 147.5, probability: 0.86 },
    { word: ' love', start: 147.5, end: 147.78, probability: 0.86 },
    { word: ' you,', start: 147.78, end: 148.1, probability: 0.86 },
    { word: ' I\'m', start: 148.4, end: 148.6, probability: 0.9 },
    { word: ' sorry', start: 148.6, end: 149.2, probability: 0.95 }
];

// ============================================================================
// PART 2: THE "MAGIC" LOGIC (from AutoTimestampServiceV2.ts)
// ============================================================================

function tokenize(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
}

function computeDTW(seq1, seq2) {
    const n = seq1.length;
    const m = seq2.length;
    const dtw = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = seq1[i - 1] === seq2[j - 1] ? 0 : 1;
            dtw[i][j] = cost + Math.min(
                dtw[i - 1][j],
                dtw[i][j - 1],
                dtw[i - 1][j - 1]
            );
        }
    }
    return dtw[n][m];
}

/* 
   🎯 PRECISION FIX V3: VAD-Enforced Elastic Stretch
   Invalidates "Anchors" that are physically impossible (too close together).
   Stretches the invalid lines evenly between the remaining valid anchors.
   [NEW] Uses VAD segments to skip instrumental breaks.
*/
function interpolateTimestamps(lines, vadSegments) {
    const HIGH_CONFIDENCE_THRESHOLD = 0.75; 

    // Step 1: Identify VALID Anchors
    const anchors = lines.map((line, index) => {
        let isAnchor = (line.confidence || 0) >= HIGH_CONFIDENCE_THRESHOLD;

        // Force first and last to be anchors
        if (index === 0 || index === lines.length - 1) {
            isAnchor = true;
        }

        // PHYSICS CHECK:
        if (index > 0) {
            const prevTime = lines[index - 1].timestamp;
            if (line.timestamp - prevTime < 0.5) {
                isAnchor = false; // Revoke anchor status
            }
        }

        return { index, time: line.timestamp, isAnchor };
    });

    // Step 2: The Elastic Loop
    let lastAnchorIndex = 0;

    for (let i = 1; i < anchors.length; i++) {
        if (anchors[i].isAnchor) {
            const prevAnchor = anchors[lastAnchorIndex];
            const nextAnchor = anchors[i];

            const timeGap = nextAnchor.time - prevAnchor.time;
            const indexGap = nextAnchor.index - prevAnchor.index;

            // Only stretch if we have lines in between
            if (indexGap > 1) {
                const step = timeGap / indexGap;

                console.log(`   -> Stretching ${indexGap - 1} lines between ${prevAnchor.time}s and ${nextAnchor.time}s`);

                for (let j = 1; j < indexGap; j++) {
                    const targetIndex = prevAnchor.index + j;
                    
                    // 1. Calculate naive elastic timestamp
                    let proposedTime = prevAnchor.time + (step * j);

                    // 2. VAD CHECK
                    const inVoiceZone = vadSegments.some(seg => 
                        proposedTime >= seg.start && proposedTime <= seg.end
                    );
                    
                    if (!inVoiceZone) {
                            // Find the next valid voice segment start
                            const nextSegment = vadSegments.find(seg => seg.start > proposedTime);
                            if (nextSegment) {
                                // JUMP THE GAP!
                                console.log(`      [VAD] Jumped instrumental gap to ${nextSegment.start}s`);
                                proposedTime = nextSegment.start + (0.1 * j); 
                            }
                    }

                    lines[targetIndex].timestamp = parseFloat(proposedTime.toFixed(2));
                    // Mark as interpolated
                    lines[targetIndex].confidence = 0.5; 
                }
            }
            lastAnchorIndex = i;
        }
    }
    
    // Safety check
    lines.forEach(l => { if (l.timestamp < 0) l.timestamp = 0; });
}

function inferVADSegments(words) {
    if (!words.length) return [];
    
    const segments = [];
    let currentStart = words[0].start;
    let currentEnd = words[0].end;
    
    for (let i = 1; i < words.length; i++) {
        const w = words[i];
        
        // If the gap is small (< 2.0s), merge it into the current segment
        if (w.start - currentEnd < 2.0) {
            currentEnd = Math.max(currentEnd, w.end);
        } else {
            // Gap is large (> 2.0s) -> Push valid segment and start new one
            segments.push({ start: currentStart, end: currentEnd });
            currentStart = w.start;
            currentEnd = w.end;
        }
    }
    segments.push({ start: currentStart, end: currentEnd });
    
    console.log("\n--- VAD SEGMENTS DETECTED ---");
    segments.forEach(s => console.log(`   [Action] Voice Zone: ${s.start.toFixed(2)}s - ${s.end.toFixed(2)}s`));
    
    return segments;
}


function getWordsInWindow(allWords, start, end, hintIndex) {
    const words = [];
    let i = hintIndex;
    // Skip words before start
    while (i < allWords.length && allWords[i].end < start) i++;
    // Collect words inside window
    while (i < allWords.length && allWords[i].start <= end) {
        words.push(allWords[i]);
        i++;
    }
    return words;
}

function findBestInWindow(lyricLine, windowWords) {
    const lyricWords = tokenize(lyricLine);
    if (lyricWords.length === 0) return { timestamp: 0, confidence: 0, endIndex: 0 };
    if (windowWords.length === 0) return { timestamp: 0, confidence: 0, endIndex: 0 };

    let bestMatch = { timestamp: 0, confidence: 0, endIndex: 0 };
    
    // Constrained Window Search using DTW
    for (let len = Math.max(1, lyricWords.length - 2); len <= lyricWords.length + 3; len++) {
        for (let i = 0; i <= windowWords.length - len; i++) {
            const candidateSegment = windowWords.slice(i, i + len);
            const dtwScore = computeDTW(lyricWords, candidateSegment.map(w => tokenize(w.word)[0] || ""));
            const similarity = 1 / (1 + dtwScore);
            const avgProb = candidateSegment.reduce((s, w) => s + (w.probability || 0.5), 0) / len;
            
            // Weighted Score: 80% Text Match, 20% Whisper Confidence
            const score = (similarity * 0.8) + (avgProb * 0.2);
            
            if (score > bestMatch.confidence) {
                bestMatch = {
                    timestamp: candidateSegment[0].start,
                    confidence: score,
                    endIndex: i + len
                };
            }
        }
    }
    return bestMatch;
}

// ============================================================================
// PART 3: MAIN EXECUTION
// ============================================================================

function runTest() {
    console.log("Loading assets...");
    console.log(`Prepared ${LYRIC_LINES.length} lyric lines.`);
    console.log(`Prepared ${WHISPER_WORDS.length} whisper words.`);
    
    console.log("\n--- ALIGNING (WINDOWED) ---");
    
    const alignedLyrics = [];
    let searchStartTimestamp = 0.0;
    let searchStartIndex = 0;
    let successfulMatches = 0;

    for (let i = 0; i < LYRIC_LINES.length; i++) {
        const line = LYRIC_LINES[i];
        
        // 1. Define Window (15s Leash)
        const WINDOW_DURATION = 15.0;
        const windowEnd = searchStartTimestamp + WINDOW_DURATION;
        
        const primaryWindowWords = getWordsInWindow(WHISPER_WORDS, searchStartTimestamp, windowEnd, searchStartIndex);
        
        // 2. Find best match strictly in window
        let match = findBestInWindow(line, primaryWindowWords);
        
        // 3. Fallback (Instrumental Safety Net - 60s)
        if (match.confidence < 0.4) {
             const expandedWords = getWordsInWindow(WHISPER_WORDS, searchStartTimestamp, searchStartTimestamp + 60.0, searchStartIndex);
             const fallbackMatch = findBestInWindow(line, expandedWords);
             if (fallbackMatch.confidence > 0.8) {
                 match = fallbackMatch;
                 console.log(`   -> FALLBACK JUMP for "${line.substring(0, 15)}..."`);
             }
        }

        if (match.confidence >= 0.6) {
            searchStartTimestamp = match.timestamp + 0.1;
            
            // Update searchStartIndex to optimize next lookup
            let specificWordIndex = searchStartIndex;
            while(specificWordIndex < WHISPER_WORDS.length && WHISPER_WORDS[specificWordIndex].start < match.timestamp) {
                specificWordIndex++;
            }
            searchStartIndex = specificWordIndex;
            
            successfulMatches++;
            alignedLyrics.push({ 
                text: line, 
                timestamp: match.timestamp, 
                confidence: match.confidence 
            });
        } else {
            // Low confidence? Push with 0 timestamp or anchor estimation (Simulated pile-up)
             alignedLyrics.push({ 
                text: line, 
                timestamp: searchStartTimestamp + 0.1, // Just shove it at the current anchor
                confidence: match.confidence 
            });
            // Don't advance anchor much on failures
        }
    }

    // POST-PROCESSING: ELASTIC STRETCH (VAD ENFORCED)
    console.log("\n--- POST-PROCESSING: FIXING PILE-UPS (VAD ENFORCED STRETCH) ---");
    
    // Infer VAD
    const vadSegments = inferVADSegments(WHISPER_WORDS);
    
    interpolateTimestamps(alignedLyrics, vadSegments);
    
    // FINAL OUTPUT
    alignedLyrics.forEach(l => {
        const s = l.timestamp;
        const m = Math.floor(s / 60);
        const sec = (s % 60).toFixed(2);
        const mm = m.toString().padStart(2, '0');
        const ss = sec < 10 ? '0' + sec : sec;
        const ts = `[${mm}:${ss}]`;
        
        console.log(`${ts} ${l.text} (Conf: ${(l.confidence*100).toFixed(0)}%)`);
    });
}

runTest();
