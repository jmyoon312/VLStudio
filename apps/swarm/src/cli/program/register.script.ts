import type { Command } from "commander";
import { scriptCliCommand } from "../../commands/script.js";
import { defaultRuntime } from "../../runtime.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";
import { formatHelpExamples } from "../help-format.js";

export function registerScriptCommands(program: Command) {
  program
    .command("script")
    .description("Generate a YouTube script via the ScriptEngine with optional wisdom injection")
    .requiredOption("--topic <text>", "The core topic or mission for the script")
    .option("--niche <name>", "Specific niche or audience context")
    .option("--wisdom <context>", "Custom long-term wisdom or lessons to inject")
    .option("--provider <id>", "LLM provider (e.g., groq, google, openai)")
    .option("--model <id>", "LLM model id")
    .option("--json", "Output results as raw JSON", false)
    .addHelpText(
      "after",
      () =>
        `
${theme.heading("Examples:")}
${formatHelpExamples([
  ['openclaw script --topic "Top 5 AI Tools" --niche "tech"', "Basic generation."],
  [
    'openclaw script --topic "YouTube Growth" --wisdom "Always use a strong hook in the first 3 seconds."',
    "Generate with custom wisdom injection.",
  ],
  [
    'openclaw script --topic "Gaming Trends" --json',
    "Generate and output as raw JSON for machine processing.",
  ],
])}
`,
    )
    .action(async (opts: any) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await scriptCliCommand(opts, defaultRuntime);
      });
    });
}
