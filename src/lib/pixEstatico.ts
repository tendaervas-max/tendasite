/**
 * Pix estático EMV ("copia e cola") com valor e referência do pedido.
 * NÃO cria cobrança no Nubank, NÃO consulta pagamentos e NÃO prova recebimento.
 * O nome e a cidade devem ser conferidos no aplicativo bancário pelo pagador.
 */
const campo = (id: string, valor: string): string => {
  if (valor.length > 99) throw new Error('Campo PIX inválido.');
  return id + String(valor.length).padStart(2, '0') + valor;
};

function crc16Ccitt(dados: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < dados.length; i++) {
    crc ^= dados.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
const ascii = (valor: string, limite: number) => valor.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Za-z0-9 .-]/g, ' ')
  .replace(/\s+/g, ' ').trim().toUpperCase().slice(0, limite);

export function gerarPixCopiaECola(args: {
  chave: string; valor: number; pedidoId: number; nome: string; cidade: string;
}): string {
  const chave = args.chave.replace(/\D/g, '');
  if (!/^\d{14}$/.test(chave)) throw new Error('A chave PIX CNPJ da loja não está configurada corretamente.');
  if (!Number.isFinite(args.valor) || args.valor <= 0 || args.valor > 99999999.99) throw new Error('Valor do pedido inválido.');
  if (!Number.isSafeInteger(args.pedidoId) || args.pedidoId < 1) throw new Error('Identificador do pedido inválido.');
  const nome = ascii(args.nome, 25);
  const cidade = ascii(args.cidade, 15);
  if (!nome || !cidade) throw new Error('Identificação do recebedor incompleta.');

  // Referência usada na cobrança estática; não equivale ao txid verificado pela API Pix do banco.
  const referencia = ('TENDA' + args.pedidoId).slice(0, 25);
  const recebedor = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  const dados = campo('00', '01') + campo('26', recebedor) + campo('52', '0000') +
    campo('53', '986') + campo('54', args.valor.toFixed(2)) + campo('58', 'BR') +
    campo('59', nome) + campo('60', cidade) + campo('62', campo('05', referencia)) + '6304';
  return dados + crc16Ccitt(dados);
}
