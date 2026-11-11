'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
            router.push(`/?buscar=${encodeURIComponent(trimmed)}`);
        } else {
            router.push('/');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full">
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca zapatos, botines, sandalias..."
                className="w-full border-2 border-gray-200 rounded-full pl-6 pr-12 py-3 focus:border-pink-600 outline-none transition-colors text-sm"
            />
            <button
                type="submit"
                aria-label="Buscar productos"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </button>
        </form>
    );
}

