import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { getProductVariations } from '@/lib/woocommerce';

interface CheckoutRequestItem {
    id: number;
    variationId?: number;
    quantity: number;
}

const MAX_CART_ITEMS = 20;
const MAX_ITEM_QUANTITY = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const ipRequests = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    if (ipRequests.size > 1000) {
        for (const [key, entry] of ipRequests) {
            if (entry.resetAt <= now) ipRequests.delete(key);
        }
    }

    const current = ipRequests.get(ip);
    if (!current || current.resetAt <= now) {
        ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
        return true;
    }

    current.count += 1;
    return false;
}

function getClientIp(request: NextRequest): string {
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function isPositiveInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export async function POST(request: NextRequest) {
    const noStoreHeaders = { 'Cache-Control': 'no-store' };

    try {
        const clientIp = getClientIp(request);
        if (isRateLimited(clientIp)) {
            return Response.json(
                { error: 'Demasiados intentos en poco tiempo. Espera un minuto e intenta nuevamente.' },
                { status: 429, headers: noStoreHeaders }
            );
        }

        const body = await request.json();
        const rawItems: unknown = body?.items;
        if (!Array.isArray(rawItems) || rawItems.length === 0) {
            return Response.json(
                { error: 'Tu carrito está vacío.' },
                { status: 400, headers: noStoreHeaders }
            );
        }

        if (rawItems.length > MAX_CART_ITEMS) {
            return Response.json(
                { error: `El carrito no puede superar los ${MAX_CART_ITEMS} productos distintos.` },
                { status: 400, headers: noStoreHeaders }
            );
        }

        const items: CheckoutRequestItem[] = [];
        for (const raw of rawItems) {
            const id = Number((raw as CheckoutRequestItem)?.id);
            const rawVariationId = (raw as CheckoutRequestItem)?.variationId;
            const variationId = rawVariationId !== undefined && rawVariationId !== null ? Number(rawVariationId) : undefined;
            const quantity = Number((raw as CheckoutRequestItem)?.quantity);

            if (!isPositiveInt(id) || (variationId !== undefined && !isPositiveInt(variationId)) || !isPositiveInt(quantity)) {
                return Response.json(
                    { error: 'Datos de producto inválidos en el carrito.' },
                    { status: 400, headers: noStoreHeaders }
                );
            }

            items.push({
                id,
                variationId,
                quantity: Math.min(MAX_ITEM_QUANTITY, quantity),
            });
        }

        const wpBaseUrl = (
            process.env.NEXT_PUBLIC_WORDPRESS_URL ||
            (process.env.WOOCOMMERCE_API_URL ? new URL(process.env.WOOCOMMERCE_API_URL).origin : '')
        ).replace(/\/$/, '');

        if (!wpBaseUrl) {
            return Response.json(
                { error: 'Falta configurar NEXT_PUBLIC_WORDPRESS_URL en las variables de entorno.' },
                { status: 500, headers: noStoreHeaders }
            );
        }

        const resolvedItems: { checkoutId: number; quantity: number }[] = [];
        for (const item of items) {
            const variations = await getProductVariations(item.id, { noStore: true });
            const inStockVariations = variations.filter(
                (v) => v.purchasable && v.stock_status === 'instock'
            );

            if (variations.length > 0 && inStockVariations.length === 0) {
                return Response.json(
                    { error: 'Uno o más productos de tu carrito ya no tienen stock disponible.' },
                    { status: 409, headers: noStoreHeaders }
                );
            }

            // Si ya tiene una variación válida en stock, la mantenemos; si no, tomamos la primera disponible
            const validVariation =
                inStockVariations.find((v) => v.id === item.variationId) ||
                inStockVariations[0];

            const maxAllowedQty = validVariation?.stock_quantity
                ? Math.min(MAX_ITEM_QUANTITY, Math.max(1, validVariation.stock_quantity))
                : MAX_ITEM_QUANTITY;

            resolvedItems.push({
                checkoutId: validVariation ? validVariation.id : (item.variationId || item.id),
                quantity: Math.min(maxAllowedQty, item.quantity),
            });
        }

        const cartData = resolvedItems.map((i) => `${i.checkoutId}:${i.quantity}`).join(',');
        const frontendUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, '');

        const params = new URLSearchParams({
            headless_cart: cartData,
            frontend_url: frontendUrl,
        });

        const signingSecret = process.env.CHECKOUT_SIGNING_SECRET?.trim();
        if (signingSecret) {
            const ts = Math.floor(Date.now() / 1000).toString();
            const payload = `${cartData}|${ts}|${frontendUrl}`;
            const sig = createHmac('sha256', signingSecret).update(payload).digest('hex');
            params.set('ts', ts);
            params.set('sig', sig);
        } else if (process.env.NODE_ENV === 'production') {
            console.warn('[Checkout API] ADVERTENCIA: CHECKOUT_SIGNING_SECRET no está configurado en producción.');
        }

        const checkoutUrl = `${wpBaseUrl}/checkout/?${params.toString()}`;

        return Response.json({ checkoutUrl, resolvedItems }, { headers: noStoreHeaders });
    } catch (error) {
        console.error('[Checkout API] Error preparando checkout:', error);
        return Response.json(
            { error: 'No se pudo preparar el checkout. Verifica la conexión con WooCommerce.' },
            { status: 502, headers: noStoreHeaders }
        );
    }
}

