export interface ShoeVariation {
    id: number;
    price: string;
    regular_price: string;
    sale_price: string;
    on_sale: boolean;
    purchasable: boolean;
    stock_status: string;
    stock_quantity: number | null;
    sku: string;
    attributes: { name: string; slug: string; option: string }[];
}

export interface ProductCategory {
    id: number;
    name: string;
    slug: string;
    count: number;
}

export interface Shoe {
    id: number;
    name: string;
    slug: string;
    sku: string;
    price: string;
    regular_price: string;
    sale_price: string;
    price_html: string;
    on_sale: boolean;
    purchasable: boolean;
    stock_status: string;
    stock_quantity: number | null;
    description: string;
    short_description: string;
    images: { id?: number; src: string; alt?: string }[];
    average_rating: string;
    rating_count: number;
    categories?: { id: number; name: string; slug: string }[];
    variations?: number[];
    attributes?: { id: number; name: string; slug: string; options: string[] }[];
    default_attributes?: { id: number; name: string; option: string }[];
    related_ids?: number[];
    meta_data?: { id: number; key: string; value: unknown }[];
}

const credentials = btoa(`${process.env.WOOCOMMERCE_CONSUMER_KEY}:${process.env.WOOCOMMERCE_CONSUMER_SECRET}`);
const headers = { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' };

const wpOrigin = (
    process.env.NEXT_PUBLIC_WORDPRESS_URL ||
    (process.env.WOOCOMMERCE_API_URL ? new URL(process.env.WOOCOMMERCE_API_URL).origin : '')
).replace(/\/$/, '');

function maskUrl(text: string): string {
    if (!text || !wpOrigin) return text;
    return text.split(`${wpOrigin}/wp-content/`).join('/wp-content/');
}

function maskProductUrls(shoe: Shoe): Shoe {
    return {
        ...shoe,
        description: maskUrl(shoe.description || ''),
        short_description: maskUrl(shoe.short_description || ''),
        images: Array.isArray(shoe.images)
            ? shoe.images.map((img) => ({
                  ...img,
                  src: maskUrl(img.src),
              }))
            : [],
    };
}

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function stemSpanishWord(word: string): string {
    const w = normalizeText(word);
    const synonyms: Record<string, string> = {
        tacos: 'tacon',
        taco: 'tacon',
        tacones: 'tacon',
        botines: 'botin',
        sandalias: 'sandalia',
        zapatos: 'zapato',
        botas: 'bota',
        zuecos: 'sueco',
        zueco: 'sueco',
        suecos: 'sueco',
    };
    if (synonyms[w]) return synonyms[w];
    if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
    if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
    return w;
}

export async function getProducts(options?: { categoryId?: number; search?: string; perPage?: number }): Promise<Shoe[]> {
    // Si hay búsqueda por texto, traemos el catálogo completo (cacheado) para buscar con soporte de plurales, acentos, categorías y atributos (color/talla)
    if (options?.search) {
        const params = new URLSearchParams({ per_page: '100' });
        if (options.categoryId) {
            params.set('category', String(options.categoryId));
        }

        const res = await fetch(`${process.env.WOOCOMMERCE_API_URL}/products?${params.toString()}`, {
            headers,
            next: { revalidate: 3600 },
        });
        if (!res.ok) return [];
        const allProducts: Shoe[] = await res.json();
        if (!Array.isArray(allProducts)) return [];

        const rawTokens = normalizeText(options.search)
            .split(/\s+/)
            .filter((t) => t.length > 0 && t !== 'de' && t !== 'con' && t !== 'en');
        const stemmedTokens = rawTokens.map(stemSpanishWord);

        return allProducts.filter((shoe) => {
            const searchableParts = [
                shoe.name,
                shoe.slug,
                shoe.description,
                ...(shoe.categories?.map((c) => `${c.name} ${c.slug}`) || []),
                ...(shoe.attributes?.map((a) => `${a.name} ${a.options.join(' ')}`) || []),
            ];
            const haystack = normalizeText(searchableParts.join(' '));
            const haystackStemmed = haystack
                .split(/[^a-z0-9]+/)
                .filter(Boolean)
                .map(stemSpanishWord)
                .join(' ');

            return stemmedTokens.every(
                (token, idx) =>
                    haystack.includes(rawTokens[idx]) ||
                    haystack.includes(token) ||
                    haystackStemmed.includes(token)
            );
        }).map(maskProductUrls);
    }

    const params = new URLSearchParams({
        per_page: String(options?.perPage || 24),
    });
    if (options?.categoryId) {
        params.set('category', String(options.categoryId));
    }

    const res = await fetch(`${process.env.WOOCOMMERCE_API_URL}/products?${params.toString()}`, {
        headers,
        next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map(maskProductUrls) : [];
}

export async function getProductBySlug(slug: string): Promise<Shoe | null> {
    if (!slug) return null;
    const res = await fetch(`${process.env.WOOCOMMERCE_API_URL}/products?slug=${encodeURIComponent(slug)}`, {
        headers,
        next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const product = Array.isArray(data) ? data[0] || null : null;
    return product ? maskProductUrls(product) : null;
}

export async function getProductVariations(productId: number): Promise<ShoeVariation[]> {
    const res = await fetch(`${process.env.WOOCOMMERCE_API_URL}/products/${productId}/variations?per_page=50`, {
        headers,
        next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

export async function getCategories(): Promise<ProductCategory[]> {
    const res = await fetch(`${process.env.WOOCOMMERCE_API_URL}/products/categories?per_page=50&hide_empty=false`, {
        headers,
        next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const excludedSlugs = new Set(['uncategorized', 'sin-categorizar', 'coleccion-primavera-verano-2023']);
    const preferredOrder = ['zapatos', 'sandalias', 'botines', 'botas'];
    return Array.isArray(data)
        ? data
              .filter((c: ProductCategory) => !excludedSlugs.has(c.slug))
              .sort((a: ProductCategory, b: ProductCategory) => {
                  const idxA = preferredOrder.indexOf(a.slug);
                  const idxB = preferredOrder.indexOf(b.slug);
                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                  if (idxA !== -1) return -1;
                  if (idxB !== -1) return 1;
                  return a.name.localeCompare(b.name, 'es');
              })
        : [];
}