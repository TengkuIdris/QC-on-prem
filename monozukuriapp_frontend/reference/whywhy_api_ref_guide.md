# Why-Why Analysis AI Agent API Usage Guide

## 1. Overview

This document explains how to use the REST API provided by the "Why-Why Analysis AI Support System."

By using this API, you can invoke the Why-Why analysis functionality from external systems, execute dialogues, and retrieve analysis results.

## 2. Authentication

Requests to the API require authentication using either an API key or JWT token. Please include either one in the HTTP header of your request.

### 2.1 API Key Authentication

Specify the issued API key in the request header `X-API-Key`.

```
X-API-Key: YOUR_API_KEY
```

### 2.2 JWT Token Authentication

Specify the JWT token in the request header `Authorization` using the `Bearer` scheme.

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**What is JWT (JSON Web Token)?**

### 2.3 How to Obtain JWT Tokens

This API only performs JWT token verification and does not issue tokens.

API users must obtain JWT tokens from a separately prepared authentication server or Identity Provider (IdP). The typical acquisition flow is as follows:

1. The client application sends its ID, secret, and other credentials to the authentication server to request authentication.
2. Upon successful authentication, the authentication server issues a JWT token to the client.
3. The client calls this API by including the JWT token in the `Authorization: Bearer <token>` header.

### 2.4 Authentication from AWS Systems (Workload Identity Federation)

When the backend system is running on AWS, authentication using Google Cloud's **Workload Identity Federation** is the most secure and recommended method.

This mechanism allows secure API access without placing long-term credentials such as Google Cloud service account keys (private key files) in the AWS environment.

**Authentication Flow**

```
AWS Backend → AWS STS → Google Cloud STS → Why-Why Analysis API

1. Request AWS ID token
2. Issue AWS ID token
3. Exchange AWS token for Google token
4. Issue Google ID token (JWT)
5. Make API request with Google JWT
6. Verify JWT
7. Return API response
```

1. **Pre-configuration**: Create a "Workload Identity Pool" on the Google Cloud side and configure settings to trust specific AWS roles as Google Cloud service accounts.
2. **Token Exchange**: The AWS backend presents the ID token obtained from AWS credentials to Google Cloud's Security Token Service (STS).
3. **Obtain Google JWT**: Google STS verifies the AWS token and, if valid, issues a short-lived JWT with Google Cloud service account permissions.
4. **API Call**: The backend uses the obtained Google JWT to call this API.

**References:**
- Google Cloud Documentation: Authentication methods with Google (please refer to the Workload Identity Federation section)
- AWS Blog: Access AWS using a Google Cloud Platform native workload identity (this is the reverse access pattern, but useful for understanding the ID federation concept)

If authentication fails, HTTP status code `401 Unauthorized` will be returned.

## 3. Base URL

All API endpoints are based on the following base URLs:

- **Production environment**: `https://<your-production-domain>/v1`
- **Development environment (local)**: `http://127.0.0.1:8000/v1`

## 4. Endpoint Specifications

### 4.1 Create New Analysis Thread

Starts a new Why-Why analysis session (thread).

- **Method**: `POST`
- **Path**: `/threads`

**Request Body** (`application/json`)

Send information about the problem to be analyzed in the `problem` object.

```json
{
  "problem": {
    "title": "string (required, defect overview/problem title)",
    "product_name": "string (optional, product name)",
    "occurrence_date": "string (optional, ISO8601 datetime, defect discovery date)",
    "process": "string (optional, target process/line number)",
    "location": "string (optional, occurrence location - factory name/area)",
    "severity": "string (optional, problem severity, 'LOW'|'MEDIUM'|'HIGH')",
    "description": "string (optional, detailed problem description)",
    "man_details": "string (optional, Man details)",
    "machine_details": "string (optional, Machine details)",
    "material_details": "string (optional, Material details)",
    "method_details": "string (optional, Method details)",
    "measurement_details": "string (optional, Measurement details)",
    "environment_details": "string (optional, Environment details)",
    "timeline_analysis": "string (optional, timeline analysis)",
    "defect_types": [
      "string (optional, defect classification, 'APPEARANCE'|'DIMENSION'|'FUNCTION'|'MATERIAL'|'STRENGTH'|'DURABILITY'|'OTHER')"
    ],
    "other_defect_type": "string (optional, other defect classification details)",
    "frequency": "string (optional, occurrence frequency, 'FREQUENT'|'OCCASIONAL'|'RARE'|'FIRST_TIME')",
    "frequency_percentage": "string (optional, occurrence frequency percentage)",
    "investigations": [
      {
        "date": "string (optional, ISO8601 datetime, implementation date)",
        "content": "string (optional, investigation/test content)",
        "result": "string (optional, result)",
        "investigator": "string (optional, investigator)"
      }
    ],
    "direct_cause": "string (optional, direct cause)",
    "verification": {
      "method": "string (optional, verification method)",
      "result": "string (optional, result)",
      "date": "string (optional, ISO8601 datetime, implementation date)",
      "verifier": "string (optional, verifier)"
    },
    "language": "string (output language)"
  }
}
```

