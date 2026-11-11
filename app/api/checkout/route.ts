import { NextRequest } from 'next/server';
import { getProductVariations } from '@/lib/woocommerce';

interface CheckoutRequestItem {
    id: number;
    variationId?: number;
    quantity: number;
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const items: CheckoutRequestItem[] = Array.isArray(body?.items) ? body.items : [];

    const resolvedItems = await Promise.all(
        items.map(async (item) => {
            const variations = await getProductVariations(item.id);
            const inStockVariations = variations.filter(
                (v) => v.purchasable && v.stock_status === 'instock'
            );

            // Si ya tiene una variación válida en stock, la mantenemos; si no, tomamos la primera disponible
            const validVariation =
                inStockVariations.find((v) => v.id === item.variationId) ||
                inStockVariations[0];

            return {
                checkoutId: validVariation ? validVariation.id : (item.variationId || item.id),
                quantity: item.quantity,
            };
        })
    );

    const cartData = resolvedItems.map((i) => `${i.checkoutId}:${i.quantity}`).join(',');
    const firstItem = resolvedItems[0];
    const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const wpBaseUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || '').replace(/\/$/, '');

    const checkoutUrl = firstItem
        ? `${wpBaseUrl}/checkout/?headless_cart=${cartData}&frontend_url=${encodeURIComponent(frontendUrl)}`
        : `${wpBaseUrl}/checkout/`;

    return Response.json({ checkoutUrl, resolvedItems });
}

