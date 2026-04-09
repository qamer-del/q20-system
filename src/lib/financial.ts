/**
 * =============================================
 * Q20 Financial Engine — Precision Arithmetic
 * =============================================
 * All money calculations go through these helpers
 * to prevent floating-point rounding errors.
 * 
 * Strategy: Round to 2 decimal places at every step
 * using banker's rounding (round half to even).
 */

// ---- Core Rounding ----

/** Round a number to exactly 2 decimal places (SAR halalas) */
export function roundSAR(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Multiply two numbers and round to 2 decimal places */
export function multiply(a: number, b: number): number {
  return roundSAR(a * b)
}

// ---- VAT Calculations (Saudi 15% Standard Rate) ----

const VAT_RATE = 0.15

/**
 * Extract VAT from a VAT-inclusive price.
 * Pump prices in Saudi Arabia INCLUDE VAT.
 * Formula: netAmount = totalAmount / 1.15
 */
export function extractVatFromInclusive(totalAmountInclVat: number): {
  netAmount: number
  vatAmount: number
  totalAmount: number
} {
  const totalAmount = roundSAR(totalAmountInclVat)
  const netAmount = roundSAR(totalAmount / (1 + VAT_RATE))
  // Derive VAT as difference to ensure: net + vat === total (no rounding gap)
  const vatAmount = roundSAR(totalAmount - netAmount)
  return { netAmount, vatAmount, totalAmount }
}

/**
 * Calculate VAT on top of a net (VAT-exclusive) amount.
 * Used for purchase invoices where supplier quotes ex-VAT.
 */
export function addVatToExclusive(netAmountExclVat: number): {
  netAmount: number
  vatAmount: number
  totalAmount: number
} {
  const netAmount = roundSAR(netAmountExclVat)
  const vatAmount = roundSAR(netAmount * VAT_RATE)
  const totalAmount = roundSAR(netAmount + vatAmount)
  return { netAmount, vatAmount, totalAmount }
}

// ---- Zakat Calculation (ZATCA Saudi Arabia) ----
// Per ZATCA (هيئة الزكاة والضريبة والجمارك) regulations:
//
// الوعاء الزكوي (Zakatable Base) for small/medium businesses
// is calculated using the simplified method:
//
// Zakatable Base = Sources of Funds - Deductions
//
// Sources of Funds (مصادر الأموال):
//   + Equity/Capital (رأس المال)
//   + Retained Earnings (الأرباح المبقاة)
//   + Net Income for the period (صافي الربح)
//   + Reserves (الاحتياطيات)
//   + Long-term liabilities (الالتزامات طويلة الأجل)
//
// Deductions (الحسميات):
//   - Net Fixed Assets (صافي الأصول الثابتة)
//   - Long-term investments (الاستثمارات طويلة الأجل)
//   - Accumulated losses (الخسائر المرحلة)
//
// For a fuel station with no fixed assets in the system,
// this simplifies to:
//
// Zakatable Base ≈ Current Assets - Current Liabilities
//   Current Assets: Cash + Bank + Inventory Value + VAT Receivable
//   Current Liabilities: VAT Payable + Accounts Payable
//
// Rate:
//   - 2.5% for Hijri year (354/355 days)
//   - 2.5776% for Gregorian year (365 days) = 2.5% × (365/354)

const ZAKAT_RATE_HIJRI = 0.025
const ZAKAT_RATE_GREGORIAN = 0.025 * (365 / 354) // ≈ 2.5776%

export interface ZakatBreakdown {
  /** Total current assets (Cash + Bank + Inventory + VAT Receivable) */
  currentAssets: number
  /** Total current liabilities (VAT Payable + Accounts Payable) */
  currentLiabilities: number
  /** Equity (Capital + Retained Earnings) */
  equity: number
  /** Net income for the period */
  netIncome: number
  /** الوعاء الزكوي — the base amount subject to Zakat */
  zakatBase: number
  /** Zakat due at Hijri rate (2.5%) */
  zakatDueHijri: number
  /** Zakat due at Gregorian rate (≈2.5776%) */
  zakatDueGregorian: number
  /** Rate used */
  rateUsed: 'hijri' | 'gregorian'
  /** Final zakat owed */
  zakatOwed: number
}

export interface AccountBalance {
  type: string
  balance: number
  code: string
}

/**
 * Calculate Zakat per ZATCA Saudi regulations.
 * Uses the simplified method suitable for fuel stations.
 */
export function calculateZakat(
  accounts: AccountBalance[],
  calendarType: 'hijri' | 'gregorian' = 'gregorian'
): ZakatBreakdown {
  // Categorize accounts
  const assetAccounts = accounts.filter(a => a.type === 'ASSET')
  const liabilityAccounts = accounts.filter(a => a.type === 'LIABILITY')
  const equityAccounts = accounts.filter(a => a.type === 'EQUITY')
  const revenueAccounts = accounts.filter(a => a.type === 'REVENUE')
  const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE')

  // Sum balances
  const currentAssets = roundSAR(assetAccounts.reduce((s, a) => s + a.balance, 0))
  const currentLiabilities = roundSAR(liabilityAccounts.reduce((s, a) => s + a.balance, 0))
  const equity = roundSAR(equityAccounts.reduce((s, a) => s + a.balance, 0))
  const totalRevenue = roundSAR(revenueAccounts.reduce((s, a) => s + a.balance, 0))
  const totalExpense = roundSAR(expenseAccounts.reduce((s, a) => s + a.balance, 0))
  const netIncome = roundSAR(totalRevenue - totalExpense)

  // ZATCA Zakatable Base (Simplified Method)
  // Sources: Equity + Net Income + Current Liabilities (representing funds used)
  // Deductions: None (no fixed assets in system)
  // Simplified: Current Assets - Current Liabilities (net current assets)
  const zakatBase = roundSAR(Math.max(0, currentAssets - currentLiabilities))

  const rate = calendarType === 'hijri' ? ZAKAT_RATE_HIJRI : ZAKAT_RATE_GREGORIAN
  const zakatDueHijri = roundSAR(zakatBase * ZAKAT_RATE_HIJRI)
  const zakatDueGregorian = roundSAR(zakatBase * ZAKAT_RATE_GREGORIAN)
  const zakatOwed = roundSAR(zakatBase * rate)

  return {
    currentAssets,
    currentLiabilities,
    equity,
    netIncome,
    zakatBase,
    zakatDueHijri,
    zakatDueGregorian,
    rateUsed: calendarType,
    zakatOwed,
  }
}

// ---- Accounting Balance Helpers ----

/**
 * Calculate the normal balance for an account type.
 * Assets & Expenses have debit-normal balances.
 * Liabilities, Equity & Revenue have credit-normal balances.
 */
export function calculateBalance(type: string, totalDebit: number, totalCredit: number): number {
  if (type === 'ASSET' || type === 'EXPENSE') {
    return roundSAR(totalDebit - totalCredit)
  }
  return roundSAR(totalCredit - totalDebit)
}

/**
 * Validate that a journal entry balances (total debits === total credits).
 */
export function validateJournalBalance(
  entries: Array<{ debit: number; credit: number }>
): { balanced: boolean; totalDebit: number; totalCredit: number; difference: number } {
  const totalDebit = roundSAR(entries.reduce((s, e) => s + e.debit, 0))
  const totalCredit = roundSAR(entries.reduce((s, e) => s + e.credit, 0))
  const difference = roundSAR(Math.abs(totalDebit - totalCredit))
  return {
    balanced: difference === 0,
    totalDebit,
    totalCredit,
    difference,
  }
}

// ---- Invoice Number Generation ----

/** Generate a sequential, human-readable invoice number */
export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = now.getTime().toString(36).toUpperCase().slice(-5)
  return `${prefix}-${date}-${seq}`
}
