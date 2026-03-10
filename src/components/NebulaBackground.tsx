"use client";

import React, { useEffect, useRef } from 'react';

export function NebulaBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        canvas.width = width;
        canvas.height = height;

        // Core colors based on brand: #2CDB9B (Turquoise) and #003327 (Dark Teal)
        // Definiendo múltiples núcleos de nebulosa (clusters). Aumentados a 10.
        const numCores = 10;
        const cores = Array.from({ length: numCores }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: 50 + Math.random() * 80, // Radios un poco más pequeños para compensar
            baseX: Math.random() * width,
            baseY: Math.random() * height,
            speedX: (Math.random() - 0.5) * 0.4,
            speedY: (Math.random() - 0.5) * 0.4,
            noisePhase: Math.random() * Math.PI * 2
        }));

        const particles: Particle[] = [];
        const particleCount = 350; // Aumentar cantidad de partículas

        // Coordenadas del mouse (fuera del canvas por defecto)
        let mouseX = -1000;
        let mouseY = -1000;

        // Tracking super lento global del mouse
        let targetX = width / 2;
        let targetY = height / 2;

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            targetX = e.clientX;
            targetY = e.clientY;
        };

        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);

        class Particle {
            coreIndex: number;
            angle: number;
            baseRadiusOffset: number;
            radiusOffset: number;
            speed: number;
            baseSize: number;
            size: number;
            baseAlpha: number;
            alpha: number;
            noise: number;

            // Variables para físicas de repulsión interactiva
            vx: number;
            vy: number;
            currentX: number;
            currentY: number;

            constructor() {
                this.coreIndex = Math.floor(Math.random() * cores.length);
                this.angle = Math.random() * Math.PI * 2;
                this.baseRadiusOffset = (Math.random() - 0.5) * 160;
                this.radiusOffset = this.baseRadiusOffset;
                this.speed = (Math.random() - 0.5) * 0.005;

                this.baseSize = Math.random() * 2 + 0.5;
                this.size = this.baseSize;

                this.baseAlpha = Math.random() * 0.5 + 0.1;
                this.alpha = this.baseAlpha;

                this.noise = Math.random() * 1000;

                this.vx = 0;
                this.vy = 0;
                this.currentX = 0;
                this.currentY = 0;
            }

            update() {
                this.angle += this.speed;
                const core = cores[this.coreIndex];

                // Efecto de pulso orgánico
                const naturalRadius = core.radius + this.baseRadiusOffset + Math.sin(Date.now() * 0.0005 + this.noise) * 10;

                // Posición objetivo (la posición normal de la partícula en su órbita)
                const targetPx = core.x + Math.cos(this.angle) * naturalRadius;
                const targetPy = core.y + Math.sin(this.angle) * naturalRadius;

                // --- INTERACCIÓN AGRESIVA HOVER ---
                const dx = targetPx - mouseX;
                const dy = targetPy - mouseY;
                const distToMouse = Math.hypot(dx, dy);
                const interactionRadius = 150; // Radio de alcance del cursor

                let forceX = 0;
                let forceY = 0;

                if (distToMouse < interactionRadius) {
                    // Repulsión: empujar la partícula lejos del mouse
                    const force = (interactionRadius - distToMouse) / interactionRadius;
                    forceX = (dx / distToMouse) * force * 10;
                    forceY = (dy / distToMouse) * force * 10;

                    // Aumentar brillo y tamaño al reaccionar
                    this.size = Math.min(this.size + 0.3, 4);
                    this.alpha = Math.min(this.alpha + 0.05, 1);
                } else {
                    // Volver al estado normal suavemente
                    this.size -= (this.size - this.baseSize) * 0.05;
                    this.alpha -= (this.alpha - this.baseAlpha) * 0.02;
                }

                // Inercia y aceleración
                this.vx = (this.vx + forceX) * 0.85;
                this.vy = (this.vy + forceY) * 0.85;

                // Retorno elástico a su posición objetivo en la órbita
                const returnDx = targetPx - this.currentX;
                const returnDy = targetPy - this.currentY;

                this.vx += returnDx * 0.05;
                this.vy += returnDy * 0.05;

                this.currentX += this.vx;
                this.currentY += this.vy;

                // Inicializar primera vez para evitar que vuelen desde la esquina (0,0)
                if (this.currentX === 0) {
                    this.currentX = targetPx;
                    this.currentY = targetPy;
                }

                this.draw(this.currentX, this.currentY);
            }

            draw(x: number, y: number) {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(x, y, Math.max(0.1, this.size), 0, Math.PI * 2);

                // Color turquesa de la marca: hsla(158, 72%, 52%)
                ctx.fillStyle = `hsla(158, 72%, 52%, ${this.alpha})`;
                ctx.fill();

                // Efecto de brillo si la partícula se agrandó por el mouse
                if (this.size > this.baseSize + 0.5) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = 'rgba(44, 219, 155, 0.8)';
                } else {
                    ctx.shadowBlur = 0;
                }
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        let bgTrackingX = width / 2;
        let bgTrackingY = height / 2;

        const render = () => {
            // Movimiento extremadamente lento del fondo global hacia el target
            bgTrackingX += (targetX - bgTrackingX) * 0.005;
            bgTrackingY += (targetY - bgTrackingY) * 0.005;

            // Fondo muy oscuro con ligero tono verde militar profundo/negro
            ctx.fillStyle = 'rgba(2, 6, 5, 0.2)';
            ctx.fillRect(0, 0, width, height);

            // Actualizar y dibujar núcleos
            cores.forEach((core) => {
                // Deriva
                core.baseX += core.speedX;
                core.baseY += core.speedY;

                // Rebote suave en bordes extendidos
                if (core.baseX < -200 || core.baseX > width + 200) core.speedX *= -1;
                if (core.baseY < -200 || core.baseY > height + 200) core.speedY *= -1;

                // Leve movimiento global de los núcleos
                const dx = bgTrackingX - core.baseX;
                const dy = bgTrackingY - core.baseY;
                const dist = Math.hypot(dx, dy);

                core.x = core.baseX + (dx / dist) * Math.min(dist, 50) * 0.05;
                core.y = core.baseY + (dy / dist) * Math.min(dist, 50) * 0.05;

                // Pulsación
                const dynamicRadius = core.radius + Math.sin(Date.now() * 0.001 + core.noisePhase) * 15;

                // Gradiente del núcleo
                const gradient = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, dynamicRadius * 2);
                gradient.addColorStop(0, 'rgba(44, 219, 155, 0.08)');  // Turquesa centro
                gradient.addColorStop(0.3, 'rgba(0, 51, 39, 0.05)');  // Verde oscuro mid (#003327)
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(core.x, core.y, dynamicRadius * 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Actualizar y dibujar partículas
            particles.forEach(p => p.update());

            // Dibujar conexiones
            ctx.lineWidth = 0.3;
            for (let i = 0; i < particles.length; i += 2) {
                for (let j = i + 1; j < particles.length; j += 3) {
                    const p1 = particles[i];
                    const p2 = particles[j];

                    // Usar currentX y currentY para las conexiones interactivas
                    const dist = Math.hypot(p2.currentX - p1.currentX, p2.currentY - p1.currentY);

                    if (dist < 55) {
                        ctx.beginPath();
                        ctx.moveTo(p1.currentX, p1.currentY);
                        ctx.lineTo(p2.currentX, p2.currentY);

                        // Si el ratón está cerca, las líneas también se vuelven un poco más visibles
                        const mouseDist = Math.hypot(mouseX - p1.currentX, mouseY - p1.currentY);
                        const intensity = mouseDist < 150 ? 0.3 : 0.1;

                        ctx.strokeStyle = `rgba(44, 219, 155, ${intensity - (dist / 55) * intensity})`;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
        />
    );
}
