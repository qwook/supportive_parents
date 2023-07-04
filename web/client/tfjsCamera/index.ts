/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import "@tensorflow/tfjs-backend-webgl";

import * as tfjsWasm from "@tensorflow/tfjs-backend-wasm";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

import * as THREE from "three";
import landmarkIndices from "./landmark_indices.json";
import talkingRecording from "./talking_recording.json";
import passiveRecording from "./passive_recording.json";
import faceMesh from "./face.json";
import mespeak from "mespeak";
import voiceUs from "mespeak/voices/en/en-us.json";
import config from "mespeak/src/mespeak_config.json";

mespeak.loadVoice(voiceUs);
mespeak.loadConfig(config);

tfjsWasm.setWasmPaths(`tfjs-backend-wasm`);

import "@tensorflow-models/face-detection";

import { Camera } from "./camera";
import { STATE, createDetector } from "./shared/params";
import { setBackendAndEnvFlags } from "./shared/util";
import { write } from "../utils/fakefs";

STATE.model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
STATE.backend = "mediapipe-gpu";
STATE.modelConfig.maxFaces = 1

const dannyTexture = new THREE.TextureLoader().load("images/henry_01.png");
let faceText

let dynamicGeometry;
let dynamicBuffer: THREE.BufferAttribute;
let indices;
{
  const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.001,
    100000
  );
  camera.position.z = 500;

  const scene = new THREE.Scene();

  {
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array(
      faceMesh.vertices.map((value) => [-value.x - 0, -value.y, value.z]).flat()
    );
    const uv = new Float32Array(Array(3 * faceMesh.vertices.length).fill(1));

    dynamicBuffer = new THREE.BufferAttribute(vertices, 3);
    let uvBuffer = new THREE.BufferAttribute(uv, 2);
    indices = [0, 11, 267];
    // const indices = [0, 267, 11];
    // indices = [267, 11, 0];
    geometry.setIndex(faceMesh.faces.flat());
    // geometry.setIndex(indices);
    geometry.setAttribute("uv", uvBuffer);
    geometry.setAttribute("position", dynamicBuffer);
    dynamicGeometry = geometry;
    const material = new THREE.MeshBasicMaterial({ map: dannyTexture });
    faceText = material
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    scene.add(mesh);

    (async () => {
      detector = await createDetector();
      const faces = await detector.estimateFaces(
        document.getElementById("reference-face"),
        {
          flipHorizontal: false,
        }
      );
      if (faces.length > 0) {
        for (let i = 0; i < faceMesh.vertices.length; i++) {
          dynamicGeometry.attributes.uv.setXY(
            i,
            (faceMesh.vertices[i].x + 150) / 300,
            1.0 - (faceMesh.vertices[i].y + 150) / 300
          );
        }

        const face = faces[0];
        for (let i = 0; i < face.keypoints.length; i++) {
          dynamicGeometry.attributes.uv.setXY(
            i,
            face.keypoints[i].x / 1024,
            1.0 - face.keypoints[i].y / 1024
          );
        }
        dynamicGeometry.attributes.uv.needsUpdate = true;
      }
    })();

    // const wireframe = new THREE.WireframeGeometry(geometry);

    // const line = new THREE.LineSegments(wireframe);
    // line.material.depthTest = false;
    // line.material.opacity = 0.25;
    // line.material.transparent = true;

    // scene.add(line);
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: document.getElementById("3d-output"),
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // animation

  const animation = (time) => {
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(animation);
}

let detector: faceLandmarksDetection.FaceLandmarksDetector, camera, stats;
let startInferenceTime,
  numInferences = 0;
let inferenceTimeSum = 0,
  lastPanelUpdate = 0;
let rafId;

function beginEstimateFaceStats() {
  startInferenceTime = (performance || Date).now();
}

function endEstimateFaceStats() {
  const endInferenceTime = (performance || Date).now();
  inferenceTimeSum += endInferenceTime - startInferenceTime;
  ++numInferences;

  const panelUpdateMilliseconds = 1000;
  if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds) {
    const averageInferenceTime = inferenceTimeSum / numInferences;
    inferenceTimeSum = 0;
    numInferences = 0;
    lastPanelUpdate = endInferenceTime;
  }
}

