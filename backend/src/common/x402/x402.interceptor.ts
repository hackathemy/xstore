import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import {
  X402PaymentReceipt,
  X402_HEADERS,
  encodeX402Header,
} from './types';

/**
 * X402 Response Interceptor
 * Handles X-Payment-Receipt headers for successful payments
 */
@Injectable()
export class X402ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse<Response>();

        // If response contains a payment receipt, add it to headers
        if (data && typeof data === 'object' && 'x402Receipt' in data) {
          const receipt = data.x402Receipt as X402PaymentReceipt;
          response.setHeader(
            X402_HEADERS.PAYMENT_RECEIPT,
            encodeX402Header(receipt),
          );

          // Remove internal receipt from response body
          const { x402Receipt, ...rest } = data;
          return rest;
        }

        return data;
      }),
    );
  }
}

/**
 * X402 Payment Required Exception
 * Throws HTTP 402 with payment details in response body and headers
 */
import { HttpException } from '@nestjs/common';
import { X402PaymentRequired, X402_CONTENT_TYPE } from './types';

export class X402PaymentRequiredException extends HttpException {
  constructor(paymentRequired: X402PaymentRequired) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'Payment Required',
        ...paymentRequired,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/**
 * X402 Exception Filter
 * Ensures proper headers are set for 402 responses
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
} from '@nestjs/common';

@Catch(X402PaymentRequiredException)
export class X402ExceptionFilter implements ExceptionFilter {
  catch(exception: X402PaymentRequiredException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as Record<string, unknown>;

    // Set X402-specific headers
    response.setHeader('Content-Type', X402_CONTENT_TYPE);
    response.setHeader(
      X402_HEADERS.PAYMENT_REQUIRED,
      Buffer.from(JSON.stringify(exceptionResponse)).toString('base64'),
    );

    response.status(status).json(exceptionResponse);
  }
}
