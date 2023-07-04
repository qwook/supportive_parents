import { PassThrough } from "stream";

function ReadChunks(reader) {
  return {
    async *[Symbol.asyncIterator]() {
      let readResult = await reader.read();
      while (!readResult.done) {
        yield readResult.value;
        readResult = await reader.read();
      }
    },
  };
}

type PromptMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
type Prompt = Array<PromptMessage>;

export default function RunLLM(prompt: Prompt) {
  return {
    async *[Symbol.asyncIterator]() {
      const response = await fetch("/rawGPT", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prompt),
      });
      const reader = response.body?.getReader();
      for await (const chunk of ReadChunks(reader)) {
        const text = new TextDecoder().decode(chunk);
        yield text;
      }
    },
  };
}

export function RunLLMStream(prompt: Prompt) {
  const llmStream = new PassThrough();
  let text = "";
  void (async () => {
    for await (const delta of RunLLM(prompt)) {
      text += delta;
      llmStream.push(delta);
    }
    llmStream.end();
  })();
  return llmStream;
}
