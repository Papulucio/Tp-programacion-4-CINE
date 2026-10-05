import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/** Exige sesión activa (cualquier rol). */
export const sesionGuard: CanActivateFn = (_route, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.estaLogueado()) return true;
  return router.createUrlTree(['/login'], { queryParams: { retour: estado.url } });
};

/** Solo el usuario administrador (mail del 12/02). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaLogueado()) return router.createUrlTree(['/login']);
  return auth.esAdmin() ? true : router.createUrlTree(['/home']);
};

/** Administrador o empleado (mail del 12/02: "usuarios que usen los empleados"). */
export const empleadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaLogueado()) return router.createUrlTree(['/login']);
  return auth.esAdmin() || auth.esEmpleado() ? true : router.createUrlTree(['/home']);
};