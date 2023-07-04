import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

export type DetectorProps = {
  onDetectorReady?: () => void;
};

export type DetectorHandle = {
  detect: (frame) => Promise<faceLandmarksDetection.Face[]>;
  getWidth: () => number;
};

const Detector = forwardRef<DetectorHandle, DetectorProps>((props, ref) => {
  const detector = useRef<faceLandmarksDetection.FaceLandmarksDetector>();

  useImperativeHandle(ref, () => {
    return {
      detect: async (frame) => {
        return (
          (await detector.current?.estimateFaces(frame, {
            flipHorizontal: false,
          })) || []
        );
      },
      getWidth: () => {
        return (detector.current as any).width;
      }
    };
  });

  useEffect(() => {
    void (async () => {
      detector.current = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: "mediapipe",
          refineLandmarks: false,
          maxFaces: 1,
          solutionPath: "/face_mesh",
        }
      );
      props.onDetectorReady ? props.onDetectorReady() : null;
    })().catch(console.error);
  }, []);

  return <></>;
});
export default Detector;
