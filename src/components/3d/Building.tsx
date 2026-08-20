'use client';

import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BuildingPart {
  size: [number, number, number];
  position: [number, number, number];
  color?: string; // Optional per-part color
  name?: string;  // Optional per-part name
  hasDoor?: boolean;
  doorOffset?: [number, number, number];
  doorRotation?: [number, number, number];
}

interface BuildingProps {
  position: [number, number, number];
  size?: [number, number, number];
  parts?: BuildingPart[];
  color: string;
  name: string;
  onClick?: () => void;
  highlightVenue?: string;
  hasReachedDestination?: boolean;
}

// Sub-component for individual parts to allow useFrame hooks
function BuildingPartMesh({ 
  part, 
  color, 
  isTarget, 
  hasReachedDestination, 
  isHovered, 
  onClick, 
  onPointerOver, 
  onPointerOut 
}: any) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (hasReachedDestination && isTarget && materialRef.current) {
      // Intense strobe effect when destination is reached
      const t = state.clock.elapsedTime * 8; // fast blink
      materialRef.current.emissiveIntensity = Math.abs(Math.sin(t)) * 1.5;
      materialRef.current.emissive.setHex(Math.sin(t) > 0 ? 0xff3333 : 0x10b981); // Flash between red and emerald green
    } else if (materialRef.current) {
      // Normal state
      materialRef.current.emissiveIntensity = isTarget ? 0.8 : 0;
      materialRef.current.emissive.setHex(isTarget ? 0x059669 : 0x000000);
    }
  });

  return (
    <mesh
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      castShadow
      receiveShadow
    >
      <boxGeometry args={part.size} />
      <meshStandardMaterial 
        ref={materialRef}
        color={isHovered ? '#ffffff' : (part.color || color)} 
        roughness={0.3} 
        metalness={0.1} 
      />
    </mesh>
  );
}

export default function Building({ position, size, parts, color, name, onClick, highlightVenue, hasReachedDestination }: BuildingProps) {
  const [hovered, setHover] = useState(false);
  const [hoveredPartName, setHoveredPartName] = useState<string | null>(null);

  const handlePointerOver = (e: any, partName?: string) => {
    e.stopPropagation();
    setHover(true);
    if (partName) setHoveredPartName(partName);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHover(false);
    setHoveredPartName(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  // Simple scale effect instead of spring
  const scale = hovered ? 1.05 : 1;
  const baseMaterialColor = hovered ? '#ffffff' : color;

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {parts ? (
        <group>
          {parts.map((part, idx) => {
            const isTarget = highlightVenue === part.name;
            return (
            <group key={idx} position={part.position}>
              <BuildingPartMesh
                part={part}
                color={color}
                isTarget={isTarget}
                hasReachedDestination={hasReachedDestination}
                isHovered={hovered && hoveredPartName === part.name}
                onClick={handleClick}
                onPointerOver={(e: any) => handlePointerOver(e, part.name)}
                onPointerOut={handlePointerOut}
              />
              
              {/* Optional Physical Door */}
              {part.hasDoor && part.doorOffset && (
                <mesh position={part.doorOffset} rotation={part.doorRotation || [0, 0, 0]}>
                  <boxGeometry args={[1.5, 2.5, 0.2]} />
                  <meshStandardMaterial color="#1e293b" /> {/* Dark slate door */}
                </mesh>
              )}

              {/* Room Name / Venue Plaque */}
              {part.name && (
                <Html
                  position={part.hasDoor && part.doorOffset 
                    ? [part.doorOffset[0], part.doorOffset[1] + 1.8, part.doorOffset[2]] 
                    : [0, (part.size[1] / 2) + 0.5, 0]}
                  center
                  distanceFactor={part.hasDoor ? 5 : 30}
                  zIndexRange={[100, 0]}
                  transform={!!part.hasDoor} // Makes it a 3D wall plaque if it has a door
                  rotation={part.hasDoor && part.doorRotation ? part.doorRotation : [0, 0, 0]}
                >
                  <div className={`
                    px-2 py-0.5 rounded text-[14px] font-black whitespace-nowrap shadow-sm transition-all duration-300
                    ${hoveredPartName === part.name ? 'bg-blue-600 text-white scale-110' : (part.hasDoor ? 'bg-slate-800 text-white border border-slate-600' : 'bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200/50')}
                    ${highlightVenue === part.name ? 'animate-pulse bg-emerald-500 text-white scale-125 ring-4 ring-emerald-300' : ''}
                  `}>
                    {part.name}
                  </div>
                </Html>
              )}
            </group>
            );
          })}
        </group>
      ) : (
        <mesh
          onClick={handleClick}
          onPointerOver={(e) => handlePointerOver(e)}
          onPointerOut={handlePointerOut}
          castShadow
          receiveShadow
        >
          <boxGeometry args={size} />
          <meshStandardMaterial color={baseMaterialColor} roughness={0.3} metalness={0.1} />
        </mesh>
      )}

      {/* Main Building Name Label (only show if not hovering a specific part, or if no parts) */}
      <Html
        position={[0, (size ? size[1] / 2 : 4) + 2.5, 0]}
        center
        distanceFactor={30}
        zIndexRange={[100, 0]}
      >
        <div className={`
          px-3 py-1.5 rounded-xl text-sm font-black whitespace-nowrap shadow-lg transition-all duration-300
          ${hovered && !hoveredPartName ? 'bg-blue-600 text-white scale-110' : 'bg-white/90 backdrop-blur-md text-slate-800 border border-slate-200'}
        `}>
          {name}
        </div>
      </Html>
    </group>
  );
}
