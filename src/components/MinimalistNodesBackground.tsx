"use client";

import React, { useRef, useEffect } from 'react';

interface MinimalistNodesBackgroundProps {
    particleCount?: number;
    color?: string;
    connectionDistance?: number;
}

export function MinimalistNodesBackground({
    particleCount = 50,
    color = "rgba(44, 219, 155, 0.5)", // Default a un verde esmeralda sutil, se puede inyectar el del tenant
    connectionDistance = 150
}: MinimalistNodesBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            baseOpacity: number;

            constructor(width: number, height: number) {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5; // Movimiento muy lento
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 0.5; // Nodos pequeños
                this.baseOpacity = Math.random() * 0.5 + 0.2;
            }

            update(width: number, height: number) {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges gently
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }

            draw(ctx: CanvasRenderingContext2D, colorString: string) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = colorString.replace(/[\d.]+\)$/g, `${this.baseOpacity + 0.3})`); // Más brillantes
                ctx.shadowBlur = 10;
                ctx.shadowColor = colorString;
                ctx.fill();
            }
        }

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            particles = [];
            const count = Math.min(particleCount * 1.5, (window.innerWidth * window.innerHeight) / 10000); // Ligeramente más denso
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(canvas.width, canvas.height));
            }
        };

        const drawConnections = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        const opacity = 1 - (distance / connectionDistance);
                        ctx.beginPath();
                        ctx.strokeStyle = color.replace(/[\d.]+\)$/g, `${opacity * 0.5})`); // Líneas más visibles
                        ctx.lineWidth = 1; // Un poco más gruesas
                        ctx.shadowBlur = 15; // Efecto Glow de neón
                        ctx.shadowColor = color;
                        ctx.moveTo(particles[i].x, particles[i].y);

                        // Efecto "eléctrico": zigzag o curvatura
                        const cx = (particles[i].x + particles[j].x) / 2 + (Math.random() - 0.5) * 15; // Más zigzag
                        const cy = (particles[i].y + particles[j].y) / 2 + (Math.random() - 0.5) * 15;
                        ctx.quadraticCurveTo(cx, cy, particles[j].x, particles[j].y);
                        ctx.stroke();
                        ctx.shadowBlur = 0; // Reset
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.update(canvas.width, canvas.height);
                p.draw(ctx, color);
            });

            drawConnections();

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [particleCount, color, connectionDistance]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ filter: 'blur(0.5px)' }} // Suavizar ligeramente para el estilo 'glass'
        />
    );
}
