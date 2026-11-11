'use client';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

export function HeaderCart() {
    const { totalItems } = useCart();
    return (
        <Link href="/carrito" className="relative p-2 flex items-center gap-2 font-bold text-gray-700 hover:text-pink-600 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <span className="hidden md:inline">Mi Carrito</span>
            {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 md:top-0 md:right-24 bg-pink-600 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold">
                    {totalItems}
                </span>
            )}
        </Link>
    );
}