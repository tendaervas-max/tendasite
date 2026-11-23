import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const { ordenarFotos, moverFoto } = createRequire(import.meta.url)(resolve(process.argv[2]));
const fotos = [{ id: 'salva-a', url: 'a.jpg', cor: 'Rosa' }, { id: 'salva-b', url: 'b.jpg', cor: 'Azul' }, { id: 'nova:c', url: 'upload-c.jpg', cor: 'Verde' }];
const ordem = moverFoto(fotos.map(f=>f.id), 'nova:c', 'salva-a');
const salvas = ordenarFotos(fotos, ordem);
assert.equal(salvas[0].url,'upload-c.jpg');
assert.deepEqual(salvas.map(f=>f.url),['upload-c.jpg','a.jpg','b.jpg']);
assert.deepEqual(salvas.map(f=>f.cor),['Verde','Rosa','Azul']);
// Remover uma foto não perde as demais nem transfere a cor de outra posição.
assert.deepEqual(ordenarFotos(fotos.filter(f=>f.id!=='salva-a'),ordem).map(f=>f.cor),['Verde','Azul']);
// Fotos adicionadas depois de uma ordenação aparecem sem descartar o restante.
assert.deepEqual(ordenarFotos([...fotos,{id:'nova:d',url:'d.jpg',cor:'Amarela'}],ordem).map(f=>f.id),['nova:c','salva-a','salva-b','nova:d']);
assert.deepEqual(ordenarFotos(fotos,['removida','salva-b','salva-b']).map(f=>f.id),['salva-b','salva-a','nova:c']);
assert.deepEqual(moverFoto(['a','b','c'],'a','c'),['b','c','a']);
assert.deepEqual(moverFoto(['a','b'],'desconhecida','a'),['a','b']);
assert.deepEqual(ordenarFotos([],[]),[]);
console.log('PASS: ordem, capa, cores, fotos novas e remoções preservadas.');
