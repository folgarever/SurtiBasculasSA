import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { NotificacionItem, NotificacionesService } from '../../services/notificaciones.service';
import { NotificacionesComponent } from './notificaciones.component';

describe('NotificacionesComponent', () => {
  const item: NotificacionItem = {
    id: 'respuesta-3',
    titulo: 'Respuesta a tu sugerencia',
    detalle: 'SG-2026-00003 · Más mesas',
    ruta: '/sugerencias',
    marcador: '2026-11-18 14:00:00::Se instalarán mesas.',
    tipo: 'sugerencia',
  };

  const router = { navigateByUrl: vi.fn() };

  const servicio = {
    cargar: vi.fn(),
    items: signal<NotificacionItem[]>([item]),
    noLeidos: signal(1),
    total: signal(1),
    cargando: signal(false),
    estaLeido: vi.fn(() => false),
    marcarLeido: vi.fn(),
    marcarTodos: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    servicio.items.set([item]);
    servicio.noLeidos.set(1);
    servicio.total.set(1);
    await TestBed.configureTestingModule({
      imports: [NotificacionesComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: NotificacionesService, useValue: servicio },
      ],
    }).compileComponents();
  });

  function crear() {
    const fixture = TestBed.createComponent(NotificacionesComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('carga las notificaciones al iniciar y muestra el contador de no leídos', () => {
    const raiz = crear().nativeElement as HTMLElement;
    expect(servicio.cargar).toHaveBeenCalledOnce();
    expect(raiz.querySelector('.notificaciones-badge')?.textContent?.trim()).toBe('1');
    expect(raiz.querySelector('button[aria-label="Notificaciones, 1 sin leer"]')).toBeTruthy();
  });

  it('abre el panel y marca como leída la notificación al abrirla', () => {
    const fixture = crear();
    const raiz = fixture.nativeElement as HTMLElement;
    raiz.querySelector<HTMLButtonElement>('.notificaciones-trigger')!.click();
    fixture.detectChanges();

    expect(raiz.querySelector('.notificaciones-panel')).toBeTruthy();
    raiz.querySelector<HTMLButtonElement>('.notificaciones-item')!.click();
    expect(servicio.marcarLeido).toHaveBeenCalledWith(item);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/sugerencias');
    fixture.detectChanges();
    expect(raiz.querySelector('.notificaciones-panel')).toBeNull();
  });

  it('permite marcar todas como leídas', () => {
    const fixture = crear();
    const raiz = fixture.nativeElement as HTMLElement;
    raiz.querySelector<HTMLButtonElement>('.notificaciones-trigger')!.click();
    fixture.detectChanges();

    raiz.querySelector<HTMLButtonElement>('.notificaciones-leidas')!.click();
    expect(servicio.marcarTodos).toHaveBeenCalledOnce();
  });
});
