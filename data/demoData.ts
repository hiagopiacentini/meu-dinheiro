
import { Account, Transaction, Category, Loan, AnnualGoals, TransactionType } from '../types';

export const sampleAccounts: Account[] = [
    { id: 'nubank-demo', name: 'Nubank - NuConta', initialBalance: 5200.75, bank: 'Nubank', isActive: true },
    { id: 'itau-demo', name: 'Itaú - Conta Corrente', initialBalance: 15340.21, bank: 'Itaú', isActive: true },
    { id: 'inter-demo', name: 'Inter - Conta Digital', initialBalance: 8750.00, bank: 'Inter', isActive: true },
    { id: 'caixa-demo', name: 'Caixa - Poupança', initialBalance: 25000.00, bank: 'Caixa', isActive: true },
];

export const sampleCategories: Category[] = [
    { id: 'c1', name: 'Receitas', type: TransactionType.INCOME, color: '#22c55e', subcategories: [
        { id: 'sc1', name: 'Salário e Renda', categoryId: 'c1', items: [
            { id: 'i1', name: 'Salário', subcategoryId: 'sc1', categoryId: 'c1', includeInBalance: true },
            { id: 'i2', name: 'Renda Extra', subcategoryId: 'sc1', categoryId: 'c1', includeInBalance: true },
            { id: 'i3', name: 'Aluguel Recebido', subcategoryId: 'sc1', categoryId: 'c1', includeInBalance: true },
        ]}
    ]},
    { id: 'c2', name: 'Moradia', type: TransactionType.EXPENSE, color: '#f97316', subcategories: [
        { id: 'sc2', name: 'Contas', categoryId: 'c2', items: [
            { id: 'i4', name: 'Aluguel', subcategoryId: 'sc2', categoryId: 'c2', includeInBalance: true, isFixed: true },
            { id: 'i5', name: 'Condomínio', subcategoryId: 'sc2', categoryId: 'c2', includeInBalance: true, isFixed: true },
            { id: 'i6', name: 'Luz', subcategoryId: 'sc2', categoryId: 'c2', includeInBalance: true, isFixed: true },
            { id: 'i7', name: 'Água', subcategoryId: 'sc2', categoryId: 'c2', includeInBalance: true, isFixed: true },
            { id: 'i8', name: 'Gás', subcategoryId: 'sc2', categoryId: 'c2', includeInBalance: true, isFixed: true },
            { id: 'i9', name: 'Internet', subcategoryId: 'sc2', categoryId: 'c2', includeInBalance: true, isFixed: true },
        ]}
    ]},
    { id: 'c3', name: 'Alimentação', type: TransactionType.EXPENSE, color: '#ef4444', subcategories: [
        { id: 'sc3', name: 'Dia a dia', categoryId: 'c3', items: [
            { id: 'i10', name: 'Supermercado', subcategoryId: 'sc3', categoryId: 'c3', includeInBalance: true, isFixed: false },
            { id: 'i11', name: 'Restaurante', subcategoryId: 'sc3', categoryId: 'c3', includeInBalance: true, isFixed: false },
            { id: 'i12', name: 'Delivery / iFood', subcategoryId: 'sc3', categoryId: 'c3', includeInBalance: true, isFixed: false },
        ]}
    ]},
    { id: 'c4', name: 'Transporte', type: TransactionType.EXPENSE, color: '#8b5cf6', subcategories: [
        { id: 'sc4', name: 'Veículo', categoryId: 'c4', items: [
            { id: 'i13', name: 'Combustível', subcategoryId: 'sc4', categoryId: 'c4', includeInBalance: true, isFixed: false },
            { id: 'i14', name: 'Manutenção', subcategoryId: 'sc4', categoryId: 'c4', includeInBalance: true, isFixed: false },
        ]},
        { id: 'sc5', name: 'Público', categoryId: 'c4', items: [
            { id: 'i15', name: 'Uber / 99', subcategoryId: 'sc5', categoryId: 'c4', includeInBalance: true, isFixed: false },
            { id: 'i16', name: 'Ônibus / Metrô', subcategoryId: 'sc5', categoryId: 'c4', includeInBalance: true, isFixed: false },
        ]}
    ]},
    { id: 'c5', name: 'Lazer', type: TransactionType.EXPENSE, color: '#ec4899', subcategories: [
        { id: 'sc6', name: 'Serviços', categoryId: 'c5', items: [
            { id: 'i17', name: 'Streaming (Netflix, etc)', subcategoryId: 'sc6', categoryId: 'c5', includeInBalance: true, isFixed: true },
            { id: 'i18', name: 'Cinema / Shows', subcategoryId: 'sc6', categoryId: 'c5', includeInBalance: true, isFixed: false },
        ]},
        { id: 'sc7', name: 'Compras', categoryId: 'c5', items: [
            { id: 'i19', name: 'Roupas e Acessórios', subcategoryId: 'sc7', categoryId: 'c5', includeInBalance: true, isFixed: false },
            { id: 'i20', name: 'Eletrônicos', subcategoryId: 'sc7', categoryId: 'c5', includeInBalance: true, isFixed: false },
        ]}
    ]},
    { id: 'c6', name: 'Movimentações', type: TransactionType.EXPENSE, color: '#64748b', subcategories: [
        { id: 'sc8', name: 'Transferências', categoryId: 'c6', items: [
            { id: 'i21', name: 'Transferência entre contas', subcategoryId: 'sc8', categoryId: 'c6', includeInBalance: false },
        ]}
    ]}
];

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

