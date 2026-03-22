import { forwardRef } from 'react';
import { Plyr } from 'plyr-react';
import type { APITypes, PlyrProps } from 'plyr-react';
import { useMediaBunnyStream } from './useMediaBunnyStream';
import 'plyr-react/plyr.css';

export interface MediaBunnyPlyrProps extends Omit<PlyrProps, 'source'> {
  fileOrUrl: File | string | null;
}

export const MediaBunnyPlyr = forwardRef<APITypes, MediaBunnyPlyrProps>(
  ({ fileOrUrl, options, ...rest }, ref) => {
    const { source, status, progress, error } = useMediaBunnyStream(fileOrUrl);

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        {/* DOM ISOLATION LAYER: Overlays are kept strictly separate from Plyr */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {/* Error State */}
          {status === 'error' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,0,0,0.8)',
                color: 'white',
                pointerEvents: 'auto',
              }}
            >
              <p>
                <strong>Playback Error:</strong> {error?.message}
              </p>
            </div>
          )}

          {/* Loading State */}
          {status === 'converting' && !source && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                pointerEvents: 'auto',
              }}
            >
              <h3>Media Bunny Magic ✨</h3>
              <p>Initializing Stream...</p>
            </div>
          )}

          {/* Progress overlay */}
          {status === 'converting' && source && (
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              Converting: {Math.round(progress * 100)}%
            </div>
          )}
        </div>

        {/* DOM ISOLATION LAYER: Plyr is safe inside its own dedicated container */}
        <div style={{ width: '100%', height: '100%' }}>
          <Plyr
            ref={ref}
            source={source}
            options={{
              ...options,
              autoplay: true,
            }}
            {...rest}
          />
        </div>
      </div>
    );
  }
);

MediaBunnyPlyr.displayName = 'MediaBunnyPlyr';
