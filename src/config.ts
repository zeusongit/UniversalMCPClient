import { readFileSync, existsSync } from 'fs';
import { ClientConfig, MCPServerConfig } from './types.js';
import dotenv from 'dotenv';

dotenv.config();

export class ConfigManager {
  private config: ClientConfig;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
  }

  private loadConfig(configPath?: string): ClientConfig {
    // Try to load from config file
    if (configPath && existsSync(configPath)) {
      const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
      return this.mergeWithEnv(configData);
    }

    // Try default config file
    const defaultPath = './mcp-config.json';
    if (existsSync(defaultPath)) {
      const configData = JSON.parse(readFileSync(defaultPath, 'utf-8'));
      return this.mergeWithEnv(configData);
    }

    // Fallback to environment variables only
    return this.loadFromEnv();
  }

  private mergeWithEnv(config: ClientConfig): ClientConfig {
    return {
      ...config,
      anthropic: {
        ...config.anthropic,
        apiKey: process.env.ANTHROPIC_API_KEY || config.anthropic?.apiKey,
        model: process.env.ANTHROPIC_MODEL || config.anthropic?.model || 'claude-3-5-sonnet-20241022',
      },
      api: {
        ...config.api,
        port: parseInt(process.env.API_PORT || '') || config.api?.port || 3000,
        host: process.env.API_HOST || config.api?.host || '0.0.0.0',
      },
    };
  }

  private loadFromEnv(): ClientConfig {
    const servers: Record<string, MCPServerConfig> = {};

    // Look for MCP_SERVER_* environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('MCP_SERVER_')) {
        const serverName = key.replace('MCP_SERVER_', '').toLowerCase();
        const serverPath = process.env[key];
        
        if (serverPath) {
          servers[serverName] = this.createServerConfigFromPath(serverName, serverPath);
        }
      }
    });

    return {
      servers,
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      },
      api: {
        port: parseInt(process.env.API_PORT || '3000'),
        host: process.env.API_HOST || '0.0.0.0',
      },
    };
  }

  private createServerConfigFromPath(name: string, path: string): MCPServerConfig {
    const extension = path.split('.').pop()?.toLowerCase();
    let command: string;
    
    switch (extension) {
      case 'js':
        command = 'node';
        break;
      case 'py':
        command = process.platform === 'win32' ? 'python' : 'python3';
        break;
      case 'jar':
        command = 'java';
        return {
          name,
          transport: {
            type: 'stdio',
            stdio: {
              command,
              args: ['-jar', path],
            },
          },
        };
      default:
        command = path; // Assume it's an executable
        return {
          name,
          transport: {
            type: 'stdio',
            stdio: {
              command,
              args: [],
            },
          },
        };
    }

    return {
      name,
      transport: {
        type: 'stdio',
        stdio: {
          command,
          args: [path],
        },
      },
    };
  }

  getConfig(): ClientConfig {
    return this.config;
  }

  getServerConfig(serverName: string): MCPServerConfig | undefined {
    return this.config.servers[serverName];
  }

  getServerNames(): string[] {
    return Object.keys(this.config.servers);
  }

  hasAnthropicConfig(): boolean {
    return !!this.config.anthropic?.apiKey;
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (Object.keys(this.config.servers).length === 0) {
      errors.push('No MCP servers configured. Add servers to mcp-config.json or set MCP_SERVER_* environment variables.');
    }

    // Validate each server config
    Object.entries(this.config.servers).forEach(([name, config]) => {
      if (config.transport.type === 'stdio' && !config.transport.stdio) {
        errors.push(`Server ${name}: stdio transport configured but missing stdio configuration`);
      }
      if (config.transport.type === 'sse' && !config.transport.sse) {
        errors.push(`Server ${name}: sse transport configured but missing sse configuration`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
} 