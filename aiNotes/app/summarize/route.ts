import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { text } = await request.json();

  // Call your Hugging Face API here
  const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: text })
  });

  const data = await response.json();

  return NextResponse.json(data);
}
