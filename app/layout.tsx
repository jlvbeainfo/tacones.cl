import { CartProvider } from '@/context/CartContext';
import { getCategories } from '@/lib/woocommerce';
import { HeaderCart } from './HeaderCart';
import { SearchBar } from './SearchBar';
import Image from 'next/image';
import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Tacones.cl | Calzado de Mujer',
  description: 'La mejor tienda de zapatos para mujer en Chile.',
};

const FALLBACK_CATEGORIES = [
  { name: 'Zapatos', href: '/?categoria=zapatos' },
  { name: 'Sandalias', href: '/?categoria=sandalias' },
  { name: 'Botines', href: '/?categoria=botines' },
  { name: 'Botas', href: '/?categoria=botas' },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const wcCategories = await getCategories();
  const dynamicCategories =
    wcCategories.length > 0
      ? wcCategories.map((c) => ({ name: c.name, href: `/?categoria=${c.slug}` }))
      : FALLBACK_CATEGORIES;
  const catalogCategories = [{ name: 'Ver Todo', href: '/' }, ...dynamicCategories];

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="text-gray-900 font-sans antialiased min-h-screen flex flex-col">
        <CartProvider>
          <div className="bg-pink-600 text-white text-xs py-2 px-4 flex justify-between items-center">
            <span>Envío a todo Chile</span>
            <a
              href="https://api.whatsapp.com/send?phone=56984693207"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-semibold"
            >
              WhatsApp: +56 9 84693207
            </a>
          </div>

          <header className="bg-white border-b py-5 px-6 md:px-8 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
              <Link href="/">
                <Image
                  src="/logo.webp"
                  alt="Tacones.cl"
                  width={200}
                  height={80}
                  className="h-12 md:h-16 w-auto object-contain cursor-pointer"
                  preload
                />
              </Link>

              <div className="flex-1 max-w-2xl mx-4 md:mx-12 hidden md:block">
                <SearchBar />
              </div>

              <HeaderCart />
            </div>

            <div className="mt-4 md:hidden">
              <SearchBar />
            </div>
          </header>

          <nav className="bg-white border-b shadow-sm overflow-x-auto">
            <ul className="flex justify-center space-x-6 md:space-x-12 py-4 px-4 text-xs md:text-sm font-bold uppercase tracking-wider text-gray-700 whitespace-nowrap">
              {catalogCategories.map((cat) => (
                <li key={cat.name}>
                  <Link
                    href={cat.href}
                    className="hover:text-pink-600 cursor-pointer transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-1">{children}</div>

          <footer className="bg-gray-900 text-gray-300 mt-20 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
              {/* Columna 1: Marca */}
              <div className="space-y-4">
                <Link href="/" className="inline-block bg-white p-2 rounded">
                  <Image
                    src="/logo.webp"
                    alt="Tacones.cl"
                    width={160}
                    height={64}
                    className="h-10 w-auto object-contain"
                  />
                </Link>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Calzado femenino exclusivo en Chile. Diseños pensados para destacar en cada paso.
                </p>
              </div>

              {/* Columna 2: Categorías del Catálogo */}
              <div>
                <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-4">
                  Categorías
                </h3>
                <ul className="space-y-2.5 text-sm">
                  {catalogCategories.map((cat) => (
                    <li key={cat.name}>
                      <Link href={cat.href} className="hover:text-pink-400 transition-colors">
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Columna 3: Información de Contacto */}
              <div>
                <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-4">
                  Información de Contacto
                </h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a
                      href="https://api.whatsapp.com/send?phone=56979214151"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-pink-400 transition-colors"
                    >
                      <span className="text-green-400 font-bold">WhatsApp:</span> (+56) 9 7921 4151
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:detacos.cl@gmail.com"
                      className="hover:text-pink-400 transition-colors"
                    >
                      Email: detacos.cl@gmail.com
                    </a>
                  </li>
                  <li className="text-gray-400">Disponible los 365 días del año.</li>
                </ul>
              </div>

              {/* Columna 4: Redes Sociales */}
              <div>
                <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-4">
                  Síguenos
                </h3>
                <div className="flex items-center gap-4 mb-6">
                  <a
                    href="https://www.instagram.com/detacos.cl/?hl=es"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-11 h-11 rounded-full bg-gray-800 hover:bg-pink-600 text-white flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.facebook.com/detacos.cl"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-11 h-11 rounded-full bg-gray-800 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a
                    href="https://api.whatsapp.com/send?phone=56979214151"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="w-11 h-11 rounded-full bg-gray-800 hover:bg-green-600 text-white flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.126.556 4.124 1.529 5.857l-1.529 5.584 5.715-1.499c1.685.921 3.617 1.446 5.673 1.446 6.627 0 12-5.373 12-12s-5.373-12-11.388-11.388z" />
                    </svg>
                  </a>
                </div>
                <p className="text-xs text-gray-400">
                  Pagos 100% seguros a través de Transbank Webpay Plus.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-800 py-6 text-center text-xs text-gray-500">
              © {new Date().getFullYear()} Tacones.cl — Todos los derechos reservados.
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}