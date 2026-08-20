'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Line, Html } from '@react-three/drei';
import { Navigation, MapPin, Play, Square } from 'lucide-react';
import * as THREE from 'three';
import Image from 'next/image';
import Building from './Building';

// Prototype data based on user input
const BLOCKS = [
  { 
    id: 'GATE', 
    name: 'Main College Gate', 
    color: '#ef4444', 
    position: [0, 0, 30] as [number, number, number],
    parts: [
      { size: [1.5, 5, 1.5], position: [-4, 2.5, 0], color: '#f8fafc' }, // Left Pillar (White)
      { size: [1.5, 5, 1.5], position: [4, 2.5, 0], color: '#f8fafc' },  // Right Pillar (White)
      { size: [12, 1.5, 4], position: [0, 5.75, 0], color: '#c2410c' },  // Roof (Terracotta Orange)
      { size: [24, 4, 1], position: [-16.75, 2, 0], color: '#e2e8f0' },  // Extended Left Boundary Wall
      { size: [10, 3, 0.5], position: [-11, 5.5, 0], color: '#ffffff' }, // Main Signboard on Left Wall
      { size: [6, 4, 1], position: [7.75, 2, 0], color: '#e2e8f0' }      // Right Boundary Wall
    ]
  },
  { 
    id: 'ATM', 
    name: 'ICICI Bank ATM', 
    color: '#ea580c',
    position: [-7, 0, 23] as [number, number, number], // Aligned with Security, between Gate (30) and Security (16)
    parts: [
      { size: [4, 3, 4], position: [0, 1.5, 0], color: '#f8fafc' }, // White ATM building body
      { size: [4.2, 0.5, 4.2], position: [0, 3.25, 0], color: '#ea580c' }, // Orange ICICI Roof Overhang
      { size: [0.2, 1.5, 2], position: [2, 1.5, 0], color: '#1e293b' }, // Dark ATM screen panel (Facing East/Road)
      { size: [0.3, 0.5, 0.8], position: [2.05, 1.5, 0], color: '#22c55e' } // Green glowing screen
    ]
  },
  {
    id: 'SECURITY',
    name: 'College Security Booth',
    color: '#3b82f6',
    position: [-7, 0, 16] as [number, number, number],
    parts: [
      { size: [3, 1.2, 3], position: [0, 0.6, 0], color: '#e2e8f0' }, // Concrete base
      { size: [2.8, 1.5, 2.8], position: [0, 1.95, 0], color: '#60a5fa' }, // Blue tinted glass windows
      { size: [3.4, 0.4, 3.4], position: [0, 2.9, 0], color: '#1e3a8a' }, // Dark blue security roof
      { size: [0.2, 1.5, 0.2], position: [-1.4, 1.95, -1.4], color: '#e2e8f0' }, // Corner pillar
      { size: [0.2, 1.5, 0.2], position: [1.4, 1.95, -1.4], color: '#e2e8f0' }, // Corner pillar
      { size: [0.2, 1.5, 0.2], position: [-1.4, 1.95, 1.4], color: '#e2e8f0' }, // Corner pillar
      { size: [0.2, 1.5, 0.2], position: [1.4, 1.95, 1.4], color: '#e2e8f0' } // Corner pillar
    ]
  },
  {
    id: 'GB',
    name: 'Green Building',
    color: '#10b981', // Emerald Green
    position: [-26, 0, -4] as [number, number, number], // Left of the road, past security
    parts: [
      { size: [12, 10, 24], position: [2, 5, 0], color: '#10b981' },    // Main right spine
      { size: [8, 10, 16], position: [-8, 5, 2], color: '#10b981' },    // Middle left stepped extension
      { size: [6, 10, 6], position: [-12, 5, 5], color: '#10b981' },    // Further left stepped extension
      { size: [8, 10, 6], position: [-2, 5, 12], color: '#10b981' },    // Bottom protrusion
      { size: [4, 10, 4], position: [6, 5, 10], color: '#10b981' }      // Small bottom-right square extension
    ]
  },
  {
    id: 'PARKING',
    name: 'RIT Parking',
    color: '#64748b', // Slate
    position: [20, 0, -6] as [number, number, number], // Right side of the main road, aligned with Green building road connections
    parts: [
      { size: [24, 0.2, 30], position: [0, 0.1, 0], color: '#64748b' }, // Large parking pavement
      { size: [24, 2, 0.5], position: [0, 1, 14.5], color: '#94a3b8' }, // Back wall
      // A few parked "cars" (small boxes)
      { size: [2, 1.5, 4], position: [-8, 0.75, 8], color: '#ef4444' }, // Red car
      { size: [2, 1.5, 4], position: [-4, 0.75, 8], color: '#3b82f6' }, // Blue car
      { size: [2, 1.5, 4], position: [0, 0.75, 8], color: '#f8fafc' },  // White car
      { size: [2, 1.5, 4], position: [4, 0.75, 8], color: '#eab308' },  // Yellow car
      { size: [2, 1.5, 4], position: [8, 0.75, 8], color: '#10b981' }   // Green car
    ]
  },
  {
    id: 'A_BLOCK',
    name: 'A Block',
    color: '#3b82f6', // Blue
    position: [20, 0, -25] as [number, number, number], // Moved closer (was -40)
    parts: [
      { size: [12, 10, 24], position: [-2, 5, 0], color: '#3b82f6' },   // Main left spine
      { size: [8, 10, 16], position: [8, 5, 2], color: '#3b82f6' },     // Middle right stepped extension
      { size: [6, 10, 6], position: [12, 5, 5], color: '#3b82f6' },     // Further right stepped extension
      { size: [8, 10, 6], position: [2, 5, 12], color: '#3b82f6' },     // Bottom protrusion
      { size: [4, 10, 4], position: [-6, 5, 10], color: '#3b82f6' }     // Small bottom-left square extension
    ]
  },
  {
    id: 'ARCADE',
    name: 'Arcade Shop',
    color: '#f43f5e', // Rose/Red
    position: [-15, 0, -25] as [number, number, number], // Moved closer (was -40)
    parts: [
      { size: [8, 4, 8], position: [0, 2, 0], color: '#f43f5e' }, // Main shop body
      { size: [8, 0.5, 3], position: [4, 3, 0], color: '#fcd34d' }, // Yellow awning protruding towards the road
      { size: [8, 1.5, 0.2], position: [4, 4, 0], color: '#1e293b' } // Dark signboard on top of awning
    ]
  },
  {
    id: 'B_BLOCK',
    name: 'B Block',
    color: '#f59e0b', // Amber/Orange
    position: [-22, 0, -90] as [number, number, number], // Pushed back to create a bigger gap from Arcade
    parts: [
      // Left attached room (B0-01) facing the end of the corridor (-Z face)
      { size: [20, 6, 12], position: [0, 3, 41], color: '#f59e0b', name: 'B0-01', hasDoor: true, doorOffset: [4, -1.75, -6.1], doorRotation: [0, Math.PI, 0] },
      
      // Main spine containing Classrooms 2 to 7 (6 rooms)
      ...Array.from({ length: 6 }).map((_, i) => ({
        size: [12, 6, 11.5] as [number, number, number],
        position: [-4, 3, 29.16 - i * 11.66] as [number, number, number],
        color: i % 2 !== 0 ? '#f59e0b' : '#fbbf24',
        name: `B0-0${i + 2}`, hasDoor: true, doorOffset: [6.1, -1.75, 0], doorRotation: [0, Math.PI / 2, 0]
      })),

      // Right attached rooms (split along X: back and front)
      // Girls toilet at the back, facing the end of the corridor (+Z face)
      { size: [16, 6, 12], position: [-2, 3, -41], color: '#f59e0b', name: 'Girls Toilet', hasDoor: true, doorOffset: [6, -1.75, 6.1], doorRotation: [0, 0, 0] }, 
      // Mech room next to toilet. Door on +Z face.
      { size: [8, 6, 12], position: [10, 3, -41], color: '#fbbf24', name: 'Dept of Mech', hasDoor: true, doorOffset: [0, -1.75, 6.1], doorRotation: [0, 0, 0] },

      // Walking path (Corridor) in front of the classrooms
      { size: [4, 0.2, 70], position: [4, 0.1, 0], color: '#cbd5e1' },
      // Corridor extension to the right for the Mech room
      { size: [8, 0.2, 4], position: [10, 0.1, -33], color: '#cbd5e1' },

      // --- FIRST FLOOR ---
      // Left attached room (B1-01) facing the end of the corridor (-Z face)
      { size: [20, 6, 12], position: [0, 9, 41], color: '#fcd34d', name: 'B1-01', hasDoor: true, doorOffset: [4, -1.75, -6.1], doorRotation: [0, Math.PI, 0] },
      
      // Main spine containing Classrooms 2 to 7 (6 rooms)
      ...Array.from({ length: 6 }).map((_, i) => ({
        size: [12, 6, 11.5] as [number, number, number],
        position: [-4, 9, 29.16 - i * 11.66] as [number, number, number],
        color: i % 2 === 0 ? '#f59e0b' : '#fbbf24', // Swapped colors slightly for visual variety
        name: `B1-0${i + 2}`, hasDoor: true, doorOffset: [6.1, -1.75, 0], doorRotation: [0, Math.PI / 2, 0]
      })),

      // Right attached rooms (Boys Toilet and Empty room)
      // Boys Toilet facing the end of the corridor (+Z face)
      { size: [16, 6, 12], position: [-2, 9, -41], color: '#fcd34d', name: 'Boys Toilet', hasDoor: true, doorOffset: [6, -1.75, 6.1], doorRotation: [0, 0, 0] }, 
      // Empty Room. Door on +Z face.
      { size: [8, 6, 12], position: [10, 9, -41], color: '#fbbf24', name: 'Empty Room', hasDoor: true, doorOffset: [0, -1.75, 6.1], doorRotation: [0, 0, 0] },

      // 1st Floor Corridor
      { size: [4, 0.2, 70], position: [4, 6.1, 0], color: '#cbd5e1' },
      // 1st Floor Corridor extension to the right
      { size: [8, 0.2, 4], position: [10, 6.1, -33], color: '#cbd5e1' },

      // --- SECOND FLOOR ---
      // Left attached room (B2-01) facing the end of the corridor (-Z face)
      { size: [20, 6, 12], position: [0, 15, 41], color: '#f59e0b', name: 'B2-01', hasDoor: true, doorOffset: [4, -1.75, -6.1], doorRotation: [0, Math.PI, 0] },
      
      // Main spine containing Classrooms 2 to 7 (6 rooms)
      ...Array.from({ length: 6 }).map((_, i) => ({
        size: [12, 6, 11.5] as [number, number, number],
        position: [-4, 15, 29.16 - i * 11.66] as [number, number, number],
        color: i % 2 !== 0 ? '#f59e0b' : '#fbbf24',
        name: `B2-0${i + 2}`, hasDoor: true, doorOffset: [6.1, -1.75, 0], doorRotation: [0, Math.PI / 2, 0]
      })),

      // Right attached rooms
      // Staff Toilet facing the end of the corridor (+Z face)
      { size: [16, 6, 12], position: [-2, 15, -41], color: '#f59e0b', name: 'Staff Toilet', hasDoor: true, doorOffset: [6, -1.75, 6.1], doorRotation: [0, 0, 0] }, 
      // Seminar Hall. Door on +Z face.
      { size: [8, 6, 12], position: [10, 15, -41], color: '#fbbf24', name: 'Seminar Hall', hasDoor: true, doorOffset: [0, -1.75, 6.1], doorRotation: [0, 0, 0] },

      // 2nd Floor Corridor
      { size: [4, 0.2, 70], position: [4, 12.1, 0], color: '#cbd5e1' },
      // 2nd Floor Corridor extension to the right
      { size: [8, 0.2, 4], position: [10, 12.1, -33], color: '#cbd5e1' },

      // --- THIRD FLOOR ---
      // Centered 4 rooms (dropping the ends)
      ...Array.from({ length: 4 }).map((_, i) => ({
        size: [12, 6, 11.5] as [number, number, number],
        position: [-4, 21, 17.5 - i * 11.66] as [number, number, number], // Starts at B0-03's local Z
        color: i % 2 === 0 ? '#f59e0b' : '#fbbf24',
        name: `B3-0${i + 1}`, hasDoor: true, doorOffset: [6.1, -1.75, 0], doorRotation: [0, Math.PI / 2, 0]
      })),

      // 3rd Floor Corridor (shorter to match the 4 rooms)
      { size: [4, 0.2, 48], position: [4, 18.1, 0], color: '#cbd5e1' },

      // Connecting path from the corridor to the Main Road (Ground Level)
      { size: [12, 0.15, 6], position: [12, 0.1, 0], color: '#cbd5e1' },

      // U-Shaped Staircase (Ground to 1st Floor)
      ...Array.from({ length: 5 }).map((_, i) => ({
        size: [1.5, 0.6, 3] as [number, number, number],
        position: [6.5 + i * 1, 0.2 + i * 0.6, -4.5] as [number, number, number],
        color: '#8B4513'
      })),
      { size: [3, 0.6, 6], position: [12.5, 3.0, -6], color: '#8B4513' },
      ...Array.from({ length: 5 }).map((_, i) => ({
        size: [1.5, 0.6, 3] as [number, number, number],
        position: [10.5 - i * 1, 3.6 + i * 0.6, -7.5] as [number, number, number],
        color: '#8B4513'
      })),

      // U-Shaped Staircase (1st Floor to 2nd Floor)
      ...Array.from({ length: 5 }).map((_, i) => ({
        size: [1.5, 0.6, 3] as [number, number, number],
        position: [6.5 + i * 1, 6.2 + i * 0.6, -4.5] as [number, number, number],
        color: '#8B4513'
      })),
      { size: [3, 0.6, 6], position: [12.5, 9.0, -6], color: '#8B4513' },
      ...Array.from({ length: 5 }).map((_, i) => ({
        size: [1.5, 0.6, 3] as [number, number, number],
        position: [10.5 - i * 1, 9.6 + i * 0.6, -7.5] as [number, number, number],
        color: '#8B4513'
      })),

      // U-Shaped Staircase (2nd Floor to 3rd Floor)
      ...Array.from({ length: 5 }).map((_, i) => ({
        size: [1.5, 0.6, 3] as [number, number, number],
        position: [6.5 + i * 1, 12.2 + i * 0.6, -4.5] as [number, number, number],
        color: '#8B4513'
      })),
      { size: [3, 0.6, 6], position: [12.5, 15.0, -6], color: '#8B4513' },
      ...Array.from({ length: 5 }).map((_, i) => ({
        size: [1.5, 0.6, 3] as [number, number, number],
        position: [10.5 - i * 1, 15.6 + i * 0.6, -7.5] as [number, number, number],
        color: '#8B4513'
      }))
    ]
  },
];

