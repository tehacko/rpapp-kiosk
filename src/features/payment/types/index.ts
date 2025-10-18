// Payment-related types
export interface PaymentFormData {
  email: string;
  paymentMethod: 'qr' | 'thepay';
}

export interface PaymentStep {
  step: number;
  title: string;
  description: string;
}
