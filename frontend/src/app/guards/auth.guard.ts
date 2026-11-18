import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Todas las rutas que usan este guard son de personal; los candidatos tienen su propio portal.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (auth.isCandidate()) return router.createUrlTree(['/seleccion-candidato']);
  return true;
};
