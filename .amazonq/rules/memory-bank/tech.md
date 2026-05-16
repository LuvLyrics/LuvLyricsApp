# Technology Stack

## Core Technologies

### Framework & Runtime
- **Expo SDK**: ~54.0.33
- **React Native**: 0.81.5
- **React**: 19.1.0
- **TypeScript**: ~5.9.2
- **Node.js**: Required for development

### Programming Languages
- **TypeScript**: Primary language for application logic
- **JavaScript**: Configuration files (babel.config.js)
- **Kotlin**: Android native code (MainApplication.kt)

## Key Dependencies

### UI & Animation
- **@shopify/react-native-skia**: 2.2.12 - High-performance graphics and blur effects
- **react-native-reanimated**: ~4.1.1 - Smooth 60fps animations
- **react-native-gesture-handler**: ~2.28.0 - Touch gesture handling
- **expo-linear-gradient**: ^15.0.8 - Gradient backgrounds
- **expo-blur**: ~15.0.8 - Blur effects
- **react-native-svg**: 15.12.1 - Vector graphics

### Navigation
- **@react-navigation/native**: ^7.1.28 - Core navigation
- **@react-navigation/native-stack**: ^7.12.0 - Stack navigation
- **@react-navigation/bottom-tabs**: ^7.12.0 - Tab navigation
- **react-native-screens**: ~4.16.0 - Native screen optimization
- **react-native-safe-area-context**: ^5.6.2 - Safe area handling

### Data & Storage
- **expo-sqlite**: ^16.0.10 - Local SQLite database
- **@react-native-async-storage/async-storage**: ^2.2.0 - Key-value storage
- **zustand**: ^5.0.11 - State management
- **date-fns**: ^4.1.0 - Date formatting

### Audio & Media
- **expo-av**: ~16.0.8 - Audio/video playback
- **expo-audio**: ~1.1.1 - Core audio engine with system media session sync
- **expo-media-library**: ~18.2.1 - Local file access
- **react-native-worklets**: 0.5.1 - High-performance audio processing

### Search & Services
### Unified Search Engine
- **MultiSourceLyricsService**: Orchestrates parallel fetching from all providers (5s race)
- **JioSaavn Service**: Official API wrapper for high-quality synced lyrics
- **Lyrica Service**: Alternative lyrics provider
- **LRCLIB API**: Public source for synced lyrics (.lrc)
- **Genius Scraper**: Fallback source for plain text lyrics
- **Smart Lyric Matcher**: Fuzzy matching and scoring logic for ranking results

### Development Tools
- **expo-dev-client**: ~6.0.20 - Custom development client
- **babel-preset-expo**: ^54.0.10 - Babel configuration
- **@types/react**: ~19.1.0 - React TypeScript definitions

## Build System

### Package Manager
- **npm**: Primary package manager (package-lock.json present)

### Build Tools
- **Expo CLI**: Main build and development tool
- **Gradle**: Android build system (8.14.3)
- **Metro Bundler**: JavaScript bundler (via Expo)

### Configuration Files
- **babel.config.js**: Babel transpilation configuration
- **tsconfig.json**: TypeScript compiler options
- **app.json**: Expo app configuration
- **eas.json**: Expo Application Services configuration
- **android/build.gradle**: Android build configuration
- **android/gradle.properties**: Gradle properties

## Development Commands

### Start Development Server
```bash
npm start
# or
expo start
```

### Run on Android
```bash
npm run android
# or
expo run:android
```

### Run on iOS
```bash
npm run ios
# or
expo run:ios
```

### Run on Web
```bash
npm run web
# or
expo start --web
```

## Platform Support

### Android
- **Package**: com.lyricflow.app
- **Scheme**: lyricflow
- **Edge-to-Edge**: Enabled
- **Adaptive Icon**: Custom with black background

### iOS
- **Bundle Identifier**: com.lyricflow.app
- **Tablet Support**: Enabled

### Web
- **Favicon**: Custom favicon.png

## Architecture Features

### React Native New Architecture
- **Enabled**: `newArchEnabled: true` in app.json
- **Benefits**: Improved performance, better type safety, concurrent rendering

### Expo Plugins
- **expo-sqlite**: Database functionality
- **expo-audio**: Audio recording and playback

### User Interface
- **Style**: Dark mode only (`userInterfaceStyle: "dark"`)
- **Orientation**: Portrait only
- **Splash Screen**: Custom with black background

## Performance Optimizations

### 60fps Scroll Engine
- **requestAnimationFrame**: High-precision timing loop
- **deltaTime Calculations**: Sub-millisecond accuracy
- **Memoized Components**: React.memo for LyricItem to prevent re-renders
- **Animated.View Wrapper**: Used for rotating background images to ensure smooth performance
- **Battery Saver Mode**: Option to disable background animations to reduce GPU usage

### Database Optimizations
- **Singleton Pattern**: Single connection prevents race conditions
- **Retry Mechanism**: Automatic recovery from NullPointerException
- **PRAGMA Checks**: Efficient schema migrations
- **WAL Mode**: Concurrent read/write access

### High-Precision Sync
- **Sub-millisecond Timing**: Ensuring lyrics never drift from audio
- **Standalone Execution**: All library and sync logic runs locally without backend costs

## Version Control
- **Git**: Version control system
- **.gitignore**: Excludes build artifacts, node_modules, .expo, etc.

## Project Identifiers
- **EAS Project ID**: c1057836-feb4-4f08-b177-7efc8bc2b4b3
- **App Name**: LyricFlow
- **Slug**: lyricflow
- **Version**: 1.0.0
