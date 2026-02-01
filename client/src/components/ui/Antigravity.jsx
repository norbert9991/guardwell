import React, { useEffect, useRef, useState } from 'react';

/**
 * AntigravityBackground
 * 
 * Creates a background with:
 * 1. A subtle spotlight that follows the mouse.
 * 2. Floating orbs that move in parallax (opposite to mouse).
 */
export const AntigravityBackground = ({ children }) => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!containerRef.current) return;
            const { innerWidth, innerHeight } = window;
            // Normalize coordinates -1 to 1
            const x = (e.clientX / innerWidth) * 2 - 1;
            const y = (e.clientY / innerHeight) * 2 - 1;
            setMousePos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Parallax movement calculation
    // movement amount = position * factor * -1 (opposite direction)
    const moveX = mousePos.x * -20; // Max 20px movement
    const moveY = mousePos.y * -20;

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 overflow-hidden bg-gradient-to-br from-[#EEF1F4] via-white to-[#E3E6EB]"
        >
            {/* Spotlight Effect */}
            <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at ${(mousePos.x + 1) * 50}% ${(mousePos.y + 1) * 50}%, rgba(111, 163, 216, 0.15), transparent 40%)`
                }}
            />

            {/* Parallax Orbs */}
            <div 
                className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#6FA3D8]/20 rounded-full blur-[100px] transition-transform duration-100 ease-out will-change-transform"
                style={{ transform: `translate(${moveX}px, ${moveY}px)` }}
            />
            <div 
                className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#1E3A5F]/10 rounded-full blur-[100px] transition-transform duration-100 ease-out will-change-transform"
                style={{ transform: `translate(${moveX * 1.5}px, ${moveY * 1.5}px)`, transitionDelay: '50ms' }}
            />
            <div 
                className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-[#6FA3D8]/10 rounded-full blur-[80px] animate-pulse transition-transform duration-100 ease-out will-change-transform"
                style={{ transform: `translate(${moveX * 0.5}px, ${moveY * 0.5}px)` }}
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
                        background: `linear-gradient(${135 - rotation.x * 5 + rotation.y * 5}deg, rgba(255,255,255,0.1) 0%, transparent 50%)`,
                        mixBlendMode: 'overlay'
                    }}
                />
            </div>
        </div>
    );
};
