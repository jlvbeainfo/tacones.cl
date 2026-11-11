# Tacones.cl — Frontend Headless E-Commerce

Frontend moderno construido con **Next.js 16 (App Router)**, **React 19** y **Tailwind CSS 4** para la tienda online de calzado femenino **Tacones.cl**, conectado mediante arquitectura **Headless** al backend existente de **WordPress + WooCommerce**.

---

## Arquitectura del Proyecto

El proyecto reemplaza la plantilla frontal de WordPress manteniendo toda la lógica administrativa, catálogo, inventario de variaciones (tallas/colores), cálculo de despacho por comunas y pasarela de pago (**Transbank Webpay Plus**) en WooCommerce:

- **Catálogo e Inventario (`lib/woocommerce.ts`)**: Consume la API REST de WooCommerce (`/wp-json/wc/v3`) desde Server Components con caché y revalidación ISR.
- **Optimización de Imágenes (`next.config.ts`)**: El servidor de Next.js actúa como proxy y optimizador (`/_next/image`) para las fotografías alojadas en `/wp-content/uploads/` del backend WordPress.
- **Ficha de Producto (`app/producto/[slug]/page.tsx` y `AddToCartButton.tsx`)**:
  - Ruta dinámica asíncrona compatible con Next.js 16 (`params: Promise<{ slug: string }>`).
  - Replica todos los datos del producto de WordPress:
    - Breadcrumbs (`Inicio › Categoría › Producto`).
    - Barra lateral con **Comprar por Categorías** y ranking de productos **Populares** según vistas reales (`meta_data.views`).
    - Etiqueta de **Oferta**, precio regular tachado y precio de oferta.
    - Selector de **COLOR** y **TALLA** con validación de stock por variación (`purchasable` e `instock`), selector de cantidad (`− 1 +`), botón **Añadir al carrito** y botón de compra rápida **Comprar**.
    - Metadatos de **Disponibilidad**, **SKU** y pestañas interactivas de **Descripción** e **Información adicional**.
- **Carrito Persistente y Sincronización de Checkout (`context/CartContext.tsx`, `app/carrito/page.tsx`, `app/api/checkout/route.ts`)**:
  - Carrito persistido en `localStorage` con soporte para variaciones de calzado (`variationId`, `selectedSize`, `selectedColor`, `quantity`).
  - Endpoint `POST /api/checkout` que valida y resuelve los IDs de variación en stock antes de redirigir al checkout de WooCommerce (`?headless_cart=...`).

---

## Requisitos y Configuración Local

### 1. Variables de Entorno (`.env.local`)

Crear un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WORDPRESS_URL=https://tu-dominio-wordpress.com
WOOCOMMERCE_API_URL=https://tu-dominio-wordpress.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=tu_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=tu_consumer_secret
```

### 2. Instalación y Ejecución

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Configuración en WordPress (Code Snippets)

Para que el Checkout de WooCommerce sincronice múltiples productos/variaciones desde Next.js, oculte el header/footer del tema antiguo (`GoStore`) y aplique los estilos visuales del nuevo frontend, debe estar activo el siguiente snippet PHP en WordPress (**Fragmentos de código / Code Snippets**):

```php
// 1. Sincronizar el carrito desde Next.js (soporta múltiples productos y variaciones/tallas)
add_action('template_redirect', function () {
    if (!empty($_GET['frontend_url'])) {
        setcookie('tacones_frontend_url', esc_url_raw(wp_unslash($_GET['frontend_url'])), time() + 86400, '/');
    }

    if (empty($_GET['headless_cart'])) {
        return;
    }

    if (!function_exists('WC') || !WC()->cart) {
        return;
    }

    WC()->cart->empty_cart();

    $items = explode(',', sanitize_text_field(wp_unslash($_GET['headless_cart'])));

    foreach ($items as $item) {
        $parts = explode(':', $item);
        $id    = isset($parts[0]) ? absint($parts[0]) : 0;
        $qty   = isset($parts[1]) ? max(1, absint($parts[1])) : 1;

        if (!$id) continue;

        $product = wc_get_product($id);
        if (!$product) continue;

        if ($product->is_type('variation')) {
            $parent_id  = $product->get_parent_id();
            $attributes = $product->get_variation_attributes();
            WC()->cart->add_to_cart($parent_id, $qty, $id, $attributes);
        } else {
            WC()->cart->add_to_cart($id, $qty);
        }
    }

    wc_clear_notices();
    wp_safe_redirect(wc_get_checkout_url());
    exit;
}, 1);
```

---

## Estructura de Archivos Principales

```text
├── app/
│   ├── api/checkout/route.ts        # Resolución de variaciones en stock y generación de URL de checkout
│   ├── carrito/page.tsx             # Vista del carrito de compras y redirección a pago
│   ├── producto/[slug]/
│   │   ├── AddToCartButton.tsx      # Selector de color, talla, cantidad y pestañas del producto
│   │   └── page.tsx                 # Detalle de producto, breadcrumbs y sidebar (Categorías + Populares)
│   ├── HeaderCart.tsx               # Indicador de carrito en el encabezado
│   ├── layout.tsx                   # Layout global con barra superior, buscador y navegación
│   └── page.tsx                     # Página de inicio con hero y grilla de colección
├── context/
│   └── CartContext.tsx              # Estado global del carrito con soporte de variaciones
├── lib/
│   └── woocommerce.ts               # Cliente REST API para productos, variaciones y categorías
└── next.config.ts                   # Configuración de optimización de imágenes remotas
```
