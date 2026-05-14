import { ZodError } from "zod";
export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = "AppError";
    }
}
export function errorHandler(error, request, reply) {
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
            },
        });
    }
    if (error instanceof ZodError) {
        return reply.status(400).send({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid request data",
                details: error.errors,
            },
        });
    }
    if (error instanceof SyntaxError) {
        return reply.status(400).send({
            error: {
                code: "PARSE_ERROR",
                message: "Invalid JSON",
            },
        });
    }
    request.log.error(error);
    return reply.status(500).send({
        error: {
            code: "INTERNAL_ERROR",
            message: "Internal server error",
        },
    });
}
//# sourceMappingURL=error.js.map