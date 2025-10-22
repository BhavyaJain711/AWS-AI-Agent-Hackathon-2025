# DynamoDB Table Definitions

## Overview
This document defines all DynamoDB tables required for the Multi-Agent Management System.

## Tables

### 1. Projects Table
**Table Name:** `multi-agent-projects`

| Attribute | Type | Key Type | Description |
|-----------|------|----------|-------------|
| userId | String | Partition Key | Cognito user ID (sub) |
| projectId | String | Sort Key | Unique project identifier |
| name | String | - | Project display name |
| description | String | - | Project description |
| agentIds | List | - | Array of agent IDs in this project |
| toolIds | List | - | Array of tool IDs in this project |
| mainAgentConfig | String | - | Reference to main agent config |
| envIds | List | - | Array of environment variable IDs in this project |
| deploymentIds | List | - | Array of deployment IDs for this project |
| createdAt | String | - | ISO timestamp |
| updatedAt | String | - | ISO timestamp |

**GSI:** None required for current use case

---

### 2. Agents Table
**Table Name:** `multi-agent-agents`

| Attribute | Type | Key Type | Description |
|-----------|------|----------|-------------|
| userId | String | Partition Key | Cognito user ID (sub) |
| agentId | String | Sort Key | Unique agent identifier |
| projectId | String | - | Project this agent belongs to |
| name | String | - | Agent display name (for UI listing) |
| config | Map | - | Complete agent configuration JSON |
| createdAt | String | - | ISO timestamp |
| updatedAt | String | - | ISO timestamp |

**Agent Config JSON Structure:**
```json
{
  "name": "Agent Name",
  "description": "Agent description",
  "type": "agent_tool",
  "system_prompt": "Agent's system prompt",
  "tools": ["custom-tool-1", "custom-tool-2"],
  "builtin_tools": ["web-search", "calculator"],
  "model": {
    "region": "us-east-1",
    "model_id": "anthropic.claude-3-sonnet-20240229-v1:0"
  }
}
```

**GSI:** None required for current use case

---

### 3. Tools Table
**Table Name:** `multi-agent-tools`

| Attribute | Type | Key Type | Description |
|-----------|------|----------|-------------|
| userId | String | Partition Key | Cognito user ID (sub) |
| toolId | String | Sort Key | Unique tool identifier |
| projectId | String | - | Project this tool belongs to |
| name | String | - | Tool display name (for UI listing) |
| config | Map | - | Complete tool configuration JSON |
| createdAt | String | - | ISO timestamp |
| updatedAt | String | - | ISO timestamp |

**Tool Config JSON Structure:**
```json
{
  "name": "tool-name",
  "description": "Tool description",
  "type": "frontend_action", // or "code"
  "inputSchema": {
    "type": "object",
    "properties": {
      "param1": { "type": "string", "description": "Parameter 1" }
    },
    "required": ["param1"]
  },
  "code": "// Code content for code tools only"
}
```

**GSI:** None required for current use case

**Note:** Tool names only need to be unique within a user's scope, not globally. Since we query by userId (PK), we can check name uniqueness within a user's tools by filtering the query results, which is efficient enough for the expected scale.

---

### 4. Main Agent Configuration Table
**Table Name:** `multi-agent-main-config`

| Attribute | Type | Key Type | Description |
|-----------|------|----------|-------------|
| userId | String | Partition Key | Cognito user ID (sub) |
| configId | String | Sort Key | Format: "project-{projectId}" |
| projectId | String | - | Project this main config belongs to |
| config | Map | - | Complete main agent configuration JSON |
| createdAt | String | - | ISO timestamp |
| updatedAt | String | - | ISO timestamp |

**Main Agent Config JSON Structure:**
```json
{
  "name": "Main Orchestrator",
  "description": "Main orchestrator agent description",
  "system_prompt": "Main agent system prompt",
  "model": {
    "region": "us-east-1",
    "model_id": "anthropic.claude-3-sonnet-20240229-v1:0"
  }
}
```

---

### 5. Environment Variables Table
**Table Name:** `multi-agent-environment`

