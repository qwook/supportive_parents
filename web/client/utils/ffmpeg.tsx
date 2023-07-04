import { createFFmpeg } from "@ffmpeg/ffmpeg";

const ffmpeg = createFFmpeg({
  log: true,
  corePath: window.location.origin + "/ffmpeg/core/dist/ffmpeg-core.js",
});
ffmpeg.load();

export default ffmpeg;
