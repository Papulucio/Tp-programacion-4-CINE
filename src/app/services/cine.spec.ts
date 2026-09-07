import { TestBed } from '@angular/core/testing';
import { Cine } from './cine';

describe('Cine', () => {
  let service: Cine;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Cine);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
