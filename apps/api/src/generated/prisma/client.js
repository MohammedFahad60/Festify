// Stub runtime for Prisma Client - replaced by `prisma generate` in production
export class PrismaClient {
  constructor(options) {
    this._options = options;
    // Create stub model proxies that throw helpful error if called without real client
    const stub = new Proxy({}, {
      get(_target, prop) {
        return async (...args) => {
          throw new Error(
            `PrismaClient stub: ${String(prop)} called but real client not generated. ` +
            `Run 'npx prisma generate' with DATABASE_URL set and network access to generate the real client. ` +
            `Args: ${JSON.stringify(args).slice(0, 200)}`
          );
        };
      }
    });
    this.user = stub;
    this.role = stub;
    this.userRole = stub;
    this.organizer = stub;
    this.category = stub;
    this.venue = stub;
    this.festival = stub;
    this.festivalImage = stub;
    this.ticketType = stub;
    this.order = stub;
    this.orderItem = stub;
    this.payment = stub;
    this.ticket = stub;
  }
  async $connect() {}
  async $disconnect() {}
  async $queryRaw() { return []; }
  async $transaction(fn, options) {
    // Simple pass-through: call fn with this as tx
    return fn(this);
  }
}

export const Prisma = {
  Decimal: class Decimal {
    constructor(value) { this.value = Number(value) || 0; }
    mul(other) { return new Prisma.Decimal(this.value * Number(other)); }
    add(other) { return new Prisma.Decimal(this.value + Number(other.value ?? other)); }
    toString() { return String(this.value); }
    valueOf() { return this.value; }
  },
  JsonNull: null,
  TransactionIsolationLevel: {
    ReadUncommitted: "ReadUncommitted",
    ReadCommitted: "ReadCommitted",
    RepeatableRead: "RepeatableRead",
    Serializable: "Serializable",
  }
};
