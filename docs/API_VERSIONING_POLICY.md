# API Versioning Policy

## Overview

All Banking Buddy APIs are versioned using URL path versioning. The current version is **v1**.

## Version Format

All API endpoints follow the pattern: `/api/v{version}/{resource}`

Example:

- `/api/v1/users`
- `/api/v1/clients`
- `/api/v1/transactions`
- `/api/v1/ai/query`

## Current Version

**v1** - Current stable version (as of 2025-11-16)

## Backward Compatibility

- **v1 APIs will be maintained** for a minimum of 6 months after v2 is released
- Breaking changes will only be introduced in new major versions (v2, v3, etc.)
- Minor updates and bug fixes will be made within the same version without breaking changes
- API Gateway routes requests based on version number in the URL path

## Future Development

- **Version Routing**: API Gateway routes requests based on version number in the URL path
- **Multiple Versions**: Future versions (v2, v3, etc.) will coexist with v1
- **Infrastructure Support**: The API Gateway infrastructure supports adding new versions by creating new `/v2`, `/v3`, etc. resources alongside existing versions
- **Deprecation Policy**:
  - Deprecated versions will be announced 3 months in advance
  - Deprecated versions will remain available for 6 months after announcement
  - Migration guides will be provided for each version upgrade

## Version Selection

Clients must explicitly specify the version in the URL path. There is no default version routing - all requests must include the version number.

## Examples

### Current (v1)

```HTTP
GET /api/v1/users
POST /api/v1/clients
GET /api/v1/transactions
POST /api/v1/ai/query
```

### Future (v2 - when released)

```HTTP
GET /api/v2/users
POST /api/v2/clients
GET /api/v2/transactions
POST /api/v2/ai/query
```

## Implementation Details

- **API Gateway**: Routes are configured in Terraform with version-specific resources
- **Backend Services**: Controllers use `@RequestMapping("/api/v1/...")` annotations
- **Frontend**: API service uses versioned endpoints via `VITE_API_BASE_URL` environment variable (e.g., `http://localhost:8080/api/v1`)
- **Audit Logging**: Already uses `/api/v1/audit/logs` format

## Notes

- This policy ensures backward compatibility as required by non-functional requirements
- Version routing is implemented at the API Gateway level
- All services have been updated to use v1 format
- Future versions can be added by extending the existing infrastructure pattern
