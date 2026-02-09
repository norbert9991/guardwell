import React, { useEffect, useRef, useState } from 'react';

/**
 * AntigravityBackground
 * 
 * Creates a background with:
 * 1. A canvas-based magnetic particle field (colored dashes orienting to cursor).
 * 2. A subtle spotlight that follows the mouse.
 */
export const AntigravityBackground = ({ children }) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    // Use ref for animation loop performance to avoid re-renders
    const mouseRef = useRef({ x: -1000, y: -1000 });
    // State for CSS-based spotlight to keep it simple
    const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };

            if (window.innerWidth > 0 && window.innerHeight > 0) {
                setSpotlightPos({
                    x: (e.clientX / window.innerWidth) * 100,
                    y: (e.clientY / window.innerHeight) * 100
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Canvas Particle System
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Configuration
        const particles = [];
        const spacing = 40; // Grid spacing
        const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#A78BFA', '#F472B6']; // Google-ish + Cool colors

        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.baseX = x;
                this.baseY = y;
                // Add some randomness to position
                this.x += (Math.random() - 0.5) * 20;
                this.y += (Math.random() - 0.5) * 20;

                this.size = Math.random() * 2 + 1.5; // Thickness
                this.length = Math.random() * 6 + 4; // Length
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            draw(ctx, mouseX, mouseY) {
                // Calculate vector to mouse
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Rotation (point towards mouse)
                // Add -Math.PI / 2 because we draw vertical dashes by default? 
                // Let's assume we draw horizontal dashes, so atan2 is correct.
                let angle = Math.atan2(dy, dx);

                // Interaction: Move slightly away from mouse (repulsion) or towards (attraction)?
                // "Antigravity" might imply repulsion. Let's do a subtle repulsion.
                const maxDistance = 300;
                const force = (maxDistance - distance) / maxDistance;
                let moveX = 0;
                let moveY = 0;

                if (distance < maxDistance) {
                    moveX = -Math.cos(angle) * force * 20;
                    moveY = -Math.sin(angle) * force * 20;
                }

                ctx.save();
                ctx.translate(this.x + moveX, this.y + moveY);
                ctx.rotate(angle);

                ctx.fillStyle = this.color;
                ctx.beginPath();
                // Draw pill shape
                ctx.roundRect(-this.length / 2, -this.size / 2, this.length, this.size, this.size);
                ctx.fill();

                ctx.restore();
            }
        }

        const init = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles.length = 0;

            for (let x = 0; x < canvas.width + spacing; x += spacing) {
                for (let y = 0; y < canvas.height + spacing; y += spacing) {
                    particles.push(new Particle(x, y));
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const { x, y } = mouseRef.current;

            particles.forEach(particle => {
                particle.draw(ctx, x, y);
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        init();
        animate();

        const handleResize = () => init();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#F8FAFC] via-white to-[#F1F5F9]"
        >
            {/* Spotlight Effect */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(111, 163, 216, 0.08), transparent 45%)`
                }}
            />

            {/* Canvas Particle Layer */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none z-0 opacity-60"
            />

            {/* Content Overlay */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
                {children}
            </div>
        </div>
    );
};

/**
 * MagneticCard
 * 
 * A card that tilts 3D towards the mouse position.
 */
export const MagneticCard = ({ children, className = "" }) => {
    const cardRef = useRef(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Calculate distance from center
        const rotateY = ((mouseX - centerX) / (rect.width / 2)) * 5; // Max 5 deg rotation
        const rotateX = ((centerY - mouseY) / (rect.height / 2)) * 5; // Max 5 deg rotation (inverted Y for natural tilt)

        setRotation({ x: rotateX, y: rotateY });
    };

    const handleMouseEnter = () => setIsHovering(true);

    const handleMouseLeave = () => {
        setIsHovering(false);
        setRotation({ x: 0, y: 0 });
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
            style={{
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1, 1, 1)`,
            }}
        >
            <div className="relative w-full h-full">
                {children}
                {/* Shine effect */}
                <div
                    className={`absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                        background: `linear-gradient(${135 - rotation.x * 5 + rotation.y * 5}deg, rgba(255,255,255,0.2) 0%, transparent 50%)`,
                        mixBlendMode: 'overlay'
                    }}
                />
            </div>
        </div>
    );
};
