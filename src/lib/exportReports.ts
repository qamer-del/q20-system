// @ts-ignore
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
// @ts-ignore
import jsPDF from "jspdf"
// @ts-ignore
import autoTable from "jspdf-autotable"

/**
 * ==========================================
 * EXCEL EXPORT (ZATCA Compliant)
 * ==========================================
 */
export async function generateFinancialExcel(data: any) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = data.stationName
  workbook.created = new Date()

  // 1. Income Statement Sheet
  const isSheet = workbook.addWorksheet("Income Statement")
  isSheet.columns = [
    { header: "Account Name", key: "name", width: 40 },
    { header: "Account Code", key: "code", width: 20 },
    { header: "Amount (SAR)", key: "amount", width: 25 },
  ]
  
  // Style headers
  isSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
  isSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }

  isSheet.addRow({ name: "REVENUE" }).font = { bold: true }
  data.revenues.forEach((r: any) => isSheet.addRow({ name: r.name, code: r.code, amount: r.balance }))
  isSheet.addRow({ name: "Total Revenue", amount: data.totalRevenue }).font = { bold: true, color: { argb: "FF16A34A" } }
  
  isSheet.addRow([]) // Spacer
  
  isSheet.addRow({ name: "EXPENSES" }).font = { bold: true }
  data.expenses.forEach((e: any) => isSheet.addRow({ name: e.name, code: e.code, amount: e.balance }))
  isSheet.addRow({ name: "Total Expenses", amount: data.totalExpense }).font = { bold: true, color: { argb: "FFE11D48" } }

  isSheet.addRow([]) // Spacer
  const niRow = isSheet.addRow({ name: "NET INCOME", amount: data.netIncome })
  niRow.font = { bold: true, size: 14 }
  niRow.getCell("amount").numFmt = '#,##0.00'

  // 2. VAT Report Sheet
  const vatSheet = workbook.addWorksheet("VAT Report")
  vatSheet.columns = [
    { header: "Description", key: "desc", width: 40 },
    { header: "Amount (SAR)", key: "amount", width: 25 },
  ]
  vatSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
  vatSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }

  vatSheet.addRow({ desc: "VAT Collected on Sales (Output Tax)", amount: data.vatPayable })
  vatSheet.addRow({ desc: "VAT Paid on Purchases (Input Tax)", amount: data.vatReceivable })
  
  const vatRow = vatSheet.addRow({ 
    desc: data.netVatOwed >= 0 ? "Net VAT Payable to ZATCA" : "Net VAT Refund Claimable", 
    amount: Math.abs(data.netVatOwed) 
  })
  vatRow.font = { bold: true, color: { argb: "FF0284C7" } }

  // 3. Zakat Calc Sheet
  const zakatSheet = workbook.addWorksheet("Zakat Declaration")
  zakatSheet.columns = [
    { header: "Category", key: "category", width: 40 },
    { header: "Amount (SAR)", key: "amount", width: 25 },
  ]
  zakatSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
  zakatSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }

  zakatSheet.addRow({ category: "Current Assets", amount: data.zakatData.currentAssets })
  zakatSheet.addRow({ category: "Less: Current Liabilities", amount: -data.zakatData.currentLiabilities })
  if (data.zakatData.equity > 0) {
    zakatSheet.addRow({ category: "Equity", amount: data.zakatData.equity })
  }
  
  zakatSheet.addRow([])
  const baseRow = zakatSheet.addRow({ category: "Zakatable Base", amount: data.zakatData.zakatBase })
  baseRow.font = { bold: true }

  zakatSheet.addRow({ category: "Estimated Zakat Due (Hijri 2.5%)", amount: data.zakatData.zakatDueHijri })
  const finalZakatRow = zakatSheet.addRow({ category: "Estimated Zakat Due (Gregorian ≈2.578%)", amount: data.zakatData.zakatDueGregorian })
  finalZakatRow.font = { bold: true, color: { argb: "FFD97706" } }

  // Format all numbers
  workbook.eachSheet((sheet: any) => {
    sheet.getColumn("amount").numFmt = '#,##0.00'
  })

  // Export buffer
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  saveAs(blob, `Financial_Report_${data.stationName}_${new Date().toISOString().split('T')[0]}.xlsx`)
}


