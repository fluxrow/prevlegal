import * as xlsx from 'xlsx'

function inspect() {
    const listPath = "/Users/cauafarias/Documents/Documentos - MacBook Air de Cauã/Fluxrow/NOMES RJ BNG.xlsx"
    const workbook = xlsx.readFile(listPath)
    const sheetName = workbook.SheetNames[0]
    const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName])

    console.log("Headers encontrados:")
    if (rows.length > 0) {
        console.log(Object.keys(rows[0]))
        console.log("\nPrimeira linha amostra:")
        console.log(rows[0])
    }
}
inspect()
