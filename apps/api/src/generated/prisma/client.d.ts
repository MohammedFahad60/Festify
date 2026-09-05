// Stub type declarations for Prisma Client
export declare class PrismaClient {
  constructor(options?: any);
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw(...args: any[]): Promise<any>;
  $transaction<T>(fn: (tx: any) => Promise<T>, options?: any): Promise<T>;
  user: any;
  role: any;
  userRole: any;
  organizer: any;
  category: any;
  venue: any;
  festival: any;
  festivalImage: any;
  ticketType: any;
  order: any;
  orderItem: any;
  payment: any;
  ticket: any;
}

export declare namespace Prisma {
  class Decimal {
    constructor(value: any);
    mul(other: any): Decimal;
    add(other: any): Decimal;
    toString(): string;
    valueOf(): number;
  }
  const JsonNull: any;
  type InputJsonValue = any;
  enum TransactionIsolationLevel {
    ReadUncommitted = "ReadUncommitted",
    ReadCommitted = "ReadCommitted",
    RepeatableRead = "RepeatableRead",
    Serializable = "Serializable",
  }
}
