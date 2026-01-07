import { Field, QuickModel, QuickType } from '../../quick.model';
import type {
  ContactTransforms,
  IAddress,
  IContact,
  INestedModel,
  NestedModelTransforms,
} from '../interfaces/nested-model.interface';
import { SimpleModel } from './simple.model';

/**
 * Modelo con modelos anidados
 */

// Re-exportar interfaces para compatibilidad
export type { ContactTransforms, IAddress, IContact, INestedModel, NestedModelTransforms };

export class Address extends QuickModel<IAddress> {
  @Field() street!: string;
  @Field() city!: string;
  @Field() country!: string;
  @Field() zipCode!: string;
}

export class Contact
  extends QuickModel<IContact>
  implements QuickType<IContact, ContactTransforms>
{
  @Field() email!: string;
  @Field() phone!: string;
  @Field() address!: Address;
}

export class NestedModel
  extends QuickModel<INestedModel>
  implements QuickType<INestedModel, NestedModelTransforms>
{
  @Field() userId!: string;
  @Field() profile!: SimpleModel;
  @Field() contact!: Contact;
  @Field(Address) addresses!: Address[];
  @Field() notes!: string[];
  @Field() metadata!: Record<string, any>;
}
