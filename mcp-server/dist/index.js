#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { close } from './db.js';
import { searchInterviewsSchema, searchInterviews, getInterviewDetailSchema, getInterviewDetail, getNpsSummarySchema, getNpsSummary, searchTopicsSchema, searchTopics, getDetractorInsightsSchema, getDetractorInsights, } from './tools.js';
const server = new McpServer({
    name: 'nps-agro',
    version: '1.0.0',
});
// Register tools
server.tool(searchInterviewsSchema.name, searchInterviewsSchema.description, searchInterviewsSchema.inputSchema, async ({ arguments: args }) => {
    const result = await searchInterviews(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool(getInterviewDetailSchema.name, getInterviewDetailSchema.description, getInterviewDetailSchema.inputSchema, async ({ arguments: args }) => {
    const result = await getInterviewDetail(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool(getNpsSummarySchema.name, getNpsSummarySchema.description, getNpsSummarySchema.inputSchema, async ({ arguments: args }) => {
    const result = await getNpsSummary(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool(searchTopicsSchema.name, searchTopicsSchema.description, searchTopicsSchema.inputSchema, async ({ arguments: args }) => {
    const result = await searchTopics(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool(getDetractorInsightsSchema.name, getDetractorInsightsSchema.description, getDetractorInsightsSchema.inputSchema, async ({ arguments: args }) => {
    const result = await getDetractorInsights(args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await close();
    process.exit(0);
});
// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
