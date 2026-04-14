// ZATCA Saudi Tax Authority requires a very specific Tag-Length-Value (TLV) encoding, 
// converted into a Base64 string, before generating the QR code.
export function generateZatcaTlvBase64(
    sellerName: string,
    vatRegistrationNumber: string,
    timestamp: string, // ISO format
    invoiceTotal: string,
    vatTotal: string
  ) {
    // Helper to generate a TLV buffer sequence
    const getTlv = (tag: number, value: string) => {
      const valueBuffer = Buffer.from(value, 'utf8')
      const tagBuffer = Buffer.from([tag])
      const lengthBuffer = Buffer.from([valueBuffer.length])
      return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer])
    }
  
    // ZATCA exact tag sequence: 1=Seller, 2=VAT_No, 3=Time, 4=Total, 5=VAT
    return Buffer.concat([
      getTlv(1, sellerName),
      getTlv(2, vatRegistrationNumber),
      getTlv(3, timestamp),
      getTlv(4, invoiceTotal),
      getTlv(5, vatTotal)
    ]).toString('base64')
  }

/**
 * ==========================================
 * ZATCA Phase 2: UBL 2.1 XML Generator 
 * ==========================================
 * This function constructs the official UBL 2.1 XML structure for a B2C Simplified Tax Invoice.
 * In a fully deployed Phase 2 environment, this raw XML is canonicalized and cryptographically 
 * signed (ECDSA-SHA256) using the station's certificate before API transmission.
 */
export function generateZatcaUblXml(
  invoiceDetails: {
    uuid: string,
    invoiceNumber: string,
    issueDate: string, // YYYY-MM-DD
    issueTime: string, // HH:MM:SS
    totalAmount: number,
    netAmount: number,
    vatAmount: number,
    fuelName: string,
    quantity: number,
    unitPrice: number
  }
) {
  const { uuid, invoiceNumber, issueDate, issueTime, totalAmount, netAmount, vatAmount, fuelName, quantity, unitPrice } = invoiceDetails
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <!-- 0200000 = Simplified Tax Invoice (B2C) -->
  <cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">1010010000</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>Q20 Fuel Station LLC</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>King Fahd Road</cbc:StreetName>
        <cbc:BuildingNumber>1234</cbc:BuildingNumber>
        <cbc:CityName>Riyadh</cbc:CityName>
        <cbc:PostalZone>12211</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>300000000000003</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Q20 Fuel Station LLC</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- B2C Simplified Invoices do not require detailed Buyer info -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Delivery info -->
  <cac:Delivery>
    <cbc:ActualDeliveryDate>${issueDate}</cbc:ActualDeliveryDate>
  </cac:Delivery>

  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>10</cbc:PaymentMeansCode> <!-- 10 = In Cash -->
  </cac:PaymentMeans>

  <!-- Tax Total (VAT at 15%) -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${vatAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${netAmount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Legal Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${netAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${netAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${totalAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Fuel Dispensed Line Item -->
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="LTR">${quantity.toFixed(2)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${netAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="SAR">${vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="SAR">${totalAmount.toFixed(2)}</cbc:RoundingAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${fuelName}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="SAR">${unitPrice.toFixed(2)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="LTR">1.0</cbc:BaseQuantity>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`
}
