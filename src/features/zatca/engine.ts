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
