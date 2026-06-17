export interface Usuario {
  username: string;
  nombre: string;
  rol: 'administrador' | 'vendedor';
  rolId?: number;          // ID de rol en el backend (1 para admin, 2 para vendedor)
  activo: boolean;
  password?: string;
  uuid?: string;           // Identificador UUID en el backend
}
