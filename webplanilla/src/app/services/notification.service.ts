// src/app/services/notification.service.ts (OPCIONAL - para mejorar UX)
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface NotificationMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<NotificationMessage[]>([]);
  public notifications$ = this.notifications.asObservable();

  constructor() {}

  show(type: 'success' | 'warning' | 'info' | 'error', title: string, message: string, duration: number = 5000): void {
    const notification: NotificationMessage = {
      id: this.generateId(),
      type,
      title,
      message,
      duration
    };

    const current = this.notifications.value;
    this.notifications.next([...current, notification]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, duration);
    }
  }

  success(title: string, message: string, duration?: number): void {
    this.show('success', title, message, duration);
  }

  error(title: string, message: string, duration?: number): void {
    this.show('error', title, message, duration);
  }

  warning(title: string, message: string, duration?: number): void {
    this.show('warning', title, message, duration);
  }

  info(title: string, message: string, duration?: number): void {
    this.show('info', title, message, duration);
  }

  remove(id: string): void {
    const current = this.notifications.value;
    this.notifications.next(current.filter(n => n.id !== id));
  }

  clear(): void {
    this.notifications.next([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}