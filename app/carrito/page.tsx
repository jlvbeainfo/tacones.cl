'use client';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { useState } from 'react';

export default function CartPage() {
    const { cart, removeFromCart } = useCart();
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const total = cart.reduce((acc, item) => acc + (parseInt(item.price || '0') * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0 || loadingCheckout) return;
        setLoadingCheckout(true);

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map((item) => ({
                        id: item.id,
                        variationId: item.variationId,
                        quantity: item.quantity,
                    })),
                }),
            });
            const data = await res.json();
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
                return;
            }
        } catch {
            alert('No se pudo conectar con el servidor de pagos. Intenta nuevamente.');
        } finally {
            setLoadingCheckout(false);
        }
    };

    if (cart.length === 0) {
        return (
            <main className="max-w-4xl mx-auto p-16 text-center bg-white mt-12 border">
                <h1 className="text-2xl font-bold mb-6 uppercase tracking-wide">Tu carrito está vacío</h1>
                <a href="/" className="text-pink-600 font-bold hover:underline uppercase tracking-wider">Continuar comprando</a>
            </main>
        );
    }

    return (
        <main className="max-w-4xl mx-auto p-8 bg-white mt-12">
            <h1 className="text-3xl font-bold mb-10 text-gray-900 border-b pb-4 uppercase tracking-tight">Tu Compra</h1>

            <div className="flex flex-col gap-8 mb-10">
                {cart.map((item) => {
                    const resolvedVarId = item.variationId || item.variations?.[0];
                    return (
                        <div key={`${item.id}-${resolvedVarId ?? 'base'}`} className="flex items-center gap-6 border-b pb-6">
                            <div className="relative w-28 h-36 bg-gray-50">
                                {item.images[0] && (
                                    <Image
                                        src={item.images[0].src.replace(/^https?:\/\/[^/]+\/wp-content\//, '/wp-content/')}
                                        alt={item.name}
                                        fill
                                        sizes="112px"
                                        className="object-cover"
                                    />
                                )}
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold text-gray-900 uppercase tracking-wide">{item.name}</h2>
                                {item.selectedSize && (
                                    <p className="text-gray-600 text-xs font-bold uppercase mt-1">Talla: {item.selectedSize}</p>
                                )}
                                <p className="text-gray-500 text-sm mt-2">Cantidad: {item.quantity}</p>
                                <button
                                    onClick={() => removeFromCart(item.id, resolvedVarId)}
                                    className="text-xs text-red-500 hover:underline uppercase font-bold mt-2 cursor-pointer"
                                >
                                    Eliminar
                                </button>
                            </div>
                            <p className="font-bold text-xl text-pink-600">
                                ${(parseInt(item.price || '0') * item.quantity).toLocaleString('es-CL')}
                            </p>
                        </div>
                    );
                })}
            </div>

            <div className="bg-gray-50 p-8 flex flex-col items-end">
                <div className="text-lg text-gray-800 mb-6 uppercase font-bold">
                    Total Estimado: <span className="text-3xl ml-4 text-pink-600">${total.toLocaleString('es-CL')}</span>
                </div>
                <button
                    onClick={handleCheckout}
                    disabled={loadingCheckout}
                    className="bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold py-5 px-12 uppercase tracking-widest text-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                    {loadingCheckout ? 'Preparando Checkout...' : 'Proceder al Pago'}
                </button>
            </div>
        </main>
    );
}