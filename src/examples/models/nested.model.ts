import { QModel, QType, QInterface } from '../../quick.model';
import type {
  ContactTransforms,
  IAddress,
  IContact,
  INestedModel,
  NestedModelTransforms,
} from '../interfaces/nested-model.interface';
import { SimpleModel } from './simple.model';

/**
 * Models demonstrating nested structures and model composition.
 * 
 * This example shows how QModel handles:
 * - Nested models (model within model)
 * - Arrays of models
 * - Complex object hierarchies
 * - Automatic deserialization of nested structures
 * 
 * @example
 * ```typescript
 * const nested = new NestedModel({
 *   userId: '123',
 *   profile: { id: '1', name: 'John', ... },
 *   contact: {
 *     email: 'john@example.com',
 *     phone: '+1234567890',
 *     address: { street: '123 Main St', ... }
 *   },
 *   addresses: [{ street: 'Home', ... }, { street: 'Work', ... }],
 *   notes: ['Note 1', 'Note 2'],
 *   metadata: { key: 'value' }
 * });
 * ```
 */

// Re-export interfaces for convenience
export type { ContactTransforms, IAddress, IContact, INestedModel, NestedModelTransforms };

/**
 * Simple address model with basic street information.
 */
export class Address extends QModel<IAddress> {
  @QType() street!: string;
  @QType() city!: string;
  @QType() country!: string;
  @QType() zipCode!: string;
}

/**
 * Contact model with email, phone, and nested address.
 */
export class Contact
  extends QModel<IContact>
  implements QInterface<IContact, ContactTransforms>
{
  @QType() email!: string;
  @QType() phone!: string;
  @QType() address!: Address;
}

/**
 * Complex nested model demonstrating model composition.
 * Contains references to other models (SimpleModel, Contact) and arrays of models.
 */
export class NestedModel
  extends QModel<INestedModel>
  implements QInterface<INestedModel, NestedModelTransforms>
{
  @QType() userId!: string;
  @QType() profile!: SimpleModel;
  @QType() contact!: Contact;
  @QType(Address) addresses!: Address[];
  @QType() notes!: string[];
  @QType() metadata!: Record<string, any>;
}
