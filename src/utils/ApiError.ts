class ApiError extends Error {

    statusCode: Number;
    code: string;
    details: unknown[];

    constructor(statusCode: Number,code: string, message: string, details: unknown[] = []) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(code: string, message: string, details: unknown[] = []) {
        return new ApiError(400, code, message, details);
    }
    static notFound(message = 'Resource not found') {
        return new ApiError(404, 'NOT_FOUND', message);
    }
    static conflict(code: string, message: string) {
        return new ApiError(409, code, message);
    }
    static forbidden(code: string, message: string) {
        return new ApiError(403, code, message);
    }
    static internal(message = 'Internal server error') {
        return new ApiError(500, 'SERVER_ERROR', message);
    }
}

export default ApiError;