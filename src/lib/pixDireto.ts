// QR Pix estático no padrão BR Code (Banco Central), sem intermediário.
// Não é uma cobrança dinâmica/API bancária: o status continua aguardando
// até que a loja confirme o recebimento diretamente no extrato Nu Empresas.
import { qrcodegen } from './vendor/qrcodegen';

function campo(id: string, valor: string): string {
  if (valor.length > 99) throw new Error('Campo PIX muito longo');
  return id + String(valor.length).padStart(2, '0') + valor;
}

function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function gerarPixCopiaCola(chavePix: string, valor: number, pedidoId: number): string {
  const chave = chavePix.trim();
  if (!chave || chave.length > 77 || !Number.isFinite(valor) || valor <= 0 ||
    !Number.isSafeInteger(pedidoId) || pedidoId <= 0)
    throw new Error('Informações de cobrança PIX inválidas');
  // TXID do BR Code estático limitado a 25 caracteres alfanuméricos.
  const txid = 'TENDA' + String(pedidoId);
  if (txid.length > 25) throw new Error('Identificador PIX muito longo');
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  const base = campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valor.toFixed(2)) +
    campo('58', 'BR') +
    campo('59', 'TENDA ERVAS') +
    campo('60', 'GUARULHOS') +
    campo('62', campo('05', txid)) +
    '6304';
  return base + crc16(base);
}

export function gerarQrPix(codigo: string): { tamanho: number; quadrados: {x:number;y:number}[] } {
  const qr = qrcodegen.QrCode.encodeText(codigo, qrcodegen.QrCode.Ecc.MEDIUM);
  const quadrados: {x:number;y:number}[] = [];
  for (let y = 0; y < qr.size; y++)
    for (let x = 0; x < qr.size; x++)
      if (qr.getModule(x, y)) quadrados.push({x,y});
  return { tamanho: qr.size, quadrados };
}
