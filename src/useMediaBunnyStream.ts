import { useState, useEffect } from 'react';
import type { PlyrSource } from 'plyr-react';
import {
  Input,
  Output,
  Conversion,
  Mp4OutputFormat,
  StreamTarget,
  UrlSource,
  BlobSource,
  ALL_FORMATS,
} from 'mediabunny';

import type { StreamTargetChunk } from 'mediabunny';

export type MediaBunnyStatus = 'idle' | 'converting' | 'success' | 'error';

export interface UseMediaBunnyStreamResult {
  source: PlyrSource | null;
  status: MediaBunnyStatus;
  progress: number;
  error: Error | null;
}

export function useMediaBunnyStream(
  fileOrUrl: File | string | null
): UseMediaBunnyStreamResult {
  const [source, setSource] = useState<PlyrSource | null>(null);
  const [status, setStatus] = useState<MediaBunnyStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (status === 'success') return;

    if (!fileOrUrl) {
      setStatus('idle');
      setSource(null);
      return;
    }

    console.log('[MediaBunny] Starting stream process...');

    let isCancelled = false;
    let inputInstance: Input | null = null;
    let outputInstance: Output | null = null;
    let conversionInstance: Conversion | null = null;
    let mediaSource: MediaSource | null = null;
    let objectUrl: string | null = null;

    const processMedia = async () => {
      setStatus('converting');
      setProgress(0);
      setError(null);
      console.log('[MediaBunny] converting');

      try {
        // 1. Setup Mediabunny Input
        console.log('[MediaBunny] Step 1: Initializing Input...');
        inputInstance = new Input({
          formats: ALL_FORMATS,
          source:
            typeof fileOrUrl === 'string'
              ? new UrlSource(fileOrUrl)
              : new BlobSource(fileOrUrl),
        });

        // 2. Setup MSE (Media Source Extensions)
        console.log('[MediaBunny] Step 2: Creating MediaSource...');
        mediaSource = new MediaSource();
        objectUrl = URL.createObjectURL(mediaSource);

        // Tell Plyr to connect to the empty MediaSource
        setSource({
          type: 'video',
          sources: [{ src: objectUrl, type: 'video/mp4' }],
        });

        // Wait for the browser to open the MSE connection
        await new Promise<void>((resolve, reject) => {
          mediaSource!.addEventListener(
            'sourceopen',
            () => {
              console.log('[MediaBunny] MediaSource opened!');
              resolve();
            },
            { once: true }
          );
          mediaSource!.addEventListener('error', reject, { once: true });
        });

        if (isCancelled) return;

        let sourceBuffer: SourceBuffer | null = null;

        // 3. Create a WritableStream with Backpressure
        console.log('[MediaBunny] Step 3: Initializing WritableStream...');
        const writable = new WritableStream<StreamTargetChunk>({
          async write(chunk) {
            if (isCancelled) return;

            // FIX: Initialize SourceBuffer on the first chunk!
            if (!sourceBuffer && outputInstance) {
              console.log(
                '[MediaBunny] Receiving first chunk. Fetching MIME Type...'
              );
              const exactMimeType = await outputInstance.getMimeType();
              console.log('[MediaBunny] MIME Type:', exactMimeType);

              if (isCancelled || mediaSource?.readyState !== 'open') return;
              sourceBuffer = mediaSource!.addSourceBuffer(exactMimeType);
            }

            if (isCancelled || mediaSource?.readyState !== 'open') return;

            try {
              console.log(
                `[MediaBunny] Appending ${chunk.data.byteLength} bytes to SourceBuffer...`
              );
              sourceBuffer!.appendBuffer(chunk.data);

              await new Promise<void>((resolve, reject) => {
                sourceBuffer!.addEventListener('updateend', () => resolve(), {
                  once: true,
                });
                sourceBuffer!.addEventListener('error', (e) => reject(e), {
                  once: true,
                });
              });
            } catch (e) {
              if (!isCancelled) throw e;
            }
          },
        });

        // 4. Setup Output for Append-Only Fragmented MP4
        console.log('[MediaBunny] Step 4: Configuring Output...');
        outputInstance = new Output({
          format: new Mp4OutputFormat({
            fastStart: 'fragmented',
            minimumFragmentDuration: 1, // Chunk every 1 second
          }),
          target: new StreamTarget(writable, { chunked: true }),
        });

        // 5. Initialize Conversion
        console.log('[MediaBunny] Step 5: Initializing Conversion...');
        conversionInstance = await Conversion.init({
          input: inputInstance,
          output: outputInstance,
        });

        if (!conversionInstance.isValid) {
          throw new Error(
            'This format or codec cannot be converted by the browser.'
          );
        }

        conversionInstance.onProgress = (p) => {
          if (!isCancelled) setProgress(p);
        };

        // 6. Execute Conversion (Runs in the background, piping to MSE)
        console.log('[MediaBunny] Step 6: Starting Execution...');
        await conversionInstance.execute();

        if (isCancelled) return;

        if (mediaSource.readyState === 'open') {
          mediaSource.endOfStream();
        }

        setStatus('success');
        console.log('[MediaBunny] Conversion complete.');
      } catch (err) {
        if (!isCancelled) {
          console.error('[MediaBunny Error]', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus('error');
          if (mediaSource && mediaSource.readyState === 'open') {
            mediaSource.endOfStream('decode');
          }
        }
      }
    };

    processMedia();

    // CLEANUP: Abort conversions and revoke memory instantly on unmount
    return () => {
      isCancelled = true;
      console.log('[MediaBunny] Cleaning up resources...');
      if (conversionInstance) conversionInstance.cancel().catch(() => {});
      if (inputInstance) inputInstance.dispose();

      // FIX FOR THE ERR_FILE_NOT_FOUND:
      // We delay revoking the URL so the video tag has time to gracefully disconnect
      // during React's Strict Mode double-invocations.
      if (objectUrl) {
        const urlToRevoke = objectUrl;
        setTimeout(() => URL.revokeObjectURL(urlToRevoke), 1000);
      }
    };
  }, [fileOrUrl]);

  return { source, status, progress, error };
}
