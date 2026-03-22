import React, { useState, useRef } from 'react';
import { UniversalPlyr } from './UniversalPlyr';
import type { UniversalPlyrRef } from './UniversalPlyr';
import type { PlyrOptions } from 'plyr-react';
import type { HlsConfig } from 'hls.js';

export default function App() {
  const [media, setMedia] = useState<File | string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const playerRef = useRef<UniversalPlyrRef>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setMedia(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setMedia(urlInput.trim());
    }
  };

  const customPlyrOptions: PlyrOptions = {
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
    autoplay: true,
    seekTime: 10,
    volume: 0.8,
  };

  const customHlsConfig: Partial<HlsConfig> = {
    enableWorker: true,
    lowLatencyMode: false,
    maxBufferLength: 30,
  };

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>
        Universal Player
      </h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
        Headless MediaBunny + HLS.js + Plyr with full React control
      </p>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '30px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            flex: '1 1 300px',
            border: '1px solid #ddd',
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
          }}
        >
          <h3 style={{ marginTop: 0 }}>1. Play Local File</h3>
          <p style={{ fontSize: '13px', color: '#555' }}>
            Select an unsupported format like <strong>.mkv</strong> to trigger
            conversion.
          </p>
          <input
            type="file"
            accept="video/*,.mkv,.ts,.avi"
            onChange={handleFileChange}
            style={{ width: '100%', marginTop: '10px' }}
          />
        </div>

        <div
          style={{
            flex: '1 1 300px',
            border: '1px solid #ddd',
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
          }}
        >
          <h3 style={{ marginTop: 0 }}>2. Play Remote URL</h3>
          <p style={{ fontSize: '13px', color: '#555' }}>
            Paste an <strong>.m3u8</strong> stream for HLS playback.
          </p>
          <form
            onSubmit={handleUrlSubmit}
            style={{ display: 'flex', gap: '10px', marginTop: '10px' }}
          >
            <input
              type="url"
              placeholder="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Play
            </button>
          </form>
        </div>
      </div>

      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button
          onClick={() => {
            console.log('Player Ref:', playerRef.current);
            console.log('Plyr Instance:', playerRef.current?.plyr);
            console.log('HLS Instance:', playerRef.current?.hls);
            console.log('Status:', playerRef.current?.getStatus());
            console.log('URL:', playerRef.current?.getPlayableUrl());
          }}
          style={{
            padding: '10px 20px',
            cursor: 'pointer',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Log Exposed Instances to Console
        </button>
      </div>

      <div
        style={{
          marginTop: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          borderRadius: '8px',
          backgroundColor: '#000',
        }}
      >
        {media ? (
          <UniversalPlyr
            ref={playerRef}
            fileOrUrl={media}
            plyrOptions={customPlyrOptions}
            hlsConfig={customHlsConfig}
            onReady={() => console.log('Player Ready!')}
            onError={(error) => console.error('Player Error:', error)}
            onProgress={(progress) =>
              console.log('Conversion Progress:', Math.round(progress * 100), '%')
            }
            onConversionStart={() => console.log('Conversion Started')}
            onConversionComplete={() => console.log('Conversion Complete')}
            onHlsReady={(hls) => console.log('HLS Ready:', hls)}
            renderLoading={(progress) => (
              <div
                style={{
                  height: '450px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  backgroundColor: '#1a1a1a',
                }}
              >
                <h2>Processing Media...</h2>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {Math.round(progress * 100)}%
                </p>
              </div>
            )}
            renderError={(error) => (
              <div
                style={{
                  height: '450px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff4444',
                  backgroundColor: '#1a1a1a',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <h2>Playback Error</h2>
                  <p>{error}</p>
                </div>
              </div>
            )}
          />
        ) : (
          <div
            style={{
              height: '450px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#888',
              textAlign: 'center',
              padding: '20px',
            }}
          >
            <div>
              <h2>No Media Loaded</h2>
              <p>Select a local file or paste a URL above.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
