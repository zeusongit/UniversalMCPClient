# Universal MCP Client

A flexible, universal client for the Model Context Protocol (MCP) that can connect to any MCP server with minimal configuration. This client provides both command-line interface and REST API access to your MCP servers.

## Features

✅ **Universal Compatibility** - Works with any MCP server  
✅ **Auto-Discovery** - Automatically detects server capabilities  
✅ **Multiple Transports** - Supports both stdio and SSE transports  
✅ **Flexible Configuration** - JSON config file or environment variables  
✅ **CLI & REST API** - Both command-line and HTTP interfaces  
✅ **LLM Integration** - Optional AI-powered querying with Anthropic Claude  
✅ **Type-Safe** - Full TypeScript support  
✅ **Error Handling** - Comprehensive error management  
✅ **Multi-Server** - Connect to multiple MCP servers simultaneously  

## Quick Start

### 1. Installation

```bash
git clone <this-repo>
cd universal-mcp-client
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Quick Setup with Environment Variables

```bash
# Set up your MCP servers
export MCP_SERVER_DYNAMO="/path/to/dynamo-packages-server.js"
export MCP_SERVER_WEATHER="/path/to/weather-server.py"

# Optional: Add Anthropic API key for LLM features
export ANTHROPIC_API_KEY="your-anthropic-key"

# Run the CLI client
npm start
```

### 4. Or Use Configuration File

```bash
# Copy example config
cp mcp-config.example.json mcp-config.json

# Edit with your server paths
nano mcp-config.json

# Run with config file
npm start
```

## Configuration

### Option 1: Environment Variables (Quick Setup)

Set environment variables for quick setup:

```bash
# Required: Define your MCP servers
export MCP_SERVER_DYNAMO="/absolute/path/to/dynamo-server.js"
export MCP_SERVER_WEATHER="/absolute/path/to/weather-server.py" 
export MCP_SERVER_DATABASE="/absolute/path/to/database-server.jar"

# Optional: Anthropic API for LLM features
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"

# Optional: API server settings
export API_PORT=3000
export API_HOST="0.0.0.0"
```

### Option 2: Configuration File (Recommended)

Create `mcp-config.json`:

```json
{
  "servers": {
    "dynamo-packages": {
      "name": "DynamoPackages Server",
      "description": "Server for DynamoPackages validation",
      "transport": {
        "type": "stdio",
        "stdio": {
          "command": "node",
          "args": ["/absolute/path/to/dynamo-packages-server.js"],
          "env": {
            "DYNAMO_API_KEY": "your-key"
          }
        }
      }
    },
    "weather-server": {
      "name": "Weather Server",
      "transport": {
        "type": "stdio", 
        "stdio": {
          "command": "python3",
          "args": ["/absolute/path/to/weather-server.py"]
        }
      }
    },
    "remote-server": {
      "name": "Remote Server",
      "transport": {
        "type": "sse",
        "sse": {
          "url": "http://localhost:8080/sse",
          "headers": {
            "Authorization": "Bearer your-token"
          }
        }
      }
    }
  },
  "anthropic": {
    "apiKey": "your-anthropic-api-key",
    "model": "claude-3-5-sonnet-20241022"
  },
  "api": {
    "port": 3000,
    "host": "0.0.0.0"
  }
}
```

## Usage

### Command Line Interface

```bash
# Start the interactive CLI
npm start

# Or with custom config
npm start -- --config=./my-config.json
```

**Available CLI Commands:**

- `help` - Show available commands
- `servers` - List connected servers
- `tools [server]` - List tools for all servers or specific server
- `resources [server]` - List resources for all servers or specific server
- `call <server> <tool>` - Call a tool (prompts for arguments)
- `read <server> <uri>` - Read a resource
- `ping <server>` - Ping a server
- `find <tool>` - Find which servers have a specific tool
- `query <question>` - Ask a question using LLM (requires Anthropic API key)
- `quit` - Exit

**Example CLI Session:**

```
🚀 Universal MCP Client
========================

📡 Connecting to 2 servers...
🔌 Connecting to server: dynamo-packages
✅ Connected to dynamo-packages
🔌 Connecting to server: weather-server
✅ Connected to weather-server

✅ Connected to 2 servers: dynamo-packages, weather-server

📋 Available capabilities:

  dynamo-packages:
    🔧 Tools: validate_dynamo_product, list_dynamo_products

  weather-server:
    🔧 Tools: get_weather, get_forecast

🎮 Interactive Mode

> call dynamo-packages validate_dynamo_product
productName (required) (string) - The name of the product to validate: Revit
✅ Tool result: [{"type":"text","text":"Revit is supported"}]

> query Is Revit supported by dynamo packages?
🤖 Processing query: Is Revit supported by dynamo packages?
🔧 Calling dynamo-packages.validate_dynamo_product with: {"productName":"Revit"}

