API Gateway — Project Summary

What it is ???
A multi-tenant SaaS API Gateway — a service that sits between API consumers and upstream APIs, handling authentication, rate limiting, request proxying, logging, and event notifications. Think of it as a self-hosted, stripped-down version of Kong or AWS API Gateway.

What it does ???
Users register on the platform, create projects (each pointing to an upstream API), generate API keys for those projects, and configure rate limit rules. Any third-party caller who has an API key can then route their requests through the gateway instead of hitting the upstream API directly.
The gateway handles everything in between — it validates the key, enforces the rate limit, proxies the request, logs the traffic, and fires webhook notifications when thresholds are breached.

How it works — the full flow
Caller → Gateway → Validate Key (PostgreSQL)
                 → Check Rate Limit (Redis sliding window)
                 → Proxy Request (Axios → Upstream API)
                 → Log Request (PostgreSQL async)
                 → Dispatch Webhook if quota exceeded (background worker)
Each layer is independent and fails fast — if key validation fails, Redis is never touched. If the rate limit is exceeded, the upstream is never called. This keeps the gateway lean and predictable under load.

The modules and what each one owns:
 
- Auth handles user registration, login, and JWT issuance with refresh-safe token design. Passwords are bcrypt hashed, tokens expire in 15 minutes.
- Projects lets users register upstream APIs with a unique slug. The slug becomes part of the gateway URL — /gateway/my-project/* routes to that project's upstream URL.
- API Keys generates cryptographically random keys using crypto.randomBytes, stores only a SHA-256 hash in the database, and returns the raw key exactly once. Every gateway request hashes the incoming key and does a single DB lookup — fast and secure.
- Rate Limit Rules stores per-project throttling configuration — max requests, window size, and strategy. The strategy field tells the gateway which Redis algorithm to run.
- Gateway is the core engine. It chains key validation, Redis rate limiting via an atomic Lua script, Axios proxying, async PostgreSQL logging, and webhook dispatch into a single request pipeline. The Lua script runs atomically in Redis to prevent race conditions where two concurrent requests both read "under limit" and both get through.
- Request Logs exposes a paginated, filterable query interface over the traffic history — filter by method, status code, path, date range, or specific API key. Also exposes an aggregation endpoint for stats — total requests, average latency, error rate.
- Webhooks implements the transactional outbox pattern — events are written to PostgreSQL synchronously, then a background worker polls every 5 seconds, delivers via HTTP POST with HMAC-SHA256 signatures, and retries up to 3 times on failure. Storing events in the DB means no events are lost on server restart.
- Swagger auto-generates interactive documentation at /api/v1/docs with working examples, auth flows, and response schemas for every endpoint.
