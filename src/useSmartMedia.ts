import { useState, useEffect, useRef } from 'react';
import {
  Input,
  Output,
  Conversion,
  Mp4OutputFormat,
  BufferTarget,
  BlobSource,
  ALL_FORMATS,
} from 'mediabunny';

export interface ConversionConfig {
  fastStart?: 'in-memory' | 'fragmented' | 'reserve' | false;
  videoBitrate?: number;
  audioBitrate?: number;
  videoCodec?: string;
  audioCodec?: string;
}

export interface UseSmartMediaReturn {
  playableUrl: string | null;
  isHls: boolean;
  progress: number;
  status: 'idle' | 'converting' | 'ready' | 'error';
}

export function useSmartMedia(
  fileOrUrl: File | string | null,
  config?: ConversionConfig
): UseSmartMediaReturn {
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);
  const [isHls, setIsHls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    'idle' | 'converting' | 'ready' | 'error'
  >('idle');

  const conversionRef = useRef<Conversion | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fileOrUrl) {
      setStatus('idle');
      setPlayableUrl(null);
      setIsHls(false);
      setProgress(0);
      return;
    }

    let isCancelled = false;

    if (typeof fileOrUrl === 'string') {
      console.log('[SmartMedia] Remote URL detected.');
      setPlayableUrl(fileOrUrl);
      setIsHls(fileOrUrl.includes('.m3u8'));
      setStatus('ready');
      return;
    }

    console.log('[SmartMedia] Local file detected:', fileOrUrl.name);
    setIsHls(false);

    if (fileOrUrl.type === 'video/mp4' || fileOrUrl.type === 'video/webm') {
      console.log('[SmartMedia] Web-safe format. Direct playback.');
      const url = URL.createObjectURL(fileOrUrl);
      urlRef.current = url;
      setPlayableUrl(url);
      setStatus('ready');
      return;
    }

    console.log('[SmartMedia] Non-web format. Starting conversion...');
    setStatus('converting');
    setProgress(0);

    const convert = async () => {
      try {
        console.log('[MediaBunny] Initializing Input...');
        const input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(fileOrUrl),
        });

        console.log('[MediaBunny] Configuring Output...');
        const output = new Output({
          format: new Mp4OutputFormat({
            fastStart: config?.fastStart ?? 'in-memory',
          }),
          target: new BufferTarget(),
        });

        console.log('[MediaBunny] Initializing Conversion...');
        const conversion = await Conversion.init({ input, output });
        conversionRef.current = conversion;

        conversion.onProgress = (p) => {
          if (!isCancelled) {
            setProgress(p);
            console.log(`[MediaBunny] Progress: ${Math.round(p * 100)}%`);
          }
        };

        console.log('[MediaBunny] Executing Conversion...');
        await conversion.execute();

        if (isCancelled) return;

        console.log('[MediaBunny] Conversion Complete!');
        const buffer = output.target.buffer;
        if (buffer) {
          const blob = new Blob([buffer], { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setPlayableUrl(url);
          setStatus('ready');
        }
      } catch (e) {
        if (!isCancelled) {
          console.error('[MediaBunny] Conversion Error:', e);
          setStatus('error');
        }
      }
    };

    convert();

    return () => {
      isCancelled = true;
      console.log('[SmartMedia] Cleanup: Cancelling conversion...');

      if (conversionRef.current) {
        conversionRef.current.cancel().catch(() => {});
        conversionRef.current = null;
      }

      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [fileOrUrl, config]);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        console.log('[SmartMedia] Final cleanup: Revoking URL...');
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  return { playableUrl, isHls, status, progress };
}
