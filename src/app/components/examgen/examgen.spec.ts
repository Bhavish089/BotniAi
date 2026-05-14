import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Examgen } from './examgen';

describe('Examgen', () => {
  let component: Examgen;
  let fixture: ComponentFixture<Examgen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Examgen],
    }).compileComponents();

    fixture = TestBed.createComponent(Examgen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
