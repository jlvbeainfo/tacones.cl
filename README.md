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
# Secreto compartido con WordPress (wp-config.php: TACONES_CHECKOUT_SECRET) para firmar el checkout con HMAC-SHA256
CHECKOUT_SIGNING_SECRET=genera_un_secreto_hex_de_64_caracteres
```

### 2. Instalación y Ejecución

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Configuración en WordPress (Code Snippets)

Primero, define el mismo secreto compartido en el archivo `wp-config.php` de tu WordPress (antes de `/* That's all, stop editing! */`):

```php
define('TACONES_CHECKOUT_SECRET', 'genera_un_secreto_hex_de_64_caracteres');
```

Luego, para que el Checkout de WooCommerce sincronice múltiples productos/variaciones desde Next.js de forma segura (validando firma HMAC-SHA256, expiración de 5 minutos, lista blanca de `frontend_url`, límites de cantidad y estado de publicación), activa el siguiente snippet PHP en WordPress (**Fragmentos de código / Code Snippets**):

```php
// 1. Sincronizar el carrito desde Next.js con firma HMAC-SHA256 + TTL + Allowlist
add_action('template_redirect', function () {
    if (empty($_GET['headless_cart'])) {
        return;
    }

    if (!function_exists('WC') || !WC()->cart) {
        return;
    }

    $raw_cart = sanitize_text_field(wp_unslash($_GET['headless_cart']));
    if (!preg_match('/^\d+:\d+(,\d+:\d+)*$/', $raw_cart)) {
        wp_die('Parámetros de carrito inválidos.', 'Error de Checkout', ['response' => 400]);
    }

    // Lista blanca estricta de orígenes permitidos para frontend_url (evita Open Redirect)
    $allowed_frontends = [
        'https://tacones.cl',
        'https://www.tacones.cl',
        'https://taconesonline.cl',
        'https://www.taconesonline.cl',
        'http://localhost:3000', // Quitar en producción si no se usa
    ];

    $raw_frontend_url = !empty($_GET['frontend_url'])
        ? rtrim(esc_url_raw(wp_unslash($_GET['frontend_url'])), '/')
        : '';

    $safe_frontend_url = in_array($raw_frontend_url, $allowed_frontends, true)
        ? $raw_frontend_url
        : 'https://taconesonline.cl';

    // Verificar firma HMAC-SHA256 y expiración (5 minutos) cuando TACONES_CHECKOUT_SECRET esté definido
    if (defined('TACONES_CHECKOUT_SECRET') && TACONES_CHECKOUT_SECRET !== '') {
        $ts  = isset($_GET['ts']) ? sanitize_text_field(wp_unslash($_GET['ts'])) : '';
        $sig = isset($_GET['sig']) ? sanitize_text_field(wp_unslash($_GET['sig'])) : '';

        if (!ctype_digit($ts) || abs(time() - (int) $ts) > 300) {
            wp_die('El enlace de pago expiró. Vuelve a tu carrito e intenta nuevamente.', 'Enlace expirado', ['response' => 403]);
        }

        $payload  = $raw_cart . '|' . $ts . '|' . $raw_frontend_url;
        $expected = hash_hmac('sha256', $payload, TACONES_CHECKOUT_SECRET);

        if (!$sig || !hash_equals($expected, $sig)) {
            wp_die('Firma de checkout inválida.', 'Acceso denegado', ['response' => 403]);
        }
    }

    setcookie('tacones_frontend_url', $safe_frontend_url, [
        'expires'  => time() + 86400,
        'path'     => '/',
        'secure'   => is_ssl(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    WC()->cart->empty_cart();

    $items = array_slice(explode(',', $raw_cart), 0, 20);

    foreach ($items as $item) {
        $parts = explode(':', $item);
        $id    = isset($parts[0]) ? absint($parts[0]) : 0;
        $qty   = isset($parts[1]) ? min(10, max(1, absint($parts[1]))) : 1;

        if (!$id) continue;

        $product = wc_get_product($id);
        if (!$product || !$product->is_purchasable() || !$product->is_in_stock()) {
            continue;
        }

        if ($product->is_type('variation')) {
            $parent_id = $product->get_parent_id();
            $parent    = wc_get_product($parent_id);
            if (!$parent || $parent->get_status() !== 'publish') {
                continue;
            }
            $attributes = $product->get_variation_attributes();
            WC()->cart->add_to_cart($parent_id, $qty, $id, $attributes);
        } else {
            if ($product->get_status() !== 'publish') {
                continue;
            }
            WC()->cart->add_to_cart($id, $qty);
        }
    }

    wc_clear_notices();
    wp_safe_redirect(wc_get_checkout_url());
    exit;
}, 1);

// 2. Envolver "Tu pedido" + pago en una sola columna derecha sticky (2 columnas en desktop)
add_action('woocommerce_checkout_before_order_review_heading', function () {
    echo '<div class="tacones-order-summary">';
}, 1);

add_action('woocommerce_checkout_after_order_review', function () {
    echo '</div>';
}, 99);

// 3. Cabecera minimalista de Tacones.cl y estilos de 2 columnas para el Checkout
add_action('wp_body_open', function () {
    if (!function_exists('is_checkout') || !is_checkout()) {
        return;
    }

    $back_url = !empty($_COOKIE['tacones_frontend_url'])
        ? esc_url(wp_unslash($_COOKIE['tacones_frontend_url']))
        : 'https://taconesonline.cl';
    ?>
    <div class="tacones-topbar">
        <span>Envío a todo Chile</span>
        <a href="https://api.whatsapp.com/send?phone=56984693207" target="_blank" rel="noopener noreferrer">
            WhatsApp: +56 9 84693207
        </a>
    </div>
    <div class="tacones-checkout-header">
        <div class="tacones-checkout-header-inner">
            <a href="<?php echo $back_url; ?>" class="tacones-brand">TACONES.CL</a>
            <a href="<?php echo $back_url; ?>/carrito" class="tacones-back-link">← Volver al carrito</a>
        </div>
    </div>
    <?php
});

add_action('wp_head', function () {
    if (!function_exists('is_checkout') || !is_checkout()) {
        return;
    }
    ?>
    <style id="tacones-headless-checkout-css">
        /* Ocultar header/footer del tema de WordPress en el checkout */
        #site-header,
        #site-footer,
        header.site-header,
        footer.site-footer,
        .page-header,
        .skip-link {
            display: none !important;
        }

        body.woocommerce-checkout {
            background: #ffffff !important;
            color: #111827 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            margin: 0 !important;
        }

        .tacones-topbar {
            background: #db2777;
            color: #ffffff;
            font-size: 12px;
            padding: 8px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .tacones-topbar a {
            color: #ffffff;
            text-decoration: none;
            font-weight: 600;
        }

        .tacones-checkout-header {
            background: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            padding: 18px 24px;
            margin-bottom: 32px;
        }
        .tacones-checkout-header-inner {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .tacones-brand {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: #111827;
            text-decoration: none;
        }
        .tacones-back-link {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #db2777;
            text-decoration: none;
        }
        .tacones-back-link:hover {
            text-decoration: underline;
        }

        main#content,
        .site-main {
            max-width: 1200px !important;
            margin: 0 auto 64px auto !important;
            padding: 0 24px !important;
        }

        /* Layout de 2 columnas en desktop: Datos a la izquierda, Tu pedido + Pago a la derecha */
        @media (min-width: 960px) {
            form.woocommerce-checkout {
                display: grid !important;
                grid-template-columns: minmax(0, 1.35fr) minmax(360px, 1fr) !important;
                gap: 40px !important;
                align-items: start !important;
            }
            form.woocommerce-checkout > .woocommerce-NoticeGroup,
            form.woocommerce-checkout > .woocommerce-error,
            form.woocommerce-checkout > .woocommerce-message {
                grid-column: 1 / -1 !important;
            }
            form.woocommerce-checkout > #customer_details {
                grid-column: 1 !important;
            }
            form.woocommerce-checkout > .tacones-order-summary {
                grid-column: 2 !important;
                position: sticky !important;
                top: 24px !important;
            }
        }

        /* En la columna izquierda, apilar facturación y envío al 100% */
        #customer_details.col2-set .col-1,
        #customer_details.col2-set .col-2 {
            width: 100% !important;
            float: none !important;
        }

        /* Tarjeta derecha ("Tu pedido" + Turnstile + Webpay) */
        .tacones-order-summary {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 24px;
            border-radius: 4px;
        }
        .tacones-order-summary #order_review_heading {
            margin-top: 0 !important;
            margin-bottom: 16px !important;
            font-size: 20px !important;
            font-weight: 700 !important;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 12px;
        }

        /* Inputs y botón de pago consistentes con Tacones.cl */
        .woocommerce-checkout input[type="text"],
        .woocommerce-checkout input[type="email"],
        .woocommerce-checkout input[type="tel"],
        .woocommerce-checkout select,
        .woocommerce-checkout textarea,
        .woocommerce-checkout .select2-selection--single {
            border: 1px solid #d1d5db !important;
            border-radius: 4px !important;
            padding: 10px 12px !important;
            min-height: 44px;
        }
        #place_order {
            width: 100% !important;
            background: #111827 !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
            padding: 16px 24px !important;
            border: none !important;
            border-radius: 2px !important;
            cursor: pointer !important;
            transition: background 0.2s ease;
        }
        #place_order:hover {
            background: #db2777 !important;
        }
    </style>
    <?php
}, 99);
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
