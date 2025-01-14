// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Context } from '@azure/functions';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export abstract class WebController {
    public context: Context;

    constructor(@inject(ContextAwareLogger) protected readonly logger: ContextAwareLogger) {}

    public abstract readonly apiVersion: string;

    public abstract readonly apiName: string;

    public async invoke(requestContext: Context, ...args: any[]): Promise<unknown> {
        this.context = requestContext;

        try {
            this.logger.setCommonProperties(this.getBaseTelemetryProperties());

            let result: unknown;
            if (this.validateRequest(...args)) {
                result = await this.handleRequest(...args);
            }

            this.setResponseContentTypeHeader();

            return result;
        } catch (error) {
            this.logger.logError('Encountered an error while processing HTTP web request.', { error: System.serializeError(error) });
            throw error;
        }
    }

    protected abstract validateRequest(...args: any[]): boolean;

    protected abstract handleRequest(...args: any[]): Promise<unknown>;

    protected getBaseTelemetryProperties(): { [name: string]: string } {
        return {
            apiName: this.apiName,
            apiVersion: this.apiVersion,
            controller: this.constructor.name,
            invocationId: this.context.invocationId,
        };
    }

    private setResponseContentTypeHeader(): void {
        if (this.context !== undefined && this.context.res !== undefined) {
            const jsonContentType = 'application/json; charset=utf-8';
            if (this.context.res.headers === undefined) {
                this.context.res.headers = {
                    'content-type': jsonContentType,
                    'X-Content-Type-Options': 'nosniff',
                };
            } else if (this.context.res.headers['content-type'] === undefined) {
                this.context.res.headers['content-type'] = jsonContentType;
                this.context.res.headers['X-Content-Type-Options'] = 'nosniff';
            }
        }
    }
}
