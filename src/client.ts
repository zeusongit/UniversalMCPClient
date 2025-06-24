import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { MCPServerConfig, ToolCall, ServerInfo } from './types.js';

export class UniversalMCPClient {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport | SSEClientTransport> = new Map();
  private serverInfos: Map<string, ServerInfo> = new Map();
  private anthropic?: Anthropic;
  private anthropicModel: string;

  constructor(anthropicApiKey?: string, anthropicModel?: string) {
    if (anthropicApiKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    }
    this.anthropicModel = anthropicModel || 'claude-3-5-sonnet-20241022';
  }

  async connectToServer(serverName: string, config: MCPServerConfig): Promise<void> {
    console.log(`🔌 Connecting to server: ${serverName}`);

    try {
      const client = new Client({
        name: `universal-client-${serverName}`,
        version: "1.0.0"
      });

      let transport: StdioClientTransport | SSEClientTransport;

      if (config.transport.type === 'stdio' && config.transport.stdio) {
        transport = new StdioClientTransport({
          command: config.transport.stdio.command,
          args: config.transport.stdio.args,
          env: config.transport.stdio.env,
        });
      } else if (config.transport.type === 'sse' && config.transport.sse) {
        transport = new SSEClientTransport(new URL(config.transport.sse.url));
      } else {
        throw new Error(`Invalid transport configuration for server ${serverName}`);
      }

      await client.connect(transport);
      this.clients.set(serverName, client);
      this.transports.set(serverName, transport);

      // Discover server capabilities
      await this.discoverServerCapabilities(serverName);
      
      console.log(`✅ Connected to ${serverName}`);
    } catch (error) {
      console.error(`❌ Failed to connect to ${serverName}:`, error);
      throw error;
    }
  }

