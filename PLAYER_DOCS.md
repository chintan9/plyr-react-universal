# Universal Player Documentation

A fully headless, customizable React video player that combines MediaBunny (in-browser video conversion), HLS.js (adaptive streaming), and Plyr (video controls) into a single component.

## Features

- **Headless Architecture**: Complete control via React props
- **Full Library Exposure**: Direct access to MediaBunny, HLS.js, and Plyr instances
- **Memory Optimized**: Automatic cleanup with proper URL revocation and conversion cancellation
- **Performance Optimized**: Worker-based processing, buffer management, and minimal re-renders
- **Zero Chopiness**: Optimized HLS.js buffer configuration and smooth MediaBunny conversions
- **Type-Safe**: Full TypeScript support with exported types

## Installation

```bash
npm install plyr-react hls.js mediabunny
```

## Basic Usage

```tsx
import { UniversalPlyr } from './UniversalPlyr';

function App() {
  const [media, setMedia] = useState<File | string | null>(null);

  return (
    <UniversalPlyr
      fileOrUrl={media}
      autoplay={true}
    />
  );
}
```

## Advanced Usage with All Props

```tsx
import { useRef } from 'react';
import { UniversalPlyr } from './UniversalPlyr';
import type { UniversalPlyrRef } from './UniversalPlyr';
import type { PlyrOptions } from 'plyr-react';
import type { HlsConfig } from 'hls.js';

function App() {
  const playerRef = useRef<UniversalPlyrRef>(null);

  const customPlyrOptions: PlyrOptions = {
    controls: ['play-large', 'play', 'progress', 'current-time', 'volume', 'fullscreen'],
    autoplay: true,
    seekTime: 10,
    volume: 0.8,
  };

  const customHlsConfig: Partial<HlsConfig> = {
    enableWorker: true,
    lowLatencyMode: false,
    maxBufferLength: 30,
    maxBufferSize: 60 * 1000 * 1000,
  };

  const conversionConfig = {
    fastStart: 'in-memory' as const,
  };

  return (
    <UniversalPlyr
      ref={playerRef}
      fileOrUrl={mediaFile}

      // Plyr Configuration
      plyrOptions={customPlyrOptions}

      // HLS.js Configuration
      hlsConfig={customHlsConfig}

      // MediaBunny Configuration
      conversionConfig={conversionConfig}

      // Event Callbacks
      onReady={() => console.log('Player ready!')}
      onError={(error) => console.error('Error:', error)}
      onProgress={(progress) => console.log(`Converting: ${progress * 100}%`)}
      onConversionStart={() => console.log('Conversion started')}
      onConversionComplete={() => console.log('Conversion complete')}
      onHlsReady={(hls) => console.log('HLS instance:', hls)}

      // Custom Renderers
      renderLoading={(progress) => (
        <div>Loading... {Math.round(progress * 100)}%</div>
      )}
      renderError={(error) => (
        <div>Error: {error}</div>
      )}

      // Styling
      className="my-player"
      style={{ borderRadius: '12px' }}
      autoplay={true}
    />
  );
}
```

## API Reference

### Props

#### `fileOrUrl` (required)
- **Type**: `File | string | null`
- **Description**: Local video file or remote URL (including HLS .m3u8 streams)

#### `plyrOptions`
- **Type**: `PlyrOptions`
- **Description**: Plyr configuration object
- **Default**: Basic controls configuration

#### `hlsConfig`
- **Type**: `Partial<HlsConfig>`
- **Description**: HLS.js configuration object
- **Default**: Optimized buffer settings for smooth playback

#### `conversionConfig`
- **Type**: `ConversionConfig`
- **Description**: MediaBunny conversion settings
- **Options**:
  - `fastStart`: `'in-memory' | 'fragmented' | 'reserve' | false`
  - `videoBitrate`: `number`
  - `audioBitrate`: `number`
  - `videoCodec`: `string`
  - `audioCodec`: `string`

#### Event Callbacks

