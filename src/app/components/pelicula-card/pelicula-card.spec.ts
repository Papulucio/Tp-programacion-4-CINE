import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeliculaCard } from './pelicula-card';

describe('PeliculaCard', () => {
  let component: PeliculaCard;
  let fixture: ComponentFixture<PeliculaCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeliculaCard],
    }).compileComponents();

    fixture = TestBed.createComponent(PeliculaCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