| Attribute | Type | Key Type | Description |
|-----------|------|----------|-------------|
| userId | String | Partition Key | Cognito user ID (sub) |
| envId | String | Sort Key | Format: "project-{projectId}-{key}" |
| projectId | String | - | Project this env var belongs to |
| key | String | - | Environment variable key |
| value | String | - | Environment variable value |
| createdAt | String | - | ISO timestamp |
| updatedAt | String | - | ISO timestamp |

---

### 6. Deployments Table
**Table Name:** `multi-agent-deployments`

| Attribute | Type | Key Type | Description |
|-----------|------|----------|-------------|
| userId | String | Partition Key | Cognito user ID (sub) |
| deploymentId | String | Sort Key | Unique deployment identifier |
| projectId | String | - | Project being deployed |
| status | String | - | "pending", "deploying", "success", "failed" |
| config | Map | - | Complete system configuration |
| error | String | - | Error message if failed |
| logs | List | - | Array of log messages |
| createdAt | String | - | ISO timestamp |
| updatedAt | String | - | ISO timestamp |

**GSI:** None required for current use case

---

### 7. Built-in Tools Reference Table
**Table Name:** `multi-agent-builtin-tools`

| Attribute | Type | Key Type | Description |
|-----------|------|----------|-------------|
| toolName | String | Partition Key | Built-in tool name |
| description | String | - | Tool description |
| type | String | - | Tool type |
| inputSchema | Map | - | JSON schema for tool inputs |
| category | String | - | Tool category |
| isActive | Boolean | - | Whether tool is available |

**Note:** This table is populated by system administrators and is read-only for users.

## Access Patterns

### Projects
1. **List user's projects**: Query by userId (PK)
2. **Get specific project**: Get item by userId (PK) + projectId (SK)
3. **Create project**: Put item with userId + generated projectId
4. **Update project**: Update item by userId + projectId
5. **Delete project**: Delete item by userId + projectId (cascade delete agents, tools, etc.)

### Agents
1. **List project's agents**: Query by userId (PK), filter by projectId
2. **Get specific agent**: Get item by userId (PK) + agentId (SK)
3. **Create agent**: Put item with userId + generated agentId + projectId
4. **Update agent**: Update item by userId + agentId
5. **Delete agent**: Delete item by userId + agentId, remove from project's agentIds

### Tools
1. **List project's tools**: Query by userId (PK), filter by projectId
2. **Get specific tool**: Get item by userId (PK) + toolId (SK)
3. **Check tool name uniqueness**: Query GSI by toolName
4. **Create tool**: Put item with userId + generated toolId + projectId
5. **Update tool**: Update item by userId + toolId
6. **Delete tool**: Delete item by userId + toolId, remove from project's toolIds

### Main Configuration
1. **Get project main config**: Get item by userId (PK) + "project-{projectId}" (SK)
2. **Update project main config**: Put/Update item by userId + "project-{projectId}"

### Environment Variables
1. **List project env vars**: Query by userId (PK), filter by projectId
2. **Get specific env var**: Get item by userId (PK) + "project-{projectId}-{key}" (SK)
3. **Set env var**: Put item with userId + "project-{projectId}-{key}"
4. **Delete env var**: Delete item by userId + "project-{projectId}-{key}"

### Deployments
1. **List project deployments**: Query by userId (PK), filter by projectId
2. **Get specific deployment**: Get item by userId (PK) + deploymentId (SK)
3. **Filter by status**: Query by userId, then filter results by status (efficient for user-scoped queries)
4. **Create deployment**: Put item with userId + generated deploymentId + projectId

### Built-in Tools
1. **List all built-in tools**: Scan table where isActive = true
2. **Get specific built-in tool**: Get item by toolName (PK)

## Indexes Summary

No GSI indexes are required for the current use case. All queries are efficiently handled using the primary keys and filtering on query results.

## Capacity Planning

**Initial Settings (can be adjusted based on usage):**
- **Read Capacity**: 5 RCU per table
- **Write Capacity**: 5 WCU per table
- **Billing Mode**: On-Demand (recommended for variable workloads)

## Security

- **Encryption**: Server-side encryption enabled
- **Access Control**: IAM roles with least privilege
- **VPC**: Optional VPC endpoints for enhanced security
- **Backup**: Point-in-time recovery enabled for production