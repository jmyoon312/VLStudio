import { theme } from "../terminal/theme.js";
import { defaultRuntime } from "../runtime.js";

export async function scriptCliCommand(
  opts: {
    topic: string;
    niche?: string;
    wisdom?: string;
    json?: boolean;
    provider?: string;
    model?: string;
  },
  runtime = defaultRuntime,
) {
  const { topic, niche, wisdom, json, provider, model } = opts;

  if (!json) {
    console.log(theme.muted(`🤖 [OpenClaw] Requesting script generation for: ${topic}...`));
    if (wisdom) {
      console.log(theme.muted(`🧬 [Wisdom] Injecting custom intelligence context.`));
    }
  }

  try {
    // Determine backend URL (defaulting to localhost:8000 for development)
    const backendUrl = process.env.BRIDGE_API_URL || "http://localhost:8000/api/bridge";
    const targetUrl = `${backendUrl.replace("/api/bridge", "")}/api/script/generate`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_text: topic,
        niche: niche,
        wisdom: wisdom,
        provider: provider || "groq",
        model: model || "groq/llama-3.3-70b-versatile"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(theme.success("\n✅ Script Generated Successfully!\n"));
      console.log(theme.heading("--- CONTENT ---"));
      console.log(result.script);
      console.log(theme.heading("---------------"));
      console.log(theme.muted(`\nModel Used: ${result.model_used}`));
      if (result.warning) {
        console.log(theme.warn(`⚠️ Warning: ${result.warning}`));
      }
    }
  } catch (error: any) {
    if (json) {
      console.log(JSON.stringify({ status: "error", message: error.message }));
    } else {
      console.error(theme.error(`❌ Script Generation Failed: ${error.message}`));
    }
    process.exit(1);
  }
}
