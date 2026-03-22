import { APITypes } from 'plyr-react';
import { default as default_2 } from 'hls.js';
import { HlsConfig } from 'hls.js';
import { JSX } from 'react/jsx-runtime';
import { PlyrOptions } from 'plyr-react';
import { PlyrSource } from 'plyr-react';
import { Ref } from 'react';

export declare interface ConversionConfig {
    mode?: 'stream' | 'buffer';
    fastStart?: 'in-memory' | 'fragmented' | 'reserve' | false;
    debug?: boolean;
}

export declare function UniversalPlyr({ ref, fileOrUrl, plyrOptions, hlsConfig, conversionConfig, onReady, onError, onProgress, onConversionStart, onConversionComplete, onHlsReady, autoplay, debug, renderLoading, renderError, className, style, }: UniversalPlyrProps): JSX.Element;

export declare interface UniversalPlyrProps {
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
    onHlsReady?: (hls: default_2) => void;
    autoplay?: boolean;
    debug?: boolean;
    renderLoading?: (progress: number) => React.ReactNode;
    renderError?: (error: Error | null) => React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export declare interface UniversalPlyrRef {
    plyr: APITypes | null;
    hls: default_2 | null;
    getPlayableUrl: () => string | null;
    getStatus: () => 'idle' | 'converting' | 'ready' | 'error';
    getProgress: () => number;
}

export declare function useUniversalMedia(fileOrUrl: File | string | null, config?: ConversionConfig): UseUniversalMediaReturn;

export declare interface UseUniversalMediaReturn {
    playableUrl: string | null;
    source: PlyrSource | null;
    isHls: boolean;
    progress: number;
    status: 'idle' | 'converting' | 'ready' | 'error';
    error: Error | null;
}

export { }
