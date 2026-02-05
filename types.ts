
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
  isCreditCard?: boolean; 
  imageUrl?: string;
  order?: number; 
  cards?: { id: string; name: string; initialBalance?: number }[];
}

export interface CategoryItem {
  id: string;
  name: string;
  subcategoryId: string;
  categoryId: string;
  includeInBalance: boolean;
  isFixed?: boolean; 
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
  accountId: string; 
  destinationAccountId?: string; 
  itemId?: string;
  
  installmentGroupId?: string;
  currentInstallment?: number;
  totalInstallments?: number;
  
  splitGroupId?: string; 
  linkedGroupId?: string; 
  
  createdAt?: string; 
  cardId?: string | null;
}

export interface Loan {
  id:string;
  description: string;
  amount: number;
  date: string;
  lenderAccountId: string; 
  borrowerAccountId: string; 
  status: 'active' | 'paid';
  initialTransactionId: string; 
  settlementTransactionId?: string; 
  partialSettlements?: { transactionId: string; amount: number; date: string }[];
}

export interface AnnualGoals {
  [year: string]: number;
}

export interface ManualSavings {
  [year: string]: {
    [month: string]: number;
  }
}

export interface MonthlyForecasts {
  [year: string]: {
    [month: string]: number;
  }
}

export interface ItemBudgets {
  [year: string]: {
    [month: string]: {
      [itemId: string]: number;
    }
  }
}

export interface ReportNote {
  id: string;
  monthKey: string; // Formato YYYY-MM
  text: string;
  createdAt: string;
}

export interface ReportNotes {
  list: ReportNote[];
}

export interface YieldEntry {
  id: string;
  date: string;
  amount: number;
  transactionId?: string; 
}

export interface CDBContract {
  id: string;
  name: string; 
  bank: string; 
  applicationDate: string; 
  principalAmount: number; 
  rateDescription: string; 
  maturityDate?: string | null; 
  currentGrossBalance: number; 
  isActive: boolean;
  initialTransactionId?: string; 
  yieldHistory?: YieldEntry[]; 
  linkedAccountId: string; 
}
