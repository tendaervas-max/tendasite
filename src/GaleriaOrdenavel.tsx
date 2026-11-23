import React, { useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { moverFoto } from './lib/ordemFotos';

type Props<T> = { fotos: T[]; onOrdenar: (ids: string[]) => void; renderFoto: (foto: T, indice: number) => React.ReactNode; disabled?: boolean };

export function GaleriaOrdenavel<T extends { id: string }>({ fotos, onOrdenar, renderFoto, disabled = false }: Props<T>) {
  const raiz = useRef<HTMLDivElement>(null);
  const ids = useRef(fotos.map(f => f.id));
  const callback = useRef(onOrdenar);
  const arraste = useRef<{ id: string; pointerId: number; x: number; y: number; inicioX: number; inicioY: number; movendo: boolean } | null>(null);
  const frame = useRef<number | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  useEffect(() => { ids.current = fotos.map(f => f.id); callback.current = onOrdenar; }, [fotos, onOrdenar]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  const mover = (id: string, destino: string) => {
    const nova = moverFoto(ids.current, id, destino);
    if (nova === ids.current) return;
    ids.current = nova;
    callback.current(nova);
    setAviso(`Foto movida para a posição ${nova.indexOf(id) + 1} de ${nova.length}. A primeira foto é a capa.`);
  };
  const sobPonteiro = () => {
    const atual = arraste.current;
    if (!atual?.movendo) return;
    const alvo = document.elementFromPoint(atual.x, atual.y)?.closest<HTMLElement>('[data-foto-id]');
    if (alvo && raiz.current?.contains(alvo) && alvo.dataset.fotoId) mover(atual.id, alvo.dataset.fotoId);
  };
  const rolar = () => {
    const atual = arraste.current;
    if (!atual) { frame.current = null; return; }
    if (atual.movendo) {
      const altura = window.innerHeight;
      const deslocamento = atual.y < 80 ? -14 : atual.y > altura - 80 ? 14 : 0;
      if (deslocamento) { window.scrollBy(0, deslocamento); sobPonteiro(); }
    }
    frame.current = requestAnimationFrame(rolar);
  };
  const terminar = () => {
    arraste.current = null; setArrastando(null);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  return <div ref={raiz}>
    <p className="sr-only" id="instrucoes-ordem-fotos">Arraste pelo botão de ordenar. Com o teclado, use as setas para mover a foto, Home para a capa e End para o final. Salve o produto para confirmar.</p>
    <p role="status" aria-live="polite" className="sr-only">{aviso}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fotos.map((foto, indice) => <article key={foto.id} data-foto-id={foto.id} className={`min-w-0 rounded-2xl border bg-white p-3 space-y-3 shadow-sm ${arrastando === foto.id ? 'border-brand-olive ring-2 ring-brand-olive/30 opacity-80' : 'border-brand-beige/30'}`}>
        <button type="button" disabled={disabled} aria-label={`Ordenar foto ${indice + 1}`} aria-describedby="instrucoes-ordem-fotos" aria-pressed={arrastando === foto.id} className="flex w-full select-none items-center justify-between gap-2 rounded-lg bg-brand-beige/10 px-3 py-2 text-sm text-brand-olive cursor-grab active:cursor-grabbing disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-olive" style={{ touchAction: 'none' }}
          onPointerDown={e => {
            if (disabled || e.button !== 0) return;
            e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId);
            arraste.current = { id: foto.id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, inicioX: e.clientX, inicioY: e.clientY, movendo: false };
            setArrastando(foto.id); frame.current = requestAnimationFrame(rolar);
          }}
          onPointerMove={e => {
            const atual = arraste.current;
            if (!atual || atual.pointerId !== e.pointerId) return;
            atual.x = e.clientX; atual.y = e.clientY;
            atual.movendo ||= Math.hypot(atual.x - atual.inicioX, atual.y - atual.inicioY) > 6;
            sobPonteiro();
          }}
          onPointerUp={terminar} onPointerCancel={terminar} onLostPointerCapture={terminar}
          onKeyDown={e => {
            const atual = ids.current.indexOf(foto.id);
            const destino = e.key === 'Home' ? 0 : e.key === 'End' ? ids.current.length - 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? atual - 1 : ['ArrowDown', 'ArrowRight'].includes(e.key) ? atual + 1 : -1;
            if (['Home', 'End', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.key)) { e.preventDefault(); if (ids.current[destino]) mover(foto.id, ids.current[destino]); }
          }}>
          <span className="flex items-center gap-2"><GripVertical size={18} aria-hidden="true" />Arraste para ordenar</span><span>{indice + 1}</span>
        </button>
        {renderFoto(foto, indice)}
      </article>)}
    </div>
  </div>;
}

export function ImagemArquivo({ arquivo, indice }: { arquivo: File; indice: number }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const preview = URL.createObjectURL(arquivo); setUrl(preview); return () => URL.revokeObjectURL(preview); }, [arquivo]);
  return url ? <img src={url} alt={`Nova foto ${indice + 1}`} draggable={false} className="w-full aspect-square object-contain rounded-xl" /> : null;
}
