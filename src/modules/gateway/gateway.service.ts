import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import axios, { AxiosRequestConfig } from 'axios';
import { Request, Response } from "express";
import { ApiKeysService } from '../api-keys/api-keys.service';
import { RateLimitRulesService } from "../rate-limit-rules/rate-limit-rules.service";
import { SlidingWindowStrategy } from "./strategies/sliding-window.strategy";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class GatewayService{
    private readonly logger = new Logger(GatewayService.name);

    constructor(
        private readonly apiKeysService: ApiKeysService,
        private readonly rateLimitRulesService: RateLimitRulesService,
        private readonly slidingWindow: SlidingWindowStrategy,
        private readonly prisma: PrismaService,
    ){}

    async handleRequest(req: Request, res: Response, path: string){
        const startTime = Date.now();

        // Extract API key
        const rawKey = req.headers['x-api-key'] as string;
        if(!rawKey) {
            throw new HttpException('Missing x-api-key header', HttpStatus.UNAUTHORIZED);
        }

        // Validate the key
        const apiKey = await this.apiKeysService.validateRawKey(rawKey);
        const { project } = apiKey;

        // Load the rate limit rule
        const rule = await this.rateLimitRulesService.getActiveRuleForProject(project.id);

        // Check and increment Redis counter
        if(rule) {
            const { allowed, remaining, retryAfter }  = await this.slidingWindow.check(
                apiKey.id,
                project.id,
                rule.maxRequests,
                rule.windowSeconds,
            );

            // always set rate limit headers — clients need these to self-throttle
            // X-RateLimit-* is the de facto standard (used by GitHub, Stripe, etc.)
            res.setHeader('X-RateLimit-Limit', rule.maxRequests);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Window', rule.windowSeconds);

            if(!allowed) {
                res.setHeader('Retry-After', retryAfter);

                // log the blocked req before throwing
                this.logRequest(apiKey.id, req.method, path, 429, Date.now() - startTime, req.ip ?? '');
                throw new HttpException(
                    {
                        statusCode: 429,
                        error: 'Too Many Requests',
                        message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                    );
            }
        }

        // Proxy req to upstream
        const upstreamUrl = `${project.upstreamUrl}/${path}`.replace(/([^:]\/)\/+/g, '$1');
        
        const config: AxiosRequestConfig = {
            method: req.method as any,
            url: upstreamUrl,

            headers: {
                ...req.headers,
                host: undefined,
                'x-api-key': undefined,
                'x-forwarded-for': req.ip,
                'x-gateway-project': project.slug,
            },
            // forward body for POST/PUT/PATCH
            data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
            //forward query params
            params: req.query,
             // 10 second timeout — don't let a slow upstream hang our gateway forever
            timeout: 10000,
            // don't throw on 4xx/5xx from upstream — we want to forward those responses as-is
            validateStatus: () => true,
        };

        let upstreamStatus = 502;
        let upstreamData: any = null;

        try {
            const upstreamResponse = await axios(config);
            upstreamStatus = upstreamResponse.status;
            upstreamData = upstreamResponse.data;

            // forward upstream response headers to the client
            // but skip headers that conflict with our response setup
            const skipHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
            Object.entries(upstreamResponse.headers).forEach(([key, value]) => {
                if (!skipHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, value as string);
                }
            });

            res.status(upstreamStatus).json(upstreamData);
        } catch (err: any) {
              // axios only throws on network errors (timeout, DNS failure, refused connection)
            // not on 4xx/5xx — those are caught above with validateStatus
            this.logger.error(`Upstream request failed for project ${project.slug}`, err.message);
            upstreamStatus = 502;
            res.status(502).json({
                statusCode: 502,
                error: 'Bad Gateway',
                message: 'Upstream service is unavailable',
            });
            } finally {
            // ── Step 7: Log the request ─────────────────────────────────────────────
            // fire-and-forget — we don't await this because logging must never
            // slow down or block the response. If logging fails, we log the error
            // but the client already got their response
            this.logRequest(
                apiKey.id,
                req.method,
                path,
                upstreamStatus,
                Date.now() - startTime,
                req.ip ?? '',
            );
            
            }
    }

    private logRequest(
    apiKeyId: string,
    method: string,
    path: string,
    statusCode: number,
    latencyMs: number,
    ipAddress: string,
  ) {
    // deliberately not awaited — fire and forget
    this.prisma.requestLog
      .create({
        data: { apiKeyId, method, path, statusCode, latencyMs, ipAddress },
      })
      .catch((err) => {
        // never let a logging failure crash the process
        this.logger.error('Failed to write request log', err.message);
      });
  }
}