const getDateFor = (monthOffset: number, day: number) => {
    const d = new Date(currentYear, currentMonth - monthOffset, day);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
};

export const sampleTransactions: Transaction[] = [
    // Two months ago
    { id: 't-demo-1', description: 'Salário Empresa XYZ', amount: 9500, date: getDateFor(2, 5), type: TransactionType.INCOME, accountId: 'itau-demo', itemId: 'i1' },
    { id: 't-demo-2', description: 'Aluguel Apto', amount: 2800, date: getDateFor(2, 7), type: TransactionType.EXPENSE, accountId: 'itau-demo', itemId: 'i4' },
    { id: 't-demo-3', description: 'Supermercado Pão de Açúcar', amount: 850.45, date: getDateFor(2, 10), type: TransactionType.EXPENSE, accountId: 'nubank-demo', itemId: 'i10' },
    { id: 't-demo-4', description: 'Conta de Luz - Enel', amount: 210.80, date: getDateFor(2, 15), type: TransactionType.EXPENSE, accountId: 'itau-demo', itemId: 'i6' },
    { id: 't-demo-5', description: 'Netflix', amount: 55.90, date: getDateFor(2, 18), type: TransactionType.EXPENSE, accountId: 'nubank-demo', itemId: 'i17' },
    { id: 't-demo-6', description: 'Jantar Outback', amount: 280.00, date: getDateFor(2, 22), type: TransactionType.EXPENSE, accountId: 'nubank-demo', itemId: 'i11' },

    // Last month
    { id: 't-demo-7', description: 'Salário Empresa XYZ', amount: 9500, date: getDateFor(1, 5), type: TransactionType.INCOME, accountId: 'itau-demo', itemId: 'i1' },
    { id: 't-demo-8', description: 'Freelance Website', amount: 1200, date: getDateFor(1, 8), type: TransactionType.INCOME, accountId: 'inter-demo', itemId: 'i2' },
    { id: 't-demo-9', description: 'Aluguel Apto', amount: 2800, date: getDateFor(1, 7), type: TransactionType.EXPENSE, accountId: 'itau-demo', itemId: 'i4' },
    { id: 't-demo-10', description: 'Supermercado Carrefour', amount: 670.15, date: getDateFor(1, 11), type: TransactionType.EXPENSE, accountId: 'nubank-demo', itemId: 'i10' },
    { id: 't-demo-11', description: 'Uber Viagem', amount: 45.50, date: getDateFor(1, 14), type: TransactionType.EXPENSE, accountId: 'nubank-demo', itemId: 'i15' },
    { id: 't-demo-12', description: 'Compra Online - Amazon', amount: 350.00, date: getDateFor(1, 20), type: TransactionType.EXPENSE, accountId: 'inter-demo', itemId: 'i20' },
    { id: 't-demo-13', description: 'Transferência para Poupança', amount: 2000, date: getDateFor(1, 25), type: TransactionType.EXPENSE, accountId: 'itau-demo', destinationAccountId: 'caixa-demo', itemId: 'i21' },
    
    // Installment from last month
    { id: 't-demo-inst-1', description: 'Celular Novo (1/12)', amount: 416.58, date: getDateFor(1, 28), type: TransactionType.EXPENSE, accountId: 'nubank-demo', itemId: 'i20', installmentGroupId: 'inst-1', currentInstallment: 1, totalInstallments: 12 },

    // This month
    { id: 't-demo-14', description: 'Salário Empresa XYZ', amount: 9500, date: getDateFor(0, 5), type: TransactionType.INCOME, accountId: 'itau-demo', itemId: 'i1' },
    { id: 't-demo-15', description: 'Aluguel Apto', amount: 2800, date: getDateFor(0, 7), type: TransactionType.EXPENSE, accountId: 'itau-demo', itemId: 'i4' },
    { id: 't-demo-16', description: 'iFood - Pizza', amount: 89.90, date: getDateFor(0, 9), type: TransactionType.EXPENSE, accountId: 'nubank-demo', itemId: 'i12' },
    
    // Installment for this month
    { id: 't-demo-inst-2', description: 'Celular Novo (2/12)', amount: 416.58, date: getDateFor(0, 28), type: TransactionType.EXPENSE, accountId: 'nubank-demo', itemId: 'i20', installmentGroupId: 'inst-1', currentInstallment: 2, totalInstallments: 12 },
    // Future installments
    ...Array.from({ length: 10 }, (_, i) => ({
        id: `t-demo-inst-${i + 3}`,
        description: `Celular Novo (${i + 3}/12)`,
        amount: 416.58,
        date: (() => {
            const d = new Date(currentYear, currentMonth + i + 1, 28);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${dayStr}`;
        })(),
        type: TransactionType.EXPENSE as TransactionType,
        accountId: 'nubank-demo',
        itemId: 'i20',
        installmentGroupId: 'inst-1',
        currentInstallment: i + 3,
        totalInstallments: 12
    }))
];

export const sampleLoans: Loan[] = [];

export const sampleGoals: AnnualGoals = {
    [currentYear]: 30000,
    [currentYear - 1]: 25000,
};
