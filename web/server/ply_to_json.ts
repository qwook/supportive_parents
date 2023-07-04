import { readFileSync, writeFileSync } from "fs";
import path from "path";

const faceFullPly = readFileSync(
  path.join(__dirname, "../facefull.ply")
).toString();
const lines = faceFullPly.split("\n");
let verticesCount;
let facesCount;
let lineIdx = 0;
function readline() {
  lineIdx++;
  return lines[lineIdx - 1];
}
for (let i = 0; i < lines.length; i++) {
  const words = readline().split(" ");
  if (words[0] === "element") {
    if (words[1] === "vertex") {
      verticesCount = parseInt(words[2]);
    } else if (words[1] === "face") {
      facesCount = parseInt(words[2]);
    }
  } else if (words[0] === "end_header") {
    break;
  }
}
let vertices = [];
let idToNewId = {};
for (let i = 0; i < verticesCount; i++) {
  const numbers = readline().split(" ").map(parseFloat);
  const faceId =
    numbers[10] === 123 ? numbers[8] + numbers[9] * 255 : verticesCount + 1;
  vertices.push({
    faceId,
    id: i,
    x: numbers[0],
    y: numbers[1],
    z: numbers[2],
  });
}
vertices.sort((a, b) => a.faceId - b.faceId);
const faceIdToNewId = {};
for (let i = 0; i < vertices.length; i++) {
  idToNewId[vertices[i].id] = i;
  faceIdToNewId[vertices[i].faceId] = i
}
let faces = [];
for (let i = 0; i < facesCount; i++) {
  const numbers = readline().split(" ").map(parseFloat);
  faces.push([
    idToNewId[numbers[1]],
    idToNewId[numbers[2]],
    idToNewId[numbers[3]],
  ]);
}
console.log(faces);

const json = JSON.stringify({
  vertices,
  faces,
  faceIdToNewId
});
writeFileSync(path.join(__dirname, "../client/tfjsCamera/face.json"), json);
