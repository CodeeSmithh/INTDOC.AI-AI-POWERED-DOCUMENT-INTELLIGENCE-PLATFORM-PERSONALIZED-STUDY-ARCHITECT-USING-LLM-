'use client';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

/**
 * DottedSurface - Animated WebGL particle surface using Three.js.
 * @param {string} theme - 'dark' or 'light' for particle color adjustment.
 * @param {string} className - Optional Tailwind classes.
 * @param {object} children - Child components to render above the surface.
 */
export function DottedSurface({ theme = 'dark', className, children, ...props }) {
	const containerRef = useRef(null);
	const sceneRef = useRef(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const SEPARATION = 150;
		const AMOUNTX = 40;
		const AMOUNTY = 60;

		// Scene setup
		const scene = new THREE.Scene();
		
		// Adjust background fog based on theme
		const fogColor = theme === 'dark' ? 0x000000 : 0xffffff;
		scene.fog = new THREE.Fog(fogColor, 2000, 10000);

		const camera = new THREE.PerspectiveCamera(
			60,
			window.innerWidth / window.innerHeight,
			1,
			10000,
		);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		// Transparent background to let the theme background show through if needed
		renderer.setClearColor(0x000000, 0); 

		containerRef.current.appendChild(renderer.domElement);

		// Create particles
		const positions = [];
		const colors = [];

		const geometry = new THREE.BufferGeometry();

		for (let ix = 0; ix < AMOUNTX; ix++) {
			for (let iy = 0; iy < AMOUNTY; iy++) {
				const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
				const y = 0; // Animated below
				const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

				positions.push(x, y, z);
                
                // Colors are normalized [0, 1] in Three.js BufferAttribute
				if (theme === 'dark') {
					colors.push(0.8, 0.8, 0.8); // Light gray
				} else {
					colors.push(0.1, 0.1, 0.1); // Dark gray
				}
			}
		}

		geometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

		// Create material
		const material = new THREE.PointsMaterial({
			size: 8,
			vertexColors: true,
			transparent: true,
			opacity: 0.6,
			sizeAttenuation: true,
		});

		// Create points object
		const points = new THREE.Points(geometry, material);
		scene.add(points);

		let count = 0;
		let animationId;

		const animate = () => {
			animationId = requestAnimationFrame(animate);

			const positionAttribute = geometry.attributes.position;
			const positionsArr = positionAttribute.array;

			let i = 0;
			for (let ix = 0; ix < AMOUNTX; ix++) {
				for (let iy = 0; iy < AMOUNTY; iy++) {
					const index = i * 3;

					// Animate Y position with sine waves
					positionsArr[index + 1] =
						Math.sin((ix + count) * 0.3) * 50 +
						Math.sin((iy + count) * 0.5) * 50;

					i++;
				}
			}

			positionAttribute.needsUpdate = true;
			renderer.render(scene, camera);
			count += 0.1;
		};

		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);
		animate();

		sceneRef.current = {
			scene,
			camera,
			renderer,
			animationId,
		};

		return () => {
			window.removeEventListener('resize', handleResize);

			if (sceneRef.current) {
				cancelAnimationFrame(sceneRef.current.animationId);

				sceneRef.current.scene.traverse((object) => {
					if (object instanceof THREE.Points) {
						object.geometry.dispose();
						if (Array.isArray(object.material)) {
							object.material.forEach((mat) => mat.dispose());
						} else {
							object.material.dispose();
						}
					}
				});

				sceneRef.current.renderer.dispose();

				if (containerRef.current && sceneRef.current.renderer.domElement) {
					containerRef.current.removeChild(
						sceneRef.current.renderer.domElement,
					);
				}
			}
		};
	}, [theme]);

	return (
        <div 
            className="relative min-h-screen w-full flex flex-col items-center overflow-hidden"
            style={{ backgroundColor: 'var(--bg-dark)' }}
        >
            <div
                ref={containerRef}
                className={cn('pointer-events-none absolute inset-0 z-0', className)}
                {...props}
            />
            {children && (
                <div className="relative z-10 w-full">
                    {children}
                </div>
            )}
            {/* Overlay for bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)] via-transparent to-[var(--bg-dark)]/80 pointer-events-none" />
        </div>
	);
}
