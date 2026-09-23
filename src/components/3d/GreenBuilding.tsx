'use client';

import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface GreenBuildingProps {
  position?: [number, number, number];
  scale?: [number, number, number];
  onClick?: () => void;
  highlightVenue?: string;
  hasReachedDestination?: boolean;
}

// Stylized campus tree
function CampusTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.45, 4, 8]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>
      {/* Foliage Layers */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <dodecahedronGeometry args={[2.2, 1]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
      <mesh position={[0, 6, 0]} castShadow>
        <dodecahedronGeometry args={[1.7, 1]} />
        <meshStandardMaterial color="#16a34a" roughness={0.8} />
      </mesh>
      <mesh position={[0.5, 5, 0.4]} castShadow>
        <dodecahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial color="#22c55e" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Potted terracotta plant matching the entrance photo
function PottedPlant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Terracotta Pot */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.2, 0.5, 12]} />
        <meshStandardMaterial color="#c2410c" roughness={0.9} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.05, 12]} />
        <meshStandardMaterial color="#3f2305" roughness={1} />
      </mesh>
      {/* Green Plant Foliage */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <dodecahedronGeometry args={[0.35, 1]} />
        <meshStandardMaterial color="#16a34a" roughness={0.7} />
      </mesh>
      <mesh position={[0.1, 0.6, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.25, 1]} />
        <meshStandardMaterial color="#22c55e" roughness={0.7} />
      </mesh>
    </group>
  );
}

