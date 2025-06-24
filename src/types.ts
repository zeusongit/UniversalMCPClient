export interface MCPServerConfig {
  name: string;
  transport: {
    type: 'stdio' | 'sse';
    stdio?: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
    sse?: {
      url: string;
      headers?: Record<string, string>;
    };
  };
  description?: string;
}

export interface ClientConfig {
  servers: Record<string, MCPServerConfig>;
  anthropic?: {
    apiKey?: string;
    model?: string;
  };
  api?: {
    port?: number;
    host?: string;
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ServerInfo {
  name: string;
  tools: Array<{ name: string; description?: string; inputSchema?: any }>;
  resources: Array<{ uri: string; name?: string; mimeType?: string }>;
  prompts: Array<{ name: string; description?: string }>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ToolResult {
  content: any;
  isError?: boolean;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
} 