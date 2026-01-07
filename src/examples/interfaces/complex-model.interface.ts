/**
 * @file complex-model.interface.ts
 * @description Interfaces y tipos para ComplexModel - combinación de todos los tipos soportados
 */

import type { IAddress } from './nested-model.interface';
import type { ISimpleModel } from './simple-model.interface';

/**
 * Interfaz para modelo complejo con todos los tipos soportados
 */
export interface IComplexModel {
  // Identificación
  id: string;
  uuid: string;

  // Primitivos
  name: string;
  version: number;
  enabled: boolean;

  // Tipos especiales
  pattern: { source: string; flags: string };
  lastError: { message: string; stack?: string; name: string } | null;
  bigId: string;
  token: string;

  // Fechas
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  // Colecciones
  tags: string[];
  scores: number[];
  metadata: Record<string, any>;
  permissions: string[];

  // Modelos anidados
  owner: ISimpleModel;
  addresses: IAddress[];

  // Datos binarios
  thumbnail: number[];
  signature: number[];

  // Tipos complejos
  config: Record<string, any>;
  stats: {
    views: number;
    likes: number;
    shares: number;
  };
}

/**
 * Transformations applied to IComplexModel
 */
export type ComplexModelTransforms = {
  pattern: RegExp;
  lastError: Error | null;
  bigId: bigint;
  token: symbol;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  thumbnail: Uint8Array;
  signature: ArrayBuffer;
  permissions: Set<string>;
  owner: any; // Se resuelve con SimpleModel
  addresses: any[]; // Se resuelve con Address[]
};
