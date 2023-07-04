import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import faceMesh from "./face.json";
import passiveRecording from "./passive_recording.json";
import talkingRecording from "./talking_recording.json";

import * as THREE from "three";
import { Face } from "@tensorflow-models/face-landmarks-detection";
import { DetectorHandle } from "./Detector";
import { imageLoader, textureLoader } from "../utils/threejsLoaders";

function getRecordingPositionFromTime(recording, time: number) {
  const normalized_time =
    time % (recording.interval * recording.keyframes.length);
  const frameId = Math.floor(normalized_time / recording.interval);
  const interp =
    (normalized_time - frameId * recording.interval) / recording.interval;
  const frame = recording.keyframes[frameId];
  const frame2 =
    recording.keyframes[(frameId + 1) % recording.keyframes.length];
  return frame.map((pos, idx) => {
    const pos2 = frame2[idx];
    return new THREE.Vector3(pos[0], pos[1], pos[2]).lerp(
      new THREE.Vector3(pos2[0], pos2[1], pos2[2]),
      interp
    );
  });
}

function blendKeyframes(keyframes1, keyframes2, alpha) {
  return keyframes1.map((keyframes1, idx) =>
    keyframes1.lerp(keyframes2[idx], alpha)
  );
}

export type TalkingPortraitProps = {
  width: number;
  height: number;
  texture?: string;
  detector: MutableRefObject<DetectorHandle>;
  detectorReady: boolean;
  blend: number;
  onDetectorStart?: () => void;
  onDetectorEnd?: () => void;
};

const TalkingPortrait = ({
  width,
  height,
  texture,
  detector,
  detectorReady,
  blend,
  onDetectorStart,
  onDetectorEnd,
  ...args
}: TalkingPortraitProps) => {
  const canvas = useRef<HTMLCanvasElement>();
  const img = useRef<HTMLImageElement>();
  const [threeJsObjects, setThreeJsObjects] = useState<{
    camera?: THREE.Camera;
    scene?: THREE.Scene;
    renderer?: THREE.Renderer;
    mesh: THREE.Mesh;
    material?: THREE.Material;
    positionBuffer?: THREE.BufferAttribute;
    uvBuffer?: THREE.BufferAttribute;
  }>();
  const blendTarget = useRef<number>(0);

  useEffect(() => {
    blendTarget.current = blend;
  }, [blend])

  useEffect(() => {
    if (!texture || !threeJsObjects || !detectorReady) {
      return;
    }

    void (async () => {
      const image = await new Promise((resolve) =>
        new THREE.ImageLoader().load(texture, (image) => {
          resolve(image);
        })
      );

      onDetectorStart ? onDetectorStart() : null

      /* This preps the detector for the new image, since it uses motion. */
      for (let i = 0; i < 10; i++) {
        await detector.current.detect(image);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      const faces = await detector.current.detect(image);
      const detectedFace = faces[0];

      onDetectorEnd ? onDetectorEnd() : null

      if (detectedFace) {
        for (let i = 0; i < faceMesh.vertices.length; i++) {
          threeJsObjects.uvBuffer.setXY(
            i,
            (faceMesh.vertices[i].x + 150) / 300,
            1.0 - (faceMesh.vertices[i].y + 150) / 300
          );
        }

        for (let i = 0; i < detectedFace.keypoints.length; i++) {
          threeJsObjects.uvBuffer.setXY(
            i,
            detectedFace.keypoints[i].x / 1024,
            1.0 - detectedFace.keypoints[i].y / 1024
          );
        }
        threeJsObjects.uvBuffer.needsUpdate = true;

        threeJsObjects.mesh.material.map = new THREE.TextureLoader().load(
          texture
        );
        threeJsObjects.mesh.material.needsUpdate = true;
      }
    })().catch(console.error);
  }, [texture, threeJsObjects, detectorReady]);

  useEffect(() => {
    if (!threeJsObjects) {
      return;
    }
    threeJsObjects.camera.aspect = width / height;
    threeJsObjects.camera.updateProjectionMatrix();
    threeJsObjects.renderer.setSize(width, height);
  }, [width, height, threeJsObjects]);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvas.current,
    });
    renderer.setSize(400, 640);

    const camera = new THREE.PerspectiveCamera(40, 400 / 640, 0.001, 100000);
    camera.position.z = 500;
    camera.position.y = -30;

    const scene = new THREE.Scene();
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array(
      faceMesh.vertices.map((value) => [-value.x - 0, -value.y, value.z]).flat()
    );
    const uv = new Float32Array(Array(3 * faceMesh.vertices.length).fill(1));

    const positionBuffer = new THREE.BufferAttribute(vertices, 3);
    const uvBuffer = new THREE.BufferAttribute(uv, 2);
    geometry.setAttribute("position", positionBuffer);
    geometry.setAttribute("uv", uvBuffer);
    geometry.setIndex(faceMesh.faces.flat());

    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    scene.add(mesh);

    setThreeJsObjects({
      camera,
      scene,
      renderer,
      mesh,
      material,
      positionBuffer,
      uvBuffer,
    });

    const startTime = Date.now();
    const randTime = Math.random() * 10000;
    const randTime2 = Math.random() * 10000;
    let lastTime = 0;
    let currentBlend = 0;
    renderer.setAnimationLoop(() => {
      const currentTime = Date.now() - startTime;
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      const currentFramePassive = getRecordingPositionFromTime(
        passiveRecording,
        currentTime + randTime
      );
      const currentFrameTalking = getRecordingPositionFromTime(
        talkingRecording,
        currentTime + randTime2
      );
      if (currentBlend < blendTarget.current) {
        currentBlend = Math.min(blendTarget.current, currentBlend + deltaTime / 300);
      } else {
        currentBlend = Math.max(blendTarget.current, currentBlend - deltaTime / 300);
      }
      const currentFrame = blendKeyframes(
        currentFramePassive,
        currentFrameTalking,
        currentBlend
      );

      for (let i = 0; i < currentFrame.length; i++) {
        const keypoint = currentFrame[i];
        positionBuffer.setXYZ(
          faceMesh.faceIdToNewId[i],
          -keypoint.x + 350,
          -keypoint.y + 200,
          keypoint.z
        );
        positionBuffer.needsUpdate = true;
      }

      renderer.render(scene, camera);
    });

    return () => {
      renderer.dispose();
      renderer.setAnimationLoop();
    };
  }, []);

  return <canvas ref={canvas} {...args}></canvas>;
};
export default TalkingPortrait;
