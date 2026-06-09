// Domain models
export type { Product } from './domain/product.model';
export type { Insumo, FruitSeason } from './domain/inventory.model';
export type { CartItem, OrdenActiva } from './domain/order.model';
export type { TicketVenta } from './domain/ticket.model';
export type { AuditLog } from './domain/audit.model';

// Infrastructure
export { LocalStorageService } from './infrastructure/local-storage.service';

// Services
export { POSStateService } from './services/pos-state.service';

// Guards
export { authGuard } from './guards/auth.guard';