**Success Response** (`201 Created`)

Returns the created thread ID and creation time. This `thread_id` will be used in subsequent API calls.

```json
{
  "thread_id": "string (UUID, unique ID of the created thread)",
  "created_at": "string (ISO8601 datetime, creation time)"
}
```

### 4.2 Execute Analysis and Stream Progress

Executes analysis on the specified thread and streams progress in Server-Sent Events (SSE) format.

- **Method**: `POST`
- **Path**: `/threads/{thread_id}/stream`

**Path Parameters**

- `thread_id` (string, required): Target thread ID

**Request Body** (`application/json`)

Specify the response message from the user. For the first execution after thread creation, or when continuing analysis without an information request from the AI, send an empty object `{}`.

```json
{
  "user_message": "string (optional, user response message)",
  "is_retry": "boolean (optional, default false, if true indicates user is modifying and resubmitting input)"
}
```

**Usage Patterns:**

1. **Start/Continue Analysis**: `{}` to start or continue analysis
2. **User Response**: `{"user_message": "specific answer content"}` to continue analysis
3. **User Input Correction**: `{"user_message": "corrected answer", "is_retry": true}` to re-analyze

**Response** (SSE: `text/event-stream`)

Multiple events are sent sequentially according to analysis progress. Each event consists of `event: <event_name>` and `data: <JSON_data>`.

**Event: final_result**

Analysis is complete and returns the final result.

```json
// data:
{
  "event_type": "final_result",
  "thought": "string (agent's thought process)",
  "state": { /* Latest analysis state object. See GET /threads/{thread_id} for details */ }
}
```

**Event: info_request**

AI is requesting additional information from the user.

```json
// data:
{
  "event_type": "info_request",
  "thought": "string (agent's thought process)",
  "state": { /* Latest analysis state object. state.chat_history contains AI's question at the end */ }
}
```

**Event: others**

Events other than the above, such as thought processes during analysis progress.

```json
// data:
{
  "event_type": "string (name of action being executed by agent)",
  "thought": "string (agent's thought process)"
}
```

### 4.3 Get Latest Analysis State

Retrieves the latest analysis state of the specified thread.

- **Method**: `GET`
- **Path**: `/threads/{thread_id}`

**Path Parameters**

- `thread_id` (string, required): Target thread ID

**Success Response** (`200 OK`)

Returns the current state of the thread, dialogue history so far, analysis results, etc.

```json
{
  "thread_id": "string (thread ID)",
  "created_at": "string (ISO8601 datetime, thread creation time)",
  "updated_at": "string (ISO8601 datetime, latest checkpoint update time)",
  "status": "string (analysis state, 'running'|'waiting_for_input'|'completed'|'error')",
  "state": {
    "problem": { /* ProblemInput object created in 4.1 */ },
    "chat_history": [
      { "type": "string (human|ai)", "content": "string" }
    ],
    "why_nodes": [
      {
        "id": "string",
        "name": "string",
        "level": "integer",
        "parent_id": "string (optional)",
        "children_ids": ["string"],
        "supporting_facts": "string",
        "is_root_cause": "boolean",
        "root_cause_confidence": "float (optional)",
        "root_cause_judgement": "string",
        "recurrence_prevention_measures": "string"
      }
    ],
    "root_causes": [
      {
        "cause": "string",
        "confidence": "float",
        "judgement_reason": "string",
        "countermeasures": "string"
      }
    ]
  }
}
```

## 5. Code Samples

### cURL

**Thread Creation**

```bash
# Replace YOUR_JWT_TOKEN with the actual JWT obtained from your authentication server
curl -X POST "http://127.0.0.1:8000/v1/threads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "problem": {
      "title": "Uneven coating on Product A",
      "language": "ja"
    }
  }'
```

**Execute Analysis (Streaming)**

```bash
# Replace YOUR_JWT_TOKEN with the actual JWT obtained from your authentication server
curl -N -X POST "http://127.0.0.1:8000/v1/threads/{thread_id}/stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{}'
```

### Python (requests & sseclient-py)

See details

### TypeScript (axios & google-auth-library)

Implementation example for authentication via Workload Identity Federation from cloud environments such as AWS.

See details

## 6. Error Responses

The API uses standard HTTP status codes to indicate errors.

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | INVALID_ARGUMENT | Request format is incorrect (missing required fields, etc.) |
| 401 | UNAUTHENTICATED | Authentication failed (invalid API key, etc.) |
| 403 | PERMISSION_DENIED | Access not permitted (IP restriction violation, etc.) |
| 404 | NOT_FOUND | Specified resource not found (invalid thread_id, etc.) |
| 429 | RATE_LIMIT | Request rate exceeded limit |
| 500 | INTERNAL | Unexpected error occurred on the server |

## 7. Security Supplement

### IP Whitelist

Depending on security settings, only access from specific IP addresses may be permitted. If access is blocked, please verify that the source IP address is registered in the whitelist.

### Rate Limiting

To prevent excessive requests to the API, a request limit (default: 100 requests/hour) is in place. If the limit is exceeded, HTTP status code `429 Too Many Requests` will be returned.