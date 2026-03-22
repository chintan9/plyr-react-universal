import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Plyr } from 'plyr-react';
import type { APITypes, PlyrOptions } from 'plyr-react';
import Hls from 'hls.js';
import type { HlsConfig } from 'hls.js';
import 'plyr-react/plyr.css';
import { useSmartMedia } from './useSmartMedia';
import type { ConversionConfig } from './useSmartMedia';

export interface UniversalPlyrProps {
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
  renderLoading?: (progress: number) => React.ReactNode;
  renderError?: (error: string) => React.ReactNode;
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

export const UniversalPlyr = forwardRef<UniversalPlyrRef, UniversalPlyrProps>(
  (
    {
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
      renderLoading,
      renderError,
      className,
      style,
    },
    ref
  ) => {
    const { playableUrl, isHls, status, progress } = useSmartMedia(
      fileOrUrl,
      conversionConfig
    );

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
        console.log('[UniversalPlyr] Destroying HLS instance...');
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }, []);

    useEffect(() => {
      if (status === 'converting' && statusRef.current !== 'converting') {
        onConversionStart?.();
      }
      if (status === 'ready' && statusRef.current === 'converting') {
        onConversionComplete?.();
      }
      if (status === 'error') {
        onError?.(new Error('Media conversion or loading failed'));
      }
      statusRef.current = status;
    }, [status, onConversionStart, onConversionComplete, onError]);

    useEffect(() => {
      onProgress?.(progress);
    }, [progress, onProgress]);

    useEffect(() => {
      if (!playableUrl || !isHls || !plyrRef.current) {
        cleanupHls();
        return;
      }

      console.log('[UniversalPlyr] Initializing HLS.js engine...');
      const plyrInstance = plyrRef.current.plyr;
      if (!plyrInstance) {
        cleanupHls();
        return;
      }
      const videoElement = (plyrInstance as any).media as HTMLVideoElement;
      if (!videoElement) {
        cleanupHls();
        return;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          ...hlsConfig,
        });

        hls.loadSource(playableUrl);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[UniversalPlyr] HLS manifest parsed successfully.');
          onReady?.();
          onHlsReady?.(hls);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('[UniversalPlyr] Fatal HLS error:', data);
            onError?.(new Error(`HLS Error: ${data.type} - ${data.details}`));
          }
        });

        hlsRef.current = hls;

        return () => {
          cleanupHls();
        };
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[UniversalPlyr] Using native Safari HLS.');
        videoElement.src = playableUrl;
        onReady?.();
      }

      return cleanupHls;
    }, [playableUrl, isHls, hlsConfig, onReady, onHlsReady, onError, cleanupHls]);

    const defaultLoadingRender = useCallback(
      (prog: number) => (
        <div
          style={{
            position: 'relative',
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#000',
            height: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <h3>Converting Media</h3>
          <p>{Math.round(prog * 100)}%</p>
        </div>
      ),
      []
    );

    const defaultErrorRender = useCallback(
      (errorMsg: string) => (
        <div style={{ color: 'red', padding: '20px' }}>
          Error: {errorMsg}
        </div>
      ),
      []
    );

    if (status === 'converting') {
      return renderLoading
        ? <>{renderLoading(progress)}</>
        : defaultLoadingRender(progress);
    }

    if (status === 'error') {
      return renderError
        ? <>{renderError('Media loading failed. Please check console.')}</>
        : defaultErrorRender('Media loading failed. Please check console.');
    }

    if (!playableUrl) return null;

    return (
      <div
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#000',
          ...style,
        }}
      >
        <Plyr
          ref={plyrRef}
          source={
            isHls
              ? null
              : {
                  type: 'video',
                  sources: [{ src: playableUrl, type: 'video/mp4' }],
                }
          }
          options={{
            autoplay,
            controls: [
              'play-large',
              'play',
              'progress',
              'current-time',
              'mute',
              'volume',
              'captions',
              'settings',
              'pip',
              'airplay',
              'fullscreen',
            ],
            ...plyrOptions,
          }}
        />
      </div>
    );
  }
);

UniversalPlyr.displayName = 'UniversalPlyr';
