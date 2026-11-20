import { NextRequest } from 'next/server';

const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif)$/i;

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const wpBaseUrl = (
        process.env.NEXT_PUBLIC_WORDPRESS_URL ||
        (process.env.WOOCOMMERCE_API_URL ? new URL(process.env.WOOCOMMERCE_API_URL).origin : '')
    ).replace(/\/$/, '');

    if (!wpBaseUrl || !Array.isArray(path) || path.length < 2) {
        return new Response('Not Found', { status: 404 });
    }

    // Restringir estrictamente a /wp-content/uploads/ para no exponer logs, backups ni archivos de plugins
    if (path[0] !== 'uploads') {
        return new Response('Forbidden', { status: 403 });
    }

    // Bloquear path traversal y caracteres inválidos
    const hasInvalidSegment = path.some(
        (segment) =>
            !segment ||
            segment === '.' ||
            segment === '..' ||
            segment.includes('..') ||
            segment.includes('/') ||
            segment.includes('\\') ||
            segment.includes('\0')
    );
    const lastSegment = path[path.length - 1];
    if (hasInvalidSegment || !ALLOWED_IMAGE_EXTENSIONS.test(lastSegment)) {
        return new Response('Forbidden', { status: 403 });
    }

    const encodedPath = path.map((segment) => encodeURIComponent(segment)).join('/');
    const targetUrl = `${wpBaseUrl}/wp-content/${encodedPath}`;

    try {
        const upstream = await fetch(targetUrl, {
            next: { revalidate: 86400 },
        });

        if (!upstream.ok) {
            return new Response('Not Found', { status: upstream.status });
        }

        const contentType = upstream.headers.get('content-type') || '';
        if (!contentType.toLowerCase().startsWith('image/')) {
            return new Response('Unsupported Media Type', { status: 415 });
        }

        const buffer = await upstream.arrayBuffer();

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': "default-src 'none'; sandbox",
            },
        });
    } catch {
        return new Response('Bad Gateway', { status: 502 });
    }
}

