# Lambda Layer - Common Dependencies

This directory contains the Lambda Layer that provides common dependencies for all Lambda functions in the Multi-Agent Management System.

## Structure

```
lambda-layer/
└── nodejs/
    ├── package.json
    ├── package-lock.json
    └── node_modules/
```

## Dependencies

- `@aws-sdk/client-dynamodb`: AWS SDK v3 DynamoDB client
- `@aws-sdk/lib-dynamodb`: AWS SDK v3 DynamoDB Document client

## Usage

The layer is automatically attached to all Lambda functions via the SAM template's `Globals` section. Functions can import dependencies normally:

```typescript
import { dynamoDb } from '../../shared/dynamodb-client';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
```

## Building

When you run `sam build`, this layer will be built once and reused by all Lambda functions, making the build process faster and more efficient.

## Adding Dependencies

To add new common dependencies:

1. Update `nodejs/package.json`
2. Run `npm install` in the `nodejs/` directory
3. Rebuild with `sam build`