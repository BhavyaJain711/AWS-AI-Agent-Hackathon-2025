# Lambda Functions Issues

## Critical Issues

### 1. **list-tools.js** - Inefficient Query
**Problem:** Uses `begins_with(toolId, :projectId)` which is fragile and assumes toolId starts with projectId
**Solution:** Should either:
- Get project first, then batch get tools from `toolIds` array (like list-agents)
- Or use FilterExpression with `projectId = :projectId` (but this scans all user's tools)

### 2. **list-env-vars.js** - Wrong Query Pattern
**Problem:** Uses `begins_with(envVarId, :projectId)` but according to table-definitions.md, envId format is `project-{projectId}-{key}`
**Solution:** Should use FilterExpression with `projectId = :projectId` or get from project's `envIds` array

### 3. **set-env-var.js** - Wrong envVarId Generation
**Problem:** Generates random ID with `generateId()` but table-definitions.md says envId should be `project-{projectId}-{key}`
**Solution:** Should use `envId: \`project-\${projectId}-\${key}\`` format

### 4. **delete-agent.js** - Inefficient Array Update
**Problem:** Gets entire project, filters array in Lambda, then updates
**Solution:** Could use DynamoDB's native list operations, but current approach works (just not optimal)

## Code Quality Issues

### 1. **Unused Parameters**
Multiple files have unused `context` parameter:
- delete-agent.js
- get-agent.js
- update-agent.js
- list-env-vars.js
- set-env-var.js
- get-main-config.js
- update-main-config.js

### 2. **Empty Lines**
Many files have unnecessary empty lines after `try {`

### 3. **Inconsistent Error Handling**
Some files have detailed error handling, others just generic 500 errors

### 4. **No Input Validation**
Most functions don't validate input formats or required fields properly

## Files That Need Fixing

### High Priority (Broken Functionality)
1. `tools/list-tools.js` - Wrong query pattern
2. `environment/list-env-vars.js` - Wrong query pattern  
3. `environment/set-env-var.js` - Wrong ID format

### Medium Priority (Code Quality)
4. `agents/delete-agent.js` - Remove unused context, clean up
5. `agents/get-agent.js` - Remove unused context, clean up
6. `agents/update-agent.js` - Remove unused context, clean up
7. `config/get-main-config.js` - Remove unused context, clean up
8. `config/update-main-config.js` - Remove unused context, clean up

### Already Fixed
- `agents/list-agents.js` ✓
