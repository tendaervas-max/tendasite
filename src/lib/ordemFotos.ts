export function ordenarFotos<T extends { id: string }>(fotos: T[], ordem: string[]): T[] {
  const restantes = new Map(fotos.map(foto => [foto.id, foto]));
  const resultado: T[] = [];
  for (const id of ordem) {
    const foto = restantes.get(id);
    if (foto) { resultado.push(foto); restantes.delete(id); }
  }
  return [...resultado, ...restantes.values()];
}

export function moverFoto(ids: string[], origem: string, destino: string): string[] {
  const de = ids.indexOf(origem), para = ids.indexOf(destino);
  if (de < 0 || para < 0 || de === para) return ids;
  const nova = [...ids];
  nova.splice(de, 1);
  nova.splice(para, 0, origem);
  return nova;
}
