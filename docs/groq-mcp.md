# Groq MCP Integration Guide

This guide explains how to enable Groq MCP-powered workflows in Rap-Bots using the Groq Responses API with Remote MCP servers.

## Overview

### Groq Responses API + Remote MCP

The Groq Responses API allows you to leverage Groq's fast inference with Model Context Protocol (MCP) servers. This integration keeps all LLM generation on Groq models while using remote MCP servers for specialized, non-LLM capabilities like web search, scraping, and external integrations.

**Key Features:**
- **Groq-Only Generation**: All language model inference runs on Groq's infrastructure using supported models
- **Remote MCP Servers**: Connect to external MCP servers for specialized tools (web search, scraping, etc.)
- **OpenAI SDK Compatible**: Use familiar OpenAI SDK syntax with Groq's base URL
- **Fast Inference**: Leverage Groq's optimized LPU infrastructure for rapid response times

### Architecture

```
Your Application → OpenAI SDK → Groq API (baseURL: https://api.groq.com/openai/v1)
                                      ↓
                                 Groq Models (LLM inference)
                                      ↓
                                 Remote MCP Servers (tools only)
```

## Supported Models

Groq supports various open-source models optimized for different use cases:

### Recommended Models

| Model | ID | Use Case | Context Window |
|-------|-----|----------|----------------|
| **Llama 3.3 70B Versatile** | `llama-3.3-70b-versatile` | **Default** - Best balance of speed and quality | 128k tokens |
| Llama 3.1 8B Instant | `llama-3.1-8b-instant` | Fast, lightweight alternative for simple tasks | 128k tokens |
| Llama 3.1 70B Versatile | `llama-3.1-70b-versatile` | High-quality reasoning and generation | 128k tokens |
| Mixtral 8x7B | `mixtral-8x7b-32768` | Good for multilingual tasks | 32k tokens |

**Model Selection Guidelines:**
- **Production/Default**: Use `llama-3.3-70b-versatile` for best overall performance
- **High-Volume/Speed**: Use `llama-3.1-8b-instant` for simpler tasks requiring faster responses
- **Complex Reasoning**: Use `llama-3.1-70b-versatile` for advanced reasoning tasks
- **Multilingual**: Use `mixtral-8x7b-32768` for non-English languages

## Security Notes

### API Key Management
- **Never commit** your `GROQ_API_KEY` to version control
- Store API keys in `.env` files (excluded via `.gitignore`)
- Use environment-specific key management in production (e.g., AWS Secrets Manager, Azure Key Vault)
- Rotate keys regularly and revoke unused keys

### MCP Server Authentication
- MCP servers may require their own API keys (e.g., `FIRECRAWL_API_KEY`, `STRIPE_MCP_TOKEN`)
- Each server has independent authentication requirements
- Review MCP server documentation for security best practices
- Use minimal permission scopes when configuring API keys

### Rate Limiting
- Groq API has rate limits based on your plan
- Implement retry logic with exponential backoff
- Monitor usage to avoid unexpected costs

### Data Privacy
- Be aware of data sent to MCP servers (they process your requests)
- Review MCP server privacy policies
- Avoid sending sensitive data through external MCP servers when possible

## Troubleshooting

### 401 Unauthorized Error

**Symptom**: API requests fail with HTTP 401 status

**Common Causes:**
1. Invalid or missing `GROQ_API_KEY`
2. Expired API key
3. API key not activated

**Solutions:**
```bash
# Verify your API key is set
echo $GROQ_API_KEY

# Check for leading/trailing spaces
GROQ_API_KEY=$(echo $GROQ_API_KEY | xargs)

# Generate a new key at https://console.groq.com/keys
```

### 424 Failed Dependency Error

**Symptom**: API requests fail with HTTP 424 status when using MCP tools

**Common Causes:**
1. MCP server is unreachable or down
2. Invalid MCP server URL
3. Missing or invalid MCP server authentication
4. MCP server rate limit exceeded

