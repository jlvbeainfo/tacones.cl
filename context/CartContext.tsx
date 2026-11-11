'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { Shoe } from '@/lib/woocommerce';

export interface CartItem extends Shoe {
    quantity: number;
    variationId?: number;
    selectedSize?: string;
    selectedColor?: string;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (shoe: Shoe, variationId?: number, selectedSize?: string, quantity?: number, selectedColor?: string) => void;
    removeFromCart: (id: number, variationId?: number) => void;
    totalItems: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('tacones-cart');
        if (saved) setCart(JSON.parse(saved));
    }, []);

    const addToCart = (shoe: Shoe, variationId?: number, selectedSize?: string, quantity: number = 1, selectedColor?: string) => {
        const resolvedVariationId = variationId || shoe.variations?.[0];
        const qty = Math.max(1, quantity);
        setCart((prev) => {
            const matchItem = (item: CartItem) =>
                item.id === shoe.id && (item.variationId || item.variations?.[0]) === resolvedVariationId;
            const existing = prev.find(matchItem);
            const updated = existing
                ? prev.map(item => matchItem(item) ? { ...item, quantity: item.quantity + qty } : item)
                : [...prev, { ...shoe, quantity: qty, variationId: resolvedVariationId, selectedSize, selectedColor }];
            localStorage.setItem('tacones-cart', JSON.stringify(updated));
            return updated;
        });
    };

    const removeFromCart = (id: number, variationId?: number) => {
        setCart((prev) => {
            const updated = prev.filter(
                item => !(item.id === id && (item.variationId || item.variations?.[0]) === variationId)
            );
            localStorage.setItem('tacones-cart', JSON.stringify(updated));
            return updated;
        });
    };

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, totalItems }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);