import { useState, useEffect } from 'react';
import type { PlyrSource } from 'plyr-react';
import { Input, Output, Conversion, Mp4OutputFormat, BufferTarget, StreamTarget, BlobSource, ALL_FORMATS } from 'mediabunny';
import type { StreamTargetChunk } from 'mediabunny';
import { createLogger } from './logger';

export interface ConversionConfig {
  mode?: 'stream' | 'buffer'; 
  fastStart?: 'in-memory' | 'fragmented' | 'reserve' | false;
  debug?: boolean;
}

export interface UseUniversalMediaReturn {
  playableUrl: string | null;
  source: PlyrSource | null;
  isHls: boolean;
  progress: number;
  status: 'idle' | 'converting' | 'ready' | 'error';
  error: Error | null;
}

export function useUniversalMedia(fileOrUrl: File | string | null, config?: ConversionConfig): UseUniversalMediaReturn {
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);
  const[source, setSource] = useState<PlyrSource | null>(null);
  const[isHls, setIsHls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'converting' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);

  // ✅ React 19 Standard: Reset state during the render phase when prop changes 
  // (Prevents cascading effect renders)
  const [prevFile, setPrevFile] = useState<File | string | null>(fileOrUrl);
  if (fileOrUrl !== prevFile) {
    setPrevFile(fileOrUrl);
    setPlayableUrl(null);
    setSource(null);
    setIsHls(false);
    setProgress(0);
    setStatus('idle');
    setError(null);
  }

  const logger = createLogger('UniversalMedia', config?.debug);
  const conversionMode = config?.mode ?? 'stream';

  useEffect(() => {
    if (!fileOrUrl) return;

    let isCancelled = false;
    let conversionInstance: Conversion | null = null;
    let mediaSource: MediaSource | null = null;
    let cleanupUrl: string | null = null;

    const processMedia = async () => {
      // ✅ Yield to microtask queue: ensures state setters run asynchronously, passing strict ESLint rules
      await Promise.resolve();
      if (isCancelled) return;

      if (typeof fileOrUrl === 'string') {
        logger.log('Remote URL detected.');
        setIsHls(fileOrUrl.includes('.m3u8'));
        setPlayableUrl(fileOrUrl);
        setStatus('ready');
        return;
      }

      setIsHls(false);

      if (fileOrUrl.type === 'video/mp4' || fileOrUrl.type === 'video/webm') {
        logger.log('Web-safe format. Direct playback.');
        cleanupUrl = URL.createObjectURL(fileOrUrl);
        setPlayableUrl(cleanupUrl);
        setStatus('ready');
        return;
      }

      logger.log(`Non-web format. Starting conversion in [${conversionMode}] mode...`);
      setStatus('converting');
      setProgress(0);
      setError(null);

      try {
        const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(fileOrUrl) });

        if (conversionMode === 'buffer') {
          const output = new Output({
            format: new Mp4OutputFormat({ fastStart: config?.fastStart ?? 'in-memory' }),
            target: new BufferTarget(),
          });

          conversionInstance = await Conversion.init({ input, output });
          conversionInstance.onProgress = (p) => { if (!isCancelled) setProgress(p); };
          await conversionInstance.execute();

          if (isCancelled) return;
          const buffer = output.target.buffer;
          if (buffer) {
            cleanupUrl = URL.createObjectURL(new Blob([buffer], { type: 'video/mp4' }));
            setPlayableUrl(cleanupUrl);
            setStatus('ready');
          }
        } else {
          mediaSource = new MediaSource();
          cleanupUrl = URL.createObjectURL(mediaSource);
          setSource({ type: 'video', sources:[{ src: cleanupUrl, type: 'video/mp4' }] });

          await new Promise<void>((resolve, reject) => {
            mediaSource!.addEventListener('sourceopen', () => resolve(), { once: true });
            mediaSource!.addEventListener('error', reject, { once: true });
          });

          if (isCancelled) return;

          let sourceBuffer: SourceBuffer | null = null;
          let outputInstance: Output | null = null;

          const writable = new WritableStream<StreamTargetChunk>({
            async write(chunk) {
              if (isCancelled) return;
              if (!sourceBuffer && outputInstance) {
                const mime = await outputInstance.getMimeType();
                if (mediaSource?.readyState === 'open') sourceBuffer = mediaSource!.addSourceBuffer(mime);
              }
              if (isCancelled || mediaSource?.readyState !== 'open') return;

              sourceBuffer!.appendBuffer(chunk.data);
              await new Promise<void>((resolve, reject) => {
                sourceBuffer!.addEventListener('updateend', () => resolve(), { once: true });
                sourceBuffer!.addEventListener('error', reject, { once: true });
              });
            },
          });

          outputInstance = new Output({
            format: new Mp4OutputFormat({ fastStart: 'fragmented', minimumFragmentDuration: 1 }),
            target: new StreamTarget(writable, { chunked: true }),
          });

          conversionInstance = await Conversion.init({ input, output: outputInstance });
          conversionInstance.onProgress = (p) => { if (!isCancelled) setProgress(p); };
          await conversionInstance.execute();

          if (isCancelled) return;
          if (mediaSource?.readyState === 'open') mediaSource.endOfStream();
          setStatus('ready');
        }
      } catch (err) {
        if (!isCancelled) {
          logger.error('Processing Error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus('error');
          if (mediaSource?.readyState === 'open') mediaSource.endOfStream('decode');
        }
      }
    };

    processMedia();

    return () => {
      isCancelled = true;
      logger.log('Cleaning up resources...');
      if (conversionInstance) conversionInstance.cancel().catch(() => {});
      if (cleanupUrl) {
        const urlToRevoke = cleanupUrl;
        setTimeout(() => URL.revokeObjectURL(urlToRevoke), 1000);
      }
    };
  },[fileOrUrl, conversionMode, config?.fastStart, logger]);

  return { playableUrl, source, isHls, status, progress, error };
}