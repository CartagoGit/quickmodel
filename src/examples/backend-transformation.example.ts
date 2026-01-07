/**
 * Ejemplo Complejo: Transformación de Datos del Backend
 * 
 * Este ejemplo demuestra cómo QuickModel transforma automáticamente
 * datos serializados que llegan de un backend/API REST en objetos
 * TypeScript con los tipos correctos.
 * 
 * Comparación de dos enfoques:
 * 1. @QType() - Decorador explícito en cada propiedad
 * 2. @Quick() - Decorador de clase que registra todas las propiedades automáticamente
 */

import 'reflect-metadata';
import { QModel, QType, Quick, QInterface } from '../index';

// ============================================
// SIMULACIÓN DE RESPUESTA DEL BACKEND
// ============================================

/**
 * Datos como llegan del backend (todo serializado como JSON)
 * - Fechas como strings ISO
 * - BigInt como strings
 * - RegExp como objetos con __type
 * - Symbol como objetos con __type
 * - Map como objetos con __type
 * - Set como objetos con __type
 */
const backendResponse = {
  user: {
    id: 'usr_123456',
    username: 'john.doe',
    email: 'john@example.com',
    createdAt: '2024-01-15T10:30:00.000Z',
    lastLogin: '2025-01-07T08:15:30.000Z',
    isActive: true,
    age: 28,
  },
  account: {
    id: 'acc_789012',
    balance: '9007199254740991', // BigInt serializado como string
    currency: 'USD',
    transactions: '1523', // Total de transacciones como string (será BigInt)
    accountType: 'premium',
    openedAt: '2023-06-10T00:00:00.000Z',
  },
  settings: {
    theme: 'dark',
    notifications: true,
    emailPattern: {
      __type: 'regexp',
      source: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
      flags: 'i'
    },
    sessionId: {
      __type: 'symbol',
      description: 'session-2025-01-07'
    },
    preferences: {
      __type: 'Map',
      entries: [
        ['language', 'es'],
        ['timezone', 'UTC-5'],
        ['dateFormat', 'DD/MM/YYYY'],
        ['currency', 'USD']
      ]
    },
    enabledFeatures: {
      __type: 'Set',
      values: ['darkMode', 'notifications', 'twoFactor', 'biometric']
    }
  },
  metadata: {
    apiVersion: 'v2.1',
    requestId: 'req_abc123xyz',
    timestamp: '2025-01-07T15:45:00.000Z',
    processingTime: '45', // En milisegundos, será BigInt
  }
};

// ============================================
// INTERFACES TYPESCRIPT
// ============================================

interface IUser {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
  age: number;
}

interface IAccount {
  id: string;
  balance: bigint;
  currency: string;
  transactions: bigint;
  accountType: string;
  openedAt: Date;
}

interface ISettings {
  theme: string;
  notifications: boolean;
  emailPattern: RegExp;
  sessionId: symbol;
  preferences: Map<string, string>;
  enabledFeatures: Set<string>;
}

interface IMetadata {
  apiVersion: string;
  requestId: string;
  timestamp: Date;
  processingTime: bigint;
}

interface ICompleteProfile {
  user: IUser;
  account: IAccount;
  settings: ISettings;
  metadata: IMetadata;
}

// ============================================
// MODELOS ANIDADOS CON @QType()
// ============================================

class User extends QModel<IUser> implements QInterface<IUser> {
  @QType() id!: string;
  @QType() username!: string;
  @QType() email!: string;
  @QType() createdAt!: Date;
  @QType() lastLogin!: Date;
  @QType() isActive!: boolean;
  @QType() age!: number;
}

class Account extends QModel<IAccount> implements QInterface<IAccount> {
  @QType() id!: string;
  @QType() balance!: bigint;
  @QType() currency!: string;
  @QType() transactions!: bigint;
  @QType() accountType!: string;
  @QType() openedAt!: Date;
}

