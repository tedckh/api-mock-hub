import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

/**
 * Core function to retrieve mock data from a file.
 * This is used by both the REST endpoint and the MCP tool.
 * @param requestedPath The API path (e.g., '/api/users')
 * @returns The parsed JSON data from the mock file.
 */
async function getMockData(requestedPath: string) {
    console.log(`Attempting to retrieve mock data for path: ${requestedPath}`);

    // Security: Basic sanitization to prevent directory traversal.
    if (requestedPath.includes('..')) {
        throw new Error('Invalid path: Directory traversal is not allowed.');
    }

    const mockFilePath = path.join(__dirname, '..', 'mocks', requestedPath.substring(1) + '.json');
    console.log(`Looking for file at: ${mockFilePath}`);

    try {
        const fileContent = await fs.readFile(mockFilePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            const newError = new Error(`Mock data not found for path: ${requestedPath}`);
            (newError as any).statusCode = 404;
            throw newError;
        }
        const newError = new Error(`Failed to read or parse mock data: ${error.message}`);
        (newError as any).statusCode = 500;
        throw newError;
    }
}

const server = new McpServer({
    name: 'mock-data-hub',
    version: '1.0.0'
});

server.registerTool(
    'get_mock_data',
    {
        title: 'Get Mock API Data',
        description: 'Retrieves a predefined JSON object for a given mock API path.',
        inputSchema: { 
            path: z.string().describe("The API path for the mock data (e.g., '/api/users')") 
        },
        outputSchema: { result: z.any() }
    },
    async (input: { path: string }) => {
        const jsonData = await getMockData(input.path);
        return {
            content: [{ type: 'text', text: JSON.stringify(jsonData, null, 2) }],
            structuredContent: { result: jsonData }
        };
    }
);

server.registerTool(
    'write_mock_data',
    {
        title: 'Write Mock API Data',
        description: 'Creates or overwrites a mock data file with the provided JSON content.',
        inputSchema: {
            path: z.string().describe("The API path for the mock data (e.g., '/api/users')"),
            content: z.string().describe("The JSON content to write to the file.")
        },
        outputSchema: { result: z.any() }
    },
    async (input: { path: string, content: string }) => {
        console.log(`Tool 'write_mock_data' called for path: ${input.path}`);

        // Security: Basic sanitization to prevent directory traversal.
        if (input.path.includes('..')) {
            throw new Error('Invalid path: Directory traversal is not allowed.');
        }

        const mockFilePath = path.join(__dirname, '..', 'mocks', input.path.substring(1) + '.json');
        console.log(`Attempting to write mock file to: ${mockFilePath}`);

        try {
            // Ensure the directory exists before writing the file.
            await fs.mkdir(path.dirname(mockFilePath), { recursive: true });
            await fs.writeFile(mockFilePath, input.content, 'utf-8');
            
            const successMessage = `Successfully wrote mock data for path: ${input.path}`;
            return {
                content: [{ type: 'text', text: successMessage }],
                structuredContent: { result: { status: 'ok', message: successMessage } }
            };
        } catch (error: any) {
            console.error(`Error writing mock file: ${error.message}`);
            throw new Error(`Failed to write mock data: ${error.message}`);
        }
    }
);

const app = express();
app.use(cors());
app.use(express.json());

app.post('/mcp', async (req, res) => {
    console.log('Received request on /mcp endpoint');
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });
    res.on('close', () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

app.get(/.*/, async (req, res) => {
    console.log(`Received GET request for path: ${req.path}`);
    try {
        const jsonData = await getMockData(req.path);
        res.json(jsonData);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

const port = parseInt(process.env.PORT || '3037');
app.listen(port, () => {
    console.log(`API Mock Hub running.`);
    console.log(`- MCP tool endpoint listening at http://localhost:${port}/mcp`);
    console.log(`- REST mock endpoints listening at http://localhost:${port}/*`);
});