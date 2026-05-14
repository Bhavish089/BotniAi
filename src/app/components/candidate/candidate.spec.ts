import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateComponent } from './candidate';

describe('CandidateComponent', () => {
  let component: CandidateComponent;
  let fixture: ComponentFixture<CandidateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CandidateComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
