import React, { useEffect, useState } from "react";

export default function FakeLoading({ activated, startTime, ...args }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(Math.min(100, (Date.now() - startTime) / 20000 * 100));
    }, 10);
    return () => clearInterval(interval);
  });

  return (
    <div style={{}} {...args}>
      <div
        style={{
          display: activated ? "block" : "none",
          background: "rgba(0, 0, 0, 0.5)",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{
            background: "rgba(0, 0, 0, 0.6)",
            width: `${progress}%`,
            height: "100%",
          }}
        ></div>
      </div>
    </div>
  );
}
