import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "../config/config.js";
import { VERSION } from "../version.js";
import { runCli } from "../cli/run-main.js";
import { generateVideo } from "../video-generation/runtime.js";
import { resolveAgentRunContext } from "../agents/command/run-context.js";

/**
 * OpenClaw Limb MCP Server (Native Implementation)
 * Exposes internal agent orchestration and production logic directly.
 */

export async function serveOpenClawLimbMcp(): Promise<void> {
  const server = new McpServer(
    { name: "openclaw-limb-native", version: VERSION }
  );

  // Tool 1: produce_video (High-level Swarm Orchestration)
  server.tool(
    "produce_video",
    "Orchestrate an autonomous agent swarm to produce a viral video on a specific topic. (Native)",
    {
      topic: { type: "string", description: "The topic or niche for the video." },
      format: { type: "string", enum: ["shorts", "long"], default: "shorts" },
    },
    async (args) => {
      const topic = args.topic as string;
      const format = args.format || "shorts";
      
      console.error(`[MCP-Limb] Native Dispatch: ${topic} (${format})`);
      
      try {
        await runCli([
          process.argv[0],
          "openclaw.mjs",
          "agent",
          "--message", `MISSION: Produce a ${format} video on ${topic}`
        ]);

        return {
          content: [{ type: "text", text: `Production mission for '${topic}' initiated successfully via native engine.` }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Native Execution Error: ${error.message}` }],
        };
      }
    }
  );

  // Tool 2: generate_script (Granular Scripting Control)
  server.tool(
    "generate_script",
    "Directly invoke the ScriptEngine to generate a video script for a specific topic/niche.",
    {
      topic: { type: "string", description: "The core topic of the script." },
      niche: { type: "string", description: "The specific niche or audience." },
      wisdom_context: { type: "string", description: "Past successes and lessons to incorporate into the script." },
    },
    async (args) => {
      const topic = args.topic as string;
      const niche = args.niche as string;
      const wisdom = (args.wisdom_context as string) || "";

      try {
        const output: string[] = [];
        const originalLog = console.log;
        console.log = (msg) => output.push(msg);
        
        await runCli([
          process.argv[0],
          "openclaw.mjs",
          "script",
          "--topic", topic,
          "--niche", niche,
          ...(wisdom ? ["--wisdom", wisdom] : [])
        ]);

        console.log = originalLog;
        const scriptJson = output.join("\n");

        return {
          content: [{ type: "text", text: scriptJson || `Script for '${topic}' generated with wisdom.` }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Script Generation Error: ${error.message}` }],
        };
      }
    }
  );

  // Tool 3: render_layers (Granular Rendering Control)
  server.tool(
    "render_layers",
    "Invoke the VideoEngine to render specific script segments or visual prompts.",
    {
      prompt: { type: "string", description: "The visual prompt or script segment to render." },
      durationSeconds: { type: "number", default: 5 },
      aspect_ratio: { type: "string", enum: ["9:16", "16:9", "1:1"], default: "9:16" },
    },
    async (args) => {
      const prompt = args.prompt as string;
      const durationSeconds = (args.durationSeconds as number) || 5;
      const aspectRatio = (args.aspect_ratio as string) || "9:16";

      try {
        const config = await loadConfig();
        const result = await generateVideo({
          cfg: config,
          prompt,
          durationSeconds,
          aspectRatio: aspectRatio,
          agentDir: process.cwd()
        });

        return {
          content: [{ type: "text", text: `Layer render complete. Total Assets: ${result.videos.length}` }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Render Error: ${error.message}` }],
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  
  let shuttingDown = false;
  let resolveClosed!: () => void;
  const closed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    transport["onclose"] = undefined;
    server.close().then(resolveClosed, resolveClosed);
  };

  transport["onclose"] = shutdown;
  process.stdin.once("end", shutdown);
  process.stdin.once("close", shutdown);
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  console.error("🚀 [OpenClaw MCP] Native Sovereign Limb active.");
  
  await server.connect(transport);
  await closed;
}