let lastFace = null;
// let faceRecording = [];
// let isRecording = false;

// setInterval(() => {
//   if (!isRecording) return;

//   faceRecording.push([
//     ...lastFace.keypoints.map((point, idx) => [point.x, point.y, point.z]),
//   ]);
// }, 100);

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

let blendTarget = 0;
let currentBlend = 0;

setInterval(() => {
//   blendTarget = 1;
//   mespeak.speak("I am so proud of what you've become.", { volume: 0 }, () => {
//     blendTarget = 0;
//   });
//   setTimeout(() => {
//     mespeak.speak("I am so proud of what you've become.", { volume: 1 }, () => {
//       blendTarget = 0;
//     });
//   }, 400);
  if (window.speechSynthesis.speaking) return;
  const utterance1 = new SpeechSynthesisUtterance(
    `My dearest child,

Oh, how my heart bursts with pride and joy whenever I think of you. You are a shining beacon of light in this vast universe, illuminating the world with your unique brilliance. From the moment you entered my life, I knew deep within my soul that you were destined for greatness, though the path you would tread remained a captivating mystery.

You possess an extraordinary spirit, my child, one that dances freely with the wind and radiates warmth like the sun's gentle caress. Your resilience in the face of life's challenges leaves me awe-struck, for you never allow adversity to dim the fire that burns within your being. It is as if you possess a secret reserve of strength, an unwavering determination that propels you forward when others might falter.

You have a heart so compassionate, so tender, that it embraces the world with an all-encompassing love. Your empathy knows no bounds, reaching out to those who are burdened by sorrow, offering solace and understanding with your mere presence. Through your gentle touch and comforting words, you weave a tapestry of compassion that wraps around the wounded souls of this fractured world, stitching together hope where despair once prevailed.

Oh, my child, your creativity is a kaleidoscope of colors, swirling and blending in harmonious melodies. You paint the world with your imagination, transforming ordinary moments into extraordinary memories. Your artistic expression, whether through music, painting, or the written word, has the power to touch hearts and awaken dormant dreams within others. You inspire, my dear, simply by embracing your own authenticity and sharing it fearlessly with the world.

But it is not only your talents and achievements that fill me with overwhelming pride; it is the essence of who you are as a person. You possess an unwavering integrity, a moral compass that guides your actions with grace and honor. You embrace diversity, recognizing the beauty in every soul you encounter. Your kindness and respect ripple through the lives you touch, leaving behind a legacy of love and acceptance.

My child, you are a beacon of hope, a testament to the boundless possibilities that exist within each and every one of us. As you traverse the winding path of life, know that I am here, forever your unwavering supporter. I believe in you, my darling, and your capacity to illuminate this world with your unique gifts.

With all my love,

    `
  );
  console.log(window.speechSynthesis.getVoices())
  // utterance1.voice = window.speechSynthesis.getVoices().find(voice => voice.name === "Eddy (English (US))")
  utterance1.voice = window.speechSynthesis.getVoices().find(voice => voice.name === "Eddy (English (US))")
  utterance1.rate = 0.75
  window.speechSynthesis.speak(utterance1)
}, 4000);

const startTime = Date.now();
let lastTime = 0;
setInterval(() => {
  if (window.speechSynthesis.speaking) {
    blendTarget = 1
  } else {
    blendTarget = 0
  }
  const currentTime = Date.now() - startTime;
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  const currentFramePassive = getRecordingPositionFromTime(
    passiveRecording,
    currentTime
  );
  const currentFrameTalking = getRecordingPositionFromTime(
    talkingRecording,
    currentTime
  );
  // const blend = Math.sin(currentTime / 200) / 2 + 0.5
  if (currentBlend < blendTarget) {
    currentBlend = Math.min(blendTarget, currentBlend + deltaTime / 300);
  } else {
    currentBlend = Math.max(blendTarget, currentBlend - deltaTime / 300);
  }
  const currentFrame = blendKeyframes(
    currentFramePassive,
    currentFrameTalking,
    currentBlend
  );

  const positionAttribute = dynamicGeometry.getAttribute("position");
  for (let i = 0; i < currentFrame.length; i++) {
    const keypoint = currentFrame[i];
    positionAttribute.setXYZ(
      faceMesh.faceIdToNewId[i],
      -keypoint.x + 350,
      -keypoint.y + 200,
      keypoint.z
    );
    positionAttribute.needsUpdate = true;
  }
}, 10);

