#!/bin/bash

# Universal MCP Client Installation Script

echo "🚀 Installing Universal MCP Client..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build the project"
    exit 1
fi

# Make executables
echo "🔧 Setting up executables..."
chmod +x build/index.js build/server.js

# Create example config if it doesn't exist
if [ ! -f "mcp-config.json" ]; then
    echo "📝 Creating example configuration..."
    cp mcp-config.example.json mcp-config.json
    echo "⚠️  Please edit mcp-config.json with your MCP server paths"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "⚠️  Please edit .env with your configuration"
fi

echo ""
echo "✅ Universal MCP Client installed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit mcp-config.json with your MCP server paths"
echo "2. Optionally edit .env with your API keys"
echo "3. Run 'npm start' to start the CLI client"
echo "4. Run 'npm run start:api' to start the REST API server"
echo ""
echo "📖 For more information, see README.md" 