// --- PATHFINDING GRAPH ---
type NodeId = 'GATE' | 'MAIN_ROAD_SEC' | 'MAIN_ROAD_GB' | 'MAIN_ROAD_ARC' | 'MAIN_ROAD_B' | 
              'B_CORR_MID' | 
              'B0_01' | 'B0_02' | 'B0_03' | 'B0_04' | 'B0_05' | 'B0_06' | 'B0_07' | 'B0_TOILET' | 'B0_MECH' |
              'B1_01' | 'B1_02' | 'B1_03' | 'B1_04' | 'B1_05' | 'B1_06' | 'B1_07' | 'B1_TOILET' | 'B1_EMPTY' |
              'B2_01' | 'B2_02' | 'B2_03' | 'B2_04' | 'B2_05' | 'B2_06' | 'B2_07' | 'B2_TOILET' | 'B2_SEMINAR' |
              'B3_01' | 'B3_02' | 'B3_03' | 'B3_04' |
              'STAIR_1_START' | 'STAIR_1_BOTTOM_1' | 'STAIR_1_TOP_1' | 'STAIR_1_MID' | 'STAIR_1_BOTTOM_2' | 'STAIR_1_TOP_2' | 'STAIR_1_END' |
              'STAIR_2_START' | 'STAIR_2_BOTTOM_1' | 'STAIR_2_TOP_1' | 'STAIR_2_MID' | 'STAIR_2_BOTTOM_2' | 'STAIR_2_TOP_2' | 'STAIR_2_END' |
              'STAIR_3_START' | 'STAIR_3_BOTTOM_1' | 'STAIR_3_TOP_1' | 'STAIR_3_MID' | 'STAIR_3_BOTTOM_2' | 'STAIR_3_TOP_2' | 'STAIR_3_END';

