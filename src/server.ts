import express from 'express';
import cors from 'cors';
import { UniversalMCPClient } from './client.js';
import { ConfigManager } from './config.js';

export async function startAPIServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const configManager = new ConfigManager();
  const config = configManager.getConfig();
  
  // Validate configuration
  const validation = configManager.validateConfig();
  if (!validation.valid) {
    console.error('❌ Configuration errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  const client = new UniversalMCPClient(
    config.anthropic?.apiKey,
    config.anthropic?.model
  );

  // Connect to all servers
  console.log('🔌 Connecting to MCP servers...');
  const serverNames = configManager.getServerNames();
  const connectionPromises = serverNames.map(async (serverName) => {
    const serverConfig = configManager.getServerConfig(serverName);
    if (serverConfig) {
      try {
        await client.connectToServer(serverName, serverConfig);
        return { serverName, success: true };
      } catch (error) {
        console.error(`Failed to connect to ${serverName}:`, error);
        return { serverName, success: false, error };
      }
    }
    return { serverName, success: false, error: 'No config found' };
  });

  const connectionResults = await Promise.all(connectionPromises);
  const connectedServers = connectionResults.filter(r => r.success);
  
  console.log(`✅ API Server connected to ${connectedServers.length} MCP servers`);

  // Error handler middleware
  const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      connectedServers: client.getConnectedServers(),
      version: '1.0.0'
    });
  });

  app.get('/api/servers', (req, res) => {
    res.json({
      servers: client.getAllServerInfos()
    });
  });

  app.get('/api/servers/:serverName', (req, res) => {
    const serverInfo = client.getServerInfo(req.params.serverName);
    if (!serverInfo) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json(serverInfo);
  });

  app.get('/api/servers/:serverName/tools', (req, res) => {
    const serverInfo = client.getServerInfo(req.params.serverName);
    if (!serverInfo) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json({ tools: serverInfo.tools });
  });

  app.get('/api/servers/:serverName/resources', (req, res) => {
    const serverInfo = client.getServerInfo(req.params.serverName);
    if (!serverInfo) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json({ resources: serverInfo.resources });
  });

  app.post('/api/servers/:serverName/tools/:toolName', asyncHandler(async (req: any, res: any) => {
    const { serverName, toolName } = req.params;
    const args = req.body.arguments || req.body.args || {};
    
    if (!client.isConnected(serverName)) {
      return res.status(404).json({ error: 'Server not connected' });
    }

    try {
      const result = await client.callTool(serverName, toolName, args);
      res.json({ 
        success: true,
        result,
        serverName,
        toolName,
        arguments: args
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        serverName,
        toolName,
        arguments: args
      });
    }
  }));

  app.get('/api/servers/:serverName/resources/*', asyncHandler(async (req: any, res: any) => {
    const { serverName } = req.params;
    const uri = req.params[0]; // This captures the rest of the path
    
    if (!client.isConnected(serverName)) {
      return res.status(404).json({ error: 'Server not connected' });
    }

    try {
      const result = await client.readResource(serverName, uri);
      res.json({ 
        success: true,
        result,
        serverName,
        uri
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        serverName,
        uri
      });
    }
  }));

  app.post('/api/query', asyncHandler(async (req: any, res: any) => {
    const { query, server } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    try {
      const result = await client.queryWithLLM(query, server);
      res.json({ 
        success: true,
        response: result,
        query,
        server: server || 'all'
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        query,
        server: server || 'all'
      });
    }
  }));

  app.post('/api/servers/:serverName/ping', asyncHandler(async (req: any, res: any) => {
    const { serverName } = req.params;
    
    try {
      const isAlive = await client.ping(serverName);
      res.json({ 
        success: true,
        alive: isAlive,
        serverName
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        serverName
      });
    }
  }));

  app.get('/api/tools', (req, res) => {
    const allTools = client.getAllServerInfos();
    const toolsByServer: Record<string, any[]> = {};
    
    Object.entries(allTools).forEach(([serverName, info]) => {
      toolsByServer[serverName] = info.tools;
    });
    
    res.json({ tools: toolsByServer });
  });

  app.get('/api/tools/find/:toolName', (req, res) => {
    const { toolName } = req.params;
    const results: Array<{ server: string; tool: any }> = [];
    
    const allInfos = client.getAllServerInfos();
    Object.entries(allInfos).forEach(([serverName, info]) => {
      const tool = info.tools.find(t => t.name === toolName);
      if (tool) {
        results.push({ server: serverName, tool });
      }
    });
    
    res.json({ 
      toolName,
      found: results.length > 0,
      results 
    });
  });

  // Generic error handler
  app.use((error: any, req: any, res: any, next: any) => {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      availableEndpoints: [
        'GET /api/health',
        'GET /api/servers',
        'GET /api/servers/:serverName',
        'GET /api/servers/:serverName/tools',
        'GET /api/servers/:serverName/resources', 
        'POST /api/servers/:serverName/tools/:toolName',
        'GET /api/servers/:serverName/resources/*',
        'POST /api/servers/:serverName/ping',
        'POST /api/query',
        'GET /api/tools',
        'GET /api/tools/find/:toolName'
      ]
    });
  });

  const port = config.api?.port || 3000;
  const host = config.api?.host || '0.0.0.0';
  
  const server = app.listen(port, host, () => {
    console.log(`🚀 Universal MCP API Server running on http://${host}:${port}`);
    console.log(`📖 API Documentation:`);
    console.log(`   Health:           GET  http://localhost:${port}/api/health`);
    console.log(`   List servers:     GET  http://localhost:${port}/api/servers`);
    console.log(`   Server info:      GET  http://localhost:${port}/api/servers/{server}`);
    console.log(`   Call tool:        POST http://localhost:${port}/api/servers/{server}/tools/{tool}`);
    console.log(`   Query with LLM:   POST http://localhost:${port}/api/query`);
    console.log(`   Find tool:        GET  http://localhost:${port}/api/tools/find/{tool}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🔌 Shutting down API server...');
    server.close(() => {
      console.log('HTTP server closed');
    });
    
    await client.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

// Allow running as standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  startAPIServer().catch(console.error);
} 