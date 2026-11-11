import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TemaService } from './services/tema.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: '<router-outlet />',
})
export class App {
  protected readonly tema = inject(TemaService);
}
