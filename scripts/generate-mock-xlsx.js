const XLSX = require('xlsx');
const path = require('path');

function createMockXLSX() {
    // We need an array of arrays representing rows
    // Row 0 is the header (can be anything, API uses index)
    // Indexes:
    // 0: NB, 1: NOME, 3: APS, 6: BANCO, 7: CPF, 9: DIB, 22: TIPO, 25: VALOR_RMA, 43: STATUS, 49: GANHO
    
    // Fill up to index 50 to ensure we have all required columns
    const header = new Array(50).fill('Header');
    
    const row1 = new Array(50).fill('');
    row1[0] = '1234567890'; // NB
    row1[1] = 'João da Silva'; // NOME
    row1[3] = 'Agencia SP'; // APS
    row1[6] = 'Banco do Brasil'; // BANCO
    row1[7] = '12345678901'; // CPF
    row1[9] = '10/05/2020'; // DIB
    row1[22] = 'Aposentadoria'; // TIPO
    row1[25] = '2500,00'; // VALOR_RMA
    row1[43] = 'Ativo'; // STATUS
    row1[49] = '50000,00'; // GANHO
    
    const row2 = new Array(50).fill('');
    row2[0] = '0987654321'; // NB
    row2[1] = 'Maria Souza'; // NOME
    row2[3] = 'Agencia RJ'; // APS
    row2[6] = 'Caixa'; // BANCO
    row2[7] = '09876543210'; // CPF
    row2[9] = '15/08/2022'; // DIB
    row2[22] = 'Pensão'; // TIPO
    row2[25] = '3500,00'; // VALOR_RMA
    row2[43] = 'Cessado'; // STATUS (should be skipped by the importer)
    row2[49] = '20000,00'; // GANHO
    
    const row3 = new Array(50).fill('');
    row3[0] = '1122334455'; // NB
    row3[1] = 'Carlos Especial'; // NOME
    row3[3] = 'Agencia MG'; // APS
    row3[6] = 'Itaú'; // BANCO
    row3[7] = '11122233344'; // CPF
    row3[9] = '01/01/2019'; // DIB
    row3[22] = 'Aposentadoria Especial'; // TIPO
    row3[25] = '8000,00'; // VALOR_RMA
    row3[43] = 'Ativo'; // STATUS
    row3[49] = '150000,00'; // GANHO

    const data = [header, row1, row2, row3];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    const outputPath = path.join(__dirname, '..', 'mock_data.xlsx');
    XLSX.writeFile(wb, outputPath);
    console.log(`Mock XLSX created at: ${outputPath}`);
}

createMockXLSX();
