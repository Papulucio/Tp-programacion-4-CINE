import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { RegistroComponent } from './pages/registro/registro';
import { AdminComponent } from './pages/admin/admin';
import { EmpleadoComponent } from './pages/empleado/empleado';
import { CompraComponent } from './pages/compra/compra';
import { PerfilComponent } from './pages/perfil/perfil';
import { adminGuard, empleadoGuard, sesionGuard } from './core/guards/rol.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, title: 'Cine · Cartelera' },
  { path: 'login', component: LoginComponent, title: 'Cine · Iniciar sesión' },
  { path: 'registro', component: RegistroComponent, title: 'Cine · Registro' },
  { path: 'compra/:id', component: CompraComponent, title: 'Cine · Comprar entradas' },
  { path: 'perfil', component: PerfilComponent, canActivate: [sesionGuard], title: 'Cine · Mi perfil' },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard], title: 'Cine · Administración' },
  {
    path: 'empleado',
    component: EmpleadoComponent,
    canActivate: [empleadoGuard],
    title: 'Cine · Validación de entradas',
  },
  { path: '**', redirectTo: 'home' },
];