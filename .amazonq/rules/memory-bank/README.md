# Memory Bank Index

## AI Karaoke Feature Documentation

### Quick Start Guide

**What is AI Karaoke?**
Apple Music Sing-style vocal/instrumental balance control powered by on-device AI using ONNX Runtime.

**Key Components:**
1. **ONNX Model** - Spleeter/Demucs quantized model (~40-60MB)
2. **FFmpeg Pipeline** - MP3/M4A → PCM → ONNX → WAV
3. **Dual-Track Playback** - Vocal + Instrumental with 50ms sync
4. **UI Controls** - Balance slider (-1.0 to +1.0)

### Documentation Files

| File | Purpose |
|------|---------|
| `ai-karaoke-implementation.md` | Feature overview and implementation summary |
| `architecture.md` | Project structure and design patterns |
| `ffmpeg-guide.md` | FFmpeg audio conversion documentation |
| `onnx-integration.md` | ONNX model loading and inference |
| `dual-track-playback.md` | Synchronized audio playback |
| `file-changes.md` | Complete file modifications list |

### Critical Implementation Notes

**DO NOT USE:**
- `react-native-track-player` - Queue-based, cannot dual-play
- `expo-av` - Deprecated after SDK 54
- `useAudioPlayer` hook in class methods (only in React components)

**USE:**
- `expo-audio` with `useAudioPlayer` hook in components
- Direct `AudioPlayer` class in services (not hooks!)
- `expo-file-system/legacy` for file operations
- `ffmpeg-kit-react-native@6.0.2` for audio conversion

### Common Issues

1. **Invalid hook call**: Don't use hooks in class methods
2. **FFmpeg build failure**: Use version 6.0.2, not min-gpl
3. **expo-file-system deprecation**: Import from /legacy
4. **Whisper -999 error**: Add FFmpeg WAV conversion

### Build Commands

```bash
# Install dependencies
npm install onnxruntime-react-native ffmpeg-kit-react-native@6.0.2
npx expo install expo-audio

# Development build
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot"
npx expo run:android --device
```

### Model Setup

**Option 1: Bundled**
1. Download model from HuggingFace (spleeter onnx quantized)
2. Place in `assets/models/spleeter_2stem_quantized.onnx`
3. Update `BUNDLED_MODEL` import in sourceSeparationModel.ts

**Option 2: CDN**
1. Upload model to your CDN
2. Update `MODEL_URL` in sourceSeparationModel.ts

### Files to Check

When working on AI Karaoke:
- `src/services/sourceSeparationModel.ts` - ONNX inference
- `src/services/SourceSeparationService.ts` - FFmpeg pipeline
- `src/hooks/useKaraokePlayer.ts` - Dual-track playback
- `src/components/VocalBalanceSlider.tsx` - UI control
- `src/components/StemProcessButton.tsx` - Trigger button
- `src/store/tasksStore.ts` - Background task tracking

### Database Schema

```sql
vocal_stem_uri TEXT
instrumental_stem_uri TEXT
separation_status TEXT DEFAULT 'none'
separation_progress INTEGER DEFAULT 0
```

### Testing Checklist

- [ ] FFmpeg converts MP3 to WAV
- [ ] ONNX model loads and runs
- [ ] Stems save to correct paths
- [ ] Dual players sync within 50ms
- [ ] Balance slider adjusts volumes
- [ ] Progress updates in TasksModal

### Next Steps for Completion

1. Download ONNX model (~40-60MB)
2. Place in assets/models/ or CDN
3. Rebuild with `npx expo run:android`
4. Test with a short song (2-3 minutes)

### Support

For issues, check:
1. FFmpeg logs in console
2. ONNX output names (use Netron.app)
3. File permissions in Android
4. Memory usage during processing

---
*Last Updated: Feb 12, 2026*
