/**
 * @deprecated Import from `core/domain` or `@app/core` instead.
 * This file re-exports all models for backward compatibility.
 *
 * Migration guide:
 *   Before: import { Product } from '../../core/models/pos.models'
 *   After:  import { Product } from '../../core/domain/product.model'
 *   Or:     import type { Product } from '@app/core'
 */
export type { Product } from '../domain/product.model';
export type { Insumo, FruitSeason } from '../domain/inventory.model';
export type { CartItem, OrdenActiva } from '../domain/order.model';
export type { TicketVenta } from '../domain/ticket.model';
export type { AuditLog } from '../domain/audit.model';