Response:
Based on the validation result, yes, Revit is supported by DynamoPackages.
```

### REST API Server

Start the API server:

```bash
npm run start:api
```

The API will be available at `http://localhost:3000`

**API Endpoints:**

- `GET /api/health` - Health check
- `GET /api/servers` - List all connected servers and their capabilities
- `GET /api/servers/{server}` - Get specific server info
- `GET /api/servers/{server}/tools` - List tools for a server
- `POST /api/servers/{server}/tools/{tool}` - Call a tool
- `GET /api/servers/{server}/resources` - List resources for a server
- `GET /api/servers/{server}/resources/{uri}` - Read a resource
- `POST /api/servers/{server}/ping` - Ping a server
- `POST /api/query` - Query with LLM
- `GET /api/tools` - List all tools across all servers
- `GET /api/tools/find/{tool}` - Find which servers have a specific tool

**API Examples:**

```bash
# Check health
curl http://localhost:3000/api/health

# List all servers
curl http://localhost:3000/api/servers

# Call a tool
curl -X POST http://localhost:3000/api/servers/dynamo-packages/tools/validate_dynamo_product \
  -H "Content-Type: application/json" \
  -d '{"arguments": {"productName": "Revit"}}'

# Query with LLM
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What servers are available and what can they do?"}'

# Find a tool
curl http://localhost:3000/api/tools/find/validate_dynamo_product
```

## Supported Server Types

The client automatically detects and supports:

- **Node.js servers** (`.js` files) - Uses `node` command
- **Python servers** (`.py` files) - Uses `python3` command  
- **Java servers** (`.jar` files) - Uses `java -jar` command
- **Custom executables** - Direct command execution
- **SSE servers** - HTTP Server-Sent Events transport

## Configuration Details

### Server Transport Types

**stdio (Standard Input/Output):**
```json
{
  "transport": {
    "type": "stdio",
    "stdio": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}
```

**SSE (Server-Sent Events):**
```json
{
  "transport": {
    "type": "sse", 
    "sse": {
      "url": "http://localhost:8080/sse",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

### Environment Variable Format

For quick setup, use this pattern:
```bash
MCP_SERVER_<NAME>=/path/to/server/file
```

Examples:
```bash
MCP_SERVER_DYNAMO=/path/to/dynamo-server.js
MCP_SERVER_WEATHER=/path/to/weather-server.py
MCP_SERVER_DATABASE=/path/to/database-server.jar
```

## Integration Examples

### With Your Dynamo-Packages Server

```bash
# Set up environment
export MCP_SERVER_DYNAMO="/path/to/dynamo-packages-server.js"
export DYNAMO_API_KEY="your-dynamo-api-key"

# Start client
npm start

# In CLI:
> call dynamo validate_dynamo_product
productName: Revit

> call dynamo list_dynamo_products
searchTerm: Civil

> query Are there any Civil 3D products available in DynamoPackages?
```

### API Integration

```javascript
// Example: Check if Revit is supported
const response = await fetch('http://localhost:3000/api/servers/dynamo/tools/validate_dynamo_product', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    arguments: { productName: 'Revit' }
  })
});

const result = await response.json();
console.log('Revit supported:', result.success);
```

## Development

### Project Structure

```
src/
├── types.ts          # TypeScript type definitions
├── config.ts         # Configuration management  
├── client.ts         # Core MCP client
├── index.ts          # CLI application
└── server.ts         # REST API server
```

### Scripts

- `npm run build` - Build TypeScript
- `npm start` - Run CLI client
- `npm run start:api` - Run API server
- `npm run dev` - Watch mode for development
- `npm run clean` - Clean build directory

### Adding New Features

The client is designed to be extensible. Key extension points:

1. **New Transport Types** - Add support in `client.ts`
2. **New API Endpoints** - Add routes in `server.ts`  
3. **New CLI Commands** - Add commands in `index.ts`
4. **Custom Configuration** - Extend types in `types.ts`

## Troubleshooting

### Connection Issues

1. **Check server paths** - Ensure absolute paths are used
2. **Verify permissions** - Make sure server files are executable
3. **Environment variables** - Check server-specific env vars are set
4. **Network connectivity** - For SSE servers, verify URL accessibility

### Common Errors

**"No MCP servers configured"**
- Add servers to `mcp-config.json` or set `MCP_SERVER_*` environment variables

**"Server not connected"**  
- Check server path and permissions
- Verify server dependencies are installed
- Check server logs for errors

**"Tool call failed"**
- Verify tool name and arguments
- Check server-specific API keys/credentials
- Use `ping` command to test server connectivity

**"Anthropic API key not configured"**
- Set `ANTHROPIC_API_KEY` environment variable or add to config file
- Required only for LLM query features

### Debug Mode

For detailed logging, set:
```bash
export DEBUG=mcp:*
npm start
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

- Open an issue for bugs or feature requests
- Check existing issues for common problems
- Provide logs and configuration when reporting issues 