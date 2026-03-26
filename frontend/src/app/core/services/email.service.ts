import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/email`;

  sendReceipt(toEmail: string, subject: string, htmlBody: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/send-receipt`, { toEmail, subject, htmlBody })
    );
  }
}
