'use client';
import { Shoe, ShoeVariation } from '@/lib/woocommerce';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddToCartButton({ shoe, variations = [] }: { shoe: Shoe; variations?: ShoeVariation[] }) {
    const { addToCart } = useCart();
    const router = useRouter();
    const [added, setAdded] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<'description' | 'additional'>('description');

    const colorAttr = shoe.attributes?.find(
        (a) => a.name.toUpperCase() === 'COLOR' || a.slug.toLowerCase() === 'color'
    );
    const sizeAttr = shoe.attributes?.find(
        (a) => a.name.toUpperCase() === 'TALLA' || a.slug.toLowerCase() === 'talla'
    );

    const parsedVariations = variations.map((v) => {
        const vSize = v.attributes.find(
            (a) => a.name.toUpperCase() === 'TALLA' || a.slug.toLowerCase() === 'talla'
        )?.option;
        const vColor = v.attributes.find(
            (a) => a.name.toUpperCase() === 'COLOR' || a.slug.toLowerCase() === 'color'
        )?.option;
        return {
            ...v,
            size: vSize || String(v.id),
            color: vColor || colorAttr?.options?.[0] || '',
            isAvailable: v.purchasable && v.stock_status === 'instock',
        };
    });

    const firstAvailable = parsedVariations.find((v) => v.isAvailable);

    const [selectedColor, setSelectedColor] = useState<string>(
        firstAvailable?.color || colorAttr?.options?.[0] || ''
    );
    const [selectedSize, setSelectedSize] = useState<string>(
        firstAvailable?.size || sizeAttr?.options?.[0] || ''
    );

    const matchedVariation = parsedVariations.find(
        (v) =>
            (!selectedSize || v.size === selectedSize) &&
            (!selectedColor || !v.color || v.color === selectedColor)
    );

    const canPurchase = matchedVariation
        ? matchedVariation.isAvailable
        : shoe.purchasable && shoe.stock_status === 'instock';

    const maxQty = matchedVariation?.stock_quantity ?? 10;

    const handleReset = () => {
        setSelectedColor(firstAvailable?.color || colorAttr?.options?.[0] || '');
        setSelectedSize(firstAvailable?.size || sizeAttr?.options?.[0] || '');
        setQuantity(1);
    };

    const handleAdd = () => {
        if (!canPurchase) return;
        addToCart(shoe, matchedVariation?.id, selectedSize, quantity, selectedColor);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    const handleBuyNow = () => {
        if (!canPurchase) return;
        addToCart(shoe, matchedVariation?.id, selectedSize, quantity, selectedColor);
        router.push('/carrito');
    };

    const allSizes = sizeAttr?.options?.length
        ? sizeAttr.options
        : Array.from(new Set(parsedVariations.map((v) => v.size))).sort((a, b) =>
              a.localeCompare(b, undefined, { numeric: true })
          );

    return (
        <div className="space-y-6">
            {/* Selectores de Variación (COLOR y TALLA) como en WordPress */}
            <div className="space-y-4 border-t border-b py-6">
                {colorAttr && colorAttr.options.length > 0 && (
                    <div className="flex items-center justify-between gap-4">
                        <label htmlFor="select-color" className="text-xs font-bold uppercase tracking-widest text-gray-700 w-24">
                            COLOR
                        </label>
                        <select
                            id="select-color"
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="flex-1 border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 focus:border-pink-600 outline-none"
                        >
                            {colorAttr.options.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {allSizes.length > 0 && (
                    <div className="flex items-center justify-between gap-4">
                        <label htmlFor="select-talla" className="text-xs font-bold uppercase tracking-widest text-gray-700 w-24">
                            TALLA
                        </label>
                        <div className="flex-1 flex items-center gap-3">
                            <select
                                id="select-talla"
                                value={selectedSize}
                                onChange={(e) => {
                                    setSelectedSize(e.target.value);
                                    setQuantity(1);
                                }}
                                className="flex-1 border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 focus:border-pink-600 outline-none"
                            >
                                {allSizes.map((size) => {
                                    const v = parsedVariations.find((pv) => pv.size === size);
                                    const available = v ? v.isAvailable : true;
                                    return (
                                        <option key={size} value={size}>
                                            {size} {!available ? '(Agotado)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="text-xs text-gray-500 hover:text-pink-600 underline uppercase tracking-wider"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>
                )}

                {/* Disponibilidad de la variación seleccionada ("1 disponibles") */}
                {matchedVariation && (
                    <div className="pt-1">
                        {matchedVariation.isAvailable ? (
                            <p className="text-xs font-bold text-green-600 uppercase tracking-wider">
                                {matchedVariation.stock_quantity
                                    ? `${matchedVariation.stock_quantity} disponibles`
                                    : 'En stock'}
                            </p>
                        ) : (
                            <p className="text-xs font-bold text-red-500 uppercase tracking-wider">
                                Talla agotada — selecciona otra talla disponible
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Cantidad (- 1 +) + Añadir al Carrito + Comprar */}
            <div className="space-y-3">
                <div className="flex items-stretch gap-3">
                    <div className="flex items-center border-2 border-gray-200">
                        <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="px-4 py-3 text-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            −
                        </button>
                        <input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={quantity}
                            onChange={(e) =>
                                setQuantity(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))
                            }
                            className="w-14 text-center font-bold text-gray-900 outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                            className="px-4 py-3 text-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            +
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!canPurchase}
                        className={`flex-1 py-4 px-6 font-bold text-sm md:text-base uppercase tracking-widest transition-colors ${
                            !canPurchase
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : added
                                ? 'bg-green-600 text-white'
                                : 'bg-pink-600 hover:bg-pink-700 text-white'
                        }`}
                    >
                        {added ? '¡Añadido al Carrito!' : 'Añadir al carrito'}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={!canPurchase}
                    className="w-full py-4 font-bold text-sm md:text-base uppercase tracking-widest bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white transition-colors"
                >
                    Comprar
                </button>
            </div>

            {/* Meta Content: Disponibilidad y SKU */}
            <div className="pt-4 border-t text-xs uppercase tracking-wider space-y-2 text-gray-600">
                <p>
                    <span className="font-bold text-gray-800">Disponibilidad: </span>
                    <span className={canPurchase ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                        {canPurchase ? 'Disponible' : 'Agotado'}
                    </span>
                </p>
                <p>
                    <span className="font-bold text-gray-800">SKU: </span>
                    <span>{matchedVariation?.sku || shoe.sku || 'N/A'}</span>
                </p>
            </div>

            {/* Pestañas de WooCommerce: Descripción | Información adicional */}
            <div className="pt-8">
                <div className="flex border-b border-gray-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('description')}
                        className={`pb-3 px-6 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
                            activeTab === 'description'
                                ? 'border-pink-600 text-pink-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Descripción
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('additional')}
                        className={`pb-3 px-6 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
                            activeTab === 'additional'
                                ? 'border-pink-600 text-pink-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Información adicional
                    </button>
                </div>

                <div className="py-6">
                    {activeTab === 'description' ? (
                        <div
                            className="prose text-gray-700 text-sm leading-relaxed space-y-2"
                            dangerouslySetInnerHTML={{
                                __html: shoe.description || '<p>Sin descripción disponible.</p>',
                            }}
                        />
                    ) : (
                        <table className="w-full text-sm border border-gray-200">
                            <tbody>
                                {(shoe.attributes || []).map((attr) => (
                                    <tr key={attr.name} className="border-b border-gray-200 last:border-b-0">
                                        <th className="bg-gray-50 text-left px-4 py-3 font-bold uppercase text-xs tracking-wider text-gray-700 w-1/3 border-r border-gray-200">
                                            {attr.name}
                                        </th>
                                        <td className="px-4 py-3 text-gray-600">
                                            {attr.options.join(', ')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}