const GRAPH_NODES: Record<NodeId, { name: string, pos: [number, number, number], doorPos?: [number, number, number] }> = {
  'GATE': { name: 'Main Gate', pos: [0, 0.2, 30] },
  'MAIN_ROAD_SEC': { name: 'Security Booth', pos: [0, 0.2, 16] },
  'MAIN_ROAD_GB': { name: 'Green Building', pos: [0, 0.2, -4] },
  'MAIN_ROAD_ARC': { name: 'Arcade Shop', pos: [0, 0.2, -25] },
  'MAIN_ROAD_B': { name: 'B Block Intersection', pos: [0, 0.2, -90] },
  
  // Ground Floor
  'B_CORR_MID': { name: 'B Block Center (GF)', pos: [-18, 0.2, -90] },
  'B0_01': { name: 'Classroom B0-01', pos: [-18, 0.2, -52], doorPos: [-18, 0.2, -52] },
  'B0_02': { name: 'Classroom B0-02', pos: [-18, 0.2, -61], doorPos: [-19.5, 0.2, -61] },
  'B0_03': { name: 'Classroom B0-03', pos: [-18, 0.2, -73], doorPos: [-19.5, 0.2, -73] },
  'B0_04': { name: 'Classroom B0-04', pos: [-18, 0.2, -84], doorPos: [-19.5, 0.2, -84] },
  'B0_05': { name: 'Classroom B0-05', pos: [-18, 0.2, -96], doorPos: [-19.5, 0.2, -96] },
  'B0_06': { name: 'Classroom B0-06', pos: [-18, 0.2, -107], doorPos: [-19.5, 0.2, -107] },
  'B0_07': { name: 'Classroom B0-07', pos: [-18, 0.2, -119], doorPos: [-19.5, 0.2, -119] },
  'B0_TOILET': { name: 'Girls Toilet (GF)', pos: [-18, 0.2, -122], doorPos: [-18, 0.2, -124] },
  'B0_MECH': { name: 'Dept of Mech', pos: [-12, 0.2, -122], doorPos: [-12, 0.2, -124] },

  // First Floor
  'B1_01': { name: 'Classroom B1-01', pos: [-18, 6.2, -52], doorPos: [-18, 6.2, -52] },
  'B1_02': { name: 'Classroom B1-02', pos: [-18, 6.2, -61], doorPos: [-19.5, 6.2, -61] },
  'B1_03': { name: 'Classroom B1-03', pos: [-18, 6.2, -73], doorPos: [-19.5, 6.2, -73] },
  'B1_04': { name: 'Classroom B1-04', pos: [-18, 6.2, -84], doorPos: [-19.5, 6.2, -84] },
  'B1_05': { name: 'Classroom B1-05', pos: [-18, 6.2, -96], doorPos: [-19.5, 6.2, -96] },
  'B1_06': { name: 'Classroom B1-06', pos: [-18, 6.2, -107], doorPos: [-19.5, 6.2, -107] },
  'B1_07': { name: 'Classroom B1-07', pos: [-18, 6.2, -119], doorPos: [-19.5, 6.2, -119] },
  'B1_TOILET': { name: 'Boys Toilet (1F)', pos: [-18, 6.2, -122], doorPos: [-18, 6.2, -124] },
  'B1_EMPTY': { name: 'Empty Room (1F)', pos: [-12, 6.2, -122], doorPos: [-12, 6.2, -124] },

  // Second Floor
  'B2_01': { name: 'Classroom B2-01', pos: [-18, 12.2, -52], doorPos: [-18, 12.2, -52] },
  'B2_02': { name: 'Classroom B2-02', pos: [-18, 12.2, -61], doorPos: [-19.5, 12.2, -61] },
  'B2_03': { name: 'Classroom B2-03', pos: [-18, 12.2, -73], doorPos: [-19.5, 12.2, -73] },
  'B2_04': { name: 'Classroom B2-04', pos: [-18, 12.2, -84], doorPos: [-19.5, 12.2, -84] },
  'B2_05': { name: 'Classroom B2-05', pos: [-18, 12.2, -96], doorPos: [-19.5, 12.2, -96] },
  'B2_06': { name: 'Classroom B2-06', pos: [-18, 12.2, -107], doorPos: [-19.5, 12.2, -107] },
  'B2_07': { name: 'Classroom B2-07', pos: [-18, 12.2, -119], doorPos: [-19.5, 12.2, -119] },
  'B2_TOILET': { name: 'Staff Toilet (2F)', pos: [-18, 12.2, -122], doorPos: [-18, 12.2, -124] },
  'B2_SEMINAR': { name: 'Seminar Hall (2F)', pos: [-12, 12.2, -122], doorPos: [-12, 12.2, -124] },

  // Third Floor
  'B3_01': { name: 'Classroom B3-01', pos: [-18, 18.2, -73], doorPos: [-19.5, 18.2, -73] },
  'B3_02': { name: 'Classroom B3-02', pos: [-18, 18.2, -84], doorPos: [-19.5, 18.2, -84] },
  'B3_03': { name: 'Classroom B3-03', pos: [-18, 18.2, -96], doorPos: [-19.5, 18.2, -96] },
  'B3_04': { name: 'Classroom B3-04', pos: [-18, 18.2, -107], doorPos: [-19.5, 18.2, -107] },

  // Stairs Pathfinding Nodes
  'STAIR_1_START': { name: 'Stairs 1 Start (GF)', pos: [-18, 0.2, -94.5] },
  'STAIR_1_BOTTOM_1': { name: '', pos: [-15.5, 0.2, -94.5] },
  'STAIR_1_TOP_1': { name: '', pos: [-11.5, 2.6, -94.5] },
  'STAIR_1_MID': { name: 'Stairs 1 Mid-Landing', pos: [-9.5, 3.0, -96] },
  'STAIR_1_BOTTOM_2': { name: '', pos: [-11.5, 3.6, -97.5] },
  'STAIR_1_TOP_2': { name: '', pos: [-15.5, 6.0, -97.5] },
  'STAIR_1_END': { name: 'Stairs 1 End (1F)', pos: [-18, 6.2, -97.5] },

  'STAIR_2_START': { name: 'Stairs 2 Start (1F)', pos: [-18, 6.2, -94.5] },
  'STAIR_2_BOTTOM_1': { name: '', pos: [-15.5, 6.2, -94.5] },
  'STAIR_2_TOP_1': { name: '', pos: [-11.5, 8.6, -94.5] },
  'STAIR_2_MID': { name: 'Stairs 2 Mid-Landing', pos: [-9.5, 9.0, -96] },
  'STAIR_2_BOTTOM_2': { name: '', pos: [-11.5, 9.6, -97.5] },
  'STAIR_2_TOP_2': { name: '', pos: [-15.5, 12.0, -97.5] },
  'STAIR_2_END': { name: 'Stairs 2 End (2F)', pos: [-18, 12.2, -97.5] },

  'STAIR_3_START': { name: 'Stairs 3 Start (2F)', pos: [-18, 12.2, -94.5] },
  'STAIR_3_BOTTOM_1': { name: '', pos: [-15.5, 12.2, -94.5] },
  'STAIR_3_TOP_1': { name: '', pos: [-11.5, 14.6, -94.5] },
  'STAIR_3_MID': { name: 'Stairs 3 Mid-Landing', pos: [-9.5, 15.0, -96] },
  'STAIR_3_BOTTOM_2': { name: '', pos: [-11.5, 15.6, -97.5] },
  'STAIR_3_TOP_2': { name: '', pos: [-15.5, 18.0, -97.5] },
  'STAIR_3_END': { name: 'Stairs 3 End (3F)', pos: [-18, 18.2, -97.5] },
};

