#!/usr/bin/env tsx

/**
 * Groq MCP Demo Script (TypeScript)
 * 
 * Demonstrates using the Groq Responses API with Remote MCP servers.
 * This script shows:
 * - Initializing OpenAI SDK with Groq base URL
 * - Configuring MCP servers (Huggingface, Firecrawl)
 * - Discovering available tools
 * - Making requests with MCP tool support
 * - Handling tool calls and responses
 * 
 * Usage:
 *   GROQ_API_KEY=gsk_... tsx scripts/groq_mcp_demo.ts
 * 
 * Optional:
 *   FIRECRAWL_API_KEY=fc-... tsx scripts/groq_mcp_demo.ts
 */

import OpenAI from "openai";

// Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_GROQ_MODEL = process.env.DEFAULT_GROQ_MODEL || "llama-3.3-70b-versatile";
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// Validate required configuration
if (!GROQ_API_KEY) {
  console.error("❌ Error: GROQ_API_KEY environment variable is required");
  console.error("   Get your API key from https://console.groq.com/keys");
  console.error("   Usage: GROQ_API_KEY=gsk_... tsx scripts/groq_mcp_demo.ts");
  process.exit(1);
}

// Initialize OpenAI client with Groq base URL
const client = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

console.log("🚀 Groq MCP Demo - TypeScript");
console.log("=" .repeat(60));
console.log(`Model: ${DEFAULT_GROQ_MODEL}`);
console.log(`Groq API: Configured ✓`);

// Define MCP servers
interface MCPServer {
  type: string;
  server_url: string;
  headers?: Record<string, string>;
}

const tools: MCPServer[] = [
  {
    type: "mcp",
    server_url: "https://huggingface.co/mcp"
  }
];

console.log(`Huggingface MCP: Enabled ✓`);

// Conditionally add Firecrawl if API key is available
if (FIRECRAWL_API_KEY) {
  tools.push({
    type: "mcp",
    server_url: "https://mcp.firecrawl.dev/",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`
    }
  });
  console.log(`Firecrawl MCP: Enabled ✓`);
} else {
  console.log(`Firecrawl MCP: Disabled (no API key)`);
}

console.log("=" .repeat(60));
console.log();

/**
 * Demo 1: Simple chat completion without MCP tools
 */
async function demo1_SimpleCompletion() {
  console.log("📝 Demo 1: Simple Chat Completion (No MCP)");
  console.log("-" .repeat(60));

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: "user", content: "Write a 4-line rap verse about artificial intelligence." }
      ],
      max_tokens: 150,
    });

    console.log("Response:");
    console.log(response.choices[0].message.content);
    console.log();
    console.log(`✓ Completed in ${response.usage?.total_tokens || 0} tokens`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.status === 401) {
      console.error("   Check your GROQ_API_KEY");
    }
  }
  console.log();
}

/**
 * Demo 2: Chat completion with MCP tools
 */
async function demo2_MCPCompletion() {
  console.log("🔧 Demo 2: Chat Completion with MCP Tools");
  console.log("-" .repeat(60));

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { 
          role: "user", 
          content: "What are some popular open-source language models on Hugging Face? List 3 with brief descriptions." 
        }
      ],
      tools: tools as any,
      max_tokens: 500,
    });

    const message = response.choices[0].message;

    // Show reasoning (if any)
    if (message.content) {
      console.log("Model Reasoning:");
      console.log(message.content);
      console.log();
    }

    // Show tool calls (if any)
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log("🔧 MCP Tool Calls:");
      message.tool_calls.forEach((toolCall: any, index: number) => {
        console.log(`\n  ${index + 1}. ${toolCall.function?.name || toolCall.type}`);
        if (toolCall.function?.arguments) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`     Arguments:`, JSON.stringify(args, null, 2).split('\n').join('\n     '));
          } catch {
            console.log(`     Arguments: ${toolCall.function.arguments}`);
          }
        }
      });
      console.log();
    }

    // Show final message
    console.log("Final Message:");
    console.log(JSON.stringify(message, null, 2));
    console.log();
    console.log(`✓ Completed in ${response.usage?.total_tokens || 0} tokens`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.status === 401) {
      console.error("   Check your GROQ_API_KEY");
    } else if (error.status === 424) {
      console.error("   MCP server dependency failed");
      console.error("   Check that MCP servers are reachable");
    }
  }
  console.log();
}

/**
 * Demo 3: Discover available tools
 */
async function demo3_DiscoverTools() {
  console.log("🔍 Demo 3: Tool Discovery");
  console.log("-" .repeat(60));

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { 
          role: "user", 
          content: "What tools do you have access to? Please list them." 
        }
      ],
      tools: tools as any,
      max_tokens: 300,
    });

    console.log("Response:");
    console.log(response.choices[0].message.content);
    console.log();
    console.log(`✓ Completed in ${response.usage?.total_tokens || 0} tokens`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
  console.log();
}

/**
 * Demo 4: Firecrawl MCP (if enabled)
 */
async function demo4_FirecrawlMCP() {
  if (!FIRECRAWL_API_KEY) {
    console.log("⏭️  Demo 4: Skipped (Firecrawl not configured)");
    console.log("   Set FIRECRAWL_API_KEY to enable web scraping demo");
    console.log();
    return;
  }

  console.log("🌐 Demo 4: Firecrawl MCP Web Scraping");
  console.log("-" .repeat(60));

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { 
          role: "user", 
          content: "Can you scrape the latest news from a tech website and summarize the top story?" 
        }
      ],
      tools: tools as any,
      max_tokens: 400,
    });

    const message = response.choices[0].message;

    console.log("Response:");
    console.log(message.content || JSON.stringify(message, null, 2));
    console.log();
    console.log(`✓ Completed in ${response.usage?.total_tokens || 0} tokens`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.status === 424) {
      console.error("   Firecrawl MCP server failed");
      console.error("   Check your FIRECRAWL_API_KEY");
    }
  }
  console.log();
}

/**
 * Main execution
 */
async function main() {
  try {
    await demo1_SimpleCompletion();
    await demo2_MCPCompletion();
    await demo3_DiscoverTools();
    await demo4_FirecrawlMCP();

    console.log("=" .repeat(60));
    console.log("✅ All demos completed successfully!");
    console.log();
    console.log("Next steps:");
    console.log("  - Set FIRECRAWL_API_KEY to enable web scraping");
    console.log("  - Try different models (llama-3.1-8b-instant, etc.)");
    console.log("  - Read docs/groq-mcp.md for more information");
    console.log("=" .repeat(60));
  } catch (error: any) {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);
