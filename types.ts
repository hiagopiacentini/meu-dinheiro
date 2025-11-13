export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  bank?: string;
  agency?: string;
  accountNumber?: string;
  isActive: boolean;
  imageUrl?: string;
}

// For the 3-level categories
export interface CategoryItem {
  id: string;
  name: string;
  subcategoryId: string;
  categoryId: string;
}

export interface Subcategory {
  id: string;
  name: string;
  items: CategoryItem[];
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  subcategories: Subcategory[];
  color?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  accountId: string; // Source account for transfers
  destinationAccountId?: string; // Destination account for transfers
  itemId?: string;
  
  installmentGroupId?: string;
  currentInstallment?: number;
  totalInstallments?: number;
}

export interface Loan {
  id:string;
  description: string;
  amount: number;
  date: string;
  lenderAccountId: string; // Conta que empresta
  borrowerAccountId: string; // Conta que recebe o empréstimo
  status: 'active' | 'paid';
  initialTransactionId: string; // ID da transferência inicial
  settlementTransactionId?: string; // ID da transferência de quitação
}

// Add AnnualGoals type to be shared across components.
export interface AnnualGoals {
  [year: string]: number;
}