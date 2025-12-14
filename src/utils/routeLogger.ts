import type { Application } from 'express';
import type { Logger } from '../telemetry/logger';

type ExpressLayer = {
	route?: {
		path?: string;
		methods?: Record<string, boolean>;
		stack?: unknown[];
	};
};

const hasRoute = (layer: ExpressLayer): layer is Required<Pick<ExpressLayer, 'route'>> & ExpressLayer => layer.route !== undefined;

export function logRoutes(app: Application, logger: Logger, context: string): void {
	const appWithRouter = app as unknown as { _router?: { stack?: ExpressLayer[] } };
	const stack = appWithRouter._router?.stack;

	if (!Array.isArray(stack)) {
		logger.debug('route_logger_unavailable', { context });
		return;
	}

	const routes = stack.filter(hasRoute).map((layer) => ({
		path: layer.route.path ?? '',
		methods: Object.keys(layer.route.methods ?? {}),
		stack: layer.route.stack?.length ?? 0,
	}));

	logger.debug('routes_registered', {
		context,
		totalRoutes: routes.length,
		routes,
	});
}
