import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

export type ApiErrorResponse = {
	success: false;
	error: string;
	code: string;
	details?: unknown;
};

export function sendError(res: Response, status: number, payload: Omit<ApiErrorResponse, 'success'> & { details?: unknown }): void {
	res.status(status).json({
		success: false,
		error: payload.error,
		code: payload.code,
		...(payload.details !== undefined ? { details: payload.details } : {}),
	});
}

export const notFoundHandler: RequestHandler = (req, res) => {
	sendError(res, 404, {
		error: 'Route not found',
		code: 'NOT_FOUND',
		details: { path: req.originalUrl },
	});
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	if (res.headersSent) return;

	const includeDetails = process.env.NODE_ENV !== 'production';

	sendError(res, 500, {
		error: 'Internal Server Error',
		code: 'INTERNAL_ERROR',
		details: includeDetails && error instanceof Error ? { message: error.message } : undefined,
	});
};
