
export async function write(fileName: string, content: string) {
    await fetch("http://localhost:3001/upload/" + fileName, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
  }
