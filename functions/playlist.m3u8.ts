// Cloudflare Pages Function: Dynamic M3U8 Playlist Generator
import { onRequest as handlePlaylist } from "./playlist.m3u";

export const onRequest = handlePlaylist;
