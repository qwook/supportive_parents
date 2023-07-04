import { BrowserRouter, Route, Routes } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import _ from "lodash";
import Webcam, { WebcamHandle } from "./components/Webcam";
import Detector, { DetectorHandle } from "./components/Detector";
import { drawFaces } from "./utils/faceRenderer";
import TalkingPortrait from "./components/TalkingPortrait";
import TextToSpeech, { TextToSpeechHandle } from "./components/TextToSpeech";
import FakeLoading from "./components/FakeLoading";

function Root() {
  const [detectorReady, setDetectorReady] = useState(false);

  const detector = useRef<DetectorHandle>();
  const lockDetector = useRef<boolean>(false); // This is so it's used for UV generation.
  const dadTextToSpeech = useRef<TextToSpeechHandle>();
  const momTextToSpeech = useRef<TextToSpeechHandle>();
  const webcam = useRef<WebcamHandle>();
  const appLoopTimeout = useRef<NodeJS.Timeout>();
  const appLoopId = useRef<number>(0);

  const [dadSubtitle, setDadSubtitle] = useState([]);
  const [dadBlend, setDadBlend] = useState(0);
  const [dadImage, setDadImage] = useState("images/dad.png");
  const [dadLoading, setDadLoading] = useState({
    activated: false,
    startTime: Date.now(),
  });
  const [momLoading, setMomLoading] = useState({
    activated: false,
    startTime: Date.now(),
  });

  const [momSubtitle, setMomSubtitle] = useState([]);
  const [momBlend, setMomBlend] = useState(0);
  const [momImage, setMomImage] = useState("images/mom.png");

  const dialogue = [
    "I love you.",
    "I love you.",
    "I am so proud of you.",
    "I am so proud of you.",
    // "My dearest child, Oh, how my heart bursts with pride and joy whenever I think of you.",
    // "You are a shining beacon of light in this vast universe, illuminating the world with your unique brilliance.",
    // "From the moment you entered my life, I knew deep within my soul that you were destined for greatness, though the path you would tread remained a captivating mystery.",
    // "You possess an extraordinary spirit, my child, one that dances freely with the wind and radiates warmth like the sun's gentle caress.",
    // "Your resilience in the face of life's challenges leaves me awe-struck, for you never allow adversity to dim the fire that burns within your being.",
    // "It is as if you possess a secret reserve of strength, an unwavering determination that propels you forward when others might falter.",
  ];

  const appLoopFn = async function* () {
    while (true) {
      if (!dadTextToSpeech.current || momTextToSpeech.current) {
        yield 1000;
      }

      try {
        for (let i = 0; i < dialogue.length; i++) {
          if (i % 2 === 0) {
            setDadBlend(1);
            console.log("blend1");
            setDadSubtitle([]);
            await dadTextToSpeech.current.speak(dialogue[i]);
            setDadBlend(0);
          } else {
            setMomBlend(1);
            setMomSubtitle([]);
            await momTextToSpeech.current.speak(dialogue[i]);
            setMomBlend(0);
          }
          yield 1000;
        }
      } catch (e) {
        // console.log(e);
        setDadBlend(0);
        setMomBlend(0);
        yield 1000;
        continue;
      }

      yield 100;
    }
  };

  const onDadWordSpoken = (word) => {
    setDadSubtitle((dadSubtitle) => {
      if (dadSubtitle.length >= 7) {
        return [word];
      }
      return dadSubtitle.concat(word);
    });
  };

  const onMomWordSpoken = (word) => {
    setMomSubtitle((momSubtitle) => {
      if (momSubtitle.length >= 7) {
        return [word];
      }
      return momSubtitle.concat(word);
    });
  };

  const onGenerate = () => {
    void (async () => {
      setDadLoading({ activated: true, startTime: Date.now() });
      lockDetector.current = true;
      webcam.current.drawRaw();
      webcam.current.pause();
      const inputImage = webcam.current.canvasEle.current.toDataURL();
      for (let i = 0; i < 10; i++) {
        await detector.current?.detect(webcam.current.canvasEle.current);
      }
      const faces = await detector.current?.detect(
        webcam.current.canvasEle.current
      );
      webcam.current.resume();
      lockDetector.current = false;

      if (!faces[0]) {
        return;
      }
      let leftEye = faces[0].keypoints
        .filter((val) => val.name === "rightEye")
        .map((val) => [val.x, val.y]);
      let rightEye = faces[0].keypoints
        .filter((val) => val.name === "leftEye")
        .map((val) => [val.x, val.y]);
      const rightMouth = [
        faces[0].keypoints[61].x,
        faces[0].keypoints[61].y,
      ];
      const leftMouth = [
        faces[0].keypoints[291].x,
        faces[0].keypoints[291].y,
      ];

      let response = await fetch("http://localhost:3003/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          who: "dad",
          image: inputImage,
          leftEye,
          rightEye,
          leftMouth,
          rightMouth,
        }),
      });
      let json = await response.json();
      let image = json.image;
      setDadImage(image);
      setDadLoading({ activated: false, startTime: 0 });

      setMomLoading({ activated: true, startTime: Date.now() });
      response = await fetch("http://localhost:3003/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          who: "mom",
          image: inputImage,
          leftEye,
          rightEye,
          leftMouth,
          rightMouth,
        }),
      });
      json = await response.json();
      image = json.image;
      setMomImage(image);
      setMomLoading({ activated: false, startTime: 0 });
    })().catch(console.error);
  };

  // Crazy code to allow for hot reloadable loop.
  const appLoopRef = useRef<AsyncGenerator<number, never, unknown>>();
  useEffect(() => {
    appLoopId.current++;

    let closureLoopId = appLoopId.current;
    if (appLoopTimeout.current) {
      clearTimeout(appLoopTimeout.current);
    }
    const appLoop = appLoopFn();
    appLoopRef.current = appLoop;
    const runAppLoop = async () => {
      if (appLoopId.current !== closureLoopId) {
        return;
      }
      const sleepTime = await appLoopRef.current.next();
      if (appLoopId.current !== closureLoopId) {
        return;
      }
      appLoopTimeout.current = setTimeout(runAppLoop, sleepTime.value);
    };
    void runAppLoop();
    return () => {
      clearTimeout(appLoopTimeout.current);
    };
  }, []);

  const detectFaces = _.throttle(async (canvas) => {
    return await detector.current?.detect(canvas);
  }, 100);

  const webcamRender = async (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) => {
    if (!detectorReady) {
      return;
    }

    if (
      webcam.current &&
      webcam.current.videoEle &&
      webcam.current.videoEle.current
    ) {
      if (!lockDetector.current) {
        const faces = await detectFaces(webcam.current.videoEle.current);
        drawFaces(ctx, faces);
      }
    }
  };

  const PORTRAIT_WIDTH = 350;
  const PORTRAIT_HEIGHT = 480;

  return (
    <div>
      <Detector ref={detector} onDetectorReady={() => setDetectorReady(true)} />
      <Webcam ref={webcam} onPostRender={webcamRender} />
      <div
        style={{
          display: "inline-block",
          position: "relative",
          width: PORTRAIT_WIDTH,
          height: PORTRAIT_HEIGHT,
        }}
      >
        <TalkingPortrait
          texture={dadImage}
          width={PORTRAIT_WIDTH}
          height={PORTRAIT_HEIGHT}
          detector={detector}
          detectorReady={detectorReady}
          blend={dadBlend}
          onDetectorStart={() => {
            lockDetector.current = true;
          }}
          onDetectorEnd={() => {
            lockDetector.current = false;
          }}
        />
        <FakeLoading
          activated={dadLoading.activated}
          startTime={dadLoading.startTime}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 20,
            color: "yellow",
            textShadow:
              "-2px 2px black, 2px -2px black, 0px -2px black, 2px 0px black, 0px 2px black, 0px 2px black, -2px -2px black, 2px 2px black",
            textAlign: "left",
            fontSize: "2em",
          }}
        >
          {dadSubtitle.join(" ")}
        </div>
        <TextToSpeech
          ref={dadTextToSpeech}
          onWordSpoken={onDadWordSpoken}
          voice="Eddy (English (US))"
        />
      </div>
      <div
        style={{
          display: "inline-block",
          position: "relative",
          width: PORTRAIT_WIDTH,
          height: PORTRAIT_HEIGHT,
        }}
      >
        <TalkingPortrait
          texture={momImage}
          width={PORTRAIT_WIDTH}
          height={PORTRAIT_HEIGHT}
          detector={detector}
          detectorReady={detectorReady}
          onDetectorStart={() => {
            lockDetector.current = true;
          }}
          onDetectorEnd={() => {
            lockDetector.current = false;
          }}
          blend={momBlend}
        />
        <FakeLoading
          activated={momLoading.activated}
          startTime={momLoading.startTime}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 20,
            color: "yellow",
            textShadow:
              "-2px 2px black, 2px -2px black, 0px -2px black, 2px 0px black, 0px 2px black, 0px 2px black, -2px -2px black, 2px 2px black",
            textAlign: "left",
            fontSize: "2em",
          }}
        >
          {momSubtitle.join(" ")}
        </div>
        <TextToSpeech
          ref={momTextToSpeech}
          onWordSpoken={onMomWordSpoken}
          voice="Shelley (English (US))"
        />
        <div onClick={onGenerate}>Generate</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