class Settings extends QModel<ISettings> implements QInterface<ISettings> {
  @QType() theme!: string;
  @QType() notifications!: boolean;
  @QType() emailPattern!: RegExp;
  @QType() sessionId!: symbol;
  @QType() preferences!: Map<string, string>;
  @QType() enabledFeatures!: Set<string>;
}

class Metadata extends QModel<IMetadata> implements QInterface<IMetadata> {
  @QType() apiVersion!: string;
  @QType() requestId!: string;
  @QType() timestamp!: Date;
  @QType() processingTime!: bigint;
}

/**
 * Modelo principal usando @QType() explícito
 */
class CompleteProfileWithQType extends QModel<ICompleteProfile> implements QInterface<ICompleteProfile> {
  @QType(User) user!: User;
  @QType(Account) account!: Account;
  @QType(Settings) settings!: Settings;
  @QType(Metadata) metadata!: Metadata;
}

// ============================================
// MODELOS CON @Quick() - VERSIÓN CONCISA
// ============================================

@Quick()
class UserQuick extends QModel<IUser> implements QInterface<IUser> {
  declare id: string;
  declare username: string;
  declare email: string;
  declare createdAt: Date;
  declare lastLogin: Date;
  declare isActive: boolean;
  declare age: number;
}

@Quick()
class AccountQuick extends QModel<IAccount> implements QInterface<IAccount> {
  declare id: string;
  declare balance: bigint;
  declare currency: string;
  declare transactions: bigint;
  declare accountType: string;
  declare openedAt: Date;
}

@Quick()
class SettingsQuick extends QModel<ISettings> implements QInterface<ISettings> {
  declare theme: string;
  declare notifications: boolean;
  declare emailPattern: RegExp;
  declare sessionId: symbol;
  declare preferences: Map<string, string>;
  declare enabledFeatures: Set<string>;
}

@Quick()
class MetadataQuick extends QModel<IMetadata> implements QInterface<IMetadata> {
  declare apiVersion: string;
  declare requestId: string;
  declare timestamp: Date;
  declare processingTime: bigint;
}

/**
 * Modelo principal usando @Quick()
 * NOTA: Para modelos anidados, necesitamos @QType() explícito
 */
@Quick()
class CompleteProfileWithQuick extends QModel<ICompleteProfile> implements QInterface<ICompleteProfile> {
  @QType(UserQuick) user!: UserQuick;
  @QType(AccountQuick) account!: AccountQuick;
  @QType(SettingsQuick) settings!: SettingsQuick;
  @QType(MetadataQuick) metadata!: MetadataQuick;
}

// ============================================
// DEMOSTRACIÓN DE USO
// ============================================

console.log('\n' + '='.repeat(80));
console.log('TRANSFORMACIÓN DE DATOS DEL BACKEND CON QUICKMODEL');
console.log('='.repeat(80) + '\n');

// --------------------------------------------
// 1. USANDO @QType() EXPLÍCITO
// --------------------------------------------

console.log('📦 1. USANDO @QType() (Explícito)\n');

const profileWithQType = new CompleteProfileWithQType(backendResponse);

console.log('✅ Usuario:');
console.log('   ID:', profileWithQType.user.id);
console.log('   Username:', profileWithQType.user.username);
console.log('   Email:', profileWithQType.user.email);
console.log('   Creado:', profileWithQType.user.createdAt.toLocaleDateString());
console.log('   Último login:', profileWithQType.user.lastLogin.toLocaleString());
console.log('   ¿Es Date?', profileWithQType.user.createdAt instanceof Date ? '✅' : '❌');

console.log('\n✅ Cuenta:');
console.log('   ID:', profileWithQType.account.id);
console.log('   Balance:', profileWithQType.account.balance);
console.log('   Transacciones:', profileWithQType.account.transactions);
console.log('   ¿Es BigInt?', typeof profileWithQType.account.balance === 'bigint' ? '✅' : '❌');

