import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { RegistroComponent } from './pages/registro/registro';
import { AdminComponent } from './pages/admin/admin';
import { EmpleadoComponent } from './pages/empleado/empleado';
import { CompraComponent } from './pages/compra/compra';
import { PerfilComponent } from './pages/perfil/perfil';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'empleado', component: EmpleadoComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: 'compra/:id', component: CompraComponent },
  { path: '**', redirectTo: 'home' } 
];