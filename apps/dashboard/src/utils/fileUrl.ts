export const resolveFileUrl = (path?: string | null): string => {
    if (!path) return '';

    // Filter out error messages
    if (path.includes('ERR_') || path.includes('Not Found') || path.includes('Error') || path.length > 255) return '';

    // Already a standard URL
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
        return path;
    }

    // Backend Streaming Endpoint
    const BACKEND_HOST = '';

    // Check for temp files
    if (path.includes('temp')) {
        const tempName = path.split(/[/\\]/).pop();
        return `${BACKEND_HOST}/temp/${tempName}`;
    }

    // Check for standard file access via streaming
    // We reuse the logic: encode the full path for the stream endpoint
    // Assuming backend has /stream?path=...
    const encodedPath = encodeURIComponent(path);
    return `${BACKEND_HOST}/files/stream?path=${encodedPath}`;

    // Note: The Gallery implementation had complex logic involving `settings.root_download_path`.
    // Since we don't have access to global settings store here easily without context,
    // we rely on the robust `stream` endpoint which takes absolute paths.
};