/**
 * ==========================================
 * PDF EXPORT (ZATCA Compliant)
 * ==========================================
 */
export async function generateFinancialPDF(data: any) {
  const doc = new jsPDF()
  
  // Custom font size and styles
  const pageWidth = doc.internal.pageSize.width
  
  // Header
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text(data.stationName, pageWidth / 2, 20, { align: "center" })
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("Official Financial Position Report", pageWidth / 2, 28, { align: "center" })
  doc.text(`Generated On: ${data.dateGenerated}`, pageWidth / 2, 34, { align: "center" })
  
  let currentY = 45

  // --- INCOME STATEMENT ---
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Income Statement", 14, currentY)
  currentY += 8

  autoTable(doc, {
    startY: currentY,
    head: [['Account Name', 'Code', 'Amount (SAR)']],
    body: [
      ...data.revenues.map((r: any) => [r.name, r.code, r.balance.toFixed(2)]),
      ['Total Revenue', '', data.totalRevenue.toFixed(2)],
      ...data.expenses.map((e: any) => [e.name, e.code, e.balance.toFixed(2)]),
      ['Total Expenses', '', data.totalExpense.toFixed(2)],
      ['Net Income', '', data.netIncome.toFixed(2)]
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 2: { halign: 'right' } },
    willDrawCell: (hookData: any) => {
      if (hookData.section === 'body') {
        const textStr = Array.isArray(hookData.cell.raw) ? hookData.cell.raw[0]?.toString() : hookData.cell.raw?.toString() || ""
        if (textStr.includes('Total') || textStr.includes('Net Income')) {
          doc.setFont("helvetica", "bold")
        }
      }
    }
  })

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 15

  // --- VAT REPORT ---
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("VAT Summary (ZATCA Standard)", 14, currentY)
  currentY += 8

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Amount (SAR)']],
    body: [
      ['VAT Collected on Sales (Output Tax)', data.vatPayable.toFixed(2)],
      ['VAT Paid on Purchases (Input Tax)', data.vatReceivable.toFixed(2)],
      [data.netVatOwed >= 0 ? 'Net VAT Payable to ZATCA' : 'Net VAT Refund Claimable', Math.abs(data.netVatOwed).toFixed(2)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 1: { halign: 'right' } },
    willDrawCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.row.index === 2) {
        doc.setFont("helvetica", "bold")
        doc.setTextColor(2, 132, 199) // Sky blue
      }
    }
  })

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 15

  // Prevent overlap for Zakat
  if (currentY > 250) {
    doc.addPage()
    currentY = 20
  }

  // --- ZAKAT DECLARATION ---
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Official Zakat Declaration", 14, currentY)
  currentY += 8

  autoTable(doc, {
    startY: currentY,
    head: [['Category', 'Amount (SAR)']],
    body: [
      ['Current Assets', data.zakatData.currentAssets.toFixed(2)],
      ['Less: Current Liabilities', '-' + data.zakatData.currentLiabilities.toFixed(2)],
      ...(data.zakatData.equity > 0 ? [['Equity', data.zakatData.equity.toFixed(2)]] : []),
      ['Zakatable Base', data.zakatData.zakatBase.toFixed(2)],
      ['Estimated Zakat Due (Hijri 2.5%)', data.zakatData.zakatDueHijri.toFixed(2)],
      ['Estimated Zakat Due (Gregorian ≈2.578%)', data.zakatData.zakatDueGregorian.toFixed(2)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 1: { halign: 'right' } },
    willDrawCell: (hookData: any) => {
      if (hookData.section === 'body') {
        const textStr = Array.isArray(hookData.cell.raw) ? hookData.cell.raw[0]?.toString() : hookData.cell.raw?.toString() || ""
        if (textStr.includes('Base') || textStr.includes('Gregorian')) {
          doc.setFont("helvetica", "bold")
        }
      }
    }
  })

  // Footer / Signature line
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.text("Certified by Q20 Central Management Engine", pageWidth / 2, pageHeight - 20, { align: "center" })
  doc.text("Authorized Signature ______________________", pageWidth / 2, pageHeight - 10, { align: "center" })

  doc.save(`Financial_Report_${data.stationName}_${new Date().toISOString().split('T')[0]}.pdf`)
}
