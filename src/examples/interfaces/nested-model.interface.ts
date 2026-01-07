/**
 * @file nested-model.interface.ts
 * @description Interfaces y tipos para modelos anidados
 */

import type { ISimpleModel } from './simple-model.interface';

/**
 * Interface for physical address
 */
export interface IAddress {
  street: string;
  city: string;
  country: string;
  zipCode: string;
}

/**
 * Interface for contact information with nested address
 */
export interface IContact {
  email: string;
  phone: string;
  address: IAddress;
}

/**
 * Interface for model with multiple nesting
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
