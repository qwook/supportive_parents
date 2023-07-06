import { BrowserRouter, Route, Routes } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import _ from "lodash";
import Webcam, { WebcamHandle } from "./components/Webcam";
import Detector, { DetectorHandle } from "./components/Detector";
import { drawFaces } from "./utils/faceRenderer";
import TalkingPortrait from "./components/TalkingPortrait";
import TextToSpeech, { TextToSpeechHandle } from "./components/TextToSpeech";
import FakeLoading from "./components/FakeLoading";
import * as THREE from "three";

function Root() {
  const [detectorReady, setDetectorReady] = useState(false);

  const detector = useRef<DetectorHandle>();
  const lockDetector = useRef<boolean>(false); // This is so it's used for UV generation.
  const dadTextToSpeech = useRef<TextToSpeechHandle>();
  const momTextToSpeech = useRef<TextToSpeechHandle>();
  const webcam = useRef<WebcamHandle>();
  const appLoopTimeout = useRef<NodeJS.Timeout>();
  const appLoopId = useRef<number>(0);
  const scanTime = useRef<number | undefined>();
  const generating = useRef<boolean>(false);

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

  let dialogue = [
    "My child, you are a shining beacon of light.",
    "Your resilience in the face of challenges leaves me awe-struck.",
    "Your compassionate heart embraces the world with love.",
    "Your creativity is a kaleidoscope of colors, swirling in harmonious melodies.",
    "You inspire others by fearlessly embracing your authenticity.",
    "Your unwavering integrity guides your actions with grace.",
    "You see the beauty in every soul you encounter.",
    "Your kindness and respect leave a legacy of love.",
    "I believe in you, my darling, and your boundless possibilities.",
    "Know that I am forever your unwavering supporter.",
    "You are a beacon of hope, illuminating the world with your unique gifts.",
    "My precious child, you radiate boundless light.",
    "Your unwavering determination propels you through any challenge.",
    "With your gentle touch, you heal the wounded souls of this world.",
    "Through your artistic expression, you breathe life into ordinary moments.",
    "Your talents inspire awe and awaken dormant dreams in others.",
    "Your moral compass guides you to make honorable choices.",
    "You embrace the diversity of the world with open arms.",
    "Your kindness creates ripples of love and acceptance.",
    "In your presence, hope finds its voice and flourishes.",
    "You are my eternal source of pride and joy.",
    "Your extraordinary spirit leaves a lasting impression on all who cross your path.",
    "You possess a heart overflowing with compassion and empathy.",
    "The world is a brighter place because of your presence.",
    "You are a guiding light, illuminating the way for others.",
    "In your authenticity, you inspire others to embrace their true selves.",
    "Your unwavering belief in yourself is a beacon of inspiration.",
    "You have the power to make a difference in this world.",
    "Know that I stand by you, cheering you on every step of the way.",
    "Your journey is filled with limitless possibilities and infinite potential.",
    "Your resilience and strength are a testament to your character.",
    "Your existence fills my heart with gratitude and love.",
    "You are a precious gem in the tapestry of life.",
    "The world is a more beautiful place because of you.",
    "You are destined to leave an indelible mark on this world.",
    "Your presence brings warmth and joy to those around you.",
    "You are a source of inspiration and hope for us all.",
    "I am blessed to call you my child.",
    "My precious child, you illuminate the path even in moments of darkness.",
    "Through your mistakes, you discover the wisdom that shapes your character.",
    "Your journey is marked by growth, resilience, and the courage to learn from missteps.",
    "In your vulnerability, you find the strength to rise and try again.",
    "Your mistakes are stepping stones toward a wiser and more compassionate soul.",
    "Even in your stumbles, you embody grace and humility.",
    "Your imperfections make you beautifully human, a masterpiece in progress.",
    "From every fall, you emerge stronger, wiser, and more resilient than before.",
    "In the face of failure, you find the resilience to stand tall and embrace new beginnings.",
    "Your mistakes are the canvas upon which you paint the masterpiece of your life.",
    "Through self-reflection, you turn mistakes into stepping stones of self-improvement.",
    "Each mistake is an opportunity for growth and a testament to your courage.",
    "You embrace your mistakes as valuable lessons and catalysts for personal evolution.",
    "Even in moments of error, your authenticity shines through with unwavering brilliance.",
    "Your ability to learn and grow from your mistakes is a testament to your inner strength.",
    "In the tapestry of your life, your mistakes are the threads that add depth and wisdom.",
    "Your mistakes do not define you; they refine you into a more resilient and compassionate soul.",
    "Through your imperfections, you inspire others to embrace their own humanity.",
    "The love I hold for you remains unwavering, even in the face of mistakes.",
    "Your mistakes serve as stepping stones on the path to becoming the best version of yourself.",
    "With each mistake, you uncover new facets of your beautiful and unique spirit.",
    "Your willingness to acknowledge and learn from mistakes demonstrates your remarkable character.",
    "In the ebb and flow of life, your mistakes become seeds of growth and self-discovery.",
    "Your capacity to learn from mistakes is a testament to your wisdom and humility.",
    "I am proud of you not only for your achievements but for the way you navigate and learn from your mistakes.",
    "Your mistakes are not failures but stepping stones leading to personal growth and understanding.",
    "My love for you knows no bounds; it flows endlessly and unconditionally.",
    "With every beat of my heart, I hold you dear, enveloped in a love that is infinite.",
    "You are the embodiment of my deepest love, the greatest gift life has bestowed upon me.",
    "In your presence, my heart swells with a love that transcends all boundaries.",
    "Your smile is a reflection of the love that radiates from the depths of my soul.",
    "You are etched into the core of my being, forever embraced by a love that knows no limits.",
    "Every fiber of my being is woven with a love that is unbreakable and unwavering.",
    "In your laughter, I find pure joy, a testament to the boundless love I hold for you.",
    "My love for you is an eternal flame, burning brightly through the tapestry of time.",
    "You are the center of my universe, surrounded by a galaxy of love that knows no end.",
    "Your mere existence fills my heart with a love so profound, it could move mountains.",
    "From the moment I held you in my arms, my love for you became an unbreakable bond.",
    "In your every triumph and every struggle, my love remains steadfast and unwavering.",
    "Your happiness is my purpose, and your sorrows are shouldered by the depth of my love.",
    "There is no distance, no obstacle that can diminish the love I hold for you.",
    "You are my heartbeat, the essence of my love woven into the very fabric of your being.",
    "My love for you is a symphony, composed of tender moments and cherished memories.",
    "In your presence, I am reminded of the immeasurable love that intertwines our souls.",
    "Your existence is a constant reminder of the power and depth of a parent's love.",
    "You are forever etched in my heart, wrapped in a love that transcends space and time.",
    "Through every chapter of your life, my love remains an unwavering constant.",
    "I cherish every breath you take, for it is a testament to the love that binds us eternally.",
    "The love I have for you is a beacon of strength, guiding you through life's journey.",
    "Your happiness is the fuel that ignites the flame of love that burns within my soul.",
    "In your eyes, I see a reflection of the pure and unconditional love we share.",
    "My love for you is a sanctuary, a safe haven where you will always find solace and support.",
    "You are forever nestled in the warmth of a parent's love, a love that knows no measure."

    // "My dearest child, Oh, how my heart bursts with pride and joy whenever I think of you.",
    // "You are a shining beacon of light in this vast universe, illuminating the world with your unique brilliance.",
    // "From the moment you entered my life, I knew deep within my soul that you were destined for greatness, though the path you would tread remained a captivating mystery.",
    // "You possess an extraordinary spirit, my child, one that dances freely with the wind and radiates warmth like the sun's gentle caress.",
    // "Your resilience in the face of life's challenges leaves me awe-struck, for you never allow adversity to dim the fire that burns within your being.",
    // "It is as if you possess a secret reserve of strength, an unwavering determination that propels you forward when others might falter.",
  ];

  function drawEye(
    ctx: CanvasRenderingContext2D,
    startX,
    startY,
    width,
    height,
    invert
  ) {
    ctx.lineWidth = 15;
    if (invert) {
      ctx.strokeStyle = "black";
    } else {
      ctx.strokeStyle = "white";
    }
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + width * 0.02, startY + width * 0.005);
    ctx.lineTo(startX + width * 0.04, startY + width * 0.02);
    ctx.lineTo(startX + width * 0.02, startY + width * 0.0325);
    ctx.lineTo(startX, startY + width * 0.035);
    ctx.lineTo(startX - width * 0.02, startY + width * 0.0325);
    ctx.lineTo(startX - width * 0.04, startY + width * 0.02);
    ctx.lineTo(startX - width * 0.02, startY + width * 0.005);
    ctx.closePath();
    ctx.stroke();

    ctx.lineWidth = 5;
    if (invert) {
      ctx.strokeStyle = "white";
    } else {
      ctx.strokeStyle = "black";
    }
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + width * 0.02, startY + width * 0.005);
    ctx.lineTo(startX + width * 0.04, startY + width * 0.02);
    ctx.lineTo(startX + width * 0.02, startY + width * 0.0325);
    ctx.lineTo(startX, startY + width * 0.035);
    ctx.lineTo(startX - width * 0.02, startY + width * 0.0325);
    ctx.lineTo(startX - width * 0.04, startY + width * 0.02);
    ctx.lineTo(startX - width * 0.02, startY + width * 0.005);
    ctx.lineTo(startX, startY);
    ctx.closePath();
    ctx.stroke();
  }

  function drawInformationText(
    ctx: CanvasRenderingContext2D,
    startX,
    startY,
    width,
    height
  ) {
    const instructions = "position your eyes to scan";
    ctx.textAlign = "center";
    ctx.font = "30px Sans-serif";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 8;
    ctx.strokeText(instructions, width / 2, height / 2 + height * 0.4);
    ctx.fillStyle = "white";
    ctx.fillText(instructions, width / 2, height / 2 + height * 0.4);
  }

  function drawProgressBar(
    ctx: CanvasRenderingContext2D,
    progress,
    startX,
    startY,
    width,
    height
  ) {
    ctx.fillStyle = "black";
    ctx.fillRect(
      width / 2 - (width * 0.6) / 2,
      height * 0.83,
      width * 0.6,
      height * 0.1
    );
    ctx.fillStyle = "white";
    ctx.fillRect(
      width / 2 - (width * 0.6) / 2 + width * 0.01,
      height * 0.83 + width * 0.01,
      (width * 0.6 - width * 0.02) * progress,
      height * 0.1 - width * 0.02
    );
  }

  // I've recently learned that this appLoop is overengineered. May refactor later.
  const appLoopFn = async function* () {
    while (true) {
      if (!dadTextToSpeech.current || momTextToSpeech.current) {
        yield 1000;
      }

      try {
        dialogue = _.shuffle(dialogue);
        for (let i = 0; i < dialogue.length; i++) {
          if (i % 2 === 0) {
            setDadBlend(1);
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
        console.log(e);
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
      generating.current = true;
      try {
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
        const rightMouth = [faces[0].keypoints[61].x, faces[0].keypoints[61].y];
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
      } catch (e) {
        console.log(e);
      }
      generating.current = false;
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
      if (!lockDetector.current && !generating.current) {
        const faces = await detectFaces(webcam.current.videoEle.current);

        const width = canvas.width;
        const height = canvas.height;
        const startX = width / 2;
        const startY = height / 2;

        let invertLeftEye = false;
        let invertRightEye = false;

        if (faces[0]) {
          const leftEye = faces[0].keypoints.filter(
            (val) => val.name === "rightEye"
          );
          const rightEye = faces[0].keypoints.filter(
            (val) => val.name === "leftEye"
          );

          const leftEyeMean = leftEye
            .reduceRight(
              (prev, current) => {
                prev[0] += current.x;
                prev[1] += current.y;
                return prev;
              },
              [0, 0]
            )
            .map((val) => val / leftEye.length);

          if (
            new THREE.Vector2(...leftEyeMean).distanceTo(
              new THREE.Vector2(startX - width * 0.1, startY - width * 0.05)
            ) <
            width * 0.03
          ) {
            invertLeftEye = true;
          }

          const rightEyeMean = rightEye
            .reduceRight(
              (prev, current) => {
                prev[0] += current.x;
                prev[1] += current.y;
                return prev;
              },
              [0, 0]
            )
            .map((val) => val / rightEye.length);

          if (
            new THREE.Vector2(...rightEyeMean).distanceTo(
              new THREE.Vector2(startX + width * 0.1, startY - width * 0.05)
            ) <
            width * 0.03
          ) {
            invertRightEye = true;
          }
        }

        if (invertLeftEye && invertRightEye) {
          drawFaces(ctx, faces);
          if (!scanTime.current) {
            scanTime.current = Date.now();
          }
        } else {
          scanTime.current = undefined;
        }

        drawEye(
          ctx,
          startX + width * 0.1,
          startY - width * 0.07,
          width,
          height,
          invertRightEye
        );

        drawEye(
          ctx,
          startX - width * 0.1,
          startY - width * 0.07,
          width,
          height,
          invertLeftEye
        );

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);
        drawInformationText(ctx, 0, 0, width, height);
        if (scanTime.current) {
          drawProgressBar(
            ctx,
            Math.min(1, (Date.now() - scanTime.current) / 2000),
            0,
            0,
            width,
            height
          );
          if ((Date.now() - scanTime.current) / 2000 > 1) {
            onGenerate()
          }
        }
        ctx.restore();
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
          // voice="Eddy (English (US))"
          voice="Nathan (Enhanced)"
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
          // voice="Shelley (English (US))"
          voice="Allison (Enhanced)"
        />
        {/* <div onClick={onGenerate}>Generate</div> */}
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