const EDGES: Array<[NodeId, NodeId]> = [
  // Main road
  ['GATE', 'MAIN_ROAD_SEC'],
  ['MAIN_ROAD_SEC', 'MAIN_ROAD_GB'],
  ['MAIN_ROAD_GB', 'MAIN_ROAD_ARC'],
  ['MAIN_ROAD_ARC', 'MAIN_ROAD_B'],
  ['MAIN_ROAD_B', 'B_CORR_MID'],

  // GF Corridor
  ['B0_01', 'B0_02'],
  ['B0_02', 'B0_03'],
  ['B0_03', 'B0_04'],
  ['B0_04', 'B_CORR_MID'],
  ['B_CORR_MID', 'STAIR_1_START'],
  ['STAIR_1_START', 'B0_05'],
  ['B0_05', 'B0_06'],
  ['B0_06', 'B0_07'],
  ['B0_07', 'B0_TOILET'],
  ['B0_TOILET', 'B0_MECH'],

  // Staircase 1 (GF to 1F)
  ['STAIR_1_START', 'STAIR_1_BOTTOM_1'],
  ['STAIR_1_BOTTOM_1', 'STAIR_1_TOP_1'],
  ['STAIR_1_TOP_1', 'STAIR_1_MID'],
  ['STAIR_1_MID', 'STAIR_1_BOTTOM_2'],
  ['STAIR_1_BOTTOM_2', 'STAIR_1_TOP_2'],
  ['STAIR_1_TOP_2', 'STAIR_1_END'],

  // 1F Corridor
  ['B1_01', 'B1_02'],
  ['B1_02', 'B1_03'],
  ['B1_03', 'B1_04'],
  ['B1_04', 'STAIR_2_START'],
  ['STAIR_2_START', 'B1_05'],
  ['B1_05', 'STAIR_1_END'],
  ['STAIR_1_END', 'B1_06'],
  ['B1_06', 'B1_07'],
  ['B1_07', 'B1_TOILET'],
  ['B1_TOILET', 'B1_EMPTY'],

  // Staircase 2 (1F to 2F)
  ['STAIR_2_START', 'STAIR_2_BOTTOM_1'],
  ['STAIR_2_BOTTOM_1', 'STAIR_2_TOP_1'],
  ['STAIR_2_TOP_1', 'STAIR_2_MID'],
  ['STAIR_2_MID', 'STAIR_2_BOTTOM_2'],
  ['STAIR_2_BOTTOM_2', 'STAIR_2_TOP_2'],
  ['STAIR_2_TOP_2', 'STAIR_2_END'],

  // 2F Corridor
  ['B2_01', 'B2_02'],
  ['B2_02', 'B2_03'],
  ['B2_03', 'B2_04'],
  ['B2_04', 'STAIR_3_START'],
  ['STAIR_3_START', 'B2_05'],
  ['B2_05', 'STAIR_2_END'],
  ['STAIR_2_END', 'B2_06'],
  ['B2_06', 'B2_07'],
  ['B2_07', 'B2_TOILET'],
  ['B2_TOILET', 'B2_SEMINAR'],

  // Staircase 3 (2F to 3F)
  ['STAIR_3_START', 'STAIR_3_BOTTOM_1'],
  ['STAIR_3_BOTTOM_1', 'STAIR_3_TOP_1'],
  ['STAIR_3_TOP_1', 'STAIR_3_MID'],
  ['STAIR_3_MID', 'STAIR_3_BOTTOM_2'],
  ['STAIR_3_BOTTOM_2', 'STAIR_3_TOP_2'],
  ['STAIR_3_TOP_2', 'STAIR_3_END'],

  // 3F Corridor (Only 4 rooms)
  ['B3_01', 'B3_02'],
  ['B3_02', 'B3_03'],
  ['B3_03', 'STAIR_3_END'],
  ['STAIR_3_END', 'B3_04']
];

