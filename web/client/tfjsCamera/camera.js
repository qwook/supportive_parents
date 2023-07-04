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

import { VIDEO_SIZE } from "./shared/params";
import { drawResults, isMobile } from "./shared/util";

export class Camera {
  constructor() {
    this.video = document.getElementById("video");
    this.canvas = document.getElementById("output");
    this.ctx = this.canvas.getContext("2d");
  }

  /**
   * Initiate a Camera instance and wait for the camera stream to be ready.
   * @param cameraParam From app `STATE.camera`.
   */
  static async setupCamera(cameraParam) {
    console.log("SETUP CAMERA");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "Browser API navigator.mediaDevices.getUserMedia not available"
      );
    }

    let myDevice = null;
    const devices = await navigator.mediaDevices.enumerateDevices();

    for (var i = 0; i < devices.length; i++) {
      var device = devices[i];
      if (device.kind === "videoinput") {
        if (device.label === "FaceTime HD Camera (4E23:4E8C)") {
          myDevice = device.deviceId;
          console.log("yay");
        }
        console.log(device.label);
        console.log(device.deviceId);
      }
    }

    console.log("hi");
    console.log(myDevice);

    const { targetFPS, sizeOption } = cameraParam;
    const $size = VIDEO_SIZE[sizeOption];
    const videoConfig = {
      audio: false,
      video: {
        deviceId: myDevice,
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(videoConfig);
    console.log(stream);

    const camera = new Camera();
    camera.video.srcObject = stream;
    console.log("SETUP CAMERA");
    console.log(camera.video);

    await new Promise((resolve) => {
      camera.video.onloadedmetadata = () => {
        console.log("meta1");
        resolve(video);
        console.log("meta2");
      };
    });
    console.log("SETUP CAMERA");

    camera.video.play();

    const videoWidth = camera.video.videoWidth;
    const videoHeight = camera.video.videoHeight;
    // Must set below two lines, otherwise video element doesn't show.
    camera.video.width = videoWidth;
    camera.video.height = videoHeight;
    console.log("SETUP CAMERA");

    camera.canvas.width = videoWidth;
    camera.canvas.height = videoHeight;
    const canvasContainer = document.querySelector(".canvas-wrapper");
    canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

    // Because the image from camera is mirrored, need to flip horizontally.
    camera.ctx.translate(camera.video.videoWidth, 0);
    camera.ctx.scale(-1, 1);

    return camera;
  }

  drawCtx() {
    this.ctx.drawImage(
      this.video,
      0,
      0,
      this.video.videoWidth,
      this.video.videoHeight
    );
  }

  drawResults(faces, triangulateMesh, boundingBox) {
    drawResults(this.ctx, faces, triangulateMesh, boundingBox);
  }
}
