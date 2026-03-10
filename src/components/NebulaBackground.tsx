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

        // 15 núcleos de nebulosa (clusters), 5 más que antes
        const numCores = 15;

        // Para que se distribuyan inicialmente en toda la pantalla
        // los repartiremos matemáticamente en una cuadrícula virtual
        const cols = 5;
        const rows = 3;
        const cellWidth = width / cols;
        const cellHeight = height / rows;

        const cores = Array.from({ length: numCores }, (_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            // El centro exacto de la celda + algo de aleatoriedad para que no se vea como tabla
            const baseX = (col + 0.5) * cellWidth + (Math.random() - 0.5) * (cellWidth * 0.4);
            const baseY = (row + 0.5) * cellHeight + (Math.random() - 0.5) * (cellHeight * 0.4);

            return {
                radius: 40 + Math.random() * 60, // Radios moderados
                baseX,
                baseY,
                speedX: (Math.random() - 0.5) * 0.4,
                speedY: (Math.random() - 0.5) * 0.4,
                noisePhase: Math.random() * Math.PI * 2
            };
        });

        const particles: Particle[] = [];
        const particleCount = 250; // Ajustamos para cubrir mejor toda la pantalla

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
            speed: number;
            size: number;
            alpha: number;
            noise: number;

            constructor() {
                this.coreIndex = Math.floor(Math.random() * cores.length);
                this.angle = Math.random() * Math.PI * 2;
                // Partículas distribuidas cerca de su núcleo orbitalmente
                this.baseRadiusOffset = (Math.random() - 0.5) * 160;
                this.speed = (Math.random() - 0.5) * 0.005;
                this.size = Math.random() * 2 + 0.5;
                this.alpha = Math.random() * 0.5 + 0.1;
                this.noise = Math.random() * 1000;
            }

            update() {
                this.angle += this.speed;
                const core = cores[this.coreIndex];

                // Efecto de pulso orgánico
                const naturalRadius = core.radius + this.baseRadiusOffset + Math.sin(Date.now() * 0.0005 + this.noise) * 10;

                // Posición natural de la partícula
                const currentX = core.baseX + Math.cos(this.angle) * Math.max(0, naturalRadius);
                const currentY = core.baseY + Math.sin(this.angle) * Math.max(0, naturalRadius);

                this.draw(currentX, currentY);
            }

            draw(x: number, y: number) {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(x, y, this.size, 0, Math.PI * 2);

                // Color turquesa de la marca
                ctx.fillStyle = `hsla(158, 72%, 52%, ${this.alpha})`;
                ctx.fill();

                if (this.size > 1.8) {
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = 'rgba(44, 219, 155, 0.4)';
                } else {
                    ctx.shadowBlur = 0;
                }
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const render = () => {
            // Fondo muy oscuro pero transparente para el trail (rastro dejado por movimiento)
            ctx.fillStyle = 'rgba(2, 6, 5, 0.3)';
            ctx.fillRect(0, 0, width, height);

            // Actualizar núcleos (flotan aleatoriamente)
            cores.forEach((core) => {
                core.baseX += core.speedX;
                core.baseY += core.speedY;

                // Rebote EN LOS BORDES EXACTOS de la pantalla (evita que desaparezcan)
                const boundMargin = 30; // Que reboten antes de irse muy al fondo
                if (core.baseX < boundMargin) {
                    core.baseX = boundMargin;
                    core.speedX *= -1;
                } else if (core.baseX > width - boundMargin) {
                    core.baseX = width - boundMargin;
                    core.speedX *= -1;
                }

                if (core.baseY < boundMargin) {
                    core.baseY = boundMargin;
                    core.speedY *= -1;
                } else if (core.baseY > height - boundMargin) {
                    core.baseY = height - boundMargin;
                    core.speedY *= -1;
                }

                // Pulsación leve del núcleo
                const dynamicRadius = core.radius + Math.sin(Date.now() * 0.001 + core.noisePhase) * 10;
                const innerRadius = Math.max(0, dynamicRadius * 2);

                const gradient = ctx.createRadialGradient(core.baseX, core.baseY, 0, core.baseX, core.baseY, innerRadius);
                gradient.addColorStop(0, 'rgba(44, 219, 155, 0.05)');  // Turquesa en el centro tenue
                gradient.addColorStop(0.3, 'rgba(0, 51, 39, 0.03)');  // Verde oscuro
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(core.baseX, core.baseY, innerRadius, 0, Math.PI * 2);
                ctx.fill();
            });

            // Actualizar partículas
            particles.forEach(p => p.update());

            // Dibujar sutiles conexiones
            ctx.lineWidth = 0.3;
            // Evaluamos salteando para optimizar rendimiento
            for (let i = 0; i < particles.length; i += 2) {
                for (let j = i + 1; j < particles.length; j += 4) {
                    const p1 = particles[i];
                    const p2 = particles[j];

                    const core1 = cores[p1.coreIndex];
                    const core2 = cores[p2.coreIndex];

                    const natR1 = core1.radius + p1.baseRadiusOffset + Math.sin(Date.now() * 0.0005 + p1.noise) * 10;
                    const natR2 = core2.radius + p2.baseRadiusOffset + Math.sin(Date.now() * 0.0005 + p2.noise) * 10;

                    const x1 = core1.baseX + Math.cos(p1.angle) * natR1;
                    const y1 = core1.baseY + Math.sin(p1.angle) * natR1;
                    const x2 = core2.baseX + Math.cos(p2.angle) * natR2;
                    const y2 = core2.baseY + Math.sin(p2.angle) * natR2;

                    const dist = Math.hypot(x2 - x1, y2 - y1);
                    if (dist < 50) {
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.strokeStyle = `rgba(44, 219, 155, ${0.08 - dist / 620})`;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(render);
        };

        render();

        return () => {
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
