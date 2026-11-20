'use client';
import { createContext, useContext, useSyncExternalStore } from 'react';
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

const STORAGE_KEY = 'tacones-cart';
const EMPTY_CART: CartItem[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedCart: CartItem[] = EMPTY_CART;

function readCartFromStorage(): CartItem[] {
    if (typeof window === 'undefined') return EMPTY_CART;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === cachedRaw) return cachedCart;
        cachedRaw = raw;
        if (!raw) {
            cachedCart = EMPTY_CART;
            return cachedCart;
        }
        const parsed = JSON.parse(raw);
        cachedCart = Array.isArray(parsed) ? parsed : EMPTY_CART;
        return cachedCart;
    } catch {
        cachedRaw = null;
        cachedCart = EMPTY_CART;
        return EMPTY_CART;
    }
}

function writeCartToStorage(updated: CartItem[]) {
    if (typeof window === 'undefined') return;
    const raw = JSON.stringify(updated);
    cachedRaw = raw;
    cachedCart = updated;
    window.localStorage.setItem(STORAGE_KEY, raw);
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const cart = useSyncExternalStore(subscribe, readCartFromStorage, () => EMPTY_CART);

    const addToCart = (shoe: Shoe, variationId?: number, selectedSize?: string, quantity: number = 1, selectedColor?: string) => {
        const resolvedVariationId = variationId || shoe.variations?.[0];
        const qty = Math.max(1, quantity);
        const prev = readCartFromStorage();
        const matchItem = (item: CartItem) =>
            item.id === shoe.id && (item.variationId || item.variations?.[0]) === resolvedVariationId;
        const existing = prev.find(matchItem);
        const updated = existing
            ? prev.map((item) => (matchItem(item) ? { ...item, quantity: item.quantity + qty } : item))
            : [...prev, { ...shoe, quantity: qty, variationId: resolvedVariationId, selectedSize, selectedColor }];
        writeCartToStorage(updated);
    };

    const removeFromCart = (id: number, variationId?: number) => {
        const prev = readCartFromStorage();
        const updated = prev.filter(
            (item) => !(item.id === id && (item.variationId || item.variations?.[0]) === variationId)
        );
        writeCartToStorage(updated);
    };

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, totalItems }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);