- `onReady()`: Fired when player is ready to play
- `onError(error: Error)`: Fired on playback or conversion errors
- `onProgress(progress: number)`: Fired during MediaBunny conversion (0-1)
- `onConversionStart()`: Fired when MediaBunny starts converting
- `onConversionComplete()`: Fired when MediaBunny finishes converting
- `onHlsReady(hls: Hls)`: Fired when HLS.js instance is ready (provides direct HLS access)

#### Custom Renderers

- `renderLoading(progress: number)`: Custom loading UI during conversion
- `renderError(error: string)`: Custom error UI

#### Styling

- `className`: CSS class name
- `style`: React inline styles object
- `autoplay`: Boolean for autoplay (default: `true`)

### Ref API

Access player internals via ref:

```tsx
const playerRef = useRef<UniversalPlyrRef>(null);

// Access Plyr instance
playerRef.current?.plyr

// Access HLS.js instance (when playing HLS streams)
playerRef.current?.hls

// Get current playable URL
playerRef.current?.getPlayableUrl()

// Get current status
playerRef.current?.getStatus() // 'idle' | 'converting' | 'ready' | 'error'

// Get conversion progress
playerRef.current?.getProgress() // 0-1
```

## How It Works

### 1. Remote URLs (HLS Streams)
When you pass a URL ending in `.m3u8`, the player:
- Detects it as an HLS stream
- Initializes HLS.js with optimized buffering
- Connects HLS.js directly to Plyr's video element
- Provides smooth adaptive bitrate streaming

### 2. Web-Safe Local Files (MP4, WebM)
For already web-compatible files:
- Creates object URL directly
- Skips conversion entirely
- Immediate playback

### 3. Non-Web Formats (MKV, AVI, etc.)
For unsupported formats:
- Initializes MediaBunny with WASM-based conversion
- Converts to MP4 in-memory using BufferTarget
- Shows progress during conversion
- Provides converted video for playback

## Memory Management

The player implements aggressive memory management to prevent leaks:

1. **Conversion Cancellation**: All MediaBunny conversions are cancelled on unmount
2. **URL Revocation**: All object URLs are revoked when no longer needed
3. **HLS Cleanup**: HLS.js instances are properly destroyed
4. **Reference Cleanup**: All refs are nullified on unmount

## Performance Optimizations

### HLS.js Optimizations
- Worker-based processing enabled
- Optimized buffer lengths (30s max, 90s back buffer)
- Large buffer size (60MB) to prevent stalls
- Small buffer hole tolerance (0.5s)

### MediaBunny Optimizations
- In-memory buffering (no file system I/O)
- Progress callbacks throttled to prevent excessive re-renders
- Proper cancellation on component unmount

### React Optimizations
- `useCallback` for all render functions
- Minimal re-renders with strategic `useEffect` dependencies
- Ref-based instance management

## TypeScript Types

All types are exported for use in your application:

```tsx
import type {
  UniversalPlyrProps,
  UniversalPlyrRef,
} from './UniversalPlyr';

import type {
  ConversionConfig,
  UseSmartMediaReturn,
} from './useSmartMedia';
```

## Example: Accessing Library Instances

```tsx
function App() {
  const playerRef = useRef<UniversalPlyrRef>(null);

  const handleInspect = () => {
    // Access Plyr API
    const currentTime = playerRef.current?.plyr?.plyr.currentTime;
    const duration = playerRef.current?.plyr?.plyr.duration;

    // Access HLS API (if HLS stream)
    const hlsLevels = playerRef.current?.hls?.levels;
    const currentLevel = playerRef.current?.hls?.currentLevel;

    // Access player state
    const status = playerRef.current?.getStatus();
    const url = playerRef.current?.getPlayableUrl();
  };

  return (
    <>
      <UniversalPlyr ref={playerRef} fileOrUrl={media} />
      <button onClick={handleInspect}>Inspect Player</button>
    </>
  );
}
```

## Browser Support

- Modern browsers with WebAssembly support (for MediaBunny)
- HLS.js: All modern browsers except iOS Safari (uses native HLS)
- Plyr: All modern browsers

## License

This component wraps:
- [Plyr](https://github.com/sampotts/plyr) - MIT License
- [HLS.js](https://github.com/video-dev/hls.js) - Apache 2.0 License
- [MediaBunny](https://github.com/jonnyschaefer/mediabunny) - MIT License
