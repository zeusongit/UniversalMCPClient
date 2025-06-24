#!/usr/bin/env node

import { UniversalMCPClient } from './client.js';
import { ConfigManager } from './config.js';
import readline from 'readline/promises';

async function main() {
  const args = process.argv.slice(2);
  const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1];
  
  console.log('🚀 Universal MCP Client');
  console.log('========================');

  const configManager = new ConfigManager(configPath);
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

  // Connect to all configured servers
  const serverNames = configManager.getServerNames();
  console.log(`\n📡 Connecting to ${serverNames.length} servers...`);
  
  const connectionPromises = serverNames.map(async (serverName) => {
    const serverConfig = configManager.getServerConfig(serverName);
    if (serverConfig) {
      try {
        await client.connectToServer(serverName, serverConfig);
        return { serverName, success: true };
      } catch (error) {
        console.error(`Failed to connect to ${serverName}: ${error}`);
        return { serverName, success: false, error };
      }
    }
    return { serverName, success: false, error: 'No config found' };
  });

  const connectionResults = await Promise.all(connectionPromises);
  const successfulConnections = connectionResults.filter(r => r.success);
  const failedConnections = connectionResults.filter(r => !r.success);

  if (successfulConnections.length === 0) {
    console.log('❌ No servers connected successfully.');
    process.exit(1);
  }

  console.log(`\n✅ Connected to ${successfulConnections.length} servers: ${successfulConnections.map(r => r.serverName).join(', ')}`);
  
  if (failedConnections.length > 0) {
    console.log(`⚠️  Failed to connect to ${failedConnections.length} servers: ${failedConnections.map(r => r.serverName).join(', ')}`);
  }
  
  // Show available capabilities
  console.log('\n📋 Available capabilities:');
  const allInfos = client.getAllServerInfos();
  Object.entries(allInfos).forEach(([serverName, info]) => {
    console.log(`\n  ${serverName}:`);
    if (info.tools.length > 0) {
      console.log(`    🔧 Tools: ${info.tools.map(t => t.name).join(', ')}`);
    }
    if (info.resources.length > 0) {
      console.log(`    📄 Resources: ${info.resources.length} available`);
    }
    if (info.prompts.length > 0) {
      console.log(`    💬 Prompts: ${info.prompts.map(p => p.name).join(', ')}`);
    }
  });

  // Interactive mode
  await interactiveMode(client);
}

