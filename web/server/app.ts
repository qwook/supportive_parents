import express from "express";
import bodyParser from "body-parser";
import readline from "readline";
import { PassThrough } from "node:stream";
import path from "path";
import fileUpload from "express-fileupload";
import { writeFile } from "fs/promises";
import cors from "cors";
import { writeFileSync } from "fs";
// import openai from "./third_party/openai";
// import deepgram from "./third_party/deepgram";
// import { devMiddleware, hotMiddleware } from "../webpack.config";

const app = express();

// app.use(devMiddleware as typeof hotMiddleware);
// app.use(hotMiddleware);

app.options("*", cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(
  express.static("public", {
    setHeaders: function (res, path) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    },
  })
);

app.get("/test", async (req, res) => {
  res.json({ hey: "This is a cool test :^)" });
});

app.get("/jontest", async (req, res) => {
  res.json({ jon: "This is my first commit" });
});

app.use(
  express.static("dist", {
    setHeaders: function (res, path) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    },
  })
);

app.post("/rawGPT", async (req, res) => {
  try {
    const response = await openai.createChatCompletion(
      {
        model: "gpt-3.5-turbo",
        temperature: 0.0,
        messages: req.body,
        stream: true,
      },
      { responseType: "stream" }
    );

    let output = "";

    const nodeStream: NodeJS.ReadableStream =
      response.data as unknown as NodeJS.ReadableStream;
    const reader = readline.createInterface({
      input: nodeStream,
      output: new PassThrough(),
    });
    reader.on("line", (line) => {
      if (line) {
        try {
          const json = JSON.parse(line.substring(6));
          const delta = json.choices[0].delta.content;
          output += delta ? delta : "";
          res.write(delta ? delta : "");
        } catch (e) {}
      }
    });

    reader.on("close", () => {
      res.end();
    });
  } catch (e) {
    res.end();
  }
});

app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);

app.post("/transcribe", async (req, res) => {
  const audioFile = (req as any).files.audioFile;
  // audioFile.
  console.log("Transcribing...");
  const transcribed = await deepgram.transcription.preRecorded(
    { buffer: audioFile.data, mimetype: audioFile.mimetype },
    {
      punctuate: true,
    }
  );
  console.log("Done!");
  await writeFile("transcription.json", JSON.stringify(transcribed));
  res.json(transcribed);
});

app.post("/upload/:file", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  writeFileSync(req.params.file, req.body.content);
  res.send();
});

app.use(
  "/ffmpeg",
  express.static("node_modules/@ffmpeg", {
    setHeaders: function (res, path) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    },
  })
);

app.use(
  "/mermaid",
  express.static("node_modules/mermaid/dist", {
    setHeaders: function (res, path) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    },
  })
);

app.get("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.sendFile(path.resolve("public", "index.html"));
});

export default app;