console.log('\n✅ Configuración:');
console.log('   Tema:', profileWithQType.settings.theme);
console.log('   Pattern:', profileWithQType.settings.emailPattern);
console.log('   ¿Es RegExp?', profileWithQType.settings.emailPattern instanceof RegExp ? '✅' : '❌');
console.log('   SessionId:', profileWithQType.settings.sessionId.toString());
console.log('   ¿Es Symbol?', typeof profileWithQType.settings.sessionId === 'symbol' ? '✅' : '❌');
console.log('   Preferencias:', Object.fromEntries(profileWithQType.settings.preferences));
console.log('   ¿Es Map?', profileWithQType.settings.preferences instanceof Map ? '✅' : '❌');
console.log('   Features habilitados:', Array.from(profileWithQType.settings.enabledFeatures));
console.log('   ¿Es Set?', profileWithQType.settings.enabledFeatures instanceof Set ? '✅' : '❌');

console.log('\n✅ Metadata:');
console.log('   API Version:', profileWithQType.metadata.apiVersion);
console.log('   Request ID:', profileWithQType.metadata.requestId);
console.log('   Timestamp:', profileWithQType.metadata.timestamp.toISOString());
console.log('   Processing Time:', profileWithQType.metadata.processingTime, 'ms');

// --------------------------------------------
// 2. USANDO @Quick() AUTOMÁTICO
// --------------------------------------------

console.log('\n' + '-'.repeat(80) + '\n');
console.log('⚡ 2. USANDO @Quick() (Automático)\n');

const profileWithQuick = new CompleteProfileWithQuick(backendResponse);

console.log('✅ Usuario:');
console.log('   ID:', profileWithQuick.user.id);
console.log('   Username:', profileWithQuick.user.username);
console.log('   Email:', profileWithQuick.user.email);
console.log('   Creado:', profileWithQuick.user.createdAt.toLocaleDateString());
console.log('   Último login:', profileWithQuick.user.lastLogin.toLocaleString());
console.log('   ¿Es Date?', profileWithQuick.user.createdAt instanceof Date ? '✅' : '❌');

console.log('\n✅ Cuenta:');
console.log('   ID:', profileWithQuick.account.id);
console.log('   Balance:', profileWithQuick.account.balance);
console.log('   Transacciones:', profileWithQuick.account.transactions);
console.log('   ¿Es BigInt?', typeof profileWithQuick.account.balance === 'bigint' ? '✅' : '❌');

console.log('\n✅ Configuración:');
console.log('   Tema:', profileWithQuick.settings.theme);
console.log('   Pattern:', profileWithQuick.settings.emailPattern);
console.log('   ¿Es RegExp?', profileWithQuick.settings.emailPattern instanceof RegExp ? '✅' : '❌');
console.log('   SessionId:', profileWithQuick.settings.sessionId.toString());
console.log('   ¿Es Symbol?', typeof profileWithQuick.settings.sessionId === 'symbol' ? '✅' : '❌');
console.log('   Preferencias:', Object.fromEntries(profileWithQuick.settings.preferences));
console.log('   ¿Es Map?', profileWithQuick.settings.preferences instanceof Map ? '✅' : '❌');
console.log('   Features habilitados:', Array.from(profileWithQuick.settings.enabledFeatures));
console.log('   ¿Es Set?', profileWithQuick.settings.enabledFeatures instanceof Set ? '✅' : '❌');

console.log('\n✅ Metadata:');
console.log('   API Version:', profileWithQuick.metadata.apiVersion);
console.log('   Request ID:', profileWithQuick.metadata.requestId);
console.log('   Timestamp:', profileWithQuick.metadata.timestamp.toISOString());
console.log('   Processing Time:', profileWithQuick.metadata.processingTime, 'ms');

// --------------------------------------------
// 3. SERIALIZACIÓN DE VUELTA
// --------------------------------------------