  private async discoverServerCapabilities(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (!client) return;

    try {
      const [toolsResult, resourcesResult, promptsResult] = await Promise.allSettled([
        client.listTools().catch(() => ({ tools: [] })),
        client.listResources().catch(() => ({ resources: [] })),
        client.listPrompts().catch(() => ({ prompts: [] })),
      ]);

      const serverInfo: ServerInfo = {
        name: serverName,
        tools: toolsResult.status === 'fulfilled' ? toolsResult.value.tools : [],
        resources: resourcesResult.status === 'fulfilled' ? resourcesResult.value.resources : [],
        prompts: promptsResult.status === 'fulfilled' ? promptsResult.value.prompts : [],
      };

      this.serverInfos.set(serverName, serverInfo);

      console.log(`📋 ${serverName} capabilities:`);
      console.log(`  Tools: ${serverInfo.tools.length}`);
      console.log(`  Resources: ${serverInfo.resources.length}`);
      console.log(`  Prompts: ${serverInfo.prompts.length}`);
      
      if (serverInfo.tools.length > 0) {
        console.log(`  Available tools: ${serverInfo.tools.map(t => t.name).join(', ')}`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not discover all capabilities for ${serverName}:`, error);
    }
  }

  async callTool(serverName: string, toolName: string, args: Record<string, any>): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    console.log(`🔧 Calling ${serverName}.${toolName} with:`, args);

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      console.log(`✅ Tool result:`, result.content);
      return result.content;
    } catch (error) {
      console.error(`❌ Tool call failed:`, error);
      throw error;
    }
  }

  async readResource(serverName: string, uri: string): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    try {
      const result = await client.readResource({ uri });
      return result.contents;
    } catch (error) {
      console.error(`❌ Resource read failed:`, error);
      throw error;
    }
  }

  async getPrompt(serverName: string, name: string, args?: Record<string, any>): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    try {
      const result = await client.getPrompt({ name, arguments: args });
      return result;
    } catch (error) {
      console.error(`❌ Prompt get failed:`, error);
      throw error;
    }
  }

  async queryWithLLM(query: string, preferredServer?: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error("Anthropic API key not configured");
    }

    console.log(`🤖 Processing query: ${query}`);

    // Collect all available tools from all servers
    const allTools: any[] = [];
    for (const [serverName, serverInfo] of this.serverInfos) {
      if (preferredServer && serverName !== preferredServer) continue;
      
      serverInfo.tools.forEach(tool => {
        allTools.push({
          name: `${serverName}_${tool.name}`,
          description: tool.description || `Tool ${tool.name} from ${serverName}`,
          input_schema: tool.inputSchema,
        });
      });
    }

    try {
      const response = await this.anthropic.messages.create({
        model: this.anthropicModel,
        max_tokens: 2000,
        messages: [{ role: "user", content: query }],
        tools: allTools,
      });

      let result = "";
      let followUpMessages: any[] = [
        { role: "user", content: query }
      ];

      // Process initial response
      const assistantContent: any[] = [];
      
      for (const content of response.content) {
        if (content.type === "text") {
          result += content.text + "\n";
          assistantContent.push(content);
        } else if (content.type === "tool_use") {
          assistantContent.push(content);
          
          // Parse server_tool format  
          const underscoreIndex = content.name.indexOf('_');
          const serverName = content.name.substring(0, underscoreIndex);
          const toolName = content.name.substring(underscoreIndex + 1);
          
          try {
            const toolResult = await this.callTool(
              serverName, 
              toolName, 
              content.input as Record<string, any>
            );
            
            result += `\n[${content.name} executed]\n`;
            
            // Add tool result to conversation
            followUpMessages.push({
              role: "assistant",
              content: assistantContent
            });
            
            followUpMessages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: content.id,
                  content: JSON.stringify(toolResult, null, 2)
                }
              ]
            });
            
            // Get follow-up response from Claude
            const followUpResponse = await this.anthropic.messages.create({
              model: this.anthropicModel,
              max_tokens: 2000,
              messages: followUpMessages,
              tools: allTools,
            });
            
            // Process follow-up response
            for (const followUpContent of followUpResponse.content) {
              if (followUpContent.type === "text") {
                result += followUpContent.text + "\n";
              }
            }
            
          } catch (error) {
            result += `\n[${content.name} failed: ${error}]\n`;
          }
        }
      }

      return result.trim();
    } catch (error) {
      console.error("❌ LLM query failed:", error);
      throw error;
    }
  }

  async ping(serverName: string): Promise<boolean> {
    const client = this.clients.get(serverName);
    if (!client) {
      return false;
    }

    try {
      await client.ping();
      return true;
    } catch (error) {
      console.error(`❌ Ping failed for ${serverName}:`, error);
      return false;
    }
  }

  getServerInfo(serverName: string): ServerInfo | undefined {
    return this.serverInfos.get(serverName);
  }

  getAllServerInfos(): Record<string, ServerInfo> {
    const result: Record<string, ServerInfo> = {};
    for (const [name, info] of this.serverInfos) {
      result[name] = info;
    }
    return result;
  }

  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  async disconnect(serverName?: string): Promise<void> {
    if (serverName) {
      const client = this.clients.get(serverName);
      if (client) {
        await client.close();
        this.clients.delete(serverName);
        this.transports.delete(serverName);
        this.serverInfos.delete(serverName);
        console.log(`🔌 Disconnected from ${serverName}`);
      }
    } else {
      // Disconnect all
      for (const [name, client] of this.clients) {
        await client.close();
        console.log(`🔌 Disconnected from ${name}`);
      }
      this.clients.clear();
      this.transports.clear();
      this.serverInfos.clear();
    }
  }

  // Helper methods for common operations
  async listAllTools(): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    for (const [serverName, info] of this.serverInfos) {
      result[serverName] = info.tools;
    }
    return result;
  }

  async listAllResources(): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    for (const [serverName, info] of this.serverInfos) {
      result[serverName] = info.resources;
    }
    return result;
  }

  async findTool(toolName: string): Promise<Array<{ server: string; tool: any }>> {
    const results: Array<{ server: string; tool: any }> = [];
    
    for (const [serverName, info] of this.serverInfos) {
      const tool = info.tools.find(t => t.name === toolName);
      if (tool) {
        results.push({ server: serverName, tool });
      }
    }
    
    return results;
  }
} 