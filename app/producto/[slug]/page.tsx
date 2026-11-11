import { getCategories, getProductBySlug, getProducts, getProductVariations, Shoe } from '@/lib/woocommerce';
import Image from 'next/image';
import Link from 'next/link';
import { AddToCartButton } from './AddToCartButton';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

function getProductViews(shoe: Shoe): number {
    const viewsMeta = shoe.meta_data?.find(
        (m) => m.key === 'views' || m.key === 'woolentor_views_count_product'
    );
    return viewsMeta ? parseInt(String(viewsMeta.value), 10) || 0 : 0;
}

async function ProductDetails({ params }: { params: Promise<{ slug: string }> }) {
    await connection();
    const { slug } = await params;
    const shoe = await getProductBySlug(slug);

    if (!shoe) {
        notFound();
    }

    const [variations, categories, allProducts] = await Promise.all([
        getProductVariations(shoe.id),
        getCategories(),
        getProducts(),
    ]);

    const popularProducts = [...allProducts]
        .sort((a, b) => getProductViews(b) - getProductViews(a))
        .slice(0, 5);

    const activeVariation = variations.find((v) => v.purchasable && v.stock_status === 'instock') || variations[0];
    const regularPrice = activeVariation?.regular_price || shoe.regular_price;
    const currentPrice = activeVariation?.price || shoe.price;
    const primaryCategory = shoe.categories?.[0];

    return (
        <div>
            {/* Breadcrumb como en WordPress: Inicio › Categoría › Producto */}
            <nav className="text-xs uppercase tracking-wider text-gray-500 mb-8 pb-4 border-b flex items-center gap-2">
                <Link href="/" className="hover:text-pink-600 transition-colors">
                    Inicio
                </Link>
                <span>›</span>
                {primaryCategory && (
                    <>
                        <Link
                            href={`/?categoria=${primaryCategory.slug}`}
                            className="text-gray-600 hover:text-pink-600 transition-colors"
                        >
                            {primaryCategory.name}
                        </Link>
                        <span>›</span>
                    </>
                )}
                <span className="text-gray-900 font-bold">{shoe.name}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Left Sidebar de WordPress: Categorías + Populares */}
                <aside className="lg:col-span-1 space-y-10 order-2 lg:order-1">
                    {/* Widget: Comprar por Categorías */}
                    <div className="border border-gray-200 p-6 bg-white">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b pb-3 mb-4">
                            Comprar por Categorías
                        </h3>
                        <ul className="space-y-2.5 text-sm text-gray-700">
                            {categories.map((cat) => (
                                <li key={cat.id}>
                                    <Link
                                        href={`/?categoria=${cat.slug}`}
                                        className="flex justify-between items-center hover:text-pink-600 transition-colors"
                                    >
                                        <span>{cat.name}</span>
                                        <span className="text-xs text-gray-400">({cat.count})</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Widget: Populares */}
                    <div className="border border-gray-200 p-6 bg-white">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b pb-3 mb-4">
                            Populares
                        </h3>
                        <div className="space-y-4">
                            {popularProducts.map((pop) => {
                                const views = getProductViews(pop);
                                return (
                                    <Link
                                        key={pop.id}
                                        href={`/producto/${pop.slug}`}
                                        className="flex gap-3 group items-center"
                                    >
                                        <div className="relative w-16 h-20 bg-gray-50 flex-shrink-0 overflow-hidden">
                                            {pop.images?.[0] && (
                                                <Image
                                                    src={pop.images[0].src}
                                                    alt={pop.name}
                                                    fill
                                                    sizes="64px"
                                                    className="object-cover group-hover:scale-105 transition-transform"
                                                />
                                            )}
                                        </div>
                                        <div className="text-xs">
                                            <p className="font-bold text-gray-800 group-hover:text-pink-600 uppercase transition-colors">
                                                {pop.name}
                                            </p>
                                            {pop.price && (
                                                <p className="text-pink-600 font-bold mt-1">
                                                    ${parseInt(pop.price).toLocaleString('es-CL')}
                                                </p>
                                            )}
                                            {views > 0 && (
                                                <p className="text-gray-400 mt-0.5">{views} views</p>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* Contenido Principal del Producto (3 columnas) */}
                <div className="lg:col-span-3 order-1 lg:order-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Imagen + Etiqueta Oferta */}
                        <div className="aspect-[4/5] relative bg-gray-50 border border-gray-100">
                            {shoe.on_sale && (
                                <span className="absolute top-4 left-4 z-10 bg-pink-600 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5">
                                    Oferta
                                </span>
                            )}
                            {shoe.images[0] && (
                                <Image
                                    src={shoe.images[0].src}
                                    alt={shoe.name}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 40vw"
                                    className="object-cover"
                                />
                            )}
                        </div>

                        {/* Resumen del Producto */}
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-bold text-gray-900 mb-4 uppercase tracking-tight">
                                {shoe.name}
                            </h1>

                            {/* Precio Regular tachado + Precio Oferta (o price_html de WooCommerce) */}
                            <div className="mb-6 flex items-baseline gap-3">
                                {regularPrice && regularPrice !== currentPrice ? (
                                    <>
                                        <del className="text-xl text-gray-400 font-medium">
                                            ${parseInt(regularPrice).toLocaleString('es-CL')}
                                        </del>
                                        <span className="text-3xl font-bold text-pink-600">
                                            ${parseInt(currentPrice || '0').toLocaleString('es-CL')}
                                        </span>
                                    </>
                                ) : currentPrice ? (
                                    <span className="text-3xl font-bold text-pink-600">
                                        ${parseInt(currentPrice).toLocaleString('es-CL')}
                                    </span>
                                ) : shoe.price_html ? (
                                    <div
                                        className="text-2xl font-bold text-pink-600 [&>del]:text-gray-400 [&>del]:text-lg [&>del]:mr-2 [&>ins]:no-underline [&>.screen-reader-text]:hidden"
                                        dangerouslySetInnerHTML={{ __html: shoe.price_html }}
                                    />
                                ) : (
                                    <span className="text-lg font-bold text-gray-400 uppercase">
                                        Sin stock disponible
                                    </span>
                                )}
                            </div>

                            <AddToCartButton shoe={shoe} variations={variations} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
    return (
        <main className="max-w-7xl mx-auto p-6 md:p-8 mt-6 bg-white">
            <Suspense fallback={<p className="text-center text-pink-600 font-bold uppercase animate-pulse">Cargando detalle del zapato...</p>}>
                <ProductDetails params={params} />
            </Suspense>
        </main>
    );
}