**Solutions:**
```bash
# Verify MCP server URL is correct
# Check MCP server status (if available)

# For Firecrawl:
curl -X GET https://mcp.firecrawl.dev/health

# Verify MCP server API keys
echo $FIRECRAWL_API_KEY

# Try without MCP servers to isolate the issue
# Remove MCP servers from tools array temporarily
```

### Model Not Found Error

**Symptom**: Error message about model not being available

**Solutions:**
- Check that you're using a supported model ID (see Supported Models section)
- Verify the model name spelling
- Ensure you have access to the model in your Groq account plan

### Slow Response Times

**Symptom**: API calls take longer than expected

**Solutions:**
- Switch to a faster model like `llama-3.1-8b-instant`
- Reduce context window size by limiting message history
- Check MCP server response times independently
- Monitor Groq API status page for incidents

## MCP Server Examples

### Hugging Face MCP Server

**Purpose**: Access Hugging Face models and datasets

**Authentication**: None required

**Configuration**:
```typescript
{
  type: "mcp",
  server_url: "https://huggingface.co/mcp"
}
```

**Example Use Cases**:
- Query model information
- Search datasets
- Access model metadata

### Firecrawl MCP Server

**Purpose**: Web scraping and content extraction

**Authentication**: Required (`FIRECRAWL_API_KEY`)

**Configuration**:
```typescript
{
  type: "mcp",
  server_url: "https://mcp.firecrawl.dev/",
  headers: {
    Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`
  }
}
```

**Example Use Cases**:
- Extract clean content from web pages
- Scrape structured data
- Convert HTML to markdown

**Setup**:
1. Sign up at https://firecrawl.dev
2. Get your API key from the dashboard
3. Set `FIRECRAWL_API_KEY` in your `.env` file

### Parallel Web Search MCP Server

**Purpose**: Parallel web search across multiple search engines

**Authentication**: Required (`PARALLEL_API_KEY`)

**Configuration**:
```typescript
{
  type: "mcp",
  server_url: "https://api.parallel.search/mcp",
  headers: {
    Authorization: `Bearer ${process.env.PARALLEL_API_KEY}`
  }
}
```

**Example Use Cases**:
- Search multiple sources simultaneously
- Real-time information retrieval
- Fact-checking and research

**Setup**:
1. Sign up at the Parallel API service
2. Generate an API key
3. Set `PARALLEL_API_KEY` in your `.env` file

### Stripe MCP Server

**Purpose**: Payment processing and Stripe API integration

**Authentication**: Required (`STRIPE_MCP_TOKEN`)

**Configuration**:
```typescript
{
  type: "mcp",
  server_url: "https://mcp.stripe.com/",
  headers: {
    Authorization: `Bearer ${process.env.STRIPE_MCP_TOKEN}`
  }
}
```

**Example Use Cases**:
- Create payment intents
- Manage subscriptions
- Query customer information
- Handle refunds

**Setup**:
1. Access your Stripe dashboard
2. Generate a restricted API key with minimal required permissions
3. Set `STRIPE_MCP_TOKEN` in your `.env` file

## Quick Start

### TypeScript

#### Installation

```bash
npm install openai groq-sdk
```

#### Basic Example

```typescript
import OpenAI from "openai";

// Initialize OpenAI client with Groq base URL
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Simple chat completion
const response = await client.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [
    { role: "user", content: "Write a short rap verse about coding" }
  ],
});

console.log(response.choices[0].message.content);
```

#### With MCP Tools

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Define MCP servers
const tools = [
  {
    type: "mcp",
    server_url: "https://huggingface.co/mcp"
  }
];

// Conditionally add Firecrawl if API key is available
if (process.env.FIRECRAWL_API_KEY) {
  tools.push({
    type: "mcp",
    server_url: "https://mcp.firecrawl.dev/",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`
    }
  });
}

// Create completion with MCP tools
const response = await client.chat.completions.create({
  model: process.env.DEFAULT_GROQ_MODEL || "llama-3.3-70b-versatile",
  messages: [
    { role: "user", content: "Search for recent AI developments" }
  ],
  tools: tools,
});

console.log(response.choices[0].message);
```

### Python

#### Installation

```bash
pip install openai groq
```

#### Basic Example

```python
from openai import OpenAI
import os

