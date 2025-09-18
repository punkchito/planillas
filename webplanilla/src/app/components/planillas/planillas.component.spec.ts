import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanillasComponent } from './planillas.component';

describe('PlanillasComponent', () => {
  let component: PlanillasComponent;
  let fixture: ComponentFixture<PlanillasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PlanillasComponent]
    });
    fixture = TestBed.createComponent(PlanillasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
