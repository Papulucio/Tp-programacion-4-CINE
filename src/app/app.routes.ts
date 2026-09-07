import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { RegistroComponent } from './pages/registro/registro';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'registro', component: RegistroComponent },
  { path: '**', redirectTo: 'home' }
];