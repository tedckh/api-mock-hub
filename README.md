# API Mock Hub

This project is a "hybrid" mock API server built with Node.js and Express. It is designed to serve predefined mock JSON data for frontend development and to act as a callable "tool" for AI models.

It supports two types of requests:
1.  **REST API (for Frontend):** Simple `GET` requests to paths like `/api/users` will read a corresponding `.json` file from the `mocks` directory and return its content.
2.  **MCP (for AI Models):** A `POST` request to the `/mcp` endpoint allows an AI model to call tools to get or write mock data.

## Prerequisites

- Node.js (v18 or later)
- npm
- Docker (optional)

## Installation

```bash
npm install
```

## Running the Server

### With Node.js

To start the server in development mode (with auto-reloading via `ts-node`), run:

```bash
npm run dev
```

### With Docker

This project includes a `Dockerfile` and `docker-compose.yml`.

```bash
docker-compose up --build
```

The server will start and listen on `http://localhost:3037`.

## How It Works

The server provides two MCP tools:

- **`get_mock_data`**: Reads a mock data file.
- **`write_mock_data`**: Creates or overwrites a mock data file.

## Working with an AI Assistant (Conversational Workflow)

This server is designed to be managed through conversational commands given to a capable AI assistant (like the Gemini CLI) that has been configured to use this server as a tool.

The assistant will translate your natural language requests into the formal MCP tool calls that the server understands.

### Example 1: Getting Mock Data

**You say:**
> "get the data for /api/users"

**The AI does this in the background:**
The assistant calls the `get_mock_data` tool, which makes a `POST` request to the `/mcp` endpoint with this body:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_mock_data",
    "arguments": { "path": "/api/users" }
  }
}
```

### Example 2: Adding or Updating Mock Data

**You say:**
> "add an endpoint for /api/products with the content `[{\"id\": \"prod-1\"}]`"

**The AI does this in the background:**
The assistant calls the `write_mock_data` tool, which makes a `POST` request to the `/mcp` endpoint with this body:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "write_mock_data",
    "arguments": {
      "path": "/api/products",
      "content": "[{\"id\": \"prod-1\"}]"
    }
  }
}
```

This workflow allows you to manage the entire mock server without writing JSON or `curl` commands manually.

## How to Add/Update Mock Endpoints

This server is file-based. You can add or update endpoints by creating or modifying `.json` files in the `mocks` directory. The folder structure inside `mocks` must match the desired API path.

**Example:**

To create a mock response for the path `/api/users/123`, you would create the file `mocks/api/users/123.json`.

## Full Workflow Example: Adding and Getting an Endpoint

Here is a complete example of how you might add a new endpoint and then fetch data from it using `curl`.

### Step 1: Add the `/api/items` endpoint

To add this endpoint, you call the `write_mock_data` tool. Note that the `content` must be a string with escaped quotes.

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d 
  {
    "jsonrpc": "2.0",
    "id": "write-items",
    "method": "tools/call",
    "params": {
      "name": "write_mock_data",
      "arguments": {
        "path": "/api/items",
        "content": "[\"id\": \"item-1\", \"name\": \"Laptop\", \"quantity\": 15}, {\"id\": \"item-2\", \"name\": \"Keyboard\", \"quantity\": 50}]"
      }
    }
  }
\
  http://localhost:3037/mcp
```

### Step 2: Get data from the new endpoint

Now that the file is created, you can get its data using either a simple REST call or the `get_mock_data` tool.

**Option A: Simple REST `GET` (for frontends)**
```bash
curl http://localhost:3037/api/items
```

**Option B: MCP Tool Call (for AI)**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d 
  {
    "jsonrpc": "2.0",
    "id": "read-items",
    "method": "tools/call",
    "params": {
      "name": "get_mock_data",
      "arguments": {
        "path": "/api/items"
      }
    }
  }
\
  http://localhost:3037/mcp
```

## How to Use the Tools (Reference)

You (or an AI model) must send a `POST` request to the `/mcp` endpoint with a valid JSON-RPC body.

### Example: `get_mock_data`

This retrieves the data from `mocks/api/health.json`.

```json
{
  "jsonrpc": "2.0",
  "id": "read-test",
  "method": "tools/call",
  "params": {
    "name": "get_mock_data",
    "arguments": {
      "path": "/api/health"
    }
  }
}
```

### Example: `write_mock_data`

This creates or overwrites the `mocks/api/new-endpoint.json` file.

```json
{
  "jsonrpc": "2.0",
  "id": "write-test",
  "method": "tools/call",
  "params": {
    "name": "write_mock_data",
    "arguments": {
      "path": "/api/new-endpoint",
      "content": "{\"status\": \"ok\", \"message\": \"This was written by the tool!\"}"
    }
  }
}
```
**Note:** The `content` field must be a string, so the JSON payload needs to be properly escaped.

## Gemini CLI Integration (Optional)

If you use the Gemini CLI, you can register this server to make it a "known" tool that the AI assistant is aware of. This allows the assistant to call its tools more directly.

1.  Find your Gemini settings file at `~/.gemini/settings.json`.
2.  Add or update the `mcpServers` object to include an entry for this server:

```json
"mcpServers": {
  "api-mock-hub": {
    "httpUrl": "http://localhost:3037/mcp"
  }
  // ... other servers you may have registered
}
```
