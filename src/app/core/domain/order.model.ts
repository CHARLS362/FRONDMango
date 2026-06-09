export interface CartItem {
  productoId: string;
  nombre: string;
  tipoVenta: "GENERAL" | "ENTERA" | "PORCION";
  precio: number;
  cantidad: number;
  servido?: boolean;       // Para verificar si ya se sirvió en mesa/consumo local
  enviadoCocina?: boolean; // Para verificar si ya se envió a cocina
}

export interface OrdenActiva {
  id: string;              // ID único (ej. "101")
  numeroPedido: string;    // Formato visible (ej. "01", "02")
  carrito: CartItem[];
  vendedor: string;
  horaApertura: string;
  subsanadoCount: number;
  estado: "PREPARANDO" | "SERVIDO";
  clienteNombre: string;   // Datos del cliente
  observaciones: string;   // Observaciones de barra/cocina
  modoServicio?: "MESA" | "LLEVAR"; // Si es consumo local o para llevar
  enviadoCocina?: boolean; // Si ya fue enviado/validado a la cocina
  empaque?: "BOLSA" | "VASO";
  recargoEmpaque?: number;
}
