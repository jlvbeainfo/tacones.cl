import { NextRequest } from 'next/server';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const wpBaseUrl = (
        process.env.NEXT_PUBLIC_WORDPRESS_URL ||
        (process.env.WOOCOMMERCE_API_URL ? new URL(process.env.WOOCOMMERCE_API_URL).origin : '')
    ).replace(/\/$/, '');

    if (!wpBaseUrl || !Array.isArray(path) || path.length === 0) {
        return new Response('Not Found', { status: 404 });
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

        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const buffer = await upstream.arrayBuffer();

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch {
        return new Response('Bad Gateway', { status: 502 });
    }
}
