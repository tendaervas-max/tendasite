import type { Product } from "../types";

export type VariacaoKit = { nome: string; quantidade: number; preco: number };

export const variacoesKit = (produto: Product): VariacaoKit[] =>
  produto.category === "Kits" ? produto.kit_variacoes || [] : [];

export const quantidadePorOpcao = (produto: Product, opcao?: string) =>
  variacoesKit(produto).find(v => v.nome === opcao)?.quantidade || 1;

export const precoPorOpcao = (produto: Product, opcao?: string) =>
  variacoesKit(produto).find(v => v.nome === opcao)?.preco ?? produto.price;
