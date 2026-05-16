declare module 'react-native-ytdl' {
    export interface VideoInfo {
        formats: {
            audioBitrate?: number;
            contentLength?: string;
            approxDurationMs?: string;
            container?: string;
            url: string;
            [key: string]: any;
        }[];
        videoDetails: {
            title: string;
            author: {
                name: string;
            };
            lengthSeconds: string;
        };
    }

    export function getInfo(url: string): Promise<VideoInfo>;
    export function filterFormats(formats: any[], filter: 'audioonly' | 'videoonly' | 'audioandvideo'): any[];
    export function chooseFormat(formats: any[], options: any): any;
}
