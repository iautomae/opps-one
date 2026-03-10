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
        // Definiendo múltiples núcleos de nebulosa (clusters)
        const numCores = 6;
        const cores = Array.from({ length: numCores }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: 60 + Math.random() * 80, // Radios más pequeños
            baseX: Math.random() * width,
            baseY: Math.random() * height,
            speedX: (Math.random() - 0.5) * 0.4,
            speedY: (Math.random() - 0.5) * 0.4,
            noisePhase: Math.random() * Math.PI * 2
        }));

        const particles: Particle[] = [];
        const particleCount = 250;

        // Interacción del mouse muy sutil y lenta
        let mouseX = width / 2;
        let mouseY = height / 2;
        let targetX = width / 2;
        let targetY = height / 2;

        const handleMouseMove = (e: MouseEvent) => {
            targetX = e.clientX;
            targetY = e.clientY;
        };

        window.addEventListener('mousemove', handleMouseMove);

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
            radiusOffset: number;
            speed: number;
            size: number;
            alpha: number;
            noise: number;

            constructor() {
                this.coreIndex = Math.floor(Math.random() * cores.length);
                this.angle = Math.random() * Math.PI * 2;
                // Partículas esparcidas alrededor de su núcleo
                this.radiusOffset = (Math.random() - 0.5) * 180;
                this.speed = (Math.random() - 0.5) * 0.005;
                this.size = Math.random() * 2 + 0.5;
                this.alpha = Math.random() * 0.5 + 0.1;
                this.noise = Math.random() * 1000;
            }

            update() {
                this.angle += this.speed;
                const core = cores[this.coreIndex];

                // Efecto de pulso orgánico
                const currentRadius = core.radius + this.radiusOffset + Math.sin(Date.now() * 0.0005 + this.noise) * 10;

                const x = core.x + Math.cos(this.angle) * currentRadius;
                const y = core.y + Math.sin(this.angle) * currentRadius;

                this.draw(x, y);
            }

            draw(x: number, y: number) {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(x, y, this.size, 0, Math.PI * 2);

                // Color turquesa de la marca: hsla(158, 72%, 52%)
                ctx.fillStyle = `hsla(158, 72%, 52%, ${this.alpha})`;
                ctx.fill();

                if (this.size > 1.5) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(44, 219, 155, 0.6)';
                } else {
                    ctx.shadowBlur = 0;
                }
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const render = () => {
            // El seguimiento del mouse es extremadamente lento, casi imperceptible
            // Solo para que los núcleos tengan una ligerísima tendencia hacia el ratón
            mouseX += (targetX - mouseX) * 0.005;
            mouseY += (targetY - mouseY) * 0.005;

            // Fondo muy oscuro con ligero tono verde militar profundo/negro
            ctx.fillStyle = 'rgba(2, 6, 5, 0.2)';
            ctx.fillRect(0, 0, width, height);

            // Actualizar y dibujar núcleos
            cores.forEach((core) => {
                // Movimiento autónomo (deriva)
                core.baseX += core.speedX;
                core.baseY += core.speedY;

                // Rebote suave en los bordes extendidos
                if (core.baseX < -200 || core.baseX > width + 200) core.speedX *= -1;
                if (core.baseY < -200 || core.baseY > height + 200) core.speedY *= -1;

                // Atracción súper sutil al mouse
                const dx = mouseX - core.baseX;
                const dy = mouseY - core.baseY;
                const dist = Math.hypot(dx, dy);

                // El núcleo real se mueve un poquito hacia el mouse
                core.x = core.baseX + (dx / dist) * Math.min(dist, 50) * 0.05;
                core.y = core.baseY + (dy / dist) * Math.min(dist, 50) * 0.05;

                // Pulsación del núcleo
                const dynamicRadius = core.radius + Math.sin(Date.now() * 0.001 + core.noisePhase) * 15;

                // Brillo del núcleo (Verde Turquesa y Verde Oscuro)
                const gradient = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, dynamicRadius * 2);
                gradient.addColorStop(0, 'rgba(44, 219, 155, 0.08)');  // Turquesa en el centro
                gradient.addColorStop(0.3, 'rgba(0, 51, 39, 0.05)');  // Verde oscuro (#003327)
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(core.x, core.y, dynamicRadius * 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Dibujar partículas
            particles.forEach(p => p.update());

            // Dibujar conexiones tenues
            ctx.lineWidth = 0.3;
            for (let i = 0; i < particles.length; i += 2) {
                for (let j = i + 1; j < particles.length; j += 3) {
                    const p1 = particles[i];
                    const p2 = particles[j];

                    const core1 = cores[p1.coreIndex];
                    const core2 = cores[p2.coreIndex];

                    const x1 = core1.x + Math.cos(p1.angle) * (core1.radius + p1.radiusOffset);
                    const y1 = core1.y + Math.sin(p1.angle) * (core1.radius + p1.radiusOffset);
                    const x2 = core2.x + Math.cos(p2.angle) * (core2.radius + p2.radiusOffset);
                    const y2 = core2.y + Math.sin(p2.angle) * (core2.radius + p2.radiusOffset);

                    const dist = Math.hypot(x2 - x1, y2 - y1);
                    if (dist < 60) {
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.strokeStyle = `rgba(44, 219, 155, ${0.1 - dist / 600})`;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
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
