export const DEFAULT_DEV_WORKSPACE = 'local';
export const JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start with an insecure default.');
    }
    return secret;
})();
export const JWT_EXPIRES_IN_SECONDS = 60 * 60 * 12;
