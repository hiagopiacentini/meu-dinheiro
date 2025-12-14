
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
  isCreditCard?: boolean; // New flag to identify credit card accounts
  imageUrl?: string;
  order?: number; // Field to control the display order
  cards?: { id: string; name: string }[];
}

// For the 3-level categories
export interface CategoryItem {
  id: string;
  name: string;
  subcategoryId: string;
  categoryId: string;
  includeInBalance: boolean;
  isFixed?: boolean; // New flag to mark expense as Fixed or Variable
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
  
  splitGroupId?: string; // ID to link split transactions together
  
  createdAt?: string; // Timestamp ISO string of when the record was created
  cardId?: string | null;
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
  partialSettlements?: { transactionId: string; amount: number; date: string }[];
}

// Add AnnualGoals type to be shared across components.
export interface AnnualGoals {
  [year: string]: number;
}

export interface YieldEntry {
  id: string;
  date: string;
  amount: number;
  transactionId?: string; // Para poder editar/excluir a transação financeira associada
}

export interface CDBContract {
  id: string;
  name: string; // nome_cdb
  bank: string; // banco_corretora
  applicationDate: string; // data_aplicacao
  principalAmount: number; // valor_aplicado_principal
  rateDescription: string; // taxa_rendimento
  maturityDate?: string; // data_vencimento
  currentGrossBalance: number; // saldo_bruto_atual
  isActive: boolean;
  initialTransactionId?: string; // ID da transação que criou o investimento
  yieldHistory?: YieldEntry[]; // Histórico de rendimentos lançados
}
