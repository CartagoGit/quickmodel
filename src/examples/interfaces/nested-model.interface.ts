/**
 * @file nested-model.interface.ts
 * @description Interfaces y tipos para modelos anidados
 */

import type { ISimpleModel } from './simple-model.interface';

/**
 * Interfaz para dirección física
 */
export interface IAddress {
  street: string;
  city: string;
  country: string;
  zipCode: string;
}

/**
 * Interfaz para información de contacto con dirección anidada
 */
export interface IContact {
  email: string;
  phone: string;
  address: IAddress;
}

/**
 * Interfaz para modelo con anidación múltiple
 */
export interface INestedModel {
  userId: string;
  profile: ISimpleModel;
  contact: IContact;
  notes: string[];
}

/**
 * Transformaciones para IContact
 * (Address es la clase transformada de IAddress)
 */
export type ContactTransforms = {
  address: any; // Se resuelve con la clase Address del modelo
};

/**
 * Transformaciones para INestedModel
 */
export type NestedModelTransforms = {
  profile: any; // Se resuelve con SimpleModel
  contact: any; // Se resuelve con Contact
};