async function interactiveMode(client: UniversalMCPClient) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n🎮 Interactive Mode');
  console.log('Commands:');
  console.log('  help                     - Show this help');
  console.log('  servers                  - List connected servers');
  console.log('  tools [server]           - List tools for all servers or specific server');
  console.log('  resources [server]       - List resources for all servers or specific server');
  console.log('  call <server> <tool>     - Call a tool (will prompt for args)');
  console.log('  read <server> <uri>      - Read a resource');
  console.log('  ping <server>            - Ping a server');
  console.log('  find <tool>              - Find which servers have a specific tool');
  console.log('  query <question>         - Ask a question using LLM');
  console.log('  quit                     - Exit');

  while (true) {
    try {
      const input = await rl.question('\n> ');
      const [command, ...args] = input.trim().split(' ');

      switch (command.toLowerCase()) {
        case 'help':
          console.log('Commands:');
          console.log('  servers                  - List connected servers');
          console.log('  tools [server]           - List tools for all servers or specific server');
          console.log('  resources [server]       - List resources for all servers or specific server');
          console.log('  call <server> <tool>     - Call a tool');
          console.log('  read <server> <uri>      - Read a resource');
          console.log('  ping <server>            - Ping a server');
          console.log('  find <tool>              - Find which servers have a specific tool');
          console.log('  query <question>         - Ask a question using LLM');
          console.log('  quit                     - Exit');
          break;

        case 'servers':
          const servers = client.getConnectedServers();
          console.log('Connected servers:', servers.join(', '));
          break;

        case 'tools':
          if (args.length === 0) {
            const allTools = await client.listAllTools();
            Object.entries(allTools).forEach(([serverName, tools]) => {
              if (tools.length > 0) {
                console.log(`\n${serverName}:`);
                tools.forEach(tool => {
                  console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
                });
              }
            });
          } else {
            const serverInfo = client.getServerInfo(args[0]);
            if (serverInfo) {
              console.log(`Tools for ${args[0]}:`);
              serverInfo.tools.forEach(tool => {
                console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
              });
            } else {
              console.log(`Server ${args[0]} not found`);
            }
          }
          break;

        case 'resources':
          if (args.length === 0) {
            const allResources = await client.listAllResources();
            Object.entries(allResources).forEach(([serverName, resources]) => {
              if (resources.length > 0) {
                console.log(`\n${serverName}:`);
                resources.forEach(resource => {
                  console.log(`  - ${resource.uri} (${resource.name || 'No name'})`);
                });
              }
            });
          } else {
            const serverInfo = client.getServerInfo(args[0]);
            if (serverInfo) {
              console.log(`Resources for ${args[0]}:`);
              serverInfo.resources.forEach(resource => {
                console.log(`  - ${resource.uri} (${resource.name || 'No name'})`);
              });
            } else {
              console.log(`Server ${args[0]} not found`);
            }
          }
          break;

        case 'call':
          if (args.length < 2) {
            console.log('Usage: call <server> <tool>');
            break;
          }
          const [serverName, toolName] = args;
          if (!client.isConnected(serverName)) {
            console.log(`Server ${serverName} not connected`);
            break;
          }
          const toolArgs = await promptForToolArgs(rl, serverName, toolName, client);
          try {
            const result = await client.callTool(serverName, toolName, toolArgs);
            console.log('Result:', JSON.stringify(result, null, 2));
          } catch (error) {
            console.log('Error:', error);
          }
          break;

        case 'read':
          if (args.length < 2) {
            console.log('Usage: read <server> <uri>');
            break;
          }
          const [readServerName, uri] = args;
          if (!client.isConnected(readServerName)) {
            console.log(`Server ${readServerName} not connected`);
            break;
          }
          try {
            const content = await client.readResource(readServerName, uri);
            console.log('Resource content:', JSON.stringify(content, null, 2));
          } catch (error) {
            console.log('Error:', error);
          }
          break;

        case 'ping':
          if (args.length === 0) {
            console.log('Usage: ping <server>');
            break;
          }
          const pingServer = args[0];
          try {
            const isAlive = await client.ping(pingServer);
            console.log(`${pingServer}: ${isAlive ? '✅ Alive' : '❌ Not responding'}`);
          } catch (error) {
            console.log(`Error pinging ${pingServer}:`, error);
          }
          break;

        case 'find':
          if (args.length === 0) {
            console.log('Usage: find <tool>');
            break;
          }
          const searchTool = args[0];
          try {
            const results = await client.findTool(searchTool);
            if (results.length > 0) {
              console.log(`Found tool '${searchTool}' in:`);
              results.forEach(({ server, tool }) => {
                console.log(`  - ${server}: ${tool.description || 'No description'}`);
              });
            } else {
              console.log(`Tool '${searchTool}' not found in any connected server`);
            }
          } catch (error) {
            console.log('Error:', error);
          }
          break;

        case 'query':
          if (args.length === 0) {
            console.log('Usage: query <your question>');
            break;
          }
          const question = args.join(' ');
          try {
            const response = await client.queryWithLLM(question);
            console.log('\nResponse:');
            console.log(response);
          } catch (error) {
            console.log('Error:', error);
          }
          break;

        case 'quit':
        case 'exit':
          console.log('👋 Goodbye!');
          await client.disconnect();
          rl.close();
          return;

        default:
          if (input.trim()) {
            console.log('Unknown command. Type "help" for available commands.');
          }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

async function promptForToolArgs(
  rl: readline.Interface, 
  serverName: string, 
  toolName: string, 
  client: UniversalMCPClient
): Promise<Record<string, any>> {
  const serverInfo = client.getServerInfo(serverName);
  const tool = serverInfo?.tools.find(t => t.name === toolName);
  
  if (!tool || !tool.inputSchema) {
    console.log('No schema available for this tool. Enter JSON args:');
    const argsInput = await rl.question('Args (JSON): ');
    try {
      return JSON.parse(argsInput || '{}');
    } catch {
      return {};
    }
  }

  const args: Record<string, any> = {};
  const properties = tool.inputSchema.properties || {};
  const required = tool.inputSchema.required || [];

  console.log('\nEnter arguments for the tool:');
  for (const [propName, propSchema] of Object.entries(properties)) {
    const isRequired = required.includes(propName);
    const schemaInfo = propSchema as any;
    const typeInfo = schemaInfo.type ? ` (${schemaInfo.type})` : '';
    const description = schemaInfo.description ? ` - ${schemaInfo.description}` : '';
    const prompt = `${propName}${isRequired ? ' (required)' : ' (optional)'}${typeInfo}${description}: `;
    
    const value = await rl.question(prompt);
    if (value.trim()) {
      // Try to parse as JSON, fallback to string
      try {
        args[propName] = JSON.parse(value);
      } catch {
        args[propName] = value;
      }
    }
  }

  return args;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 