import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((reg) => {
                        console.log('PharmaFlow Service Worker registered successfully with scope:', reg.scope);
                    })
                    .catch((err) => {
                        console.warn('Service Worker registration failed:', err);
                    });
            });
        }
    }, []);

    return (
        <>
            <Head>
                <title>PharmaFlow ERP | Modern Pharmacy Management System</title>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
            </Head>
            <Component {...pageProps} />
        </>
    );
}

