// Cloudflare Pages Function: Dynamic M3U8 Redirector for /channel/:channel.m3u8
import { onRequest as handleRootChannel } from "../[channel].m3u8";

export const onRequest = handleRootChannel;