function findShortestPath(startId: NodeId, endId: NodeId): [number, number, number][] {
  if (startId === endId) return [GRAPH_NODES[startId].pos];

  const distances = new Map<NodeId, number>();
  const previous = new Map<NodeId, NodeId | null>();
  const unvisited = new Set<NodeId>();

  Object.keys(GRAPH_NODES).forEach((node) => {
    distances.set(node as NodeId, Infinity);
    previous.set(node as NodeId, null);
    unvisited.add(node as NodeId);
  });

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let currNode: NodeId | null = null;
    let minDistance = Infinity;
    
    unvisited.forEach(node => {
      if (distances.get(node)! < minDistance) {
        minDistance = distances.get(node)!;
        currNode = node;
      }
    });

    if (!currNode || minDistance === Infinity) break;
    if (currNode === endId) break;

    unvisited.delete(currNode);

    const neighbors = EDGES.filter(e => e[0] === currNode || e[1] === currNode)
                           .map(e => e[0] === currNode ? e[1] : e[0]);

    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor)) continue;
      
      const pos1 = GRAPH_NODES[currNode].pos;
      const pos2 = GRAPH_NODES[neighbor].pos;
      const dist = Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[2] - pos2[2], 2));
      const alt = distances.get(currNode)! + dist;
      
      if (alt < distances.get(neighbor)!) {
        distances.set(neighbor, alt);
        previous.set(neighbor, currNode);
      }
    }
  }

  const path: NodeId[] = [];
  let u: NodeId | null = endId;
  while (u) {
    path.unshift(u);
    u = previous.get(u) || null;
  }
  
  if (path[0] !== startId) return [];
  
  const finalPositions = path.map(id => GRAPH_NODES[id].pos);
  
  // If the destination node has a specific door standing position, append it
  const endNodeData = GRAPH_NODES[endId];
  if (endNodeData && endNodeData.doorPos) {
    finalPositions.push(endNodeData.doorPos);
  }
  
  return finalPositions;
}

