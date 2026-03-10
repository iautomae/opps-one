import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Definir el dominio raíz (Cámbialo si se usa otro en producción)
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'opps.one';

export function middleware(request: NextRequest) {
    const url = request.nextUrl;

    // Extraer el hostname actual (ej: 'cliente1.opps.one' o 'localhost:3000')
    const hostname = request.headers.get('host') || '';

    // 1. Evitar que el middleware se ejecute en archivos estáticos, imágenes, etc.
    if (
        url.pathname.startsWith('/_next/') ||
        url.pathname.includes('/api/') ||
        url.pathname.match(/\.(.*)$/)
    ) {
        return NextResponse.next();
    }

    // 2. Determinar si estamos en un subdominio
    let isCustomDomain = false;
    let subdomain = '';

    // Si es un dominio localhost o lvh.me (desarrollo)
    if (hostname.includes('.localhost')) {
        isCustomDomain = true;
        subdomain = hostname.split('.localhost')[0];
    } else if (hostname.includes('.lvh.me')) {
        isCustomDomain = true;
        subdomain = hostname.split('.lvh.me')[0];
    }
    // Comprobación de producción normal
    else {
        isCustomDomain = hostname.endsWith(`.${ROOT_DOMAIN}`) && hostname !== `www.${ROOT_DOMAIN}`;
        if (isCustomDomain) {
            subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');
        }
    }

    if (isCustomDomain) {
        console.log(`[MIDDLEWARE] Detectado subdominio: "${subdomain}", Hostname: "${hostname}", Pathname: "${url.pathname}"`);

        // Reescribir (NO redirigir) la URL interna para Next.js SOLAMENTE en rutas de autenticación
        if (url.pathname === '/login' || url.pathname === '/' || url.pathname.startsWith('/set-password')) {
            const rewritePath = url.pathname === '/' ? '/login' : url.pathname;
            const rewriteUrl = new URL(`/${subdomain}${rewritePath}`, request.url);
            console.log(`[MIDDLEWARE] Reescribiendo auth a: ${rewriteUrl.toString()}`);
            return NextResponse.rewrite(rewriteUrl);
        }

        // Para cualquier otra ruta dentro de la app CRM, la pasamos directo sin anexar carpetas para que caigan en (app) 
        return NextResponse.next();
    }

    // 3. Si ES el dominio raíz (opps.one o www.opps.one) o localhost sin subdominio
    // Mostrar la página de login por defecto o landing page corporativa.

    // Por ahora, redirigimos el root domain al login genérico o al tenant maestro
    if (url.pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (url.pathname === '/login') {
        // Como eliminamos src/app/login global para usar subdominios, reescribiremos 
        // el login del dominio raíz (localhost:3000 o opps.one) al tenant maestro
        const rootLoginRewrite = new URL(`/app/login`, request.url);
        return NextResponse.rewrite(rootLoginRewrite);
    }

    return NextResponse.next();
}

// Configurar en qué rutas se debe ejecutar el middleware
export const config = {
    matcher: [
        /*
         * Ejecuta el middleware en todas las rutas de la app (excepto APIs, estáticos, etc.)
         * Lo hacemos incluyendo un matcher global y la validación dentro de la función
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
