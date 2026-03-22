import { useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import type { Ref } from 'react';
import { Plyr } from 'plyr-react';
import type { APITypes, PlyrOptions } from 'plyr-react';
import Hls from 'hls.js';
import type { HlsConfig } from 'hls.js';
import { useUniversalMedia } from './useUniversalMedia';
import type { ConversionConfig } from './useUniversalMedia';
import { createLogger } from './logger';
import 'plyr-react/plyr.css';

export interface UniversalPlyrProps {
  ref?: Ref<UniversalPlyrRef>;
  fileOrUrl: File | string | null;
  plyrOptions?: PlyrOptions;
  hlsConfig?: Partial<HlsConfig>;
  conversionConfig?: ConversionConfig;
  
  onReady?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  onConversionStart?: () => void;
  onConversionComplete?: () => void;
  onHlsReady?: (hls: Hls) => void;
  
  autoplay?: boolean;
  debug?: boolean;
  
  // Headless Renderers
  renderLoading?: (progress: number) => React.ReactNode;
  renderError?: (error: Error | null) => React.ReactNode;
  
  // Styling Overrides
  className?: string;
  style?: React.CSSProperties;
}

export interface UniversalPlyrRef {
  plyr: APITypes | null;
  hls: Hls | null;
  getPlayableUrl: () => string | null;
  getStatus: () => 'idle' | 'converting' | 'ready' | 'error';
  getProgress: () => number;
}

export function UniversalPlyr({
  ref,
  fileOrUrl,
  plyrOptions = {},
  hlsConfig = {},
  conversionConfig,
  onReady,
  onError,
  onProgress,
  onConversionStart,
  onConversionComplete,
  onHlsReady,
  autoplay = true,
  debug = false,
  renderLoading,
  renderError,
  className,
  style,
}: UniversalPlyrProps) {
  const logger = createLogger('UniversalPlyr', debug);
  
  const { playableUrl, source, isHls, status, progress, error } = useUniversalMedia(fileOrUrl, { 
    ...conversionConfig, 
    debug 
  });

  const plyrRef = useRef<APITypes>(null);
  const hlsRef = useRef<Hls | null>(null);
  const statusRef = useRef(status);

  useImperativeHandle(ref, () => ({
    plyr: plyrRef.current,
    hls: hlsRef.current,
    getPlayableUrl: () => playableUrl,
    getStatus: () => status,
    getProgress: () => progress,
  }));

  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      logger.log('Destroying HLS instance...');
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, [logger]);

  useEffect(() => {
    if (status === 'converting' && statusRef.current !== 'converting') onConversionStart?.();
    if (status === 'ready' && statusRef.current === 'converting') onConversionComplete?.();
    if (status === 'error') onError?.(error || new Error('Media loading failed'));
    statusRef.current = status;
  },[status, error, onConversionStart, onConversionComplete, onError]);

  useEffect(() => {
    onProgress?.(progress);
  },[progress, onProgress]);

  useEffect(() => {
    if (!playableUrl || !isHls || !plyrRef.current) {
      cleanupHls();
      return;
    }

    const plyrInstance = plyrRef.current.plyr;
    const videoElement = (plyrInstance as any)?.media as HTMLVideoElement;
    if (!videoElement) {
      cleanupHls();
      return;
    }

    if (Hls.isSupported()) {
      logger.log('Initializing HLS.js engine...');
      const hls = new Hls({ enableWorker: true, ...hlsConfig });
      hls.loadSource(playableUrl);
      hls.attachMedia(videoElement);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onReady?.();
        onHlsReady?.(hls);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          logger.error('Fatal HLS error:', data);
          onError?.(new Error(`HLS Error: ${data.type}`));
        }
      });

      hlsRef.current = hls;
      return cleanupHls;
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      logger.log('Using native Safari HLS.');
      videoElement.setAttribute('src', playableUrl); 
      onReady?.();
    }
    return cleanupHls;
  },[playableUrl, isHls, hlsConfig, onReady, onHlsReady, onError, cleanupHls, logger]);

  const resolvedSource = source || (isHls ? null : (playableUrl ? { type: 'video', sources:[{ src: playableUrl, type: 'video/mp4' }] } : null));

  return (
    <div className={className} style={{ position: 'relative', width: '100%', ...style }}>
      
      {/* DOM Isolation Layer - UI Overlays */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
        {status === 'error' && renderError && renderError(error)}
        {status === 'converting' && renderLoading && renderLoading(progress)}
      </div>

      {/* Plyr Instance */}
        {resolvedSource !== null || isHls ? (
          <Plyr
            ref={plyrRef}
            source={resolvedSource}
            options={{ autoplay, ...plyrOptions }}
          />
        ) : null}
    </div>
  );
}