# Initialize OpenAI client with Groq base URL
client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

# Simple chat completion
response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {"role": "user", "content": "Write a short rap verse about coding"}
    ],
)

print(response.choices[0].message.content)
```

#### With MCP Tools

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

# Define MCP servers
tools = [
    {
        "type": "mcp",
        "server_url": "https://huggingface.co/mcp"
    }
]

# Conditionally add Firecrawl if API key is available
if os.environ.get("FIRECRAWL_API_KEY"):
    tools.append({
        "type": "mcp",
        "server_url": "https://mcp.firecrawl.dev/",
        "headers": {
            "Authorization": f"Bearer {os.environ.get('FIRECRAWL_API_KEY')}"
        }
    })

# Create completion with MCP tools
response = client.chat.completions.create(
    model=os.environ.get("DEFAULT_GROQ_MODEL", "llama-3.3-70b-versatile"),
    messages=[
        {"role": "user", "content": "Search for recent AI developments"}
    ],
    tools=tools,
)

print(response.choices[0].message)
```

## Advanced Usage

### Tool Discovery

MCP servers expose available tools that can be discovered at runtime:

```typescript
// The Groq API will automatically discover available tools
// from the MCP servers and make them available to the model
const response = await client.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: "What tools are available?" }],
  tools: tools,
});

// Check for tool calls in the response
if (response.choices[0].message.tool_calls) {
  console.log("Tools called:", response.choices[0].message.tool_calls);
}
```

### Handling Tool Calls

```typescript
const response = await client.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: messages,
  tools: tools,
});

const message = response.choices[0].message;

// Check if the model wants to call a tool
if (message.tool_calls) {
  console.log("Model reasoning:", message.content);
  
  message.tool_calls.forEach(toolCall => {
    console.log(`Tool called: ${toolCall.function.name}`);
    console.log(`Arguments: ${toolCall.function.arguments}`);
  });
}
```

### Multi-Turn Conversations with Tools

```typescript
const messages = [
  { role: "user", content: "Search for the latest news on AI" }
];

let response = await client.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: messages,
  tools: tools,
});

// If the model calls a tool, the results are automatically processed
// by the MCP server and returned in the response
while (response.choices[0].finish_reason === "tool_calls") {
  const message = response.choices[0].message;
  messages.push(message);
  
  // Continue the conversation with tool results
  response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: messages,
    tools: tools,
  });
}

console.log("Final response:", response.choices[0].message.content);
```

## Best Practices

1. **Model Selection**: Start with `llama-3.3-70b-versatile` and optimize based on your needs
2. **Error Handling**: Always implement try-catch blocks and handle API errors gracefully
3. **Rate Limiting**: Implement exponential backoff for retries
4. **Tool Selection**: Only include MCP servers you actually need to reduce latency
5. **Cost Monitoring**: Track your Groq API usage and MCP server costs
6. **Testing**: Test with and without MCP servers to isolate issues
7. **Logging**: Log tool calls and responses for debugging
8. **Environment Variables**: Use `.env` files and never commit secrets

## Environment Variables Reference

```bash
# Required
GROQ_API_KEY=gsk_...                                    # Your Groq API key

# Optional - Model Configuration
DEFAULT_GROQ_MODEL=llama-3.3-70b-versatile             # Default model to use

# Optional - MCP Server Authentication
FIRECRAWL_API_KEY=fc-...                               # Firecrawl API key
PARALLEL_API_KEY=pa-...                                # Parallel API key
STRIPE_MCP_TOKEN=sk_...                                # Stripe MCP token
```

## Resources

- [Groq Console](https://console.groq.com/) - Manage API keys and usage
- [Groq Documentation](https://console.groq.com/docs) - Official API documentation
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [OpenAI SDK Documentation](https://platform.openai.com/docs/libraries) - SDK reference

## Support

For issues specific to:
- **Groq API**: Contact Groq support or check their status page
- **MCP Servers**: Refer to the specific MCP server documentation
- **Rap-Bots Integration**: Open an issue in the Rap-Bots repository

## License

This integration guide is part of the Rap-Bots project and follows the same MIT license.
