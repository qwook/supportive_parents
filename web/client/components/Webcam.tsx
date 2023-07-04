import React, {
  MutableRefObject,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import AnimationLoop from "../utils/AnimationLoop";

export type WebcamProps = {
  onPostRender?: (
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D
  ) => Promise<void>;
};

export type WebcamHandle = {
  getDataURL: () => string;
  drawRaw: () => void;
  videoEle: MutableRefObject<HTMLVideoElement>;
  canvasEle: MutableRefObject<HTMLCanvasElement>;
  pause: () => void;
  resume: () => void;
};

const Webcam = forwardRef<WebcamHandle, WebcamProps>((props, ref) => {
  const videoEle = useRef<HTMLVideoElement>();
  const canvasEle = useRef<HTMLCanvasElement>();
  const canvasContext = useRef<CanvasRenderingContext2D>();
  const animationLoop = useRef(new AnimationLoop(async () => {}));
  const paused = useRef<boolean>(false);

  const onPostRenderRef = useRef<WebcamProps["onPostRender"]>();
  useEffect(() => {
    onPostRenderRef.current = props.onPostRender;
  }, [props.onPostRender]);

  useImperativeHandle(
    ref,
    () => {
      return {
        getDataURL: () => canvasEle.current.toDataURL(),
        drawRaw: () => {
          canvasContext.current.drawImage(
            videoEle.current,
            0,
            0,
            videoEle.current.videoWidth,
            videoEle.current.videoHeight
          );
        },
        videoEle,
        canvasEle,
        pause: () => (paused.current = true),
        resume: () => (paused.current = false),
      };
    },
    []
  );

  useEffect(() => {
    void (async () => {
      canvasContext.current = canvasEle.current.getContext("2d");

      const devices = await navigator.mediaDevices.enumerateDevices();
      const faceTimeDevice = devices.find((device) =>
        device.label.match("FaceTime")
      );

      const videoConfig = {
        audio: false,
        video: {
          deviceId: faceTimeDevice.deviceId,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(videoConfig);
      videoEle.current.srcObject = stream;

      await new Promise<void>((resolve) => {
        videoEle.current.onloadedmetadata = () => {
          resolve();
        };
      });

      videoEle.current.play();
      canvasEle.current.width = videoEle.current.videoWidth;
      canvasEle.current.height = videoEle.current.videoHeight;

      canvasContext.current.translate(videoEle.current.videoWidth, 0);
      canvasContext.current.scale(-1, 1);

      animationLoop.current = new AnimationLoop(async () => {
        if (paused.current) {
          return;
        }
        canvasContext.current.drawImage(
          videoEle.current,
          0,
          0,
          videoEle.current.videoWidth,
          videoEle.current.videoHeight
        );
        try {
          await onPostRenderRef.current(
            canvasEle.current,
            canvasContext.current
          );
        } catch (e) {
          console.error(e);
        }
      });
      animationLoop.current.start();
    })().catch(console.error);

    return () => {
      animationLoop.current.pause();
    };
  }, []);

  return (
    <>
      <video style={{ display: "none" }} ref={videoEle}></video>
      <canvas ref={canvasEle}></canvas>
    </>
  );
});
export default Webcam;
