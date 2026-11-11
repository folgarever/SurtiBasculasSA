import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideClipboardCheck,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMessageSquare,
  lucideUsers,
  lucideUserRoundCog,
} from '@ng-icons/lucide';
import { AuthService } from '../../services/auth.service';
import { SelectorTemaComponent } from '../../components/selector-tema/selector-tema.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, NgIcon, SelectorTemaComponent],
  providers: [provideIcons({ lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUsers, lucideUserRoundCog })],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent {
  private readonly auth = inject(AuthService);
  protected readonly usuario = this.auth.getUsuario();

  protected salir(): void {
    this.auth.logout();
  }
}
