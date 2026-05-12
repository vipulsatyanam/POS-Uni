import { Injectable, signal } from '@angular/core';
import { Customer } from '../models/product.model';

const AVATAR_COLORS = [
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ef4444', // red
];

export interface CurrentUser {
  name: string;
  email: string;
  initials: string;
  avatarColor: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {

  readonly currentUser: CurrentUser = {
    name: 'James Collison',
    email: 'Preline@HS',
    initials: 'JC',
    avatarColor: '#0ea5e9'
  };

  private readonly _customers = signal<Customer[]>([
    { id: 1, companyName: 'Tech Solutions Inc',      contactName: 'John Smith',      email: 'john@techsolutions.com',    phone: '0412 345 678', type: 'Regular' },
    { id: 2, companyName: 'Retail Masters',          contactName: 'Michael Brown',   email: 'mbrown@retailmasters.com',  phone: '0423 456 789', type: 'Regular' },
    { id: 3, companyName: 'Wilson Enterprises',      contactName: 'James Wilson',    email: 'jwilson@wilson.com.au',     phone: '0434 567 890', type: 'Regular' },
    { id: 4, companyName: 'Anderson & Co',           contactName: 'David Anderson',  email: 'david@andersonco.com.au',   phone: '0445 678 901', type: 'Regular' },
    { id: 5, companyName: 'Thomas Industries',       contactName: 'Robert Thomas',   email: 'rthomas@thomasind.com.au',  phone: '0456 789 012', type: 'Regular' },
    { id: 6, companyName: 'Green Valley Healthcare', contactName: 'Sarah Johnson',   email: 'sarah@greenvalley.com.au',  phone: '0467 890 123', type: 'VIP' },
    { id: 7, companyName: 'Summit Construction',     contactName: 'Michael Chen',    email: 'mchen@summitconstruct.com', phone: '0478 901 234', type: 'VIP' },
    { id: 8, companyName: 'Riverside Primary School',contactName: 'Emma Wilson',     email: 'ewilson@riverside.edu.au',  phone: '0489 012 345', type: 'Wholesale' },
    { id: 9, companyName: 'Brown & Associates Law',  contactName: 'David Brown',     email: 'dbrown@brownlaw.com.au',    phone: '0490 123 456', type: 'Wholesale' },
    { id: 10,companyName: 'Fitness First Gym',       contactName: 'Lisa Anderson',   email: 'landerson@fitnessfirst.com',phone: '0401 234 567', type: 'Regular' },
    { id: 11,companyName: 'Taylor Motors',           contactName: 'James Taylor',    email: 'jtaylor@taylormotors.com',  phone: '0412 345 670', type: 'VIP' },
    { id: 12,companyName: 'City Hospital',           contactName: 'Patricia Moore',  email: 'pmoore@cityhospital.com.au',phone: '0423 456 781', type: 'Wholesale' },
  ]);

  customers = this._customers.asReadonly();

  avatarColor(customer: Customer): string {
    return AVATAR_COLORS[(customer.id - 1) % AVATAR_COLORS.length];
  }

  initials(customer: Customer): string {
    const parts = customer.contactName.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  search(query: string): Customer[] {
    const q = query.toLowerCase().trim();
    if (!q) return this._customers();
    return this._customers().filter(c =>
      c.companyName.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    );
  }

  groupedByType(customers: Customer[]): { type: string; items: Customer[] }[] {
    const order = ['Regular', 'VIP', 'Wholesale'];
    const map = new Map<string, Customer[]>();
    for (const c of customers) {
      if (!map.has(c.type)) map.set(c.type, []);
      map.get(c.type)!.push(c);
    }
    return order.filter(t => map.has(t)).map(t => ({ type: t, items: map.get(t)! }));
  }
}