// --- ANIMATION COMPONENT ---
function AnimatedWalker({ pathPoints, isWalking, onComplete }: { pathPoints: [number, number, number][], isWalking: boolean, onComplete: (camPos: THREE.Vector3, lookTarget: THREE.Vector3) => void }) {
  const markerRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const progressRef = useRef(0);
  const segmentIndexRef = useRef(0);
  const animTimeRef = useRef(0); // Accumulated time for smooth limb swinging
  const smoothedDirRef = useRef(new THREE.Vector3(0, 0, 1)); // For smooth turning
  const SPEED = 8; // Slower, more natural walking speed

  useEffect(() => {
    if (isWalking && pathPoints.length >= 2) {
      progressRef.current = 0;
      segmentIndexRef.current = 0;
      animTimeRef.current = 0;
      // Initialize smoothed direction to the first segment's direction
      const p1 = new THREE.Vector3(...pathPoints[0]);
      const p2 = new THREE.Vector3(...pathPoints[1]);
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      smoothedDirRef.current.set(dir.x, 0, dir.z).normalize();
    }
  }, [isWalking, pathPoints]);

  useFrame((state, delta) => {
    if (!isWalking || pathPoints.length < 2 || !markerRef.current) return;

    const p1 = new THREE.Vector3(...pathPoints[segmentIndexRef.current]);
    const p2 = new THREE.Vector3(...pathPoints[segmentIndexRef.current + 1]);
    
    // Cap delta to prevent massive jumps if the browser lagged
    const safeDelta = Math.min(delta, 0.1);
    const distance = p1.distanceTo(p2);
    
    // Slow down if climbing stairs (detect Y change)
    const isStairs = Math.abs(p2.y - p1.y) > 0.1;
    const currentSpeed = isStairs ? SPEED * 0.4 : SPEED;
    
    if (distance < 0.001) {
      progressRef.current = 1;
    } else {
      const moveAmount = safeDelta * currentSpeed;
      progressRef.current += moveAmount / distance;
    }

    let currentPos = new THREE.Vector3().lerpVectors(p1, p2, progressRef.current);

    // Get the exact direction of the current segment
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    
    // ALWAYS use horizontal direction for camera offset so climbing doesn't tilt the camera into the floor!
    const horizontalDir = new THREE.Vector3(dir.x, 0, dir.z);
    if (horizontalDir.lengthSq() > 0.001) {
      horizontalDir.normalize();
    } else {
      horizontalDir.set(0, 0, 1);
    }
    
    // Smoothly interpolate the camera/character direction to avoid sharp snaps on corners/stairs
    smoothedDirRef.current.lerp(horizontalDir, safeDelta * 8).normalize();
    
    // Dynamically adjust camera height based on whether we are climbing stairs
    const isGoingUp = p2.y > p1.y;
    // If going up stairs, lower the camera (1.5) and look higher (5.0) to simulate looking up the stairs
    const targetCamHeight = isStairs && isGoingUp ? 1.5 : 4.5;
    const targetLookHeight = isStairs && isGoingUp ? 5.0 : 2.0;
    
    // We attach these directly to the camera object or use local state, but since we can't easily add refs 
    // at the top of the component without replacing the whole AnimatedWalker block, we can just use 
    // properties on the smoothedDirRef object as a hack, or calculate them dynamically.
    // Let's use a simpler approach: calculate it based on the exact Y progression!
    // We can lerp it based on progress if it's a stair segment, but an ease function works best.
    
    // Instead of refs, we can just use the scene state or delta to lerp a custom property we attach to the markerRef
    if (markerRef.current.userData.camHeight === undefined) {
      markerRef.current.userData.camHeight = 4.5;
      markerRef.current.userData.lookHeight = 2.0;
    }
    
    markerRef.current.userData.camHeight = THREE.MathUtils.lerp(markerRef.current.userData.camHeight, targetCamHeight, safeDelta * 3);
    markerRef.current.userData.lookHeight = THREE.MathUtils.lerp(markerRef.current.userData.lookHeight, targetLookHeight, safeDelta * 3);

    const cameraOffset = smoothedDirRef.current.clone().multiplyScalar(-6); // 6 units behind
    cameraOffset.y = markerRef.current.userData.camHeight; 
    const targetCameraPos = new THREE.Vector3().copy(currentPos).add(cameraOffset);
    camera.position.copy(targetCameraPos);
    
    // Look slightly ahead of the student using the smoothed direction
    const lookTarget = new THREE.Vector3().copy(currentPos).add(smoothedDirRef.current.clone().multiplyScalar(5));
    lookTarget.y = currentPos.y + markerRef.current.userData.lookHeight;
    camera.lookAt(lookTarget);

    if (progressRef.current >= 1) {
      segmentIndexRef.current += 1;
      progressRef.current = 0;
      
      if (segmentIndexRef.current >= pathPoints.length - 1) {
        onComplete(targetCameraPos, lookTarget);
        return;
      } else {
        currentPos = new THREE.Vector3(...pathPoints[segmentIndexRef.current]);
      }
    }

    // Update student position (legs touch the ground if we offset Y)
    markerRef.current.position.copy(currentPos);
    
    // Smoothly rotate student using the smoothed horizontal direction + exact vertical direction
    const smoothed3DDir = new THREE.Vector3(smoothedDirRef.current.x, dir.y, smoothedDirRef.current.z).normalize();
    markerRef.current.lookAt(new THREE.Vector3().copy(currentPos).add(smoothed3DDir));

    // Animate limbs smoothly based on current movement speed
    animTimeRef.current += delta * currentSpeed * 1.5;
    const swing = Math.sin(animTimeRef.current);
    
    const leftArm = markerRef.current.children[2];
    const rightArm = markerRef.current.children[3];
    const leftLeg = markerRef.current.children[4];
    const rightLeg = markerRef.current.children[5];
    
    if (leftArm && rightArm && leftLeg && rightLeg) {
      leftArm.rotation.x = swing * 0.8;
      rightArm.rotation.x = -swing * 0.8;
      leftLeg.rotation.x = -swing * 1.0;
      rightLeg.rotation.x = swing * 1.0;
    }
  });

  if (!isWalking) return null;

  return (
    <group ref={markerRef} scale={[0.7, 0.7, 0.7]}>
      {/* Head */}
      <mesh position={[0, 4, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#fcd34d" roughness={0.4} /> {/* Skin */}
      </mesh>
      {/* Torso */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[1, 2, 0.5]} />
        <meshStandardMaterial color="#3b82f6" /> {/* Blue shirt */}
      </mesh>
      {/* Left Arm */}
      <group position={[-0.7, 3.3, 0]}>
        <mesh position={[0, -0.8, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 1.6]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
      </group>
      {/* Right Arm */}
      <group position={[0.7, 3.3, 0]}>
        <mesh position={[0, -0.8, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 1.6]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
      </group>
      {/* Left Leg */}
      <group position={[-0.3, 1.5, 0]}>
        <mesh position={[0, -0.75, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 1.5]} />
          <meshStandardMaterial color="#1e293b" /> {/* Dark pants */}
        </mesh>
      </group>
      {/* Right Leg */}
      <group position={[0.3, 1.5, 0]}>
        <mesh position={[0, -0.75, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 1.5]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>
    </group>
  );
}


function CameraPullBack({ active, orbitRef }: { active: boolean, orbitRef: any }) {
  const { camera } = useThree();
  
  useFrame((state, delta) => {
    if (!active || !orbitRef.current) return;
    
    // Dynamically adjust pull-back distance based on screen aspect ratio
    // If it's a mobile screen (portrait mode, aspect < 1), we must pull back much further to fit the building horizontally.
    const isMobile = (camera as THREE.PerspectiveCamera).aspect < 1.0;
    const targetX = isMobile ? 180 : 60; // Pull way back on mobile (triple distance)
    const targetY = isMobile ? 70 : 35;  // Higher on mobile to keep it centered
    
    const targetPos = new THREE.Vector3(targetX, targetY, -90); // Far in front (+X), elevated (+Y), centered (-Z)
    const targetLook = new THREE.Vector3(-22, 10, -90); // Looking at the center of the building
    
    camera.position.lerp(targetPos, delta * 2.0);
    orbitRef.current.target.lerp(targetLook, delta * 2.0);
    orbitRef.current.update();
  });

  return null;
}

function TechSparkBillboard({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
  const targetY = 28; // The final height it rises to (behind the building)
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    // Animate rising up when active
    const goalY = active ? targetY : 0;
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, goalY, delta * 2.5);
  });

  return (
    <group ref={meshRef} position={[-38, 0, -90]}>
       <Html
          transform
          center
          distanceFactor={30} // Slightly larger as requested
          rotation={[0, Math.PI / 2, 0]} // Face the camera at X=60
       >
          <div 
            className="flex flex-col items-center justify-center p-6 bg-white/95 backdrop-blur-md border border-white/50 shadow-2xl rounded-3xl" 
            style={{ 
              opacity: active ? 1 : 0, 
              transition: 'opacity 2s ease-in-out',
              pointerEvents: active ? 'auto' : 'none' 
            }}
          >
             <p className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Powered By</p>
             <img src="/techspark-logo.png" alt="TechSpark" className="w-64 h-auto drop-shadow-xl" />
          </div>
       </Html>
    </group>
  );
}

export default function CampusMap({ 
  autoStartNode = '', 
  autoEndNode = '', 
  hideControls = false,
  highlightVenue = ''
}: { 
  autoStartNode?: NodeId | '', 
  autoEndNode?: NodeId | '',
  hideControls?: boolean,
  highlightVenue?: string
} = {}) {
  const [startNode, setStartNode] = useState<NodeId | ''>(autoStartNode);
  const [endNode, setEndNode] = useState<NodeId | ''>(autoEndNode);
  const [isWalking, setIsWalking] = useState(false);
  const [hasReachedDestination, setHasReachedDestination] = useState(false);
  const [controlsTarget, setControlsTarget] = useState<[number, number, number]>([0, 0, 0]);
  const orbitControlsRef = useRef<any>(null);

  useEffect(() => {
    if (autoStartNode && autoEndNode) {
      setStartNode(autoStartNode);
      setEndNode(autoEndNode);
      setHasReachedDestination(false);
      // Start walking immediately
      setIsWalking(true);
    }
  }, [autoStartNode, autoEndNode]);

  const pathPoints = useMemo(() => {
    if (!startNode || !endNode) return [];
    return findShortestPath(startNode, endNode);
  }, [startNode, endNode]);

  return (
    <div className="w-full h-full relative">


      {/* Navigation UI Overlay */}
      {!hideControls && (
        <div className="absolute top-6 left-6 z-10 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200 w-80">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
            <Navigation className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-800">Campus Navigator</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-green-500" /> Starting Point
            </label>
            <select 
              value={startNode} 
              onChange={(e) => {
                setStartNode(e.target.value as NodeId);
                setHasReachedDestination(false);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
            >
              <option value="" disabled>Select Starting Point</option>
              {Object.entries(GRAPH_NODES).map(([id, node]) => (
                <option key={id} value={id}>{node.name || id}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-red-500" /> Destination
            </label>
            <select 
              value={endNode} 
              onChange={(e) => {
                setEndNode(e.target.value as NodeId);
                setHasReachedDestination(false);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium"
            >
              <option value="" disabled>Select Destination</option>
              {Object.entries(GRAPH_NODES).filter(([id]) => id.includes('_0') || id.includes('TOILET') || id.includes('MECH') || id.includes('EMPTY') || id.includes('SEMINAR')).map(([id, node]) => (
                <option key={id} value={id}>{node.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setHasReachedDestination(false);
              setIsWalking(true);
            }}
            disabled={!startNode || !endNode || isWalking}
            className="w-full mt-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            {isWalking ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Navigating...
              </>
            ) : 'Start Navigation'}
          </button>
        </div>
      </div>
      )}

    <Canvas
      shadows
      camera={{ position: [0, 80, 80], fov: 45 }}
      className="w-full h-full bg-slate-50"
    >
      <color attach="background" args={['#f8fafc']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        castShadow
        position={[50, 50, 20]}
        intensity={1.5}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      
      {/* Animated Path Rendering */}
      {pathPoints.length > 0 && (
        <Line 
          points={pathPoints} 
          color="#3b82f6" 
          lineWidth={6} 
          dashed={false}
          position={[0, 0.5, 0]} // Lift slightly above road
        />
      )}
      
      {/* Animated Walkthrough Marker */}
      <AnimatedWalker 
        pathPoints={pathPoints} 
        isWalking={isWalking} 
        onComplete={(camPos, lookTarget) => {
          setIsWalking(false);
          setHasReachedDestination(true);
          if (lookTarget) {
            setControlsTarget([lookTarget.x, lookTarget.y, lookTarget.z]);
          }
        }} 
      />
      
      {/* Start/End Markers (Hide when walking) */}
      {!isWalking && startNode && (
        <mesh position={[GRAPH_NODES[startNode].pos[0], 2, GRAPH_NODES[startNode].pos[2]]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {!isWalking && endNode && (
        <mesh position={[GRAPH_NODES[endNode].pos[0], 2, GRAPH_NODES[endNode].pos[2]]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {/* Grid Helper for aesthetics */}
      <gridHelper args={[300, 150, '#cbd5e1', '#f1f5f9']} position={[0, 0.01, 0]} />

      {/* Main Campus Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -70]} receiveShadow>
        <planeGeometry args={[8, 200]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      
      {/* Green Building Loop Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, 0.021, -18]} receiveShadow>
        <planeGeometry args={[14, 5]} /> {/* Top horizontal connection */}
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, 0.021, 6]} receiveShadow>
        <planeGeometry args={[14, 5]} /> {/* Bottom horizontal connection */}
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0.021, -6]} receiveShadow>
        <planeGeometry args={[5, 29]} /> {/* Left vertical loop section */}
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Left Sidewalk (Walking Path) - Broken for intersections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5, 0.03, 19.25]} receiveShadow>
        <planeGeometry args={[2, 21.5]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5, 0.03, -6]} receiveShadow>
        <planeGeometry args={[2, 19]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5, 0.03, -95.25]} receiveShadow>
        <planeGeometry args={[2, 149.5]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.9} />
      </mesh>

      {/* Right Sidewalk (Walking Path) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.03, -70]} receiveShadow>
        <planeGeometry args={[2, 200]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.9} />
      </mesh>



      {/* Buildings */}
      {BLOCKS.map(block => (
        <Building
          key={block.id}
          name={block.name}
          position={block.position}
          size={block.size}
          parts={block.parts}
          color={block.color}
          highlightVenue={highlightVenue}
          hasReachedDestination={hasReachedDestination}
          onClick={() => {
            console.log(`Focused on ${block.name}`);
            setControlsTarget(block.position);
          }}
        />
      ))}

      {/* 3D Billboard that rises behind B Block */}
      <TechSparkBillboard active={hasReachedDestination} />

      {/* Camera Animation when destination is reached */}
      <CameraPullBack active={hasReachedDestination} orbitRef={orbitControlsRef} />

      {/* Controls */}
      <OrbitControls
        ref={orbitControlsRef}
        makeDefault
        enabled={!isWalking} // Disable manual orbit while walking
        target={controlsTarget}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5} // Allow getting very close
        maxDistance={400}
        enableDamping
        dampingFactor={0.05}
      />

    </Canvas>
    </div>
  );
}
