import { Injectable, signal, inject, effect } from '@angular/core';
import { LocalStorageService } from '../core/infrastructure/local-storage.service';
import { ApiService } from '../core/services/api.service';
import { AlertService } from '../core/services/alert.service';
import { environment } from '../../environments/environment';
import type { AuditLog } from '../core/domain/audit.model';
import type { Usuario } from '../core/domain/user.model';

const INITIAL_USUARIOS: Usuario[] = [
  { username: 'admin', nombre: 'Administrador', rol: 'administrador', activo: true, password: '1234' },
  { username: 'vendedor', nombre: 'Vendedor Principal', rol: 'vendedor', activo: true, password: '1234' }
];

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  private storage = inject(LocalStorageService);
  private apiService = inject(ApiService);
  private alertService = inject(AlertService);

  // --- Signals ---
  vendedorActivo = signal<string | null>(this.storage.load('vendedorActivo', null));
  rolActivo = signal<'administrador' | 'vendedor' | null>(this.storage.load('rolActivo', null));
  usuarios = signal<Usuario[]>(this.storage.load('usuarios', INITIAL_USUARIOS));
  cajaAbierta = signal<boolean>(this.storage.load('cajaAbierta', false));
  cajaFondoInicial = signal<number>(this.storage.load('cajaFondoInicial', 0));
  cajaMetodoVentas = signal<{ efectivo: number; yapePlin: number; tarjeta: number }>(
    this.storage.load('cajaMetodoVentas', { efectivo: 0, yapePlin: 0, tarjeta: 0 })
  );
  cajaLogs = signal<{ tipo: string; monto: number; hora: string }[]>(
    this.storage.load('cajaLogs', [])
  );
  claveAdministrador = signal<string>(this.storage.load('claveAdministrador', '1234'));

  constructor() {
    if (environment.useBackend) {
      this.apiService.getUsuarios().subscribe({
        next: (data) => this.usuarios.set(data),
        error: (err) => console.error('Error fetching users from backend:', err)
      });

      this.apiService.getCajaActiva().subscribe({
        next: (shift) => {
          if (shift) {
            this.cajaAbierta.set(true);
            this.cajaFondoInicial.set(shift.fondoInicial);
            this.cajaMetodoVentas.set({
              efectivo: shift.ventasEfectivo,
              yapePlin: shift.ventasYapePlin,
              tarjeta: shift.ventasTarjeta
            });
          } else {
            this.cajaAbierta.set(false);
            this.cajaFondoInicial.set(0);
            this.cajaMetodoVentas.set({ efectivo: 0, yapePlin: 0, tarjeta: 0 });
          }
        },
        error: (err) => console.error('Error fetching active box shift:', err)
      });
    }

    effect(() => this.storage.save('vendedorActivo', this.vendedorActivo()));
    effect(() => this.storage.save('rolActivo', this.rolActivo()));
    effect(() => this.storage.save('usuarios', this.usuarios()));
    effect(() => this.storage.save('cajaAbierta', this.cajaAbierta()));
    effect(() => this.storage.save('cajaFondoInicial', this.cajaFondoInicial()));
    effect(() => this.storage.save('cajaMetodoVentas', this.cajaMetodoVentas()));
    effect(() => this.storage.save('cajaLogs', this.cajaLogs()));
    effect(() => this.storage.save('claveAdministrador', this.claveAdministrador()));
  }

  // --- Actions ---

  setVendedorActivo(nombre: string | null, rol: 'administrador' | 'vendedor' | null = null) {
    this.vendedorActivo.set(nombre);
    this.rolActivo.set(rol);
    if (!nombre) {
      localStorage.removeItem('mango81_token');
    }
  }

  abrirCaja(fondo: number): AuditLog {
    this.cajaAbierta.set(true);
    this.cajaFondoInicial.set(fondo);
    this.cajaMetodoVentas.set({ efectivo: 0, yapePlin: 0, tarjeta: 0 });
    this.cajaLogs.set([{ tipo: 'Apertura', monto: fondo, hora: new Date().toLocaleTimeString() }]);

    if (environment.useBackend) {
      this.apiService.aperturarCaja(fondo, 0).subscribe({
        error: (err) => console.error('Error opening box in backend:', err)
      });
    }

    return {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'CAJA_APERTURA',
      descripcion: `Apertura de caja con fondo inicial de S/. ${fondo.toFixed(2)}`,
      detalles: { fondoInicial: fondo, vendedor: this.vendedorActivo() },
    };
  }

  cerrarCaja(efectivoReal: number): { diferencia: number; balance: any; auditLog: AuditLog } {
    const fondoInicial = this.cajaFondoInicial();
    const ventasEfectivo = this.cajaMetodoVentas().efectivo;
    const montoTeoricoEfectivo = fondoInicial + ventasEfectivo;
    const diferencia = efectivoReal - montoTeoricoEfectivo;

    const balance = {
      fondoInicial,
      ventasEfectivo,
      ventasYapePlin: this.cajaMetodoVentas().yapePlin,
      ventasTarjeta: this.cajaMetodoVentas().tarjeta,
      totalVentas: ventasEfectivo + this.cajaMetodoVentas().yapePlin + this.cajaMetodoVentas().tarjeta,
      teoricoEfectivo: montoTeoricoEfectivo,
      realEfectivo: efectivoReal,
      diferencia,
    };

    const auditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      fecha: new Date().toLocaleString(),
      tipo: 'CAJA_CIERRE',
      descripcion: `Cierre de caja. Total ventas: S/. ${balance.totalVentas.toFixed(2)}. Arqueo: S/. ${diferencia.toFixed(2)} (vendedor: ${this.vendedorActivo()})`,
      detalles: balance,
    };

    this.cajaAbierta.set(false);
    this.vendedorActivo.set(null);
    this.rolActivo.set(null);
    localStorage.removeItem('mango81_token');
    this.cajaLogs.update(prev => [...prev, { tipo: 'Cierre', monto: efectivoReal, hora: new Date().toLocaleTimeString() }]);

    if (environment.useBackend) {
      this.apiService.cerrarCaja(efectivoReal, 0).subscribe({
        error: (err) => console.error('Error closing box in backend:', err)
      });
    }

    return { diferencia, balance, auditLog };
  }

  crearUsuario(u: Usuario) {
    if (environment.useBackend) {
      this.apiService.crearUsuario(u).subscribe({
        next: (newU) => {
          this.usuarios.update(prev => [...prev, newU]);
          this.alertService.alert('Usuario Registrado', `El vendedor ${u.nombre} ha sido creado exitosamente.`);
        },
        error: (err) => {
          console.error('Error creating user in backend:', err);
          this.alertService.alert('Error al Registrar', 'No se pudo registrar al vendedor en el servidor backend.');
        }
      });
    } else {
      this.usuarios.update(prev => [...prev, u]);
      this.alertService.alert('Usuario Registrado', `El vendedor ${u.nombre} ha sido creado localmente.`);
    }
  }

  eliminarUsuario(username: string) {
    if (environment.useBackend) {
      this.apiService.eliminarUsuario(username).subscribe({
        next: () => {
          this.usuarios.update(prev => prev.map(u => u.username === username ? { ...u, activo: false } : u));
          this.alertService.alert('Usuario Desactivado', `El usuario ${username} ha sido dado de baja.`);
        },
        error: (err) => {
          console.error('Error deleting user in backend:', err);
          this.alertService.alert('Error', 'No se pudo eliminar al usuario en el backend.');
        }
      });
    } else {
      this.usuarios.update(prev => prev.map(u => u.username === username ? { ...u, activo: false } : u));
      this.alertService.alert('Usuario Desactivado', `El usuario ${username} ha sido dado de baja localmente.`);
    }
  }

  registrarVentaEnCaja(total: number, metodoPago: 'EFECTIVO' | 'YAPE_PLIN' | 'TARJETA') {
    this.cajaMetodoVentas.update(prev => {
      const nuevo = { ...prev };
      if (metodoPago === 'EFECTIVO') nuevo.efectivo += total;
      if (metodoPago === 'YAPE_PLIN') nuevo.yapePlin += total;
      if (metodoPago === 'TARJETA') nuevo.tarjeta += total;
      return nuevo;
    });
  }

  revertirVentaEnCaja(total: number, metodoPago: 'EFECTIVO' | 'YAPE_PLIN' | 'TARJETA') {
    this.cajaMetodoVentas.update(prev => {
      const nuevo = { ...prev };
      if (metodoPago === 'EFECTIVO') nuevo.efectivo = Math.max(0, nuevo.efectivo - total);
      if (metodoPago === 'YAPE_PLIN') nuevo.yapePlin = Math.max(0, nuevo.yapePlin - total);
      if (metodoPago === 'TARJETA') nuevo.tarjeta = Math.max(0, nuevo.tarjeta - total);
      return nuevo;
    });
  }

  cambiarClaveAdministrador(nuevaClave: string) {
    this.claveAdministrador.set(nuevaClave);
  }
}
