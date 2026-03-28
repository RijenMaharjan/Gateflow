API Gateway & Rate Limiter as a Service

I’m currently building a mini API Gateway with rate limiting. Think of it like a tiny version of Kong or AWS API Gateway — developers will be able to:

- Register their APIs
- Generate and manage API keys
- Set rate limits
- Monitor API usage

Tech Stack 
- Backend: Node.js + NestJS
- Database: PostgreSQL / MongoDB
- Caching: Redis (for rate limiting)