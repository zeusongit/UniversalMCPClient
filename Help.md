# Universal MCP Client - Testing Tool for MCP Servers

## What is this tool?

The **Universal MCP Client** is a testing and debugging tool for **Model Context Protocol (MCP) servers**. Its primary purpose is to help developers test, validate, and debug their MCP servers without needing an IDE or complex client setup.

**MCP (Model Context Protocol)** is a standardized way for AI models to connect to external data sources and tools through specialized servers. This client lets you:
- Connect to any MCP server (Node.js, Python, Java, etc.)
- Test server tools and functions
- Debug server responses
- Validate server behavior
- Query servers with natural language using AI integration

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Your Server
Set environment variable pointing to your MCP server:
```bash
# For Node.js servers
export MCP_SERVER_MYSERVER="/path/to/your/server.js"

# For Python servers  
export MCP_SERVER_MYSERVER="/path/to/your/server.py"

# For Java servers
export MCP_SERVER_MYSERVER="/path/to/your/server.jar"
```

### 3. Start Testing
```bash
npm start
```

## Configuration Methods

### Method 1: Environment Variables (Quick Setup)
```bash
# Basic server configuration
export MCP_SERVER_DYNAMO="E:\path\to\dynamo-server.js"
export MCP_SERVER_WEATHER="/path/to/weather-server.py"

# Optional: Add Anthropic API key for AI queries
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# Start the client
npm start
```

### Method 2: JSON Configuration (Advanced)
Create or edit `mcp-config.json`:
```json
{
  "servers": {
    "my-server": {
      "name": "My Test Server",
      "transport": {
        "type": "stdio",
        "stdio": {
          "command": "node",
          "args": ["E:\\path\\to\\my-server.js"]
        }
      }
    }
  },
  "anthropic": {
    "apiKey": "sk-ant-api03-...",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

## Testing Commands

### Server Information
```bash
> servers                    # List all connected servers
> ping <server>              # Test if server is responding
> tools                      # Show all available tools
> tools <server>             # Show tools from specific server
```

### Tool Testing
```bash
> call <server> <tool>       # Call a tool interactively
> call dynamo-packages validate_dynamo_product
productName (required): Revit
```

### Resource Testing
```bash
> resources                  # List available resources
> resources <server>         # Resources from specific server
> read <server> <uri>        # Read a specific resource
```

### AI-Powered Testing
```bash
> query <question>           # Ask AI to use your tools
> query "Is Revit supported by DynamoPackages?"
> query "What tools are available on my server?"
```

## Common Testing Scenarios

### 1. Testing a New MCP Server
```bash
# 1. Set up the server
export MCP_SERVER_TEST="/path/to/my-new-server.js"
npm start

# 2. Check connection
> servers
> ping test

# 3. Discover capabilities
> tools test
> resources test

# 4. Test individual tools
> call test my_tool_name
```

### 2. Debugging Tool Parameters
```bash
# Interactive tool testing shows required parameters
> call myserver validate_product
productName (required): [you'll be prompted]
category (optional): [you'll be prompted]

# Test with different inputs to validate behavior
```

### 3. Testing Error Handling
```bash
# Try invalid inputs
> call myserver my_tool
someParam (required): invalid_value

# Check how your server handles errors
```

### 4. Performance Testing
```bash
# Time tool calls
> call myserver fast_tool
> call myserver slow_tool

# Check server responsiveness
> ping myserver
```

## REST API for Automated Testing

Start the API server:
```bash
npm run start:api
# Server runs on http://localhost:3000
```

### Test Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# List servers
curl http://localhost:3000/api/servers

# Call a tool
curl -X POST http://localhost:3000/api/servers/myserver/tools/mytool \
  -H "Content-Type: application/json" \
  -d '{"arguments": {"param": "value"}}'

# AI query
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Test my server functionality"}'
```

## Troubleshooting

### "No MCP servers configured"
```bash
# Check environment variables
echo $MCP_SERVER_MYSERVER

# Or check mcp-config.json exists and is valid
cat mcp-config.json
```

### "Server not connected"
```bash
# Test server manually
node /path/to/your/server.js

# Check server dependencies
cd /path/to/server && npm install

# Verify file path is correct
ls -la /path/to/your/server.js
```

### "Tool call failed"
```bash
# First ping the server
> ping myserver

# Check available tools
> tools myserver

# Verify tool name spelling
> call myserver correct_tool_name
```

### "LLM query failed"
```bash
# Check API key is set
echo $ANTHROPIC_API_KEY

# Test tool calls directly first
> call myserver mytool

# Try simpler queries
> query "What tools are available?"
```

## Supported Server Types

### Node.js Servers
```bash
export MCP_SERVER_NODEAPP="/path/to/server.js"
# Auto-detected: command="node", args=["server.js"]
```

### Python Servers
```bash
export MCP_SERVER_PYTHONAPP="/path/to/server.py"  
# Auto-detected: command="python3", args=["server.py"]
```

### Java Servers
```bash
export MCP_SERVER_JAVAAPP="/path/to/server.jar"
# Auto-detected: command="java", args=["-jar", "server.jar"]
```

### Custom Commands
Use JSON config for custom setups:
```json
{
  "servers": {
    "custom": {
      "transport": {
        "type": "stdio", 
        "stdio": {
          "command": "python",
          "args": ["-m", "mymodule.server"],
          "env": {
            "PYTHONPATH": "/custom/path"
          }
        }
      }
    }
  }
}
```

## Testing Best Practices

### 1. Start Simple
- Test connection first with `ping`
- List tools with `tools` 
- Try basic tool calls before complex ones

### 2. Validate Tool Schemas
```bash
# Check what parameters tools expect
> tools myserver
# Look at the parameter definitions
```

### 3. Test Error Cases
- Try invalid inputs
- Test required vs optional parameters
- Verify error messages are helpful

### 4. Use AI Queries for Integration Testing
```bash
# Test natural language understanding
> query "Show me all products"
> query "Validate that AutoCAD is supported"
```

### 5. Automated Testing with API
```bash
# Write scripts to test your server
curl -X POST localhost:3000/api/servers/test/tools/validate \
  -d '{"arguments": {"name": "test"}}'
```

## Example Testing Session

```bash
# Start client
npm start

# Check what's connected
> servers
Connected servers:
  dynamo-packages: DynamoPackages validation server (2 tools, 0 resources)

# See available tools
> tools dynamo-packages
Tools for dynamo-packages:
  validate_dynamo_product: Check if a product name is valid in DynamoPackages
  list_dynamo_products: Get all valid DynamoPackages products

# Test a tool
> call dynamo-packages validate_dynamo_product
productName (required): Revit
✓ Tool call successful
Result: [{"type": "text", "text": "Revit is a valid product"}]

# Test with AI
> query Is Civil 3D supported?
🤖 Based on the validation, Civil 3D is supported by DynamoPackages.

# Exit
> exit
```

This tool is designed to make testing MCP servers fast and straightforward. Whether you're building a new server or debugging an existing one, the Universal MCP Client provides both interactive and programmatic testing capabilities.