document.body.addEventListener("keypress", async (e) => {
  // isRecording = !isRecording;
  // if (isRecording) {
  //   faceRecording = [];
  // } else {
  //   write(
  //     "talking_recording.json",
  //     JSON.stringify({
  //       keyframes: faceRecording,
  //       interval: 100,
  //     })
  //   );
  // }
  if (e.key === " ") {
    const faces = await detector.estimateFaces(camera.video, {
      flipHorizontal: false,
    });
    lastFace = faces[0];

    camera.drawCtx();
    console.log(lastFace);

    let leftEye = lastFace.keypoints
      .filter((val) => val.name === "leftEye")
      .map((val) => [detector.width - val.x, val.y]);
    let rightEye = lastFace.keypoints
      .filter((val) => val.name === "rightEye")
      .map((val) => [detector.width - val.x, val.y]);
    const leftMouth = [detector.width - lastFace.keypoints[61].x, lastFace.keypoints[61].y];
    const rightMouth = [detector.width - lastFace.keypoints[291].x, lastFace.keypoints[291].y];

    const response = await fetch("http://localhost:3003/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: camera.canvas.toDataURL(),
        leftEye,
        rightEye,
        leftMouth,
        rightMouth,
      }),
    });
    const json = await response.json()
    const image = json.image

    faceText.map = new THREE.TextureLoader().load(image);
    faceText.needsUpdate = true
  }
});

async function renderResult() {
  if (camera.video.readyState < 2) {
    await new Promise((resolve) => {
      camera.video.onloadeddata = () => {
        resolve(video);
      };
    });
  }

  let faces = null;

  if (detector != null) {
    try {
      faces = await detector.estimateFaces(camera.video, {
        flipHorizontal: false,
      });
      lastFace = faces[0];
    } catch (error) {
      detector.dispose();
      detector = null;
      alert(error);
    }
  }

  camera.drawCtx();

  // The null check makes sure the UI is not in the middle of changing to a
  // different model. If during model change, the result is from an old model,
  // which shouldn't be rendered.
  if (faces && faces.length > 0 && !STATE.isModelChanged) {
    camera.drawResults(
      faces,
      STATE.modelConfig.triangulateMesh,
      STATE.modelConfig.boundingBox
    );

    // ThreeJS rendering face here.
    // const face = faces[0];
    // const positionAttribute = dynamicGeometry.getAttribute("position");
    // for (let i = 0; i < face.keypoints.length; i++) {
    //   const keypoint = face.keypoints[i];
    //   positionAttribute.setXYZ(
    //     faceMesh.faceIdToNewId[i],
    //     -keypoint.x + 350,
    //     -keypoint.y + 200,
    //     keypoint.z
    //   );
    //   positionAttribute.needsUpdate = true;
    // }
  }
}

async function renderPrediction() {
  if (!STATE.isModelChanged) {
    await renderResult();
  }

  rafId = requestAnimationFrame(renderPrediction);
}

async function app() {
  // Gui content will change depending on which model is in the query string.
  const urlParams = new URLSearchParams(window.location.search);

  //   await setupDatGui(urlParams);

  //   stats = setupStats();

  camera = await Camera.setupCamera(STATE.camera);

  await setBackendAndEnvFlags(STATE.flags, STATE.backend);

  //   detector = await createDetector();
  console.log(detector);

  renderPrediction();
}

app();
