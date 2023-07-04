import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

function distance(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

/**
 * Draw the keypoints on the video.
 * @param ctx 2D rendering context.
 * @param faces A list of faces to render.
 */
export function drawFaces(ctx: CanvasRenderingContext2D, faces: faceLandmarksDetection.Face[]) {
  faces.forEach((face) => {
    const keypoints =
        face.keypoints.map((keypoint) => [keypoint.x, keypoint.y]);

    ctx.fillStyle = "green";

    for (let i = 0; i < 468; i++) {
      const x = keypoints[i][0];
      const y = keypoints[i][1];

      ctx.beginPath();
      ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
      ctx.fill();
    }

    if (keypoints.length > 468) {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 1;

      const leftCenter = keypoints[468];
      const leftDiameterY =
          distance(keypoints[468 + 4], keypoints[468 + 2]);
      const leftDiameterX =
          distance(keypoints[468 + 3], keypoints[468 + 1]);

      ctx.beginPath();
      ctx.ellipse(
          leftCenter[0], leftCenter[1], leftDiameterX / 2, leftDiameterY / 2, 0,
          0, 2 * Math.PI);
      ctx.stroke();

      if (keypoints.length > 468 + 5) {
        const rightCenter = keypoints[468 + 5];
        const rightDiameterY = distance(
            keypoints[468 + 5 + 2],
            keypoints[468 + 5 + 4]);
        const rightDiameterX = distance(
            keypoints[468 + 5 + 3],
            keypoints[468 + 5 + 1]);

        ctx.beginPath();
        ctx.ellipse(
            rightCenter[0], rightCenter[1], rightDiameterX / 2,
            rightDiameterY / 2, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    const contours = faceLandmarksDetection.util.getKeypointIndexByContour(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh);

    for (const [label, contour] of Object.entries(contours)) {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      const path = contour.map((index) => keypoints[index]);
      if (path.every(value => value != undefined)) {
        drawPath(ctx, path, false);
      }
    }
  });
}
