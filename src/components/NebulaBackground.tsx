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

        const particles: Particle[] = [];
        const particleCount = 150;

        // Mouse interaction
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
            angle: number;
            radius: number;
            speed: number;
            size: number;
            color: string;
            alpha: number;
            noiseOffsetX: number;
            noiseOffsetY: number;

            constructor() {
                this.angle = Math.random() * Math.PI * 2;
                // Distribute particles mostly in a ring with some spread
                this.radius = 150 + Math.random() * 100 - 50;
                this.speed = 0 + Math.random() * 0.02;
                this.size = Math.random() * 3 + 1;
                this.alpha = Math.random() * 0.5 + 0.1;

                // Colors mostly blueish/cyan for the nebula effect
                const hues = [200, 220, 180, 240];
                const bgHue = hues[Math.floor(Math.random() * hues.length)];
                this.color = `hsla(${bgHue}, 100%, 70%, `;

                this.noiseOffsetX = Math.random() * 1000;
                this.noiseOffsetY = Math.random() * 1000;
            }

            update(centerX: number, centerY: number) {
                this.angle += this.speed;

                // Slight pulsating effect
                const pulse = Math.sin(Date.now() * 0.001 + this.noiseOffsetX) * 10;
                const currentRadius = this.radius + pulse;

                // Calculate position relative to center (which follows mouse)
                const x = centerX + Math.cos(this.angle) * currentRadius;
                const y = centerY + Math.sin(this.angle) * currentRadius;

                this.draw(x, y);
            }

            draw(x: number, y: number) {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(x, y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color + this.alpha + ')';
                ctx.fill();

                // Add glow to some particles
                if (this.size > 2) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = this.color + '1)';
                } else {
                    ctx.shadowBlur = 0;
                }
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const render = () => {
            // Smooth mouse following
            mouseX += (targetX - mouseX) * 0.05;
            mouseY += (targetY - mouseY) * 0.05;

            // Clear canvas with a very dark blue/black fade for trail effect
            ctx.fillStyle = 'rgba(5, 5, 10, 0.2)';
            ctx.fillRect(0, 0, width, height);

            // Draw center glow (the core of the nebula)
            const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 250);
            gradient.addColorStop(0, 'rgba(44, 219, 155, 0.15)'); // Brand turquoise subtle glow
            gradient.addColorStop(0.4, 'rgba(30, 64, 175, 0.1)'); // Deep blue mid
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 250, 0, Math.PI * 2);
            ctx.fill();

            // Draw particles
            particles.forEach(p => p.update(mouseX, mouseY));

            // Draw connection lines for inner sphere effect
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const p1 = particles[i];
                    const p2 = particles[j];

                    // Simple distance check without calculating exact position again
                    // Approximation based on angle difference
                    const angleDiff = Math.abs(p1.angle - p2.angle) % (Math.PI * 2);
                    if (angleDiff < 0.2 || angleDiff > (Math.PI * 2 - 0.2)) {
                        const pulse1 = Math.sin(Date.now() * 0.001 + p1.noiseOffsetX) * 10;
                        const currentRadius1 = p1.radius + pulse1;
                        const x1 = mouseX + Math.cos(p1.angle) * currentRadius1;
                        const y1 = mouseY + Math.sin(p1.angle) * currentRadius1;

                        const pulse2 = Math.sin(Date.now() * 0.001 + p2.noiseOffsetX) * 10;
                        const currentRadius2 = p2.radius + pulse2;
                        const x2 = mouseX + Math.cos(p2.angle) * currentRadius2;
                        const y2 = mouseY + Math.sin(p2.angle) * currentRadius2;

                        const dist = Math.hypot(x2 - x1, y2 - y1);
                        if (dist < 80) {
                            ctx.beginPath();
                            ctx.moveTo(x1, y1);
                            ctx.lineTo(x2, y2);
                            ctx.strokeStyle = `rgba(100, 200, 255, ${0.15 - dist / 800})`;
                            ctx.stroke();
                        }
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
