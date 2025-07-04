export const STATUS_CODES: Record<string, string> = {
    '100': 'Continue',
    '101': 'Switching Protocols',
    '102': 'Processing',
    '103': 'Early Hints',
    '200': 'OK',
    '201': 'Created',
    '202': 'Accepted',
    '203': 'Non-Authoritative Information',
    '204': 'No Content',
    '205': 'Reset Content',
    '206': 'Partial Content',
    '207': 'Multi-Status',
    '208': 'Already Reported',
    '226': 'IM Used',
    '300': 'Multiple Choices',
    '301': 'Moved Permanently',
    '302': 'Found',
    '303': 'See Other',
    '304': 'Not Modified',
    '305': 'Use Proxy',
    '307': 'Temporary Redirect',
    '308': 'Permanent Redirect',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '402': 'Payment Required',
    '403': 'Forbidden',
    '404': 'Not Found',
    '405': 'Method Not Allowed',
    '406': 'Not Acceptable',
    '407': 'Proxy Authentication Required',
    '408': 'Request Timeout',
    '409': 'Conflict',
    '410': 'Gone',
    '411': 'Length Required',
    '412': 'Precondition Failed',
    '413': 'Payload Too Large',
    '414': 'URI Too Long',
    '415': 'Unsupported Media Type',
    '416': 'Range Not Satisfiable',
    '417': 'Expectation Failed',
    '418': "I'm a Teapot",
    '421': 'Misdirected Request',
    '422': 'Unprocessable Entity',
    '423': 'Locked',
    '424': 'Failed Dependency',
    '425': 'Too Early',
    '426': 'Upgrade Required',
    '428': 'Precondition Required',
    '429': 'Too Many Requests',
    '431': 'Request Header Fields Too Large',
    '451': 'Unavailable For Legal Reasons',
    '500': 'Internal Server Error',
    '501': 'Not Implemented',
    '502': 'Bad Gateway',
    '503': 'Service Unavailable',
    '504': 'Gateway Timeout',
    '505': 'HTTP Version Not Supported',
    '506': 'Variant Also Negotiates',
    '507': 'Insufficient Storage',
    '508': 'Loop Detected',
    '509': 'Bandwidth Limit Exceeded',
    '510': 'Not Extended',
    '511': 'Network Authentication Required',
};

/**
 * Gère les erreurs Axios en logguant les détails et
 * retourne true si on doit relancer (retry), false sinon.
 */
export function handleAxiosError(
    error: unknown,
    { walletFile, log }: { walletFile: string; log: any }
): boolean {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        error.response
    ) {
        const err = error as {
            response: { data?: any; status?: number; headers?: any };
        };

        const status = err.response.status ?? 0;
        const statusMessage = STATUS_CODES[status.toString()] ?? "Unknown Status";

        log.error(`HTTP Error ${status} ${statusMessage} for wallet ${walletFile}`);
        log.error(`Response data: ${JSON.stringify(err.response.data)}`);

        switch (status) {
            case 401:
                log.error(
                    `Unauthorized error - vérifie le token ou l'authentification pour ${walletFile}`
                );
                return false; // Ne pas retry, problème d'auth
            case 403:
                log.error(`Forbidden - accès refusé pour ${walletFile}`);
                return false; // Ne pas retry
            case 404:
                log.error(`Not Found - ressource introuvable pour ${walletFile}`);
                return false; // Ne pas retry
            case 408: // Timeout
            case 429: // Too Many Requests (rate limiting)
            case 500: // Internal Server Error
            case 502:
            case 503:
            case 504:
                log.info(`Erreur temporaire, retry possible pour ${walletFile}`);
                return true; // Retry possible
            default:
                log.error(`Erreur HTTP non gérée, ne retry pas pour ${walletFile}`);
                return false;
        }
    }

    // Pour d’autres erreurs non Axios ou sans réponse
    log.error(`Erreur inconnue ou non Axios pour ${walletFile}: ${String(error)}`);
    return true; // Retry par défaut si on ne sait pas
}
