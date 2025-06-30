export interface User {
  _id: string;
  email: string;
  name: string;
  hashedPassword: string;
  theme: 'light' | 'dark';
  createdAt: Date;
}

export interface Budget {
  _id: string;
  userId: string;
  name: string;
  description: string;
  totalAmount: number;
  allocatedAmount: number;
  color: string;
  createdAt: Date;
}

export interface Transaction {
  _id: string;
  userId: string;
  budgetId?: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: Date;
  createdAt: Date;
}

export interface AIInsight {
  _id: string;
  userId: string;
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  topCategories: Array<{ category: string; amount: number }>;
  insights: string[];
  recommendations: string[];
  createdAt: Date;
}

export type FilterType = {
  startDate?: Date;
  endDate?: Date;
  budgetId?: string;
  type?: 'income' | 'expense';
  category?: string;
  minAmount?: number;
  maxAmount?: number;
};