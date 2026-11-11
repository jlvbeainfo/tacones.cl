import { getCategories, getProducts } from '@/lib/woocommerce';
import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

type SearchParamsPromise = Promise<{ categoria?: string; buscar?: string }>;

// Componente asíncrono que realiza la petición a WooCommerce
async function ProductGrid({ searchParams }: { searchParams: SearchParamsPromise }) {
  await connection();
  const { categoria, buscar } = await searchParams;

  let categoryId: number | undefined;
  let activeCategoryName: string | undefined;

  if (categoria) {
    const categories = await getCategories();
    const matchedCat = categories.find(
      (c) => c.slug.toLowerCase() === categoria.toLowerCase()
    );
    if (matchedCat) {
      categoryId = matchedCat.id;
      activeCategoryName = matchedCat.name;
    } else {
      return (
        <div className="text-center py-12 space-y-4">
          <p className="text-gray-500">No se encontraron productos en esta categoría.</p>
          <Link href="/" className="inline-block text-pink-600 font-bold uppercase text-sm hover:underline">
            ← Ver todo el catálogo
          </Link>
        </div>
      );
    }
  }

  const products = await getProducts({ categoryId, search: buscar });
  const isFiltering = Boolean(categoria || buscar);

  return (
    <>
      {!isFiltering && (
        <div className="relative w-full h-[60vh] bg-gray-900 flex items-center justify-center">
          <Image
            src="/image_7edb7d.jpg"
            alt="Nueva Colección"
            fill
            sizes="100vw"
            className="object-cover opacity-80"
            preload
          />
          <div className="relative z-10 text-center px-4">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight drop-shadow-lg">
              NUEVA COLECCIÓN
            </h1>
            <a
              href="#catalogo"
              className="inline-block bg-pink-600 text-white px-10 py-4 text-lg font-bold uppercase tracking-widest hover:bg-pink-700 transition-colors"
            >
              Comprar Ahora
            </a>
          </div>
        </div>
      )}

      <div id="catalogo" className="max-w-7xl mx-auto p-8 mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-wide">
            {buscar
              ? `Resultados para "${buscar}" (${products.length})`
              : activeCategoryName
              ? activeCategoryName
              : 'Tendencias'}
          </h2>
          {isFiltering && (
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-widest text-pink-600 hover:underline"
            >
              ✕ Limpiar filtro (Ver todo)
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-500">
              No se encontraron productos para esta selección.
            </p>
            <Link href="/" className="inline-block text-pink-600 font-bold uppercase text-sm hover:underline">
              ← Ver todo el catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {products.map((shoe) => (
              <Link
                href={`/producto/${shoe.slug}`}
                key={shoe.id}
                className="bg-white p-4 group flex flex-col cursor-pointer border border-transparent hover:border-pink-200 transition-colors"
              >
                <div className="aspect-[4/5] relative mb-4 bg-gray-50 overflow-hidden">
                  {shoe.on_sale && (
                    <span className="absolute top-2 left-2 z-10 bg-pink-600 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
                      Oferta
                    </span>
                  )}
                  {shoe.images[0] && (
                    <Image
                      src={shoe.images[0].src}
                      alt={shoe.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                </div>
                <div className="flex text-pink-600 text-sm mb-2">
                  {'★'.repeat(Math.max(1, Math.round(parseFloat(shoe.average_rating || '5'))))}
                  <span className="text-gray-400 ml-2 text-xs">({shoe.rating_count || 12})</span>
                </div>
                <h3 className="font-bold text-gray-800 leading-tight mb-2 uppercase text-sm tracking-wide">
                  {shoe.name}
                </h3>
                <p className="text-pink-600 font-bold text-lg mt-auto">
                  {shoe.price
                    ? `$${parseInt(shoe.price).toLocaleString('es-CL')}`
                    : 'Agotado'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// Componente principal (carga instantánea)
export default function Home({ searchParams }: { searchParams: SearchParamsPromise }) {
  return (
    <main>
      <Suspense fallback={<p className="text-center py-16 text-pink-600 font-bold uppercase animate-pulse">Cargando colección...</p>}>
        <ProductGrid searchParams={searchParams} />
      </Suspense>
    </main>
  );
}