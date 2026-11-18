import { AppShellComponent } from '../../components/app-shell/app-shell.component';
import { NAV_ADMIN, SUGERENCIAS_ADMIN } from '../../components/app-shell/nav-items';
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

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [AppShellComponent, RouterLink, NgIcon],
  providers: [provideIcons({ lucideClipboardCheck, lucideLayoutDashboard, lucideLogOut, lucideMessageSquare, lucideUsers, lucideUserRoundCog })],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent {
  protected readonly navItems = NAV_ADMIN;
  protected readonly bottomItems = [SUGERENCIAS_ADMIN];
  private readonly auth = inject(AuthService);
  protected readonly usuario = this.auth.getUsuario();
  protected readonly puedeEvaluar = this.auth.hasEvaluationRole();

}