export default function GreenBuilding({
  position = [-34, 0, -6],
  scale = [2.8, 2.6, 2.8],
  onClick,
  highlightVenue,
  hasReachedDestination
}: GreenBuildingProps) {
  const [hovered, setHovered] = useState(false);

  // Colors based on the real photograph
  const glassColor = '#0369a1';      // Deep rich reflective blue curtain wall
  const glassTint = '#38bdf8';       // Sky blue highlights
  const redCanopyColor = '#b91c1c';  // Signature Crimson / Maroon Red
  const darkRedColor = '#881337';    // Deep burgundy / maroon red
  const whitePanelColor = '#f8fafc'; // White ACP wall cladding
  const stoneWallColor = '#e2e8f0';  // Off-white stone wall for right wing
  const steelColor = '#f1f5f9';      // Stainless steel / chrome finish
  const darkFrameColor = '#0f172a';  // Dark slate window & door frames
  const graniteStairColor = '#a8a29e'; // Rose/brownish granite steps tone
  const paverColor = '#94a3b8';      // Paved entrance courtyard

  const isHighlighted = highlightVenue?.toLowerCase().includes('green') || highlightVenue?.toLowerCase().includes('rsb');

  return (
    <group 
      position={position}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* --- ENTRANCE PLAZA & INTERLOCKING PAVEMENT --- */}
      <mesh position={[1, 0.05, 0]} receiveShadow>
        <boxGeometry args={[26, 0.1, 28]} />
        <meshStandardMaterial color={paverColor} roughness={0.85} />
      </mesh>

      {/* --- MAIN BUILDING REAR & INTERNAL CORE --- */}
      <mesh position={[-2, 7.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 15, 22]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* --- BLUE REFLECTIVE GLASS CURTAIN WALL (FRONT FACADE) --- */}
      {/* Facing East (+X direction towards road) */}
      <mesh position={[4.05, 8.5, 1]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 13, 16]} />
        <meshStandardMaterial 
          color={glassColor} 
          roughness={0.15} 
          metalness={0.8} 
          transparent 
          opacity={0.92} 
        />
      </mesh>

      {/* Horizontal Window Mullions / Floor Divide Bands */}
      {[2.5, 6, 9.5, 13].map((y, i) => (
        <mesh key={`mullion-h-${i}`} position={[4.16, y, 1]} castShadow>
          <boxGeometry args={[0.1, 0.25, 16.1]} />
          <meshStandardMaterial color={steelColor} roughness={0.3} metalness={0.6} />
        </mesh>
      ))}

      {/* Vertical Window Grid Dividers */}
      {[-5, -1, 3, 7].map((z, i) => (
        <mesh key={`mullion-v-${i}`} position={[4.16, 8.5, z]} castShadow>
          <boxGeometry args={[0.1, 13, 0.2]} />
          <meshStandardMaterial color={steelColor} roughness={0.3} metalness={0.6} />
        </mesh>
      ))}

      {/* Casement Windows (Top openable windows) */}
      {[
        [4.25, 11, -3],
        [4.25, 11, 2],
        [4.25, 7.5, -4],
        [4.25, 7.5, 3]
      ].map(([x, y, z], idx) => (
        <group key={`window-case-${idx}`} position={[x, y, z]} rotation={[0, 0, 0.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 1.2, 1.6]} />
            <meshStandardMaterial color={glassTint} roughness={0.1} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.1, 1.3, 0.08]} />
            <meshStandardMaterial color={darkFrameColor} />
          </mesh>
        </group>
      ))}

      {/* --- LEFT ACCENT COLUMN: HORIZONTAL WHITE & BURGUNDY STRIPES --- */}
      <group position={[4.1, 8.5, 9.5]}>
        {Array.from({ length: 9 }).map((_, idx) => (
          <mesh 
            key={`stripe-${idx}`} 
            position={[0, -6 + idx * 1.45, 0]} 
            castShadow 
            receiveShadow
          >
            <boxGeometry args={[0.4, 1.3, 3]} />
            <meshStandardMaterial 
              color={idx % 2 === 0 ? whitePanelColor : darkRedColor} 
              roughness={0.3} 
              metalness={0.2} 
            />
          </mesh>
        ))}
      </group>

      {/* --- STRUCTURAL STEEL DIAGONAL TRUSS / BRACE (`<` SHAPED) --- */}
      <group position={[4.22, 11.5, 6.5]}>
        <mesh rotation={[0, 0, Math.PI / 4]} position={[0, 0.8, 1]}>
          <cylinderGeometry args={[0.08, 0.08, 3.8, 8]} />
          <meshStandardMaterial color={steelColor} metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]} position={[0, -0.8, 1]}>
          <cylinderGeometry args={[0.08, 0.08, 3.8, 8]} />
          <meshStandardMaterial color={steelColor} metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* --- TOP RED ANGLED WING / CANOPY & ROOFLINE --- */}
      {/* Top Red Parapet Fascia Band */}
      <mesh position={[4.2, 15.3, 0]} castShadow>
        <boxGeometry args={[1.5, 0.8, 22]} />
        <meshStandardMaterial color={redCanopyColor} roughness={0.25} metalness={0.3} />
      </mesh>

      {/* Iconic Top Left Red Angled Wing Overhang */}
      <group position={[4.5, 16.2, 9.8]}>
        <mesh rotation={[0, -0.35, 0.15]} castShadow>
          <boxGeometry args={[5.5, 1.4, 6.5]} />
          <meshStandardMaterial color={redCanopyColor} roughness={0.2} metalness={0.3} />
        </mesh>
        <mesh position={[2.4, 0.3, 1]} rotation={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[2.8, 1.2, 2.8]} />
          <meshStandardMaterial color={redCanopyColor} roughness={0.2} metalness={0.3} />
        </mesh>
      </group>

      {/* --- ROOFTOP STEEL FRAME & SIGNAGE ("RAJALAKSHMI SCHOOL OF BUSINESS") --- */}
      <group position={[4.2, 16.5, -2]}>
        {[-4, -1, 2, 5].map((zPos, idx) => (
          <mesh key={`roof-post-${idx}`} position={[0, 0.7, zPos]}>
            <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 1.3, 0.5]}>
          <boxGeometry args={[0.1, 0.1, 10]} />
          <meshStandardMaterial color={steelColor} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.6, 0.5]}>
          <boxGeometry args={[0.1, 0.1, 10]} />
          <meshStandardMaterial color={steelColor} metalness={0.8} />
        </mesh>

        <Html
          position={[0.2, 0.9, 0.5]}
          rotation={[0, Math.PI / 2, 0]}
          transform
          distanceFactor={18}
          center
        >
          <div className="select-none pointer-events-none flex flex-col items-center">
            <span className="font-black text-[13px] tracking-wider text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase whitespace-nowrap bg-black/50 px-2 py-0.5 rounded border border-amber-400/50">
              RAJALAKSHMI
            </span>
            <span className="font-bold text-[10px] tracking-widest text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] uppercase whitespace-nowrap">
              SCHOOL OF BUSINESS
            </span>
          </div>
        </Html>
      </group>

      {/* --- CONTINUOUS HORIZONTAL CRIMSON SPANDREL BAND (Above Ground Floor) --- */}
      <mesh position={[4.22, 3.8, 1]} castShadow>
        <boxGeometry args={[0.35, 0.6, 17.5]} />
        <meshStandardMaterial color={redCanopyColor} roughness={0.25} metalness={0.3} />
      </mesh>

      {/* --- RIGHT WING ARCHITECTURAL WALL WITH GEOMETRIC WINDOW CUTOUTS --- */}
      <group position={[4.2, 5, -8.5]}>
        {/* Off-white solid architectural stone wall */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 10, 5]} />
          <meshStandardMaterial color={stoneWallColor} roughness={0.6} />
        </mesh>

        {/* Circular Porthole Window cutout (Upper) */}
        <mesh position={[0.28, 2.5, 0.8]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
          <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.9} />
        </mesh>

        {/* Triangular Window cutout (Middle) */}
        <mesh position={[0.28, 0.2, 0.8]} rotation={[0, Math.PI / 2, 0]}>
          <coneGeometry args={[0.45, 0.8, 3]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
        </mesh>

        {/* Rectangular Glass Window (Bottom) */}
        <mesh position={[0.28, -2.5, 0.8]}>
          <boxGeometry args={[0.08, 1.2, 1.2]} />
          <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.8} />
        </mesh>
      </group>

      {/* --- MAIN ENTRANCE PORTICO, LOBBY INTERIOR & DETAILS --- */}
      <group position={[4.3, 0, -1]}>
        {/* Left Stone Pier / Column */}
        <mesh position={[0.1, 1.8, 2.7]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 3.6, 0.6]} />
          <meshStandardMaterial color="#581c1c" roughness={0.6} />
        </mesh>

        {/* Right Stone Pier / Column */}
        <mesh position={[0.1, 1.8, -2.7]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 3.6, 0.6]} />
          <meshStandardMaterial color="#581c1c" roughness={0.6} />
        </mesh>

        {/* --- DETAILED LOBBY INTERIOR (Visible through glass doors) --- */}
        <group position={[-3.5, 0, 0]}>
          {/* Polished Maroon Granite Floor (High gloss as in photo) */}
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[7.5, 0.05, 7.8]} />
            <meshStandardMaterial color="#4a0e17" roughness={0.15} metalness={0.25} />
          </mesh>

          {/* Lobby Drop Ceiling (2x2 Grid with LED Panels) */}
          <mesh position={[0, 3.5, 0]}>
            <boxGeometry args={[7.5, 0.1, 7.8]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.8} />
          </mesh>

          {/* Recessed Glowing Square LED Ceiling Panels */}
          {[-2, 0, 2].map((xOffset) =>
            [-1.8, 1.8].map((zOffset) => (
              <mesh key={`led-${xOffset}-${zOffset}`} position={[xOffset, 3.44, zOffset]}>
                <boxGeometry args={[0.9, 0.02, 0.9]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
              </mesh>
            ))
          )}

          {/* Central Ceiling AC Cassette Vent */}
          <mesh position={[0, 3.44, 0]}>
            <boxGeometry args={[1.2, 0.03, 1.2]} />
            <meshStandardMaterial color="#334155" />
          </mesh>

          {/* --- LEFT SIDE: ELEVATOR / LIFT LOBBY --- */}
          <group position={[0, 0, 3.8]}>
            {/* Maroon Granite Clad Elevator Wall */}
            <mesh position={[0, 1.8, 0]}>
              <boxGeometry args={[7.4, 3.5, 0.2]} />
              <meshStandardMaterial color="#581c1c" roughness={0.4} />
            </mesh>
            {/* Stainless Steel Elevator Doors */}
            <mesh position={[-0.5, 1.4, -0.12]}>
              <boxGeometry args={[1.6, 2.6, 0.05]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Elevator Frame & Call Button */}
            <mesh position={[-0.5, 1.4, -0.1]}>
              <boxGeometry args={[1.8, 2.7, 0.02]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Blue Wheelchair / Lift Signboard */}
            <mesh position={[-0.5, 3.0, -0.12]}>
              <boxGeometry args={[0.3, 0.3, 0.02]} />
              <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.3} />
            </mesh>
          </group>

          {/* --- RIGHT SIDE: RECEPTION DESK & BRANDING --- */}
          <group position={[0, 0, -3.8]}>
            {/* White Back Wall with Wood Accent Section */}
            <mesh position={[0, 1.8, 0]}>
              <boxGeometry args={[7.4, 3.5, 0.2]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.6} />
            </mesh>
            <mesh position={[-0.5, 1.8, 0.11]}>
              <boxGeometry args={[2.5, 2.8, 0.05]} />
              <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>

            {/* "Rajalakshmi Institutions" Signboard */}
            <Html
              position={[-0.5, 2.2, 0.2]}
              rotation={[0, -Math.PI / 2, 0]}
              transform
              distanceFactor={8}
              center
            >
              <div className="bg-white/95 border border-slate-200 px-3 py-1.5 rounded-lg shadow-md flex flex-col items-center select-none pointer-events-none">
                <span className="text-[10px] font-black text-slate-800 tracking-wider">Rajalakshmi</span>
                <span className="text-[7px] font-bold text-slate-500 tracking-widest uppercase">Institutions</span>
              </div>
            </Html>

            {/* Red Fire Hose Safety Reel Drum */}
            <group position={[1.5, 2.0, 0.2]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 0.15, 16]} />
                <meshStandardMaterial color="#dc2626" roughness={0.4} />
              </mesh>
            </group>

            {/* Curved Walnut Wood Reception Counter */}
            <group position={[-0.5, 0.55, 1.8]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[2.4, 1.1, 1.2]} />
                <meshStandardMaterial color="#854d0e" roughness={0.4} />
              </mesh>
              {/* Black Granite Counter Top */}
              <mesh position={[0, 0.56, 0]}>
                <boxGeometry args={[2.5, 0.08, 1.3]} />
                <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.5} />
              </mesh>
            </group>

            {/* White Visitor / Receptionist Chair */}
            <group position={[-0.5, 0.45, 0.6]}>
              <mesh>
                <boxGeometry args={[0.5, 0.8, 0.5]} />
                <meshStandardMaterial color="#f1f5f9" />
              </mesh>
            </group>
          </group>

          {/* --- REAR BACK WALL: ENQUIRY WINDOW & WAITING BENCH --- */}
          <group position={[-3.6, 0, 0]}>
            {/* White Interior Wall */}
            <mesh position={[0, 1.8, 0]}>
              <boxGeometry args={[0.2, 3.5, 7.8]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
            {/* Enquiry / Administrative Glass Window with Blue Trim */}
            <group position={[0.11, 1.7, 0.5]}>
              <mesh>
                <boxGeometry args={[0.05, 1.4, 2.6]} />
                <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.6} transparent opacity={0.6} />
              </mesh>
              {/* Blue Border Frame */}
              <mesh position={[0.01, 0, 0]}>
                <boxGeometry args={[0.06, 1.5, 2.7]} />
                <meshStandardMaterial color="#1d4ed8" />
              </mesh>
            </group>

            {/* Silver Waiting Lounge Bench */}
            <group position={[0.6, 0.35, -2]}>
              <mesh>
                <boxGeometry args={[0.6, 0.45, 1.8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          </group>
        </group>

        {/* --- MAIN ENTRANCE FRAMELESS GLASS DOORS --- */}
        {/* Left Glass Swing Door */}
        <group position={[0.1, 1.4, 0.9]}>
          <mesh>
            <boxGeometry args={[0.05, 2.7, 1.5]} />
            <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.8} transparent opacity={0.4} />
          </mesh>
          {/* Stainless Steel Vertical Pull Handle */}
          <mesh position={[0.08, 0, -0.6]}>
            <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Pivot Clamps */}
          <mesh position={[0, 1.35, 0.6]}>
            <boxGeometry args={[0.1, 0.1, 0.15]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} />
          </mesh>
        </group>

        {/* Right Glass Swing Door */}
        <group position={[0.1, 1.4, -0.9]}>
          <mesh>
            <boxGeometry args={[0.05, 2.7, 1.5]} />
            <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.8} transparent opacity={0.4} />
          </mesh>
          {/* Stainless Steel Vertical Pull Handle */}
          <mesh position={[0.08, 0, 0.6]}>
            <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Pivot Clamps */}
          <mesh position={[0, 1.35, -0.6]}>
            <boxGeometry args={[0.1, 0.1, 0.15]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} />
          </mesh>
        </group>

        {/* IGBC Green Building Certification Plaque on Left Side Glass */}
        <mesh position={[0.18, 1.5, 2.2]}>
          <boxGeometry args={[0.02, 0.7, 0.8]} />
          <meshStandardMaterial color="#22c55e" roughness={0.3} />
        </mesh>

        {/* Potted Plants flanking the glass entrance doors */}
        <PottedPlant position={[0.4, 0, 2.3]} scale={1.1} />
        <PottedPlant position={[0.4, 0, -2.3]} scale={1.1} />

        {/* Bold Flared Crimson Red Entrance Portico Canopy */}
        <group position={[2.2, 3.8, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.2, 0.45, 6.2]} />
            <meshStandardMaterial color={redCanopyColor} roughness={0.2} metalness={0.3} />
          </mesh>
          <mesh position={[2.1, 0, 0]}>
            <boxGeometry args={[0.1, 0.45, 6.2]} />
            <meshStandardMaterial color={darkRedColor} />
          </mesh>
          {/* Underside grid panels */}
          {[-1.5, 0, 1.5].map((z, idx) => (
            <mesh key={`canopy-grid-${idx}`} position={[0, -0.23, z]}>
              <boxGeometry args={[4.1, 0.02, 0.05]} />
              <meshStandardMaterial color="#7f1d1d" />
            </mesh>
          ))}
        </group>
      </group>

      {/* --- GRAND MULTI-TIER ENTRANCE STAIRCASE --- */}
      <group position={[5.8, 0, -1]}>
        {/* Tiered Rose/Granite Steps */}
        {Array.from({ length: 6 }).map((_, stepIdx) => (
          <mesh 
            key={`step-${stepIdx}`} 
            position={[stepIdx * 0.55, (5 - stepIdx) * 0.22 + 0.11, 0]} 
            receiveShadow 
            castShadow
          >
            <boxGeometry args={[0.65, (5 - stepIdx) * 0.22 + 0.22, 7.5]} />
            <meshStandardMaterial color={graniteStairColor} roughness={0.65} />
          </mesh>
        ))}

        {/* --- CENTRAL DOUBLE-RUNG STAINLESS STEEL LADDER RAILING --- */}
        {/* Matches the distinct central railing in the user photo */}
        <group position={[1.6, 0.9, 0]}>
          {/* Left top rail */}
          <mesh rotation={[0, 0, -0.42]} position={[0, 0, 0.25]}>
            <cylinderGeometry args={[0.035, 0.035, 3.6, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Right top rail */}
          <mesh rotation={[0, 0, -0.42]} position={[0, 0, -0.25]}>
            <cylinderGeometry args={[0.035, 0.035, 3.6, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Ladder Cross-rungs */}
          {[-1.2, -0.6, 0, 0.6, 1.2].map((xOffset, idx) => (
            <mesh 
              key={`rung-${idx}`} 
              position={[xOffset * 0.9, -xOffset * 0.4, 0]} 
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
              <meshStandardMaterial color={steelColor} metalness={0.95} roughness={0.1} />
            </mesh>
          ))}
          {/* Front curved floor stanchions */}
          <mesh position={[1.4, -0.45, 0.25]}>
            <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.95} />
          </mesh>
          <mesh position={[1.4, -0.45, -0.25]}>
            <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.95} />
          </mesh>
          {/* Rear floor stanchions */}
          <mesh position={[-1.4, 0.75, 0.25]}>
            <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.95} />
          </mesh>
          <mesh position={[-1.4, 0.75, -0.25]}>
            <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.95} />
          </mesh>
        </group>

        {/* --- LEFT CURVED STAINLESS STEEL HANDRAIL --- */}
        <group position={[1.4, 1.2, 3.6]}>
          <mesh rotation={[0, 0, -0.42]}>
            <cylinderGeometry args={[0.04, 0.04, 3.6, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[-1.3, 0.6, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.95} />
          </mesh>
          <mesh position={[1.3, -0.5, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
            <meshStandardMaterial color={steelColor} metalness={0.95} />
          </mesh>
        </group>

        {/* --- RIGHT CURVED PLANTER WALL & POTTED PLANTS --- */}
        <group position={[1.2, 0.8, -4.6]}>
          {/* Smooth curved retaining wall base */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.2, 1.4, 1.6]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
          </mesh>
          {/* Wall Top Ledge */}
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[4.4, 0.1, 1.8]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
          {/* Potted Plant on the Wall Ledge */}
          <PottedPlant position={[0.8, 0.85, 0]} scale={0.9} />
          <PottedPlant position={[-1.0, 0.85, 0]} scale={0.85} />
        </group>
      </group>

      {/* --- SURROUNDING GREENERY & TREES (As in photograph) --- */}
      <CampusTree position={[7, 0, 8]} scale={1.2} />
      <CampusTree position={[4, 0, 11]} scale={1.05} />
      <CampusTree position={[-5, 0, 12]} scale={1.3} />
      <CampusTree position={[7.5, 0, -9]} scale={1.15} />
      <CampusTree position={[2.5, 0, -11.5]} scale={1.3} />
      <CampusTree position={[-6, 0, -11.5]} scale={1.35} />

      {/* --- FLOATING 3D BUILDING BADGE LABEL --- */}
      <Html
        position={[0, 19, 0]}
        center
        distanceFactor={32}
        zIndexRange={[100, 0]}
      >
        <div className={`
          px-3.5 py-1.5 rounded-2xl text-xs font-black whitespace-nowrap shadow-xl transition-all duration-300 flex items-center gap-2
          ${hovered ? 'bg-emerald-600 text-white scale-110 ring-4 ring-emerald-300/50' : 'bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200'}
          ${isHighlighted ? 'animate-bounce bg-emerald-600 text-white ring-4 ring-emerald-400' : ''}
        `}>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
          <span>Green Building (RSB)</span>
        </div>
      </Html>
    </group>
  );
}
