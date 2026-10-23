class ApiError extends Error {

    statusCode: number;
    code: string;
    details: unknown[];

    constructor(statusCode: number,code: string, message: string, details: unknown[] = []) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            statusCode: this.statusCode,
            code: this.code,
            message: this.message,
            details: this.details,
        };
    }

    static badRequest(code: string, message: string, details: unknown[] = []) {
        return new ApiError(400, code, message, details);
    }
    static unAuthorized(code: string, message: string) {
        return new ApiError(401, code, message);
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