import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PreferenciaTema, TemaService } from '../../services/tema.service';
import { SelectorTemaComponent } from './selector-tema.component';

describe('SelectorTemaComponent', () => {
  const preferencia = signal<PreferenciaTema>('sistema');
  const elegir = vi.fn((valor: PreferenciaTema) => preferencia.set(valor));

  beforeEach(async () => {
    preferencia.set('sistema');
    elegir.mockClear();
    await TestBed.configureTestingModule({
      imports: [SelectorTemaComponent],
      providers: [{ provide: TemaService, useValue: { preferencia, elegir } }],
    }).compileComponents();
  });

  it('abre el selector y cierra al elegir un tema', () => {
    const fixture = TestBed.createComponent(SelectorTemaComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const activador = root.querySelector<HTMLButtonElement>('.theme-trigger')!;

    expect(root.querySelector('.theme-popover')).toBeNull();
    activador.click();
    fixture.detectChanges();
    expect(activador.getAttribute('aria-expanded')).toBe('true');
    root.querySelectorAll<HTMLButtonElement>('.theme-selector button')[2].click();
    fixture.detectChanges();

    expect(elegir).toHaveBeenCalledWith('oscuro');
    expect(root.querySelector('.theme-popover')).toBeNull();
    expect(activador.getAttribute('aria-expanded')).toBe('false');
  });

  it('cierra con Escape y al hacer clic fuera', () => {
    const fixture = TestBed.createComponent(SelectorTemaComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const activador = root.querySelector<HTMLButtonElement>('.theme-trigger')!;

    activador.click();
    fixture.detectChanges();
    root.querySelector('.theme-control')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('.theme-popover')).toBeNull();

    activador.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(root.querySelector('.theme-popover')).toBeNull();
  });
});
