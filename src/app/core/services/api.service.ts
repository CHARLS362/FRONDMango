import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Product } from '../domain/product.model';
import type { Insumo, FruitSeason } from '../domain/inventory.model';
import type { CartItem, OrdenActiva } from '../domain/order.model';
import type { TicketVenta } from '../domain/ticket.model';
import type { AuditLog } from '../domain/audit.model';
import type { Usuario } from '../domain/user.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Helper mappings for Category <-> CategoryId
  private categoryMap: { [key: string]: number } = {
    'Jugos': 1,
    'Pasteles': 2,
    'Empanadas': 3
  };

  private categoryIdToText(id: number): string {
    if (id === 1) return 'Jugos';
    if (id === 2) return 'Pasteles';
    if (id === 3) return 'Empanadas';
    return 'General';
  }

  // --- Autenticacion ---
  login(nombreUsuario: string, contrasena: string): Observable<{ token: string; nombreUsuario: string; rol: string; usuarioUuid?: string }> {
    return this.http.post<any>(
      `${this.baseUrl}/autenticacion/iniciar-sesion`,
      { nombreUsuario, contrasena }
    ).pipe(
      map(res => ({
        token: res.token,
        nombreUsuario: res.nombreUsuario,
        rol: res.rol,
        usuarioUuid: res.usuarioUuid
      }))
    );
  }

  // --- Catalog (Products) ---
  getCarta(): Observable<Product[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Productos`).pipe(
      map(products => products.map(p => ({
        id: p.id.toString(),
        nombre: p.nombre,
        descripcion: p.descripcion || '',
        categoria: this.categoryIdToText(p.categoriaId),
        categoriaId: p.categoriaId,
        unidad: p.unidad || 'Unidad',
        costo: p.costo || 0,
        precio: p.precio,
        precioEntera: p.precioEntera || undefined,
        precioPorcion: p.precioPorcion || undefined,
        activo: p.activo,
        insumoId: p.insumoId ? p.insumoId.toString() : undefined,
        porcionesPorUnidad: p.porcionesPorUnidad || undefined,
        imagenUrl: p.imagenUrl || undefined,
        imagen: p.imagenUrl || undefined
      })))
    );
  }

  crearProducto(p: Omit<Product, 'activo'>): Observable<Product> {
    const body = {
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: p.precio,
      categoriaId: p.categoriaId || this.categoryMap[p.categoria] || 3,
      imagenUrl: p.imagenUrl || p.imagen || '',
      precioEntera: p.precioEntera || null,
      precioPorcion: p.precioPorcion || null,
      unidad: p.unidad,
      costo: p.costo || 0,
      insumoId: p.insumoId ? parseInt(p.insumoId, 10) : null,
      porcionesPorUnidad: p.porcionesPorUnidad ? parseInt(p.porcionesPorUnidad as any, 10) : null
    };
    return this.http.post<number>(`${this.baseUrl}/Productos`, body).pipe(
      map(id => ({
        ...p,
        id: id.toString(),
        activo: true
      }))
    );
  }

  actualizarProducto(id: string, fields: Partial<Product>): Observable<void> {
    const numId = parseInt(id, 10);
    const body: any = {};
    if (fields.nombre !== undefined) body.nombre = fields.nombre;
    if (fields.descripcion !== undefined) body.descripcion = fields.descripcion;
    if (fields.precio !== undefined) body.precio = fields.precio;
    if (fields.imagenUrl !== undefined || fields.imagen !== undefined) body.imagenUrl = fields.imagenUrl || fields.imagen;
    if (fields.categoriaId !== undefined) {
      body.categoriaId = fields.categoriaId;
    } else if (fields.categoria !== undefined) {
      body.categoriaId = this.categoryMap[fields.categoria] || 3;
    }
    if (fields.activo !== undefined) body.activo = fields.activo;
    if (fields.precioEntera !== undefined) body.precioEntera = fields.precioEntera;
    if (fields.precioPorcion !== undefined) body.precioPorcion = fields.precioPorcion;
    if (fields.unidad !== undefined) body.unidad = fields.unidad;
    if (fields.costo !== undefined) body.costo = fields.costo;
    if (fields.insumoId !== undefined) body.insumoId = fields.insumoId ? parseInt(fields.insumoId, 10) : null;
    if (fields.porcionesPorUnidad !== undefined) body.porcionesPorUnidad = fields.porcionesPorUnidad ? parseInt(fields.porcionesPorUnidad as any, 10) : null;

    return this.http.put<any>(`${this.baseUrl}/Productos/${numId}`, body).pipe(
      map(() => undefined)
    );
  }

  eliminarProducto(id: string): Observable<void> {
    const numId = parseInt(id, 10);
    return this.http.delete<void>(`${this.baseUrl}/Productos/${numId}`);
  }

  // --- Inventory (Insumos) ---
  getInventario(): Observable<Insumo[]> {
    return this.http.get<any[]>(`${this.baseUrl}/inventario`).pipe(
      map(insumos => insumos.map(i => ({
        id: i.id.toString(),
        nombre: i.nombre,
        unidad: i.unidad,
        stock: i.stock,
        stockMinimo: i.stockMinimo,
        costo: i.costo,
        activo: i.activo,
        temporadaId: i.temporadaId || undefined,
        categoria: i.temporadaId === 1 ? 'Pasteles' : i.temporadaId === 2 ? 'Jugos' : 'Empanadas'
      })))
    );
  }

  crearInsumo(i: Omit<Insumo, 'activo'>): Observable<Insumo> {
    const body = {
      nombre: i.nombre,
      unidad: i.unidad,
      stock: i.stock,
      stockMinimo: i.stockMinimo,
      costo: i.costo,
      temporadaId: i.temporadaId || (i.categoria === 'Pasteles' ? 1 : i.categoria === 'Jugos' ? 2 : 3)
    };
    return this.http.post<any>(`${this.baseUrl}/inventario`, body).pipe(
      map(res => ({
        id: res.id.toString(),
        nombre: res.nombre,
        unidad: res.unidad,
        stock: res.stock,
        stockMinimo: res.stockMinimo,
        costo: res.costo,
        activo: res.activo,
        temporadaId: res.temporadaId,
        categoria: res.temporadaId === 1 ? 'Pasteles' : res.temporadaId === 2 ? 'Jugos' : 'Empanadas'
      }))
    );
  }

  actualizarInsumo(id: string, fields: Partial<Insumo>): Observable<void> {
    const numId = parseInt(id, 10);
    const body: any = {};
    if (fields.nombre !== undefined) body.nombre = fields.nombre;
    if (fields.unidad !== undefined) body.unidad = fields.unidad;
    if (fields.stock !== undefined) body.stock = fields.stock;
    if (fields.stockMinimo !== undefined) body.stockMinimo = fields.stockMinimo;
    if (fields.costo !== undefined) body.costo = fields.costo;
    if (fields.activo !== undefined) body.activo = fields.activo;
    if (fields.temporadaId !== undefined) {
      body.temporadaId = fields.temporadaId;
    } else if (fields.categoria !== undefined) {
      body.temporadaId = fields.categoria === 'Pasteles' ? 1 : fields.categoria === 'Jugos' ? 2 : 3;
    }

    return this.http.put<any>(`${this.baseUrl}/inventario/${numId}`, body).pipe(
      map(() => undefined)
    );
  }

  eliminarInsumo(id: string): Observable<void> {
    const numId = parseInt(id, 10);
    return this.http.delete<void>(`${this.baseUrl}/inventario/${numId}`);
  }

  recibirStock(id: string, cantidad: number, usuarioId: number): Observable<void> {
    return this.http.get<any>(`${this.baseUrl}/inventario/${id}`).pipe(
      switchMap(insumo => {
        const nuevoStock = (insumo.stock || 0) + cantidad;
        return this.actualizarInsumo(id, { stock: nuevoStock });
      })
    );
  }

  retirarStock(id: string, cantidad: number, usuarioId: number): Observable<void> {
    return this.http.get<any>(`${this.baseUrl}/inventario/${id}`).pipe(
      switchMap(insumo => {
        const nuevoStock = Math.max(0, (insumo.stock || 0) - cantidad);
        return this.actualizarInsumo(id, { stock: nuevoStock });
      })
    );
  }

  // --- Fruit Seasons ---
  getFruitSeasons(): Observable<FruitSeason[]> {
    return this.http.get<any[]>(`${this.baseUrl}/inventario/seasons`).pipe(
      map(seasons => seasons.map(s => ({
        id: s.id.toString(),
        nombre: s.nombre,
        mesInicio: s.mesInicio,
        mesFin: s.mesFin,
        duracionDias: s.duracionDias,
        activa: s.activa,
        imagen: s.nombre === 'Mango' ? '🥭' : s.nombre === 'Fresa' ? '🍓' : '🥥'
      })))
    );
  }

  actualizarTemporadaFruta(id: string, fields: Partial<FruitSeason>): Observable<void> {
    const numId = parseInt(id, 10);
    const body: any = {};
    if (fields.mesInicio !== undefined) body.mesInicio = fields.mesInicio;
    if (fields.mesFin !== undefined) body.mesFin = fields.mesFin;
    if (fields.duracionDias !== undefined) body.duracionDias = fields.duracionDias;
    if (fields.activa !== undefined) body.activa = fields.activa;

    return this.http.put<void>(`${this.baseUrl}/inventario/seasons/${numId}`, body);
  }

  // --- Orders ---
  getOrdenesActivas(): Observable<OrdenActiva[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Pedidos`).pipe(
      map(pedidos => pedidos.map(p => {
        let metadata: any = {};
        try {
          if (p.notas && p.notas.startsWith('{')) {
            metadata = JSON.parse(p.notas);
          }
        } catch (e) {}

        const carrito: CartItem[] = (p.detalles || []).map((d: any) => {
          const matchingFlag = metadata.carritoFlags?.find((f: any) => f.productoId === d.productoId.toString());
          return {
            productoId: d.productoId.toString(),
            nombre: d.productoNombre,
            tipoVenta: d.tipoDespacho || 'GENERAL',
            precio: d.precioUnitario,
            cantidad: d.cantidad,
            servido: matchingFlag ? matchingFlag.servido : (p.estado === 'SERVIDO'),
            enviadoCocina: matchingFlag ? matchingFlag.enviadoCocina : true
          };
        });

        return {
          id: p.id.toString(),
          numeroPedido: p.numero || p.id.toString(),
          carrito,
          vendedor: metadata.vendedor || 'Vendedor',
          horaApertura: p.creadoEn ? new Date(p.creadoEn).toLocaleTimeString() : new Date().toLocaleTimeString(),
          subsanadoCount: metadata.subsanadoCount || 0,
          estado: p.estado || 'PREPARANDO',
          clienteNombre: metadata.clienteNombre || p.notas || '',
          observaciones: metadata.observaciones || '',
          modoServicio: p.tipoGeneral || 'LLEVAR',
          enviadoCocina: metadata.enviadoCocina || false,
          empaque: metadata.empaque || 'BOLSA',
          recargoEmpaque: metadata.recargoEmpaque || 0
        };
      }))
    );
  }

  crearOrden(orden: OrdenActiva): Observable<string> {
    const body = {
      tipoGeneral: orden.modoServicio,
      descuento: 0,
      notas: JSON.stringify({
        clienteNombre: orden.clienteNombre,
        observaciones: orden.observaciones,
        empaque: orden.empaque,
        recargoEmpaque: orden.recargoEmpaque,
        subsanadoCount: orden.subsanadoCount,
        enviadoCocina: orden.enviadoCocina,
        vendedor: orden.vendedor,
        carritoFlags: orden.carrito.map(item => ({
          productoId: item.productoId,
          tipoVenta: item.tipoVenta,
          servido: item.servido || false,
          enviadoCocina: item.enviadoCocina || false
        }))
      }),
      usuarioId: 0,
      cajaId: 1,
      sucursalId: 1,
      detalles: orden.carrito.map(item => ({
        productoId: parseInt(item.productoId, 10),
        cantidad: item.cantidad,
        tipoDespacho: item.tipoVenta,
        notes: ''
      }))
    };
    return this.http.post<any>(`${this.baseUrl}/Pedidos`, body).pipe(
      map(res => res.id.toString())
    );
  }

  actualizarOrden(id: string, fields: Partial<OrdenActiva>): Observable<void> {
    const numId = parseInt(id, 10);
    const body = {
      id: numId,
      tipoGeneral: fields.modoServicio || 'LLEVAR',
      descuento: 0,
      notas: JSON.stringify({
        clienteNombre: fields.clienteNombre,
        observaciones: fields.observaciones,
        empaque: fields.empaque,
        recargoEmpaque: fields.recargoEmpaque,
        subsanadoCount: fields.subsanadoCount,
        enviadoCocina: fields.enviadoCocina,
        vendedor: fields.vendedor,
        carritoFlags: fields.carrito?.map(item => ({
          productoId: item.productoId,
          tipoVenta: item.tipoVenta,
          servido: item.servido || false,
          enviadoCocina: item.enviadoCocina || false
        }))
      }),
      detalles: fields.carrito?.map(item => ({
        productoId: parseInt(item.productoId, 10),
        cantidad: item.cantidad,
        tipoDespacho: item.tipoVenta,
        notes: ''
      })) || []
    };
    return this.http.put<any>(`${this.baseUrl}/Pedidos/${numId}`, body).pipe(
      map(() => undefined)
    );
  }

  eliminarOrden(id: string): Observable<void> {
    const numId = parseInt(id, 10);
    return this.http.put<any>(`${this.baseUrl}/Pedidos/${numId}`, {
      id: numId,
      tipoGeneral: 'LLEVAR',
      descuento: 0,
      notas: 'CANCELADO',
      detalles: []
    }).pipe(map(() => undefined));
  }

  // --- Tickets ---
  getTickets(): Observable<TicketVenta[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tickets`).pipe(
      map(tickets => tickets.map(t => {
        try {
          if (t.contenidoJson) {
            const parsed = JSON.parse(t.contenidoJson);
            return {
              ...parsed,
              id: t.id.toString(),
              pedidoId: t.pedidoId ? t.pedidoId.toString() : undefined
            };
          }
        } catch (e) {}

        return {
          id: t.id.toString(),
          fecha: t.impresoEn ? new Date(t.impresoEn).toLocaleString() : new Date().toLocaleString(),
          total: 0,
          metodoPago: 'EFECTIVO',
          items: [],
          vendedor: 'Sistema',
          modoServicio: 'LLEVAR',
          pagado: 0,
          vuelto: 0,
          pedidoId: t.pedidoId ? t.pedidoId.toString() : undefined
        };
      }))
    );
  }

  crearTicket(ticket: TicketVenta): Observable<any> {
    const body = {
      pedidoId: ticket.pedidoId ? parseInt(ticket.pedidoId, 10) : null,
      descuento: 0,
      pagos: [{
        monto: ticket.total,
        metodo: ticket.metodoPago,
        referencia: ticket.observaciones || '',
        montoRecibido: ticket.pagado,
        vuelto: ticket.vuelto
      }]
    };
    return this.http.post<any>(`${this.baseUrl}/tickets`, body);
  }

  anularTicket(id: string, usuarioId?: number): Observable<void> {
    return of(undefined);
  }

  // --- Audits ---
  getAuditorias(): Observable<AuditLog[]> {
    return this.http.get<any[]>(`${this.baseUrl}/audits`).pipe(
      map(logs => logs.map(l => ({
        id: l.id,
        fecha: l.fecha ? new Date(l.fecha).toLocaleString() : new Date().toLocaleString(),
        tipo: l.tipo || 'STOCK',
        descripcion: l.descripcion,
        detalles: l.detalles || null
      })))
    );
  }

  crearAuditoria(log: AuditLog): Observable<AuditLog> {
    return this.http.post<any>(`${this.baseUrl}/audits`, {
      tipo: log.tipo,
      descripcion: log.descripcion,
      detalles: log.detalles
    }).pipe(
      map(res => ({
        id: res.id || log.id,
        fecha: res.fecha ? new Date(res.fecha).toLocaleString() : log.fecha,
        tipo: res.tipo || log.tipo,
        descripcion: res.descripcion || log.descripcion,
        detalles: res.detalles || log.detalles
      }))
    );
  }

  // --- Users ---
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<any[]>(`${this.baseUrl}/users`).pipe(
      map(users => users.map(u => ({
        username: u.username,
        nombre: u.nombre,
        rol: u.rolId === 1 ? 'administrador' : 'vendedor',
        rolId: u.rolId,
        activo: u.activo,
        uuid: u.uuid
      })))
    );
  }

  crearUsuario(usuario: Usuario): Observable<Usuario> {
    const body = {
      username: usuario.username,
      nombre: usuario.nombre,
      password: usuario.password || '',
      rolId: usuario.rol === 'administrador' ? 1 : 2,
      activo: usuario.activo !== undefined ? usuario.activo : true
    };
    return this.http.post<any>(`${this.baseUrl}/users`, body).pipe(
      map(() => usuario)
    );
  }

  eliminarUsuario(username: string): Observable<void> {
    return this.getUsuarios().pipe(
      switchMap(users => {
        const user = users.find(u => u.username === username);
        if (!user || !user.uuid) {
          throw new Error(`Usuario ${username} no encontrado o no tiene UUID asociado.`);
        }
        return this.http.delete<void>(`${this.baseUrl}/users/${user.uuid}`);
      })
    );
  }

  // --- Caja / Shift Management ---
  getCajaActiva(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Cajas/1/estado`).pipe(
      map(res => {
        if (res && res.sesionActiva) {
          return {
            fondoInicial: res.sesionActiva.montoInicial,
            ventasEfectivo: Math.max(0, (res.caja?.montoActual || 0) - (res.sesionActiva.montoInicial || 0)),
            ventasYapePlin: 0,
            ventasTarjeta: 0
          };
        }
        return null;
      })
    );
  }

  aperturarCaja(fondoInicial: number, usuarioId: number): Observable<number> {
    return this.http.post<boolean>(`${this.baseUrl}/Cajas/1/abrir`, {
      montoInicial: fondoInicial,
      usuarioId: 0
    }).pipe(
      map(() => fondoInicial)
    );
  }

  cerrarCaja(realEfectivo: number, usuarioId: number): Observable<void> {
    return this.http.get<any>(`${this.baseUrl}/Cajas/1/estado`).pipe(
      switchMap(res => {
        const montoTeorico = res.caja ? res.caja.montoActual : realEfectivo;
        const descuadre = realEfectivo - montoTeorico;
        return this.http.post<void>(`${this.baseUrl}/Cajas/1/cerrar`, {
          montoFinalReal: realEfectivo,
          descuadre,
          usuarioId: 0,
          observaciones: 'Cierre de caja desde frontend'
        });
      })
    );
  }
}
