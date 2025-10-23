#!/usr/bin/env python3

"""
Groq MCP Demo Script (Python)

Demonstrates using the Groq Responses API with Remote MCP servers.
This script shows:
- Initializing OpenAI SDK with Groq base URL
- Configuring MCP servers (Huggingface, Firecrawl)
- Discovering available tools
- Making requests with MCP tool support
- Handling tool calls and responses

Usage:
    GROQ_API_KEY=gsk_... python scripts/groq_mcp_demo.py

Optional:
    FIRECRAWL_API_KEY=fc-... python scripts/groq_mcp_demo.py
"""

import os
import sys
import json
from openai import OpenAI

# Configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
DEFAULT_GROQ_MODEL = os.environ.get("DEFAULT_GROQ_MODEL", "llama-3.3-70b-versatile")
FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY")

# Validate required configuration
if not GROQ_API_KEY:
    print("❌ Error: GROQ_API_KEY environment variable is required", file=sys.stderr)
    print("   Get your API key from https://console.groq.com/keys", file=sys.stderr)
    print("   Usage: GROQ_API_KEY=gsk_... python scripts/groq_mcp_demo.py", file=sys.stderr)
    sys.exit(1)

# Initialize OpenAI client with Groq base URL
client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
)

print("🚀 Groq MCP Demo - Python")
print("=" * 60)
print(f"Model: {DEFAULT_GROQ_MODEL}")
print("Groq API: Configured ✓")

# Define MCP servers
tools = [
    {
        "type": "mcp",
        "server_url": "https://huggingface.co/mcp"
    }
]

print("Huggingface MCP: Enabled ✓")

# Conditionally add Firecrawl if API key is available
if FIRECRAWL_API_KEY:
    tools.append({
        "type": "mcp",
        "server_url": "https://mcp.firecrawl.dev/",
        "headers": {
            "Authorization": f"Bearer {FIRECRAWL_API_KEY}"
        }
    })
    print("Firecrawl MCP: Enabled ✓")
else:
    print("Firecrawl MCP: Disabled (no API key)")

print("=" * 60)
print()


def demo1_simple_completion():
    """Demo 1: Simple chat completion without MCP tools"""
    print("📝 Demo 1: Simple Chat Completion (No MCP)")
    print("-" * 60)

    try:
        response = client.chat.completions.create(
            model=DEFAULT_GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": "Write a 4-line rap verse about artificial intelligence."
                }
            ],
            max_tokens=150,
        )

        print("Response:")
        print(response.choices[0].message.content)
        print()
        print(f"✓ Completed in {response.usage.total_tokens if response.usage else 0} tokens")
    except Exception as error:
        print(f"❌ Error: {error}", file=sys.stderr)
        if hasattr(error, 'status_code') and error.status_code == 401:
            print("   Check your GROQ_API_KEY", file=sys.stderr)
    print()


def demo2_mcp_completion():
    """Demo 2: Chat completion with MCP tools"""
    print("🔧 Demo 2: Chat Completion with MCP Tools")
    print("-" * 60)

    try:
        response = client.chat.completions.create(
            model=DEFAULT_GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": "What are some popular open-source language models on Hugging Face? List 3 with brief descriptions."
                }
            ],
            tools=tools,
            max_tokens=500,
        )

        message = response.choices[0].message

        # Show reasoning (if any)
        if message.content:
            print("Model Reasoning:")
            print(message.content)
            print()

        # Show tool calls (if any)
        if message.tool_calls and len(message.tool_calls) > 0:
            print("🔧 MCP Tool Calls:")
            for index, tool_call in enumerate(message.tool_calls, 1):
                tool_name = tool_call.function.name if hasattr(tool_call, 'function') else tool_call.type
                print(f"\n  {index}. {tool_name}")
                if hasattr(tool_call, 'function') and tool_call.function.arguments:
                    try:
                        args = json.loads(tool_call.function.arguments)
                        args_str = json.dumps(args, indent=2)
                        print(f"     Arguments: {args_str.replace(chr(10), chr(10) + '     ')}")
                    except json.JSONDecodeError:
                        print(f"     Arguments: {tool_call.function.arguments}")
            print()

        # Show final message
        print("Final Message:")
        print(json.dumps(message.model_dump() if hasattr(message, 'model_dump') else message.__dict__, indent=2, default=str))
        print()
        print(f"✓ Completed in {response.usage.total_tokens if response.usage else 0} tokens")
    except Exception as error:
        print(f"❌ Error: {error}", file=sys.stderr)
        if hasattr(error, 'status_code'):
            if error.status_code == 401:
                print("   Check your GROQ_API_KEY", file=sys.stderr)
            elif error.status_code == 424:
                print("   MCP server dependency failed", file=sys.stderr)
                print("   Check that MCP servers are reachable", file=sys.stderr)
    print()


def demo3_discover_tools():
    """Demo 3: Discover available tools"""
    print("🔍 Demo 3: Tool Discovery")
    print("-" * 60)

    try:
        response = client.chat.completions.create(
            model=DEFAULT_GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": "What tools do you have access to? Please list them."
                }
            ],
            tools=tools,
            max_tokens=300,
        )

        print("Response:")
        print(response.choices[0].message.content)
        print()
        print(f"✓ Completed in {response.usage.total_tokens if response.usage else 0} tokens")
    except Exception as error:
        print(f"❌ Error: {error}", file=sys.stderr)
    print()


def demo4_firecrawl_mcp():
    """Demo 4: Firecrawl MCP (if enabled)"""
    if not FIRECRAWL_API_KEY:
        print("⏭️  Demo 4: Skipped (Firecrawl not configured)")
        print("   Set FIRECRAWL_API_KEY to enable web scraping demo")
        print()
        return

    print("🌐 Demo 4: Firecrawl MCP Web Scraping")
    print("-" * 60)

    try:
        response = client.chat.completions.create(
            model=DEFAULT_GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": "Can you scrape the latest news from a tech website and summarize the top story?"
                }
            ],
            tools=tools,
            max_tokens=400,
        )

        message = response.choices[0].message

        print("Response:")
        if message.content:
            print(message.content)
        else:
            print(json.dumps(message.model_dump() if hasattr(message, 'model_dump') else message.__dict__, indent=2, default=str))
        print()
        print(f"✓ Completed in {response.usage.total_tokens if response.usage else 0} tokens")
    except Exception as error:
        print(f"❌ Error: {error}", file=sys.stderr)
        if hasattr(error, 'status_code') and error.status_code == 424:
            print("   Firecrawl MCP server failed", file=sys.stderr)
            print("   Check your FIRECRAWL_API_KEY", file=sys.stderr)
    print()


def main():
    """Main execution"""
    try:
        demo1_simple_completion()
        demo2_mcp_completion()
        demo3_discover_tools()
        demo4_firecrawl_mcp()

        print("=" * 60)
        print("✅ All demos completed successfully!")
        print()
        print("Next steps:")
        print("  - Set FIRECRAWL_API_KEY to enable web scraping")
        print("  - Try different models (llama-3.1-8b-instant, etc.)")
        print("  - Read docs/groq-mcp.md for more information")
        print("=" * 60)
    except Exception as error:
        print(f"❌ Fatal error: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