console.log('\n' + '-'.repeat(80) + '\n');
console.log('🔄 3. SERIALIZACIÓN DE VUELTA AL BACKEND\n');

const serializedQType = profileWithQType.toInterface();
const serializedQuick = profileWithQuick.toInterface();

console.log('✅ Datos serializados (listos para enviar al backend):');
console.log(JSON.stringify(serializedQType, null, 2).substring(0, 500) + '...');

console.log('\n✅ Ambos métodos producen la misma salida:');
console.log('   ¿Iguales?', JSON.stringify(serializedQType) === JSON.stringify(serializedQuick) ? '✅' : '❌');

// --------------------------------------------
// 4. ROUND-TRIP COMPLETO
// --------------------------------------------

console.log('\n' + '-'.repeat(80) + '\n');
console.log('🔄 4. ROUND-TRIP: Backend → Modelo → Backend → Modelo\n');

const serialized = profileWithQType.toInterface();
const restored = new CompleteProfileWithQType(serialized);

console.log('✅ Datos restaurados correctamente:');
console.log('   Username:', restored.user.username === profileWithQType.user.username ? '✅' : '❌');
console.log('   Balance:', restored.account.balance === profileWithQType.account.balance ? '✅' : '❌');
console.log('   CreatedAt:', restored.user.createdAt.getTime() === profileWithQType.user.createdAt.getTime() ? '✅' : '❌');
console.log('   RegExp pattern:', restored.settings.emailPattern.source === profileWithQType.settings.emailPattern.source ? '✅' : '❌');
console.log('   Map size:', restored.settings.preferences.size === profileWithQType.settings.preferences.size ? '✅' : '❌');
console.log('   Set size:', restored.settings.enabledFeatures.size === profileWithQType.settings.enabledFeatures.size ? '✅' : '❌');

// --------------------------------------------
// 5. VALIDACIÓN DE EMAIL CON REGEXP
// --------------------------------------------

console.log('\n' + '-'.repeat(80) + '\n');
console.log('🔍 5. USO PRÁCTICO: Validación con RegExp transformado\n');

const testEmails = [
  'john@example.com',
  'INVALID@',
  'test.user@domain.co.uk',
  'bad email',
];

console.log('Validando emails con el patrón del backend:');
testEmails.forEach(email => {
  const isValid = profileWithQType.settings.emailPattern.test(email);
  console.log(`   ${email.padEnd(30)} ${isValid ? '✅ Válido' : '❌ Inválido'}`);
});

// --------------------------------------------
// RESUMEN
// --------------------------------------------

console.log('\n' + '='.repeat(80));
console.log('📋 RESUMEN');
console.log('='.repeat(80) + '\n');

console.log('✅ @QType() - Explícito y verboso:');
console.log('   • Control total sobre cada propiedad');
console.log('   • Ideal para modelos complejos con tipos específicos');
console.log('   • Mejor para código que necesita documentación explícita');
console.log('   • Más líneas de código pero más claro\n');

console.log('⚡ @Quick() - Automático y conciso:');
console.log('   • Menos código, más productividad');
console.log('   • Autodetección de tipos simples (Date, BigInt, RegExp, etc.)');
console.log('   • Ideal para modelos con muchas propiedades');
console.log('   • Requiere @QType() solo para modelos anidados\n');

console.log('🎯 Mejor práctica:');
console.log('   • Usa @Quick() para modelos simples y propiedades básicas');
console.log('   • Usa @QType() cuando necesites control específico');
console.log('   • Combina ambos según las necesidades de cada modelo');

console.log('\n' + '='.repeat(80) + '\n');

export {
  CompleteProfileWithQType,
  CompleteProfileWithQuick,
  User,
  Account,
  Settings,
  Metadata,
  UserQuick,
  AccountQuick,
  SettingsQuick,
  MetadataQuick,
  backendResponse
};
