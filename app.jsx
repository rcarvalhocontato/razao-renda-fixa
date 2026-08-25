import React from 'react';
import { createRoot } from 'react-dom/client';
const ReactDOM = { createRoot };

const { useState, useEffect, useMemo, useCallback } = React;

/* ------------------------------------------------------------------ */
/* Armazenamento local (substitui o window.storage do ambiente Claude) */
/* ------------------------------------------------------------------ */
const storage = {
  async get(key) { const v = localStorage.getItem(key); return v === null ? null : { key, value: v }; },
  async set(key, value) { localStorage.setItem(key, value); return { key, value }; },
};

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#0A0D12', panel: '#141922', panel2: '#1C232E', hairline: 'rgba(255,255,255,0.06)',
  text: '#EDEFF3', muted: '#6B7480', mutedLight: '#98A2AF',
  lime: '#C6F135', red: '#F0555D', blue: '#5B9DF0', slate: '#7C93AC',
};
const shadow = '0 1px 2px rgba(0,0,0,.5), 0 12px 28px -12px rgba(0,0,0,.65)';

const TIPOS = ['CDB', 'LCI', 'LCA', 'CRI', 'CRA', 'Tesouro Direto', 'Debênture'];
const INDEXADORES = ['CDI', 'IPCA+', 'Prefixado', 'SELIC', 'Outro'];
const LIQUIDEZ_OPTS = ['Diária', 'No vencimento'];
const TIPO_META = {
  'CDB': { cor: C.blue, isentoDefault: false }, 'LCI': { cor: C.lime, isentoDefault: true },
  'LCA': { cor: C.lime, isentoDefault: true }, 'CRI': { cor: C.lime, isentoDefault: true },
  'CRA': { cor: C.lime, isentoDefault: true }, 'Tesouro Direto': { cor: C.slate, isentoDefault: false },
  'Debênture': { cor: C.red, isentoDefault: false },
};
const INDEXADOR_COR = { 'CDI': C.lime, 'IPCA+': C.blue, 'Prefixado': C.slate, 'SELIC': C.red, 'Outro': C.muted };
const IOF_TABLE = [96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3,0];
const BANK_BRANDS = [
  ['BANCO DO BRASIL','BB','#F7D117'], ['BTG PACTUAL','BTG','#00A86B'], ['BTG','BTG','#00A86B'],
  ['ITAÚ','IT','#EC7000'], ['ITAU','IT','#EC7000'], ['BRADESCO','BD','#CC092F'], ['SANTANDER','SAN','#EC0000'],
  ['CAIXA','CX','#005CA9'], ['NUBANK','NU','#820AD1'], ['INTER','IN','#FF7A00'], ['XP','XP','#151515'],
  ['RICO','RI','#F4B400'], ['SAFRA','SA','#1E3A8A'], ['DAYCOVAL','DAY','#00A98F'], ['BMG','BMG','#0B5CAB'],
  ['PICPAY','PP','#21C25E'], ['PAGBANK','PG','#00AEEF'], ['MERCADO PAGO','MP','#00B1EA'], ['GENIAL','GE','#00A3FF'],
];
function normalizarInstituicao(nome){
  return String(nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim()
    .replace(/\bS\.?\s*A\.?\b/g,'').replace(/\bSA\b/g,'').replace(/\bBANCO\b/g,'').replace(/\bBANK\b/g,'').replace(/\s+/g,' ').trim();
}
function marcaInstituicao(nome){
  const n=normalizarInstituicao(nome);
  const hit=BANK_BRANDS.find(([key])=>n.includes(normalizarInstituicao(key)));
  if(hit) return {sigla:hit[1], cor:hit[2]};
  return {sigla:'', cor:C.blue};
}
function nomeInstituicao(nome){
  const n=normalizarInstituicao(nome);
  const mapa=[
    ['BANCO DO BRASIL','Banco do Brasil'],['BTG PACTUAL','BTG Pactual'],['BTG','BTG Pactual'],
    ['ITAÚ','Itaú'],['ITAU','Itaú'],['BRADESCO','Bradesco'],['SANTANDER','Santander'],
    ['CAIXA','Caixa'],['NUBANK','Nubank'],['INTER','Inter'],['XP','XP'],['RICO','Rico'],
    ['SAFRA','Safra'],['DAYCOVAL','Daycoval'],['BMG','BMG'],['PICPAY','PicPay'],['PAGBANK','PagBank'],
    ['MERCADO PAGO','Mercado Pago'],['GENIAL','Genial'],['C6','C6 Bank']
  ];
  const hit=mapa.find(([key])=>n.includes(normalizarInstituicao(key)));
  return hit ? hit[1] : String(nome||'').trim();
}
function InstitutionMark(){ return null; }
const PERIODOS=[['mes','Mês'],['ano','Ano'],['todo','Todo o período']];
function inicioPeriodo(periodo,today,investments){
  if(periodo==='dia') return hojeAnteriorISO(today);
  if(periodo==='mes') return `${today.slice(0,8)}01`;
  if(periodo==='ano') return `${today.slice(0,4)}-01-01`;
  const datas=investments.map(i=>i.dataAplicacao).filter(Boolean).sort(); return datas[0]||today;
}
function hojeAnteriorISO(iso){ const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()-1); return isoDate(d); }
function retornoPeriodoInvestimento(inv,inicio,fim,ref){
  if(!inv || !inicio || !fim || inv.dataAplicacao>fim) return null;
  const inicioCalc=inv.dataAplicacao>inicio?inv.dataAplicacao:inicio;
  const valorIni=valorProjetadoEm(inv,inicioCalc,ref,fim);
  const valorFim=valorProjetadoEm(inv,fim,ref,fim);
  if(!(valorIni>0)) return null;
  return (valorFim/valorIni-1)*100;
}
function retornoCarteiraPeriodo(ativos,inicio,fim,ref){
  let peso=0, retorno=0;
  ativos.forEach(inv=>{const r=retornoPeriodoInvestimento(inv,inicio,fim,ref); if(r===null)return; const ini=valorProjetadoEm(inv,inv.dataAplicacao>inicio?inv.dataAplicacao:inicio,ref,fim); if(ini>0){peso+=ini;retorno+=ini*r;}});
  return peso?retorno/peso:null;
}
function cdiPeriodo(ref,inicio,fim){
  if(ref.historicoCDI?.length){const ultimo=ultimaDataDisponivel(ref.historicoCDI,fim)||inicio; return (fatorAcumulado(ref.historicoCDI,inicio,ultimo,1,true)-1)*100;}
  const du=diasUteisEntre(inicio,fim); return du? (Math.pow(1+ref.cdi/100,du/252)-1)*100:null;
}
function retornoCarteiraPeriodoMD(ativos, inicio, fim, ref, today) {
  if (!ativos.length || !inicio || !fim || inicio >= fim) return null;
  let valorInicio = 0, valorFim = 0, fluxoPonderado = 0, fluxos = 0;
  const totalDias = Math.max(diffDays(inicio, fim), 1);
  ativos.forEach(inv => {
    if (inv.dataAplicacao > fim) return;
    const m = calcMetrics(inv, today, ref);
    const aplicado = Number(inv.valorAplicado) || 0;
    const entrouNoPeriodo = inv.dataAplicacao >= inicio && inv.dataAplicacao <= fim;
    if (!entrouNoPeriodo) {
      const vi = valorProjetadoEm(inv, inicio, ref, today);
      if (vi > 0) valorInicio += vi;
    } else {
      // Aporte feito no início do período é fluxo, não patrimônio inicial.
      fluxos += aplicado;
      const peso = Math.max(0, Math.min(1, diffDays(inv.dataAplicacao, fim) / totalDias));
      fluxoPonderado += aplicado * peso;
    }
    valorFim += m.valorAtualBruto || 0;
  });
  const denominador = valorInicio + fluxoPonderado;
  if (!(denominador > 0)) return null;
  return ((valorFim - valorInicio - fluxos) / denominador) * 100;
}
function periodoCDIExato(ref, inicio, fim) {
  if (ref.historicoCDI?.length) {
    const ate = ultimaDataDisponivel(ref.historicoCDI, fim);
    if (!ate || ate <= inicio) return null;
    return (fatorAcumulado(ref.historicoCDI, inicio, ate, 1, false) - 1) * 100;
  }
  const du = diasUteisEntre(inicio, fim);
  return du ? (Math.pow(1 + ref.cdi / 100, du / 252) - 1) * 100 : null;
}
function grupoInstituicoes(ativos,metricsById){
  const map={};
  ativos.forEach(inv=>{const key=normalizarInstituicao(inv.instituicao); if(!map[key]) map[key]={key,nome:inv.instituicao,items:[],bruto:0,liquido:0,aplicado:0}; const g=map[key],m=metricsById[inv.id]; g.items.push(inv); g.bruto+=m.valorAtualBruto;g.liquido+=m.valorAtualLiquido;g.aplicado+=inv.valorAplicado;});
  return Object.values(map).map(g=>({...g,ganho:g.liquido-g.aplicado,rent:g.aplicado?(g.liquido/g.aplicado-1)*100:0})).sort((a,b)=>b.liquido-a.liquido);
}


/* ------------------------------------------------------------------ */
/* Ícones (SVG próprios — evita depender de mais um pacote externo)    */
/* ------------------------------------------------------------------ */
function Icon({ name, size = 16, color = 'currentColor' }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>,
    chevronDown: <polyline points="6 9 12 15 18 9" />,
    chevronUp: <polyline points="18 15 12 9 6 15" />,
    alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    history: <><path d="M3 3v5h5" /><path d="M3.1 13a9 9 0 1 0 2.6-7.4L3 8" /><path d="M12 7v5l4 2" /></>,
    wallet: <><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /><path d="M18 12h.01" /></>,
    check: <path d="m5 13 4 4L19 7" />,
    trophy: <><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M17 5h3a3 3 0 0 1-3 4" /><path d="M7 5H4a3 3 0 0 0 3 4" /></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7" /><polyline points="21 3 21 9 15 9" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
    listOrdered: <><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></>,
    listChecks: <><path d="m3 6 2 2 4-4" /><path d="m3 14 2 2 4-4" /><line x1="12" y1="6" x2="21" y2="6" /><line x1="12" y1="14" x2="21" y2="14" /></>,
  };
  return <svg {...p}>{paths[name]}</svg>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function diffDays(d1, d2) { return Math.round((new Date(d2 + 'T00:00:00') - new Date(d1 + 'T00:00:00')) / 86400000); }
function fmtBRL(v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtData(d) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
function fmtPct(v) { if (v === null || v === undefined || Number.isNaN(v)) return '—'; return (Number(v)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function bcbDateToISO(d) { const [dd, mm, yyyy] = d.split('/'); return `${yyyy}-${mm}-${dd}`; }
function aliquotaIRPorDias(dias) { if (dias <= 180) return 22.5; if (dias <= 360) return 20; if (dias <= 720) return 17.5; return 15; }
function taxaComparacaoIR(inv, dias) { return inv.isentoIR ? aliquotaIRPorDias(Math.max(dias,1)) : (inv.aliquotaIRManual !== '' && inv.aliquotaIRManual != null ? Number(inv.aliquotaIRManual) : aliquotaIRPorDias(Math.max(dias,1))); }
function taxaAnualTributavelEquivalente(inv, ref, dias) { const taxa = taxaAnualEfetiva(inv, ref); const ir = taxaComparacaoIR(inv, dias); return inv.isentoIR ? taxa / Math.max(1 - ir/100, 0.0001) : taxa; }
function percentualCDIEquivalente(inv, ref, dias) { const ir = taxaComparacaoIR(inv, dias); const p = Number(inv.parametroValor)||0; if (inv.indexador === 'CDI') return inv.isentoIR ? p / Math.max(1-ir/100,0.0001) : p; const anualTrib = taxaAnualTributavelEquivalente(inv, ref, dias); return ref.cdi > 0 ? (anualTrib / ref.cdi) * 100 : null; }
function aliquotaIOFPorDias(dias) { if (dias >= 30) return 0; if (dias <= 0) return 100; return IOF_TABLE[dias - 1]; }
function fatorAcumulado(serieDiaria, d1, d2, multiplicador = 1, incluirInicio = false) {
  let fator = 1;
  for (let i = 0; i < serieDiaria.length; i++) {
    const item = serieDiaria[i];
    // Na aplicação inicial, a instituição começa a remunerar no próprio
    // dia da aplicação. Por isso o primeiro dia é inclusivo.
    // Para um saldo/âncora informado pelo usuário, o valor informado já é
    // o saldo daquele dia e a remuneração começa no pregão seguinte.
    const dentroDoPeriodo = incluirInicio
      ? item.data >= d1 && item.data <= d2
      : item.data > d1 && item.data <= d2;
    if (dentroDoPeriodo) {
      // Séries 12 (CDI) e 11 (Selic) são taxas DIÁRIAS (% a.d.).
      // Para x% do indexador, x% é aplicado à taxa de cada pregão,
      // e os fatores diários são compostos multiplicativamente.
      fator *= (1 + (item.valor / 100) * multiplicador);
    }
  }
  return fator;
}
async function fetchHistoricoDiario(codigo, dataInicialISO, dataFinalISO) {
  if (!dataInicialISO || !dataFinalISO || dataInicialISO > dataFinalISO) return [];
  const [yi, mi, di] = dataInicialISO.split('-'); const [yf, mf, df] = dataFinalISO.split('-');
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?dataInicial=${di}/${mi}/${yi}&dataFinal=${df}/${mf}/${yf}&formato=json`;
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error('histórico BCB indisponível');
  const json = await resp.json();
  return json.map(item => ({ data: bcbDateToISO(item.data), valor: parseFloat(String(item.valor).replace(',', '.')) }))
    .filter(item => item.data && Number.isFinite(item.valor))
    .sort((a, b) => a.data.localeCompare(b.data));
}
function ultimaDataDisponivel(serie, limite) {
  if (!serie || !serie.length) return null;
  let ultima = null;
  for (const item of serie) if (item.data <= limite) ultima = item.data;
  return ultima;
}
function ontemISO(iso) { const d = new Date(iso+'T00:00:00'); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function pascoa(ano) {
  const a=ano%19,b=Math.floor(ano/100),c=ano%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1;
  return new Date(`${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}T00:00:00`);
}
function isoDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function feriadosMercadoBR(ano) {
  const out = new Set([`${ano}-01-01`,`${ano}-04-21`,`${ano}-05-01`,`${ano}-09-07`,`${ano}-10-12`,`${ano}-11-02`,`${ano}-11-15`,`${ano}-11-20`,`${ano}-12-25`]);
  const p=pascoa(ano);
  const add=(offset)=>{const d=new Date(p); d.setDate(d.getDate()+offset); out.add(isoDate(d));};
  add(-48); add(-47); add(-2); add(60);
  return out;
}
function ehDiaUtilMercado(d) { const dow=d.getDay(); if(dow===0||dow===6) return false; return !feriadosMercadoBR(d.getFullYear()).has(isoDate(d)); }
function diasUteisProvisorios(d1, d2) {
  if (!d1 || !d2 || d2 <= d1) return 0;
  const start = new Date(d1+'T00:00:00'), end = new Date(d2+'T00:00:00');
  let n=0, cur=new Date(start); cur.setDate(cur.getDate()+1);
  while(cur<=end){ if(ehDiaUtilMercado(cur)) n++; cur.setDate(cur.getDate()+1); }
  return n;
}
function diasUteisEntre(d1, d2) {
  const start = new Date(d1 + 'T00:00:00'), end = new Date(d2 + 'T00:00:00');
  if (end <= start) return 0;
  let count = 0; const cur = new Date(start); cur.setDate(cur.getDate() + 1);
  while (cur <= end) { if (ehDiaUtilMercado(cur)) count++; cur.setDate(cur.getDate() + 1); }
  return count;
}
function parametroLabel(indexador) {
  switch (indexador) {
    case 'CDI': return '% do CDI'; case 'SELIC': return '% da Selic';
    case 'IPCA+': return 'Spread sobre o IPCA (% a.a.)'; case 'Prefixado': return 'Taxa fixa (% a.a.)';
    default: return 'Taxa estimada (% a.a.)';
  }
}
function taxaAnualEfetiva(inv, ref) {
  const p = Number(inv.parametroValor) || 0; let rate;
  if (inv.indexador === 'CDI') rate = ref.cdi * (p / 100);
  else if (inv.indexador === 'SELIC') rate = ref.selic * (p / 100);
  else if (inv.indexador === 'IPCA+') rate = ((1 + ref.ipca / 100) * (1 + p / 100) - 1) * 100;
  else if (inv.indexador === 'Prefixado') rate = p;
  else rate = p;
  if (inv.taxaOverrideAnual !== '' && inv.taxaOverrideAnual != null && !Number.isNaN(Number(inv.taxaOverrideAnual))) rate = Number(inv.taxaOverrideAnual);
  return rate;
}
function descricaoTaxa(inv, ref) {
  const p = Number(inv.parametroValor) || 0; const efetiva = taxaAnualEfetiva(inv, ref);
  if (inv.indexador === 'CDI') return `${p}% do CDI (≈ ${fmtPct(efetiva)} a.a.)`;
  if (inv.indexador === 'SELIC') return `${p}% da Selic (≈ ${fmtPct(efetiva)} a.a.)`;
  if (inv.indexador === 'IPCA+') return `IPCA+ ${p}% (≈ ${fmtPct(efetiva)} a.a.)`;
  if (inv.indexador === 'Prefixado') return `${fmtPct(p)} a.a. (prefixado)`;
  return `${fmtPct(p)} a.a.`;
}
function calcMetrics(inv, today, ref) {
  const diasCorridos = Math.max(diffDays(inv.dataAplicacao, today), 0);
  const diasTotais = Math.max(diffDays(inv.dataAplicacao, inv.dataVencimento), 1);
  const diasRestantes = diffDays(today, inv.dataVencimento);
  const taxaAnual = taxaAnualEfetiva(inv, ref);
  const hist = (inv.historico || []).slice().sort((a, b) => a.data.localeCompare(b.data));
  let ancoraData = inv.dataAplicacao, ancoraValor = inv.valorAplicado;
  hist.forEach(h => { if (h.data <= today) { ancoraData = h.data; ancoraValor = h.valorBruto; } });
  const diasDesdeAncora = Math.max(diffDays(ancoraData, today), 0);
  const duDesdeAncora = diasUteisEntre(ancoraData, today);
  const projetado = diasDesdeAncora > 0;
  const usaOverride = inv.taxaOverrideAnual !== '' && inv.taxaOverrideAnual != null && !Number.isNaN(Number(inv.taxaOverrideAnual));
  let valorAtualBruto, precisao = 'estimado';
  const ultimaDataCDI = ultimaDataDisponivel(ref.historicoCDI, today);
  const ultimaDataSelic = ultimaDataDisponivel(ref.historicoSelic, today);
  if (inv.tipo === 'Tesouro Direto' && Number(inv.valorAtualBrutoManual) > 0) {
    valorAtualBruto = Number(inv.valorAtualBrutoManual);
    precisao = 'mercado-informado';
  } else if (inv.tipo === 'Tesouro Direto' && Number(inv.quantidade) > 0 && Number(inv.precoUnitarioAtual) > 0) {
    valorAtualBruto = Number(inv.quantidade) * Number(inv.precoUnitarioAtual);
    precisao = 'mercado-unitario';
  } else if (!usaOverride && inv.indexador === 'CDI' && ref.historicoCDI && ref.historicoCDI.length) {
    const dataRendimento = ultimaDataCDI || ancoraData;
    valorAtualBruto = ancoraValor * fatorAcumulado(ref.historicoCDI, ancoraData, dataRendimento, (Number(inv.parametroValor) || 0) / 100, ancoraData === inv.dataAplicacao);
    // O CDI diário do SGS pode aparecer com defasagem de um dia útil.
    // Enquanto o dado oficial não chega, provisionamos apenas os dias úteis
    // encerrados (até ontem), usando a última taxa anualizada conhecida.
    const diasProv = diasUteisProvisorios(dataRendimento, ontemISO(today));
    if (diasProv > 0) valorAtualBruto *= Math.pow(1 + taxaAnual / 100, diasProv / 252);
    precisao = diasProv > 0 ? 'historico-provisorio' : 'historico';
  } else if (!usaOverride && inv.indexador === 'SELIC' && ref.historicoSelic && ref.historicoSelic.length) {
    const dataRendimento = ultimaDataSelic || ancoraData;
    valorAtualBruto = ancoraValor * fatorAcumulado(ref.historicoSelic, ancoraData, dataRendimento, (Number(inv.parametroValor) || 0) / 100, ancoraData === inv.dataAplicacao);
    const diasProv = diasUteisProvisorios(dataRendimento, ontemISO(today));
    if (diasProv > 0) valorAtualBruto *= Math.pow(1 + taxaAnual / 100, diasProv / 252);
    precisao = diasProv > 0 ? 'historico-provisorio' : 'historico';
  } else {
    // Prefixados usam base DU/252. Para uma nova aplicação, a data de liquidação
    // é inclusiva; para um saldo informado por extrato, o saldo já representa
    // aquele dia e a remuneração começa no próximo pregão.
    const duPrefixado = diasUteisEntre(ancoraData, today) + (inv.indexador === 'Prefixado' && ancoraData === inv.dataAplicacao && ehDiaUtilMercado(new Date(ancoraData+'T00:00:00')) ? 1 : 0);
    valorAtualBruto = ancoraValor * Math.pow(1 + taxaAnual / 100, Math.max(duPrefixado, 0) / 252);
  }
  const ganhoBruto = valorAtualBruto - inv.valorAplicado;

  const iofAliq = diasCorridos < 30 ? aliquotaIOFPorDias(diasCorridos) : 0;
  const iofValor = ganhoBruto > 0 ? ganhoBruto * (iofAliq / 100) : 0;
  const ganhoAposIOF = ganhoBruto - iofValor;
  const aliqIR = inv.isentoIR ? 0 : (inv.aliquotaIRManual !== '' && inv.aliquotaIRManual != null ? Number(inv.aliquotaIRManual) : aliquotaIRPorDias(diasCorridos));
  const irValor = ganhoAposIOF > 0 ? ganhoAposIOF * (aliqIR / 100) : 0;
  const valorAtualLiquido = valorAtualBruto - iofValor - irValor;

  const rentBrutaTotal = (valorAtualBruto / inv.valorAplicado - 1) * 100;
  const rentLiquidaTotal = (valorAtualLiquido / inv.valorAplicado - 1) * 100;
  const rentBrutaMensal = diasCorridos > 0 ? (Math.pow(valorAtualBruto / inv.valorAplicado, 30 / diasCorridos) - 1) * 100 : null;
  const rentLiquidaMensal = diasCorridos > 0 ? (Math.pow(Math.max(valorAtualLiquido, 0.0001) / inv.valorAplicado, 30 / diasCorridos) - 1) * 100 : null;

  const duRestantes = diasUteisEntre(today, inv.dataVencimento);
  const valorBaseProjecao = inv.tipo === 'Tesouro Direto' ? inv.valorAplicado : valorAtualBruto;
  const valorEstBrutoVenc = valorBaseProjecao * Math.pow(1 + taxaAnual / 100, Math.max(duRestantes, 0) / 252);
  const ganhoEstVenc = valorEstBrutoVenc - inv.valorAplicado;
  const diasAteVencimento = Math.max(diffDays(inv.dataAplicacao, inv.dataVencimento), 0);
  const iofAliqVenc = diasAteVencimento < 30 ? aliquotaIOFPorDias(diasAteVencimento) : 0;
  const iofValorVenc = ganhoEstVenc > 0 ? ganhoEstVenc * (iofAliqVenc / 100) : 0;
  const ganhoAposIOFVenc = ganhoEstVenc - iofValorVenc;
  const aliqIRVenc = inv.isentoIR ? 0 : (inv.aliquotaIRManual !== '' && inv.aliquotaIRManual != null ? Number(inv.aliquotaIRManual) : aliquotaIRPorDias(diasTotais));
  const irValorVenc = ganhoAposIOFVenc > 0 ? ganhoAposIOFVenc * (aliqIRVenc / 100) : 0;
  const custodiaVenc = inv.tipo === 'Tesouro Direto' ? valorEstBrutoVenc * (Number(inv.taxaCustodiaB3 || 0.20) / 100) * (Math.max(duRestantes,0) / 252) : 0;
  const valorEstLiquidoVenc = valorEstBrutoVenc - iofValorVenc - irValorVenc - custodiaVenc;

  const cdiMensal = (Math.pow(1 + ref.cdi / 100, 21 / 252) - 1) * 100;
  const pctCDIBruto = cdiMensal !== 0 && rentBrutaMensal !== null ? (rentBrutaMensal / cdiMensal) * 100 : null;
  const pctCDILiquido = cdiMensal !== 0 && rentLiquidaMensal !== null ? (rentLiquidaMensal / cdiMensal) * 100 : null;

  return { diasCorridos, diasTotais, diasRestantes, valorAtualBruto, ganhoBruto, iofAliq, iofValor, aliqIR, irValor,
    valorAtualLiquido, valorEstBrutoVenc, ganhoEstVenc, iofAliqVenc, iofValorVenc, aliqIRVenc, irValorVenc, valorEstLiquidoVenc, custodiaVenc, taxaAnual, projetado, ancoraData, precisao,
    rentBrutaTotal, rentLiquidaTotal, rentBrutaMensal, rentLiquidaMensal, pctCDIBruto, pctCDILiquido, ultimaDataRendimento: inv.indexador === 'CDI' ? ultimaDataCDI : inv.indexador === 'SELIC' ? ultimaDataSelic : today, aliquotaComparacao: taxaComparacaoIR(inv, diasCorridos), taxaAnualTributavelEquivalente: taxaAnualTributavelEquivalente(inv, ref, diasCorridos), percentualCDIEquivalente: percentualCDIEquivalente(inv, ref, diasCorridos) };
}
function buildEvolutionSeries(list, metricsById, today) {
  const events = [];
  list.forEach(inv => {
    events.push({ date: inv.dataAplicacao, id: inv.id, valor: inv.valorAplicado });
    (inv.historico || []).forEach(h => events.push({ date: h.data, id: inv.id, valor: h.valorBruto }));
    if (metricsById && metricsById[inv.id]) events.push({ date: today, id: inv.id, valor: metricsById[inv.id].valorAtualBruto });
  });
  const dates = [...new Set(events.map(e => e.date))].sort();
  const last = {};
  return dates.map(date => {
    events.filter(e => e.date === date).forEach(e => { last[e.id] = e.valor; });
    const total = Object.values(last).reduce((a, b) => a + b, 0);
    return { date: fmtData(date), total };
  });
}
function valorProjetadoEm(inv, dataAlvo, ref, today) {
  const hist = (inv.historico || []).slice().sort((a, b) => a.data.localeCompare(b.data));
  let ancoraData = inv.dataAplicacao, ancoraValor = inv.valorAplicado;
  hist.forEach(h => { if (h.data <= dataAlvo) { ancoraData = h.data; ancoraValor = h.valorBruto; } });
  const usaOverride = inv.taxaOverrideAnual !== '' && inv.taxaOverrideAnual != null && !Number.isNaN(Number(inv.taxaOverrideAnual));
  const passado = dataAlvo <= today;
  if (!usaOverride && passado && inv.indexador === 'CDI' && ref.historicoCDI && ref.historicoCDI.length) {
    const ultimo = ultimaDataDisponivel(ref.historicoCDI, dataAlvo) || ancoraData;
    let valor = ancoraValor * fatorAcumulado(ref.historicoCDI, ancoraData, ultimo, (Number(inv.parametroValor) || 0) / 100, ancoraData === inv.dataAplicacao);
    const limite = dataAlvo < today ? dataAlvo : ontemISO(today);
    const diasProv = diasUteisProvisorios(ultimo, limite);
    if (diasProv > 0) valor *= Math.pow(1 + taxaAnualEfetiva(inv, ref) / 100, diasProv / 252);
    return valor;
  }
  if (!usaOverride && passado && inv.indexador === 'SELIC' && ref.historicoSelic && ref.historicoSelic.length) {
    const ultimo = ultimaDataDisponivel(ref.historicoSelic, dataAlvo) || ancoraData;
    let valor = ancoraValor * fatorAcumulado(ref.historicoSelic, ancoraData, ultimo, (Number(inv.parametroValor) || 0) / 100, ancoraData === inv.dataAplicacao);
    const limite = dataAlvo < today ? dataAlvo : ontemISO(today);
    const diasProv = diasUteisProvisorios(ultimo, limite);
    if (diasProv > 0) valor *= Math.pow(1 + taxaAnualEfetiva(inv, ref) / 100, diasProv / 252);
    return valor;
  }
  let du = diasUteisEntre(ancoraData, dataAlvo);
  if (inv.indexador === 'Prefixado' && ancoraData === inv.dataAplicacao && ehDiaUtilMercado(new Date(ancoraData+'T00:00:00'))) du += 1;
  const taxaAnual = taxaAnualEfetiva(inv, ref);
  return ancoraValor * Math.pow(1 + taxaAnual / 100, Math.max(du, 0) / 252);
}
function buildMonthlySeriesForInv(inv, ref, today) {
  const pontos = [];
  const aplicDate = new Date(inv.dataAplicacao + 'T00:00:00');
  const hoje = new Date(today + 'T00:00:00');
  let y = aplicDate.getFullYear(), m = aplicDate.getMonth();
  while (true) {
    const fimMes = new Date(y, m + 1, 0);
    if (fimMes >= hoje) break;
    const dataStr = fimMes.toISOString().slice(0, 10);
    pontos.push({ label: fimMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), bruto: valorProjetadoEm(inv, dataStr, ref, today) });
    m++; if (m > 11) { m = 0; y++; }
  }
  pontos.push({ label: 'hoje', bruto: valorProjetadoEm(inv, today, ref, today) });
  return pontos;
}

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function buildRentabilidadeMensalMatrix(ativos, ref, today) {
  if (!ativos.length) return { anos: [], dados: {} };
  const inicioMaisAntigo = ativos.map(i => i.dataAplicacao).sort()[0];
  const start = new Date(inicioMaisAntigo + 'T00:00:00');
  const hoje = new Date(today + 'T00:00:00');
  const anos = {};
  let y = start.getFullYear(), m = start.getMonth();
  while (true) {
    const inicioMes = new Date(y, m, 1);
    const fimMes = new Date(y, m + 1, 0);
    if (inicioMes > hoje) break;
    const fimEfetivo = fimMes > hoje ? hoje : fimMes;
    const inicioStr = inicioMes.toISOString().slice(0, 10);
    const fimStr = fimEfetivo.toISOString().slice(0, 10);
    let somaPeso = 0, somaPesoRetorno = 0;
    ativos.forEach(inv => {
      if (inv.dataAplicacao > fimStr) return;
      const inicioCalc = inv.dataAplicacao > inicioStr ? inv.dataAplicacao : inicioStr;
      const valorInicio = valorProjetadoEm(inv, inicioCalc, ref, today);
      const valorFim = valorProjetadoEm(inv, fimStr, ref, today);
      if (valorInicio > 0) { somaPeso += valorInicio; somaPesoRetorno += valorInicio * (valorFim / valorInicio - 1); }
    });
    const retornoCarteira = somaPeso > 0 ? (somaPesoRetorno / somaPeso) * 100 : null;
    const retornoCDI = ref.historicoCDI && ref.historicoCDI.length ? (fatorAcumulado(ref.historicoCDI, inicioStr, fimStr, 1, true) - 1) * 100 : null;
    if (!anos[y]) anos[y] = { carteira: Array(12).fill(null), cdi: Array(12).fill(null) };
    anos[y].carteira[m] = retornoCarteira;
    anos[y].cdi[m] = retornoCDI;
    m++; if (m > 11) { m = 0; y++; }
  }
  const anosOrdenados = Object.keys(anos).map(Number).sort((a, b) => b - a);
  return { anos: anosOrdenados, dados: anos };
}
function buildAlocacaoInstituicao(ativos, metricsById) {
  const map = {};
  ativos.forEach(inv => {
    const m = metricsById[inv.id];
    if (!map[inv.instituicao]) map[inv.instituicao] = { total: 0, aplicado: 0, ganho: 0 };
    map[inv.instituicao].total += m.valorAtualLiquido;
    map[inv.instituicao].aplicado += inv.valorAplicado;
    map[inv.instituicao].ganho += (m.valorAtualLiquido - inv.valorAplicado);
  });
  const totalGeral = Object.values(map).reduce((a, b) => a + b.total, 0) || 1;
  return Object.entries(map).map(([nome, v]) => ({
    nome, total: v.total, pctCarteira: (v.total / totalGeral) * 100,
    rentLiquida: v.aplicado > 0 ? (v.ganho / v.aplicado) * 100 : 0,
  })).sort((a, b) => b.total - a.total);
}
async function fetchTaxasBCB() {
  // BCB SGS:
  // 432 = Meta Selic (% a.a.)
  // 4389 = CDI anualizado, base 252 (% a.a.)
  // 13522 = IPCA acumulado em 12 meses (%)
  const series = { selic: 432, cdi: 4389, ipca: 13522 };
  const entries = await Promise.all(Object.entries(series).map(async ([chave, codigo]) => {
    const resp = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/1?formato=json`, { cache: 'no-store' });
    if (!resp.ok) throw new Error('BCB indisponível: ' + chave);
    const json = await resp.json(); const item = json[0];
    return [chave, { valor: parseFloat(item.valor.replace(',', '.')), data: bcbDateToISO(item.data) }];
  }));
  return Object.fromEntries(entries);
}

const emptyForm = { instituicao: '', tipo: 'CDB', indexador: 'CDI', parametroValor: '', dataAplicacao: '', dataVencimento: '', valorAplicado: '', liquidez: 'No vencimento', isentoIR: false, aliquotaIRManual: '', taxaOverrideAnual: '', carteira: '', observacoes: '', vincularA: '', tituloTesouro: '', quantidade: '', precoUnitarioCompra: '', precoUnitarioAtual: '', valorAtualBrutoManual: '', taxaCustodiaB3: '0.20', tesouroCupom: 'Não' };
const defaultRef = {
  cdi: 14.90, selic: 14.00, ipca: 4.64,
  dataCDI: '2026-08-11', dataSelic: '2026-08-11', dataIPCA: '2026-06-01',
  atualizado: '2026-08-11', fonte: 'manual'
};

/* ------------------------------------------------------------------ */
/* Componentes de apoio                                                 */
/* ------------------------------------------------------------------ */
function TipoTag({ tipo }) {
  const meta = TIPO_META[tipo] || { cor: C.muted };
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 20, background: meta.cor + '1C', color: meta.cor, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.cor }} />{tipo}</span>;
}
function Delta({ value, size = 12 }) {
  if (value === null || value === undefined || Number.isNaN(value)) return <span style={{ color: C.muted, fontSize: size }}>—</span>;
  const up = value >= 0;
  return <span style={{ color: up ? C.lime : C.red, fontSize: size, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 3 }}>{up ? '▲' : '▼'} {fmtPct(Math.abs(value))}</span>;
}
function MaturityBar({ diasCorridos, diasTotais, vencida }) {
  const pct = Math.min(100, Math.max(0, (diasCorridos / diasTotais) * 100));
  return <div style={{ height: 4, background: C.panel2, borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', width: pct + '%', background: vencida ? C.red : C.lime }} /></div>;
}
function Field({ label, children, hint }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ color: C.muted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{label}</span>{children}{hint && <span style={{ color: C.muted, fontSize: 11 }}>{hint}</span>}</label>;
}
const inputStyle = { background: C.bg, border: `1px solid ${C.hairline}`, borderRadius: 8, padding: '9px 11px', color: C.text, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 13.5, width: '100%', outline: 'none' };
function StatCard({ label, value, delta, sub, accent }) {
  return <div style={{ background: C.panel, borderRadius: 16, padding: '16px 18px', boxShadow: shadow, borderTop: `1px solid ${C.hairline}` }}>
    <div style={{ color: C.muted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 }}>{label}</div>
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 600, color: accent || C.text, letterSpacing: '-0.01em' }}>{value}</div>
    <div style={{ marginTop: 6, minHeight: 16 }}>{delta !== undefined ? <Delta value={delta} /> : sub ? <span style={{ color: C.muted, fontSize: 11.5 }}>{sub}</span> : null}</div>
  </div>;
}
function Badge({ cor, texto, icon }) { return <span style={{ background: cor + '1C', color: cor, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{icon}{texto}</span>; }
function Mini({ label, value, accent }) { return <div><div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div><div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13.5, color: accent || C.text }}>{value}</div></div>; }
function SectionLabel({ children, icon }) { return <div style={{ color: C.lime, fontSize: 10.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>{icon}{children}</div>; }
function IconBtn({ children, onClick, title, danger }) { return <button onClick={onClick} title={title} style={{ background: C.panel2, border: 'none', color: danger ? C.red : C.mutedLight, borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{children}</button>; }
function Panel({ title, subtitle, children, right }) {
  return <section style={{ background: C.panel, borderRadius: 16, padding: '20px 20px 8px', boxShadow: shadow, borderTop: `1px solid ${C.hairline}` }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <div><h3 style={{ fontSize: 13.5, fontWeight: 700, margin: 0, color: C.text }}>{title}</h3>{subtitle && <p style={{ color: C.muted, fontSize: 12, marginTop: 4, marginBottom: 14 }}>{subtitle}</p>}</div>
      {right}
    </div>
    <div style={{ marginTop: subtitle ? 0 : 14, paddingBottom: 16 }}>{children}</div>
  </section>;
}
function PieBlock({ data }) {
  const vals = data.filter(d => d.value > 0);
  if (!vals.length) return <p style={{ color: C.muted, fontSize: 13 }}>Sem dados.</p>;
  const total = vals.reduce((a, b) => a + b.value, 0) || 1;
  let acc = 0;
  const stops = vals.map(d => { const s = (acc / total) * 100; acc += d.value; const e = (acc / total) * 100; return `${d.cor} ${s}% ${e}%`; }).join(', ');
  return <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
    <div style={{ width: 150, height: 150, borderRadius: '50%', background: `conic-gradient(${stops})`, position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 26, borderRadius: '50%', background: C.panel }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {vals.map((d, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: d.cor, flexShrink: 0 }} />
        <span style={{ color: C.muted }}>{d.name}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", marginLeft: 16, color: C.text }}>{fmtBRL(d.value)}</span>
      </div>)}
    </div>
  </div>;
}
function MiniLineChart({ data, valueKey, labelKey, height = 220, color }) {
  if (!data || data.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>Dados insuficientes ainda.</div>;
  const values = data.map(d => d[valueKey]);
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max - min) || 1;
  const W = 600, H = 200, pad = 6;
  const pts = data.map((d, i) => { const x = pad + (i / (data.length - 1)) * (W - pad * 2); const y = pad + (1 - (d[valueKey] - min) / range) * (H - pad * 2); return [x, y]; });
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const areaPath = path + ` L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;
  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 10.5, marginBottom: 2 }}>
      <span>{fmtBRL(max)}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace", color: C.text }}>{fmtBRL(values[values.length - 1])}</span>
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
      <path d={areaPath} fill={color + '22'} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
    <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 10.5, marginTop: 2 }}>
      <span>{data[0][labelKey]}</span><span>{data[data.length - 1][labelKey]}</span>
    </div>
  </div>;
}
function SimpleBarsVertical({ data, labelKey, valueKey, color }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 190 }}>
    {data.map((d, i) => <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 9, color: C.muted, fontFamily: "'IBM Plex Mono', monospace" }}>{d[valueKey] > 0 ? (d[valueKey] / 1000).toFixed(0) + 'k' : ''}</span>
      <div style={{ width: '100%', maxWidth: 30, height: Math.max((d[valueKey] / max) * 140, d[valueKey] > 0 ? 3 : 0), background: color, borderRadius: '4px 4px 0 0' }} title={fmtBRL(d[valueKey])} />
      <span style={{ fontSize: 9.5, color: C.muted, whiteSpace: 'nowrap' }}>{d[labelKey]}</span>
    </div>)}
  </div>;
}
function SimpleBarsHorizontal({ data, labelKey, valueKey, color }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {data.map((d, i) => <div key={i}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.text, marginBottom: 3 }}><span>{d[labelKey]}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace", color: C.muted }}>{fmtBRL(d[valueKey])}</span></div>
      <div style={{ height: 8, background: C.panel2, borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.max((d[valueKey] / max) * 100, 2)}%`, background: color, borderRadius: 4 }} /></div>
    </div>)}
  </div>;
}
function Hero({ liquido, deltaPct, ganho }) {
  return <div style={{ background: `linear-gradient(155deg, ${C.panel}, ${C.bg})`, borderRadius: 20, padding: 26, marginBottom: 20, boxShadow: shadow, borderTop: `1px solid ${C.hairline}` }}>
    <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Patrimônio líquido em renda fixa</div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em' }}>{fmtBRL(liquido)}</div>
      <div style={{ paddingBottom: 8 }}><Delta value={deltaPct} size={15} /></div>
    </div>
    <div style={{ color: C.muted, fontSize: 12.5, marginTop: 6 }}>Ganho líquido acumulado: <span style={{ color: ganho >= 0 ? C.lime : C.red, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtBRL(ganho)}</span></div>
  </div>;
}
function TaxasBar({ refTaxas, status, onRefresh }){
  const data=refTaxas.dataCDI||refTaxas.atualizado||todayStr();
  const cor=status==='conectado'?C.lime:status==='carregando'?C.blue:status==='manual'?C.slate:C.red;
  return <div style={{maxWidth:1100,margin:'6px auto 0',padding:'0 12px 8px',display:'flex',alignItems:'center',gap:9,overflowX:'auto',whiteSpace:'nowrap'}}>
    <button onClick={onRefresh} title={`Atualizado: ${fmtData(data)}`} style={{background:'none',border:'none',padding:0,color:C.muted,cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:9.5}}><span style={{width:6,height:6,borderRadius:'50%',background:cor}}/>BCB<Icon name="refresh" size={11} color={C.muted}/></button>
    {[['CDI',refTaxas.cdi],['Selic',refTaxas.selic],['IPCA 12m',refTaxas.ipca]].map(([l,v])=><div key={l} style={{display:'flex',alignItems:'baseline',gap:4}}><span style={{fontSize:9.5,color:C.muted}}>{l}</span><span style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11.5,fontWeight:700}}>{fmtPct(v)}</span></div>)}
    <span style={{fontSize:9,color:C.muted}}>ref. {fmtData(data)}</span>
  </div>;
}


/* ------------------------------------------------------------------ */
/* Backup / migração de dados                                          */
/* ------------------------------------------------------------------ */
const BACKUP_VERSION = 1;
function criarBackupPayload() {
  const investments = JSON.parse(localStorage.getItem('rf-investimentos') || '[]');
  const taxas = JSON.parse(localStorage.getItem('rf-taxas-referencia') || 'null');
  return { app: 'Razão — Renda Fixa', backupVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), investments, taxas };
}
function baixarBackup() {
  const payload = criarBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `razao-renda-fixa-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function lerBackupArquivo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { try { resolve(JSON.parse(reader.result)); } catch (e) { reject(new Error('Arquivo de backup inválido.')); } };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsText(file);
  });
}

/* ------------------------------------------------------------------ */
/* App                                                                   */
/* ------------------------------------------------------------------ */
function periodReturnMD(ativos, inicio, fim, ref, today, metricsById) {
  if (!inicio || !fim || inicio >= fim) return null;
  const totalDays=Math.max(diffDays(inicio,fim),1);
  let V0=0, V1=0, CF=0, weightedCF=0;
  ativos.forEach(inv=>{
    if(inv.dataAplicacao>fim) return;
    const end=Math.min(0,0);
    const vf=valorProjetadoEm(inv,fim,ref,today);
    if(!(vf>0)) return;
    V1+=vf;
    if(inv.dataAplicacao<inicio){
      const vi=valorProjetadoEm(inv,inicio,ref,today);
      if(vi>0)V0+=vi;
    } else {
      const cf=Number(inv.valorAplicado)||0;
      CF+=cf;
      const w=Math.max(0,Math.min(1,diffDays(inv.dataAplicacao,fim)/totalDays));
      weightedCF+=cf*w;
    }
  });
  const den=V0+weightedCF;
  return den>0 ? ((V1-V0-CF)/den)*100 : null;
}
function periodLabel(period){ return period==='mes'?'Mês':period==='ano'?'Ano':'Todo o período'; }
function periodStart(period,today,ativos){
  if(period==='mes') return today.slice(0,8)+'01';
  if(period==='ano') return today.slice(0,4)+'-01-01';
  return ativos.map(i=>i.dataAplicacao).filter(Boolean).sort()[0]||today;
}
function refLogo(nome){
  const n=normalizarInstituicao(nome);
  if(n.includes('BTG')) return 'BTG';
  if(n.includes('BANCO DO BRASIL')) return 'BB';
  if(n.includes('NUBANK')) return 'NU';
  if(n.includes('INTER')) return 'inter';
  if(n.includes('ITAU')) return 'itaú';
  if(n.includes('PICPAY')) return 'picpay';
  if(n.includes('XP')) return 'XP';
  return '';
}
function Donut({items,total,centerLabel}){
  const vals=items.filter(x=>x.value>0); if(!vals.length)return <div className="empty-chart">Sem dados suficientes.</div>;
  let acc=0; const stops=vals.map(x=>{const a=acc;acc+=x.value;return `${x.color} ${(a/total)*100}% ${(acc/total)*100}%`;}).join(',');
  return <div className="donut-wrap"><div className="donut" style={{background:`conic-gradient(${stops})`}}><div className="donut-hole"><strong>{centerLabel}</strong><span>Total líquido</span></div></div><div className="donut-legend">{vals.slice(0,6).map((x,i)=><div className="legend-row" key={i}><i style={{background:x.color}}/><span>{x.name}</span><b>{fmtPct(x.value/total*100)}</b></div>)}</div></div>
}
function PortfolioLine({series}){
  if(!series || series.length<2)return <div className="empty-chart">Cadastre posições em datas diferentes para visualizar a evolução.</div>;
  const vals=series.map(x=>x.total), min=Math.min(...vals), max=Math.max(...vals), range=max-min||1, W=700,H=220,p=12;
  const pts=vals.map((v,i)=>[p+i/(vals.length-1)*(W-p*2),H-p-(v-min)/range*(H-p*2)]);
  const path=pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ');
  const area=path+` L${W-p},${H-p} L${p},${H-p} Z`;
  return <div className="chart-box"><div className="chart-top"><span>{fmtBRL(max)}</span><b>{fmtBRL(vals[vals.length-1])}</b></div><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><defs><linearGradient id="rfArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#19D8A1" stopOpacity=".35"/><stop offset="1" stopColor="#19D8A1" stopOpacity="0"/></linearGradient></defs><path d={area} fill="url(#rfArea)"/><path d={path} fill="none" stroke="#19D8A1" strokeWidth="3" vectorEffect="non-scaling-stroke"/><circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="4" fill="#19D8A1"/></svg><div className="chart-axis"><span>{series[0].date}</span><span>{series[Math.floor(series.length/2)].date}</span><span>{series.at(-1).date}</span></div></div>
}
function PerformanceBars({ativos,ref,today,period}){
  const months=[]; const end=new Date(today+'T00:00:00');
  for(let i=5;i>=0;i--){const d=new Date(end.getFullYear(),end.getMonth()-i,1); const ini=d.toISOString().slice(0,10); const last=new Date(d.getFullYear(),d.getMonth()+1,0); const fim=last>end?today:last.toISOString().slice(0,10); const r=periodReturnMD(ativos,ini,fim,ref,today,{}); const c=periodoCDIExato(ref,ini,fim); months.push({label:MESES_ABREV[d.getMonth()],r:r??0,c:c??0});}
  const max=Math.max(0.1,...months.flatMap(x=>[x.r,x.c]));
  return <div className="bars-chart"><div className="bars-grid">{months.map((m,i)=><div className="bar-group" key={i}><div className="bar-pair"><span className="bar green" style={{height:`${Math.max(3,(m.r/max)*118)}px`}} title={`Carteira ${fmtPct(m.r)}`}/><span className="bar blue" style={{height:`${Math.max(3,(m.c/max)*118)}px`}} title={`CDI ${fmtPct(m.c)}`}/></div><small>{m.label}</small></div>)}</div><div className="bar-legend"><span><i className="dot green"/> Sua carteira</span><span><i className="dot blue"/> CDI</span></div></div>
}
function ReferenceHeader({refTaxas,status,onRefresh,onNew,onDados,tab,setTab}){
 return <>
  <header className="ref-header"><div className="topbar"><div className="brand"><img src="icon-v14.png"/><div><div className="brand-name">RAZÃO</div><div className="brand-sub">RENDA FIXA</div></div></div><div className="head-actions"><button className="primary-btn" onClick={onNew}><Icon name="plus" size={17}/> Nova</button><button className="ghost-btn" onClick={onDados}>Dados</button></div></div>
  <div className="rates"><span className={`status-dot ${status==='conectado'?'live':''}`}/><span>BCB</span><button className="refresh" onClick={onRefresh}><Icon name="refresh" size={14}/></button><span className="sep"/><span>CDI <b>{fmtPct(refTaxas.cdi)}</b></span><span>Selic <b>{fmtPct(refTaxas.selic)}</b></span><span>IPCA 12m <b>{fmtPct(refTaxas.ipca)}</b></span><span className="refdate">ref. {fmtData(refTaxas.dataCDI)}</span></div>
  <nav className="desktop-tabs">{[['painel','Painel','grid'],['aplicacoes','Aplicações','wallet'],['analise','Análise','listOrdered'],['instituicoes','Instituições','listChecks']].map(([k,l,ic])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}><Icon name={ic} size={15}/>{l}</button>)}</nav>
 </header>
 </>
}
function RefCard({children,className=''}){return <section className={'ref-card '+className}>{children}</section>}
function ReferenceDashboard({ativos,totais,ganhoLiquido,metricsById,refTaxas,today,evolucao,setTab,period,setPeriod}){
 const start=periodStart(period,today,ativos), ret=periodReturnMD(ativos,start,today,refTaxas,today,metricsById), cdi=periodoCDIExato(refTaxas,start,today), diff=ret!=null&&cdi!=null?ret-cdi:null, pct=ret!=null&&cdi>0?ret/cdi*100:null;
 const grupos=grupoInstituicoes(ativos,metricsById); const total=totais.liquido||1;
 const donutItems=grupos.map((g,i)=>({name:nomeInstituicao(g.nome),value:g.liquido,color:['#157EFF','#20C997','#F6B73C','#8B5CF6','#FF5D73','#16B7D8'][i%6]}));
 const proximos=ativos.slice().sort((a,b)=>a.dataVencimento.localeCompare(b.dataVencimento)).slice(0,3);
 const alerts=[]; if(grupos[0]&&grupos[0].liquido/total>.4)alerts.push({title:'Concentração',text:`${fmtPct(grupos[0].liquido/total*100)} da carteira está em ${nomeInstituicao(grupos[0].nome)}.`}); const venc30=ativos.filter(i=>metricsById[i.id].diasRestantes>=0&&metricsById[i.id].diasRestantes<=30).reduce((s,i)=>s+metricsById[i.id].valorAtualLiquido,0); if(venc30)alerts.push({title:'Vencimentos',text:`${fmtBRL(venc30)} vencem nos próximos 30 dias.`}); const low=ativos.slice().sort((a,b)=>(metricsById[a.id].rentLiquidaMensal??99)-(metricsById[b.id].rentLiquidaMensal??99))[0]; if(low)alerts.push({title:'Revisar',text:`${low.tipo} em ${nomeInstituicao(low.instituicao)} está em ${fmtPct(metricsById[low.id].rentLiquidaMensal)} líquido/mês.`});
 const best=ativos.slice().sort((a,b)=>(metricsById[b.id].rentLiquidaMensal??-99)-(metricsById[a.id].rentLiquidaMensal??-99)).slice(0,4);
 return <div className="screen">
  <RefCard className="hero-card"><div className="hero-label">Patrimônio líquido</div><div className="hero-row"><div><div className="hero-value">{fmtBRL(totais.liquido)}</div><div className="hero-gain">+{fmtBRL(Math.max(ganhoLiquido,0)).replace('R$ ','R$ ')} <span>▲ {fmtPct(totais.aplicado>0?ganhoLiquido/totais.aplicado*100:0)}</span></div><div className="hero-note">{ativos.length} investimentos · {grupos.length} instituições</div></div><div className="hero-spark"><PortfolioLine series={evolucao}/></div></div></RefCard>
  <div className="two-col stats-row"><RefCard><div className="card-title">Rentabilidade</div><div className="period-switch">{[['mes','Mês'],['ano','Ano'],['todo','Desde o início']].map(x=><button key={x[0]} className={period===x[0]?'sel':''} onClick={()=>setPeriod(x[0])}>{x[1]}</button>)}</div><div className="metric-pair"><div><span>Sua carteira</span><strong className={ret!=null&&cdi!=null&&ret<cdi?'warn':''}>{ret==null?'—':fmtPct(ret)}</strong></div><div><span>CDI</span><strong>{cdi==null?'—':fmtPct(cdi)}</strong></div></div><div className="compare-line"><div style={{width:`${Math.min(100,Math.max(0,pct||0))}%`}}/></div><div className="compare-foot"><span>{pct==null?'—':fmtPct(pct)+' do CDI'}</span><span className={diff!=null&&diff<0?'warn':''}>{diff==null?'—':(diff>=0?'+':'')+fmtPct(diff)}</span></div></RefCard>
   <RefCard><div className="card-title">Carteira</div><div className="mini-grid"><div><span>Patrimônio bruto</span><b>{fmtBRL(totais.bruto)}</b></div><div><span>Ganho líquido</span><b className="green-txt">{fmtBRL(ganhoLiquido)}</b></div><div><span>Aplicado</span><b>{fmtBRL(totais.aplicado)}</b></div><div><span>Próximos vencimentos</span><b>{fmtBRL(proximos.reduce((s,i)=>s+metricsById[i.id].valorAtualLiquido,0))}</b></div></div></RefCard></div>
  <div className="two-col"><RefCard><div className="section-head"><div><h2>Evolução patrimonial</h2><p>Patrimônio líquido ao longo do período</p></div></div><PortfolioLine series={evolucao}/></RefCard><RefCard><div className="section-head"><div><h2>Desempenho</h2><p>Carteira comparada ao CDI</p></div></div><PerformanceBars ativos={ativos} ref={refTaxas} today={today} period={period}/></RefCard></div>
  <div className="two-col"><RefCard><div className="section-head"><div><h2>Composição</h2><p>Por instituição</p></div><button className="text-btn" onClick={()=>setTab('instituicoes')}>Ver tudo</button></div><Donut items={donutItems} total={total} centerLabel={fmtBRL(total)} /></RefCard><RefCard><div className="section-head"><div><h2>Insights</h2><p>Foco no que merece atenção</p></div></div><div className="insight-list">{alerts.slice(0,3).map((a,i)=><div className="insight" key={i}><div className={'insight-icon i'+i}>{i===0?'◔':i===1?'◫':'↗'}</div><div><b>{a.title}</b><span>{a.text}</span></div><span className="chev">›</span></div>)}</div></RefCard></div>
  <RefCard><div className="section-head"><div><h2>Melhores investimentos</h2><p>Rentabilidade líquida equivalente por mês</p></div><button className="text-btn" onClick={()=>setTab('analise')}>Ver análise</button></div><div className="rank-table">{best.map(inv=><div className="rank-row" key={inv.id}><div><b>{inv.tipo}</b><span>{nomeInstituicao(inv.instituicao)} · {descricaoTaxa(inv,refTaxas)}</span></div><strong className="green-txt">{fmtPct(metricsById[inv.id].rentLiquidaMensal)}</strong></div>)}</div></RefCard>
 </div>
}
function ReferenceApplications({ativos,metricsById,setTab,onNew,openEdit,deleteInvestment}){
 const [filter,setFilter]=useState('Todos'), [q,setQ]=useState('');
 const grupos=grupoInstituicoes(ativos,metricsById).filter(g=>{const ok=filter==='Todos'||(filter==='CDB'&&g.items.some(i=>i.tipo==='CDB'))||(filter==='LCI/LCA'&&g.items.some(i=>['LCI','LCA'].includes(i.tipo)))||(filter==='Tesouro'&&g.items.some(i=>i.tipo==='Tesouro Direto')); const text=nomeInstituicao(g.nome).toLowerCase().includes(q.toLowerCase()); return ok&&text;});
 const [selected,setSelected]=useState(null); const g=selected?grupos.find(x=>x.key===selected):null;
 if(g)return <div className="screen"><button className="back-btn" onClick={()=>setSelected(null)}>‹ Aplicações</button><RefCard className="institution-hero"><div><div className="eyebrow">Instituição</div><h1>{nomeInstituicao(g.nome)}</h1><span>{g.items.length} investimentos</span></div><div className="inst-total">{fmtBRL(g.liquido)}<small>{g.aplicado>0?fmtPct((g.liquido/g.aplicado-1)*100):'—'} acumulado</small></div></RefCard><div className="detail-list">{g.items.map(inv=>{const m=metricsById[inv.id];return <RefCard key={inv.id} className="investment-card"><div className="inv-head"><div><span className="type-pill">{inv.tipo}</span><h3>{inv.tituloTesouro||descricaoTaxa(inv,{cdi:14.9,selic:14,ipca:4.6})}</h3><p>{fmtData(inv.dataAplicacao)} → {fmtData(inv.dataVencimento)}</p></div><div className="inv-actions"><button onClick={()=>openEdit(inv)}>Editar</button><button onClick={()=>deleteInvestment(inv.id)}>Excluir</button></div></div><div className="inv-values"><div><span>Valor líquido atual</span><b>{fmtBRL(m.valorAtualLiquido)}</b></div><div><span>Rendimento líquido/mês</span><b className="green-txt">{fmtPct(m.rentLiquidaMensal)}</b></div><div><span>Ganho líquido</span><b>{fmtBRL(m.valorAtualLiquido-inv.valorAplicado)}</b></div><div><span>Vencimento</span><b>{m.diasRestantes>=0?`${m.diasRestantes} dias`:'vencido'}</b></div></div></RefCard>)}</div></div>;
 return <div className="screen"><div className="page-head"><div><h1>Aplicações</h1><p>Organizadas por instituição</p></div><div className="head-search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar"/><button className="circle-plus" onClick={onNew}>+</button></div></div><div className="chips">{['Todos','CDB','LCI/LCA','Tesouro'].map(x=><button key={x} className={filter===x?'on':''} onClick={()=>setFilter(x)}>{x}</button>)}</div><div className="subhead">Por instituição</div><div className="institution-list">{grupos.map(g=><button className="institution-row" key={g.key} onClick={()=>setSelected(g.key)}><div className="brandless"><span className="brand-dot"/ ><div><b>{nomeInstituicao(g.nome)}</b><small>{g.items.length} investimentos · {fmtPct(g.liquido/ (ativos.reduce((s,i)=>s+metricsById[i.id].valorAtualLiquido,0)||1)*100)} da carteira</small></div></div><div><strong>{fmtBRL(g.liquido)}</strong><small>{g.aplicado>0?fmtPct((g.liquido/g.aplicado-1)*100):'—'} acumulado</small></div><span>›</span></button>)}</div></div>
}
function ReferenceAnalysis({ativos,metricsById,refTaxas,today}){
 const [period,setPeriod]=useState('mes'), [group,setGroup]=useState('tipo'); const start=periodStart(period,today,ativos); const ret=periodReturnMD(ativos,start,today,refTaxas,today,metricsById), cdi=periodoCDIExato(refTaxas,start,today), diff=ret!=null&&cdi!=null?ret-cdi:null, pct=ret!=null&&cdi>0?ret/cdi*100:null;
 const groups={}; ativos.forEach(inv=>{const key=group==='tipo'?inv.tipo:normalizarInstituicao(inv.instituicao); if(!groups[key])groups[key]=[];groups[key].push(inv)}); const rows=Object.entries(groups).map(([k,items])=>{const a=items.reduce((s,i)=>s+i.valorAplicado,0), l=items.reduce((s,i)=>s+metricsById[i.id].valorAtualLiquido,0), r=a?((l/a)-1)*100:0, rm=items.reduce((s,i)=>s+(metricsById[i.id].rentLiquidaMensal||0)*metricsById[i.id].valorAtualLiquido,0)/(l||1);return {k,a,l,r,rm}}).sort((a,b)=>b.l-a.l);
 return <div className="screen"><div className="page-head"><div><h1>Análise</h1><p>Desempenho da carteira, sem visão diária</p></div></div><div className="chips wide">{[['mes','Mês'],['ano','Ano'],['todo','Desde o início']].map(x=><button key={x[0]} className={period===x[0]?'on':''} onClick={()=>setPeriod(x[0])}>{x[1]}</button>)}</div><div className="analysis-hero"><div><span>Sua carteira</span><strong>{ret==null?'—':fmtPct(ret)}</strong></div><div><span>CDI</span><strong>{cdi==null?'—':fmtPct(cdi)}</strong></div><div><span>Diferença</span><strong className={diff!=null&&diff<0?'warn':'green-txt'}>{diff==null?'—':(diff>=0?'+':'')+fmtPct(diff)}</strong></div><div><span>% do CDI</span><strong>{pct==null?'—':fmtPct(pct)}</strong></div></div><RefCard><div className="section-head"><div><h2>Carteira × CDI</h2><p>{periodLabel(period)} · retorno bruto com fluxos tratados como aportes</p></div></div><PerformanceBars ativos={ativos} ref={refTaxas} today={today} period={period}/></RefCard><RefCard><div className="section-head"><div><h2>Comparativo</h2><p>Rentabilidade líquida equivalente por mês</p></div><div className="chips compact">{[['tipo','Por tipo'],['instituicao','Por instituição']].map(x=><button key={x[0]} className={group===x[0]?'on':''} onClick={()=>setGroup(x[0])}>{x[1]}</button>)}</div></div><div className="comparison-table"><div className="ct-head"><span>{group==='tipo'?'Tipo':'Instituição'}</span><span>Atual líquido</span><span>Rent. líquida/mês</span></div>{rows.map(r=><div className="ct-row" key={r.k}><span>{group==='instituicao'?nomeInstituicao(r.k):r.k}</span><b>{fmtBRL(r.l)}</b><strong className="green-txt">{fmtPct(r.rm)}</strong></div>)}</div></RefCard></div>
}
function ReferenceInstitutions({ativos,metricsById,setTab}){
 const grupos=grupoInstituicoes(ativos,metricsById), total=grupos.reduce((s,g)=>s+g.liquido,0)||1;
 return <div className="screen"><div className="page-head"><div><h1>Instituições</h1><p>Consolidação por emissor</p></div></div><div className="two-col"><RefCard><div className="section-head"><div><h2>Alocação</h2><p>Patrimônio líquido</p></div></div><Donut items={grupos.map((g,i)=>({name:nomeInstituicao(g.nome),value:g.liquido,color:['#157EFF','#20C997','#F6B73C','#8B5CF6','#FF5D73','#16B7D8'][i%6]}))} total={total} centerLabel={fmtBRL(total)}/></RefCard><RefCard><div className="section-head"><div><h2>Emissores</h2><p>Concentração da carteira</p></div></div><div className="issuer-table">{grupos.map(g=><button key={g.key} className="issuer-row" onClick={()=>setTab('aplicacoes')}><div><b>{nomeInstituicao(g.nome)}</b><span>{g.items.length} investimentos</span></div><div><strong>{fmtBRL(g.liquido)}</strong><small>{fmtPct(g.liquido/total*100)}</small></div></button>)}</div></RefCard></div></div>
}
function App() {
 const [loading,setLoading]=useState(true),[investments,setInvestments]=useState([]),[refTaxas,setRefTaxas]=useState(defaultRef),[taxaStatus,setTaxaStatus]=useState('manual'),[historicoIndices,setHistoricoIndices]=useState({cdi:[],selic:[],status:'idle'}),[tab,setTab]=useState('painel'),[period,setPeriod]=useState('mes'),[showForm,setShowForm]=useState(false),[editingId,setEditingId]=useState(null),[form,setForm]=useState(emptyForm),[formError,setFormError]=useState(''),[showDados,setShowDados]=useState(false),[backupMsg,setBackupMsg]=useState(''),[today,setToday]=useState(todayStr()),[historicoTick,setHistoricoTick]=useState(0);
 const refreshTaxas=useCallback(()=>{setTaxaStatus('carregando');fetchTaxasBCB().then(data=>{const novo={cdi:data.cdi.valor,selic:data.selic.valor,ipca:data.ipca.valor,dataCDI:data.cdi.data,dataSelic:data.selic.data,dataIPCA:data.ipca.data,atualizado:today,fonte:'bcb'};setRefTaxas(novo);setTaxaStatus('conectado');storage.set('rf-taxas-referencia',JSON.stringify(novo));}).catch(()=>setTaxaStatus('offline'));},[today]);
 useEffect(()=>{(async()=>{const r=await storage.get('rf-investimentos');if(r)try{setInvestments(JSON.parse(r.value))}catch(e){}const r2=await storage.get('rf-taxas-referencia');if(r2)try{setRefTaxas(JSON.parse(r2.value))}catch(e){}setLoading(false);refreshTaxas()})();const it=setInterval(()=>{setToday(todayStr());setHistoricoTick(x=>x+1);refreshTaxas()},3600000);const vis=()=>{if(document.visibilityState==='visible'){setToday(todayStr());setHistoricoTick(x=>x+1);refreshTaxas()}};document.addEventListener('visibilitychange',vis);return()=>{clearInterval(it);document.removeEventListener('visibilitychange',vis)}},[]);
 const minDataCDI=useMemo(()=>investments.filter(i=>i.indexador==='CDI').map(i=>i.dataAplicacao).sort()[0]||null,[investments]), minDataSelic=useMemo(()=>investments.filter(i=>i.indexador==='SELIC').map(i=>i.dataAplicacao).sort()[0]||null,[investments]);
 useEffect(()=>{let cancel=false;(async()=>{try{const [cdi,selic]=await Promise.all([minDataCDI?fetchHistoricoDiario(12,minDataCDI,today):Promise.resolve([]),minDataSelic?fetchHistoricoDiario(11,minDataSelic,today):Promise.resolve([])]);if(!cancel)setHistoricoIndices({cdi,selic,status:'ok'})}catch(e){if(!cancel)setHistoricoIndices(h=>({...h,status:'erro'}))}})();return()=>{cancel=true}},[minDataCDI,minDataSelic,today,historicoTick]);
 const ref={...refTaxas,historicoCDI:historicoIndices.cdi,historicoSelic:historicoIndices.selic};
 const [vTick,setVTick]=useState(0); async function persist(list){setInvestments(list);await storage.set('rf-investimentos',JSON.stringify(list));setVTick(x=>x+1)}
 function openNew(){setForm(emptyForm);setEditingId(null);setFormError('');setShowForm(true)}
 function openEdit(inv){setForm({...emptyForm,...inv,valorAplicado:String(inv.valorAplicado),parametroValor:inv.parametroValor??'',aliquotaIRManual:inv.aliquotaIRManual??'',taxaOverrideAnual:inv.taxaOverrideAnual??'',carteira:inv.carteira||'',vincularA:inv.groupId||'',tituloTesouro:inv.tituloTesouro||'',quantidade:inv.quantidade??'',precoUnitarioCompra:inv.precoUnitarioCompra??'',precoUnitarioAtual:inv.precoUnitarioAtual??'',valorAtualBrutoManual:inv.valorAtualBrutoManual??'',taxaCustodiaB3:inv.taxaCustodiaB3??'0.20',tesouroCupom:inv.tesouroCupom||'Não'});setEditingId(inv.id);setFormError('');setShowForm(true)}
 function handleTipoChange(tipo){setForm(f=>({...f,tipo,isentoIR:TIPO_META[tipo].isentoDefault}))}
 function handleSave(){if(!form.instituicao.trim())return setFormError('Informe a instituição / emissor.');if(!form.dataAplicacao)return setFormError('Informe a data de aplicação.');if(!form.dataVencimento)return setFormError('Informe o vencimento.');const valor=Number(form.valorAplicado);if(!valor||valor<=0)return setFormError('Informe um valor aplicado válido.');const grupoSelecionado=form.vincularA?investments.find(inv=>inv.id===form.vincularA||(inv.groupId||inv.id)===form.vincularA):null;const groupId=grupoSelecionado?(grupoSelecionado.groupId||grupoSelecionado.id):(editingId?((investments.find(inv=>inv.id===editingId)?.groupId)||editingId):uid());const campos={instituicao:form.instituicao.trim(),tipo:form.tipo,indexador:form.indexador,parametroValor:form.parametroValor===''?0:Number(form.parametroValor),dataAplicacao:form.dataAplicacao,dataVencimento:form.dataVencimento,valorAplicado:valor,liquidez:form.liquidez,isentoIR:!!form.isentoIR,aliquotaIRManual:form.aliquotaIRManual===''?'':Number(form.aliquotaIRManual),taxaOverrideAnual:form.taxaOverrideAnual===''?'':Number(form.taxaOverrideAnual),carteira:form.carteira.trim(),observacoes:form.observacoes,groupId,tituloTesouro:form.tituloTesouro?.trim()||'',quantidade:form.quantidade===''?'':Number(form.quantidade),precoUnitarioCompra:form.precoUnitarioCompra===''?'':Number(form.precoUnitarioCompra),precoUnitarioAtual:form.precoUnitarioAtual===''?'':Number(form.precoUnitarioAtual),valorAtualBrutoManual:form.valorAtualBrutoManual===''?'':Number(form.valorAtualBrutoManual),taxaCustodiaB3:form.taxaCustodiaB3===''?0.20:Number(form.taxaCustodiaB3),tesouroCupom:form.tesouroCupom||'Não'};if(editingId)persist(investments.map(inv=>inv.id===editingId?{...inv,...campos}:inv));else persist([...investments,{id:uid(),...campos,status:'ativo',historico:[{id:uid(),data:campos.dataAplicacao,valorBruto:valor}]}]);setShowForm(false)}
 function deleteInvestment(id){if(confirm('Excluir esta aplicação?'))persist(investments.filter(i=>i.id!==id))}
 function exportarBackup(){try{baixarBackup();setBackupMsg('Backup exportado.')}catch(e){setBackupMsg('Não foi possível exportar o backup.')}}
 async function importarBackup(file){try{const payload=await lerBackupArquivo(file);if(!payload||payload.app!=='Razão — Renda Fixa'||!Array.isArray(payload.investments))throw new Error('Backup inválido.');if(!confirm(`Importar ${payload.investments.length} investimentos?`))return;await storage.set('rf-investimentos',JSON.stringify(payload.investments));if(payload.taxas)await storage.set('rf-taxas-referencia',JSON.stringify(payload.taxas));setInvestments(payload.investments);if(payload.taxas)setRefTaxas(payload.taxas);setBackupMsg(`Importados ${payload.investments.length} investimentos.`)}catch(e){setBackupMsg(e.message||'Falha ao importar backup.')}}
 const ativos=useMemo(()=>investments.filter(i=>i.status==='ativo'),[investments]), metricsById=useMemo(()=>{const m={};investments.forEach(i=>m[i.id]=calcMetrics(i,today,ref));return m},[investments,today,refTaxas,historicoIndices,vTick]);
 const totais=useMemo(()=>ativos.reduce((a,i)=>{const m=metricsById[i.id];a.aplicado+=Number(i.valorAplicado)||0;a.bruto+=m.valorAtualBruto||0;a.liquido+=m.valorAtualLiquido||0;a.estimadoVenc+=m.valorEstLiquidoVenc||0;return a},{aplicado:0,bruto:0,liquido:0,estimadoVenc:0}),[ativos,metricsById]), ganhoLiquido=totais.liquido-totais.aplicado, evolucao=useMemo(()=>buildEvolutionSeries(ativos,metricsById,today),[ativos,metricsById,today]);
 if(loading)return <div className="loading-screen">Carregando sua carteira…</div>;
 return <div className="ref-app"><ReferenceHeader refTaxas={refTaxas} status={taxaStatus} onRefresh={refreshTaxas} onNew={openNew} onDados={()=>{setBackupMsg('');setShowDados(true)}} tab={tab} setTab={setTab}/><main>{tab==='painel'&&<ReferenceDashboard ativos={ativos} totais={totais} ganhoLiquido={ganhoLiquido} metricsById={metricsById} refTaxas={ref} today={today} evolucao={evolucao} setTab={setTab} period={period} setPeriod={setPeriod}/>} {tab==='aplicacoes'&&<ReferenceApplications ativos={ativos} metricsById={metricsById} setTab={setTab} onNew={openNew} openEdit={openEdit} deleteInvestment={deleteInvestment}/>} {tab==='analise'&&<ReferenceAnalysis ativos={ativos} metricsById={metricsById} refTaxas={ref} today={today}/>} {tab==='instituicoes'&&<ReferenceInstitutions ativos={ativos} metricsById={metricsById} setTab={setTab}/>}</main><nav className="bottom-nav">{[['painel','Painel','grid'],['aplicacoes','Aplicações','wallet'],['analise','Análise','listOrdered'],['instituicoes','Mais','listChecks']].map(([k,l,ic])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}><Icon name={ic} size={18}/><span>{l}</span></button>)}</nav>{showDados&&<DadosModal onClose={()=>setShowDados(false)} onExport={exportarBackup} onImport={importarBackup} message={backupMsg}/>} {showForm&&<FormModal form={form} setForm={setForm} editingId={editingId} formError={formError} refTaxas={ref} investments={investments} onClose={()=>setShowForm(false)} onSave={handleSave} onTipoChange={handleTipoChange}/>}</div>
}

function IndicadoresCarteira({ ativos, totais, ganhoLiquido, metricsById, refTaxas, today, matrizMensal }) {
  const ganhoBruto = totais.bruto - totais.aplicado;
  const rentLiquida = totais.aplicado > 0 ? (ganhoLiquido / totais.aplicado) * 100 : 0;
  const impostoPotencial = Math.max(totais.bruto - totais.liquido, 0);
  const pesoTotal = ativos.reduce((a, inv) => a + (metricsById[inv.id]?.valorAtualBruto || 0), 0) || 1;
  const taxaMedia = ativos.reduce((a, inv) => a + (metricsById[inv.id]?.valorAtualBruto || 0) * taxaAnualEfetiva(inv, refTaxas), 0) / pesoTotal;
  const prazoMedio = ativos.reduce((a, inv) => a + (metricsById[inv.id]?.valorAtualBruto || 0) * Math.max(metricsById[inv.id]?.diasRestantes || 0, 0), 0) / pesoTotal;
  const porInstituicao = {};
  ativos.forEach(inv => { porInstituicao[inv.instituicao] = (porInstituicao[inv.instituicao] || 0) + (metricsById[inv.id]?.valorAtualBruto || 0); });
  const maiorEmissor = Object.entries(porInstituicao).sort((a,b)=>b[1]-a[1])[0];
  const pctMaiorEmissor = maiorEmissor ? (maiorEmissor[1] / pesoTotal) * 100 : 0;
  const acima100CDI = ativos.reduce((sum, inv) => {
    const p = Number(inv.parametroValor) || 0;
    return sum + (inv.indexador === 'CDI' && p > 100 ? (metricsById[inv.id]?.valorAtualBruto || 0) : 0);
  }, 0);
  const pctAcima100CDI = (acima100CDI / pesoTotal) * 100;
  const pctIsentos = ativos.reduce((sum, inv) => sum + (inv.isentoIR ? (metricsById[inv.id]?.valorAtualBruto || 0) : 0), 0) / pesoTotal * 100;
  const anoAtual = new Date(today + 'T00:00:00').getFullYear();
  const mesAtual = new Date(today + 'T00:00:00').getMonth();
  const dadosAno = matrizMensal?.dados?.[anoAtual];
  const retMes = dadosAno?.carteira?.[mesAtual] ?? null;
  const cdiMes = dadosAno?.cdi?.[mesAtual] ?? null;
  const mesesAno = dadosAno ? dadosAno.carteira.map((v, i) => v !== null && dadosAno.cdi[i] !== null ? i : null).filter(v => v !== null) : [];
  const retAno = mesesAno.length ? (mesesAno.reduce((f, i) => f * (1 + dadosAno.carteira[i] / 100), 1) - 1) * 100 : null;
  const cdiAno = mesesAno.length ? (mesesAno.reduce((f, i) => f * (1 + dadosAno.cdi[i] / 100), 1) - 1) * 100 : null;
  const pctCdiMes = retMes !== null && cdiMes > 0 ? (retMes / cdiMes) * 100 : null;
  const deltaMes = retMes !== null && cdiMes !== null ? retMes - cdiMes : null;
  const deltaAno = retAno !== null && cdiAno !== null ? retAno - cdiAno : null;
  const cards = [
    ['Patrimônio líquido', fmtBRL(totais.liquido), 'saldo líquido estimado hoje', C.lime],
    ['Ganho líquido', fmtBRL(ganhoLiquido), 'após IR/IOF', ganhoLiquido >= 0 ? C.lime : C.red],
    ['Rentabilidade líquida', fmtPct(rentLiquida), 'sobre o capital aplicado', rentLiquida >= 0 ? C.lime : C.red],
    ['Mês · carteira', retMes === null ? '—' : fmtPct(retMes), cdiMes === null ? 'CDI —' : `CDI ${fmtPct(cdiMes)}`, retMes === null ? C.muted : (retMes >= (cdiMes || 0) ? C.lime : C.red)],
    ['Ano · carteira', retAno === null ? '—' : fmtPct(retAno), cdiAno === null ? 'CDI —' : `CDI ${fmtPct(cdiAno)}`, retAno === null ? C.muted : (retAno >= (cdiAno || 0) ? C.lime : C.red)],
    ['Maior emissor', maiorEmissor ? fmtPct(pctMaiorEmissor) : '—', maiorEmissor ? maiorEmissor[0] : 'sem dados', pctMaiorEmissor > 40 ? C.red : C.blue],
  ];
  return <Panel title="Visão geral" subtitle="os principais números, sem excesso de informação">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
      {cards.map(([label, value, sub, accent]) => <div key={label} style={{ background: C.panel2, border: `1px solid ${C.hairline}`, borderRadius: 10, padding: '12px 13px', minHeight: 82 }}>
        <div style={{ color: C.muted, fontSize: 9.5, textTransform: 'uppercase', fontWeight: 800, letterSpacing: .3 }}>{label}</div>
        <div style={{ color: accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 700, marginTop: 7, lineHeight: 1.1 }}>{value}</div>
        <div style={{ color: C.muted, fontSize: 9.5, marginTop: 5, lineHeight: 1.25 }}>{sub}</div>
      </div>)}
    </div>
  </Panel>;
}

function InsightsCarteira({ ativos, metricsById, refTaxas, today }) {
  const total = ativos.reduce((s, inv) => s + (metricsById[inv.id]?.valorAtualBruto || 0), 0) || 1;
  const porInstituicao = {};
  ativos.forEach(inv => { porInstituicao[inv.instituicao] = (porInstituicao[inv.instituicao] || 0) + (metricsById[inv.id]?.valorAtualBruto || 0); });
  const maior = Object.entries(porInstituicao).sort((a,b)=>b[1]-a[1])[0];
  const maiorPct = maior ? maior[1] / total * 100 : 0;
  const agora = new Date(today + 'T00:00:00');
  const limite30 = new Date(agora); limite30.setDate(limite30.getDate()+30);
  const venc30 = ativos.filter(inv => { const d = new Date(inv.dataVencimento+'T00:00:00'); return d >= agora && d <= limite30; });
  const valorVenc30 = venc30.reduce((s,inv)=>s+(metricsById[inv.id]?.valorAtualBruto||0),0);
  const pctVenc30 = valorVenc30/total*100;
  const semLiquidez = ativos.filter(inv => String(inv.liquidez||'').toLowerCase().includes('vencimento')).reduce((s,inv)=>s+(metricsById[inv.id]?.valorAtualBruto||0),0)/total*100;
  const baixos = ativos.filter(inv => inv.indexador==='CDI' && !inv.isentoIR && (Number(inv.parametroValor)||0) > 0 && (Number(inv.parametroValor)||0) < 90)
    .sort((a,b)=>(metricsById[a.id]?.rentLiquidaMensal ?? 999)-(metricsById[b.id]?.rentLiquidaMensal ?? 999));
  const equivalentes = ativos.filter(inv => inv.isentoIR && metricsById[inv.id]?.percentualCDIEquivalente != null);
  const oportunidades = equivalentes.filter(inv => metricsById[inv.id].percentualCDIEquivalente >= 110)
    .sort((a,b)=>metricsById[b.id].percentualCDIEquivalente-metricsById[a.id].percentualCDIEquivalente);
  const melhores = ativos.slice().sort((a,b)=>(metricsById[b.id]?.rentLiquidaMensal ?? -999)-(metricsById[a.id]?.rentLiquidaMensal ?? -999)).slice(0,3);
  const piores = ativos.slice().sort((a,b)=>(metricsById[a.id]?.rentLiquidaMensal ?? 999)-(metricsById[b.id]?.rentLiquidaMensal ?? 999)).slice(0,3);
  const insights=[];
  if (maior && maiorPct >= 40) insights.push({tipo:'atenção', titulo:'Concentração elevada em um emissor', texto:`${maior[0]} representa ${fmtPct(maiorPct)} do patrimônio. Vale revisar a concentração e a cobertura do FGC, quando aplicável.`, cor:C.red});
  if (pctVenc30 >= 20 && venc30.length) insights.push({tipo:'atenção', titulo:'Vencimentos próximos', texto:`${fmtPct(pctVenc30)} da carteira vence nos próximos 30 dias. Vale planejar a destinação do dinheiro antes dos vencimentos.`, cor:C.blue});
  if (semLiquidez >= 50) insights.push({tipo:'atenção', titulo:'Liquidez concentrada no vencimento', texto:`${fmtPct(semLiquidez)} da carteira está marcada como “No vencimento”. Vale conferir se a reserva de liquidez está separada desses recursos.`, cor:C.blue});
  if (baixos.length) insights.push({tipo:'revisar', titulo:'Taxas CDI abaixo de 90%', texto:`Há ${baixos.length} aplicação${baixos.length>1?'ões':''} tributável${baixos.length>1?'eis':''} em CDI abaixo de 90%. São candidatas a revisão quando houver liquidez ou vencimento.`, cor:C.lime});
  if (oportunidades.length) insights.push({tipo:'oportunidade', titulo:'Produtos isentos com boa equivalência tributável', texto:`${oportunidades.length} aplicação${oportunidades.length>1?'ões':''} isenta${oportunidades.length>1?'s':''} equivale${oportunidades.length>1?'m':''} a pelo menos 110% do CDI em um produto tributável na alíquota aplicável. Compare também prazo, liquidez e risco do emissor.`, cor:C.blue});
  if (!insights.length) insights.push({tipo:'ok', titulo:'Nenhum alerta prioritário', texto:'A carteira não apresenta, pelos critérios atuais, um ponto de revisão que mereça destaque imediato.', cor:C.lime});
  const Row=({inv, tipo})=>{const m=metricsById[inv.id]; return <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${C.hairline}`}}><div style={{minWidth:0}}><div style={{fontSize:12.5,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.instituicao}</div><div style={{fontSize:10.5,color:C.muted}}>{descricaoTaxa(inv,refTaxas)} · {fmtBRL(m.valorAtualLiquido)}{inv.isentoIR ? ` · equiv. ${fmtPct(m.percentualCDIEquivalente)} CDI` : ''}</div></div><div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:12.5,color:m.rentLiquidaMensal>=0?C.lime:C.red}}>{fmtPct(m.rentLiquidaMensal)}<div style={{fontFamily:'inherit',fontSize:9,color:C.muted,textAlign:'right'}}>líq./mês</div></div></div>};
  return <Panel title="Insights" subtitle="pontos que merecem revisão; não são recomendações automáticas">
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:10}}> 
      <div style={{background:C.panel2,border:`1px solid ${C.hairline}`,borderRadius:10,padding:'12px 13px'}}>
        <SectionLabel icon={<Icon name="alert" size={13}/>}>Leitura automática</SectionLabel>
        <div style={{display:'flex',flexDirection:'column',gap:9}}>{insights.slice(0,3).map((x,i)=><div key={i} style={{borderLeft:`3px solid ${x.cor}`,paddingLeft:9}}><div style={{fontSize:12.5,fontWeight:800}}>{x.titulo}</div><div style={{fontSize:10.5,color:C.muted,lineHeight:1.35,marginTop:3}}>{x.texto}</div></div>)}</div>
      </div>
      <div style={{background:C.panel2,border:`1px solid ${C.hairline}`,borderRadius:10,padding:'12px 13px'}}>
        <SectionLabel icon={<Icon name="trophy" size={13}/>}>Melhores · líquido/mês</SectionLabel>
        {melhores.length ? melhores.map(inv=><Row key={inv.id} inv={inv}/>) : <div style={{color:C.muted,fontSize:11}}>Sem aplicações.</div>}
      </div>
      <div style={{background:C.panel2,border:`1px solid ${C.hairline}`,borderRadius:10,padding:'12px 13px'}}>
        <SectionLabel icon={<Icon name="chevronDown" size={13}/>}>Revisar primeiro</SectionLabel>
        {piores.length ? piores.map(inv=><Row key={inv.id} inv={inv}/>) : <div style={{color:C.muted,fontSize:11}}>Sem aplicações.</div>}
      </div>
    </div>
    <div style={{marginTop:10,color:C.muted,fontSize:10,lineHeight:1.35}}>Equivalência tributável: transforma a taxa de um produto isento na taxa bruta aproximada que um produto tributável precisaria oferecer para gerar o mesmo retorno líquido, usando a alíquota de IR aplicável ao prazo. A comparação não considera diferenças de liquidez, risco, carência ou custos.</div>
  </Panel>;
}


function monthStartISO(y,m){ return `${y}-${String(m+1).padStart(2,'0')}-01`; }
function shiftMonth(y,m,delta){ const d=new Date(y,m+1,1); d.setMonth(d.getMonth()+delta); return [d.getFullYear(),d.getMonth()-1]; }
function monthEndISO(y,m){ const d=new Date(y,m+1,0); return isoDate(d); }
function MonthlyPerformanceChart({ ativos, refTaxas, today, investments }){
  const d=new Date(today+'T00:00:00'); const points=[];
  for(let k=5;k>=0;k--){ const x=new Date(d.getFullYear(),d.getMonth()-k,1); const y=x.getFullYear(),m=x.getMonth(); const ini=monthStartISO(y,m); const fim=(y===d.getFullYear()&&m===d.getMonth())?today:monthEndISO(y,m); const r=retornoCarteiraPeriodoMD(ativos,ini,fim,refTaxas,today); const c=periodoCDIExato(refTaxas,ini,fim); points.push({label:x.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),ret:r??0,cdi:c??0}); }
  const max=Math.max(0.2,...points.flatMap(x=>[x.ret,x.cdi].map(v=>Math.abs(v))));
  return <div style={{paddingTop:4}}><div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8,alignItems:'end',height:175}}>{points.map((p,i)=><div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',gap:5}}><div style={{fontSize:8.5,color:C.muted,fontFamily:"'IBM Plex Mono',monospace"}}>{fmtPct(p.ret)}</div><div style={{width:'100%',display:'flex',gap:3,alignItems:'flex-end',justifyContent:'center',height:112}}><div title={`Carteira ${fmtPct(p.ret)}`} style={{width:16,maxWidth:'40%',height:`${Math.max(4,Math.min(100,Math.abs(p.ret)/max*100))}%`,background:'#32D583',borderRadius:'5px 5px 2px 2px'}}/><div title={`CDI ${fmtPct(p.cdi)}`} style={{width:16,maxWidth:'40%',height:`${Math.max(4,Math.min(100,Math.abs(p.cdi)/max*100))}%`,background:'#8E99A8',borderRadius:'5px 5px 2px 2px'}}/></div><div style={{fontSize:9,color:C.muted,textTransform:'capitalize'}}>{p.label}</div></div>)}</div><div style={{display:'flex',gap:14,fontSize:9.5,color:C.muted,justifyContent:'center',marginTop:4}}><span><i style={{display:'inline-block',width:7,height:7,borderRadius:2,background:'#32D583',marginRight:4}}/>Carteira</span><span><i style={{display:'inline-block',width:7,height:7,borderRadius:2,background:'#8E99A8',marginRight:4}}/>CDI</span></div></div>;
}
function DonutChart({data,total}){
  const vals=data.filter(x=>x.value>0); if(!vals.length)return <div style={{color:C.muted,fontSize:11}}>Sem dados.</div>; let acc=0; const stops=vals.map(x=>{const a=acc;acc+=x.value;return `${x.cor} ${(a/total)*100}% ${(acc/total)*100}%`;}).join(','); return <div style={{display:'flex',alignItems:'center',gap:16}}><div style={{width:150,height:150,borderRadius:'50%',background:`conic-gradient(${stops})`,position:'relative',flexShrink:0}}><div style={{position:'absolute',inset:28,borderRadius:'50%',background:C.panel,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700}}>{fmtBRL(total).replace('R$','R$')}</div><div style={{fontSize:8.5,color:C.muted}}>Patrimônio</div></div></div><div style={{display:'flex',flexDirection:'column',gap:7,minWidth:0}}>{vals.slice(0,5).map((x,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'8px 1fr auto',gap:6,alignItems:'center',fontSize:10.5}}><span style={{width:8,height:8,borderRadius:99,background:x.cor}}/><span style={{color:C.muted,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nomeInstituicao(x.name)}</span><span style={{fontFamily:"'IBM Plex Mono',monospace",color:C.text}}>{fmtPct(x.value/total*100)}</span></div>)}</div></div>;
}
function EvolutionChart({data}){ if(!data||data.length<2)return <div style={{height:190,display:'flex',alignItems:'center',justifyContent:'center',color:C.muted,fontSize:11}}>Dados insuficientes para o gráfico.</div>; const vals=data.map(x=>x.total),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1,W=640,H=190,pad=12; const pts=vals.map((v,i)=>[pad+(i/(vals.length-1))*(W-pad*2),H-pad-(v-min)/range*(H-pad*2)]); const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' '); const area=path+` L${W-pad},${H-pad} L${pad},${H-pad} Z`; return <div><div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.muted}}><span>{fmtBRL(max)}</span><span style={{fontFamily:"'IBM Plex Mono',monospace",color:C.text}}>{fmtBRL(vals[vals.length-1])}</span></div><svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:190,display:'block'}} preserveAspectRatio="none"><defs><linearGradient id="evg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#32D583" stopOpacity=".30"/><stop offset="100%" stopColor="#32D583" stopOpacity=".02"/></linearGradient></defs><path d={area} fill="url(#evg)"/><path d={path} fill="none" stroke="#32D583" strokeWidth="3" vectorEffect="non-scaling-stroke"/><circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4" fill="#32D583"/></svg><div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.muted}}><span>{data[0].date}</span><span>{data[data.length-1].date}</span></div></div>; }
function Dashboard({ ativos, totais, ganhoLiquido, metricsById, refTaxas, today, investments, setTab }){
 const [periodo,setPeriodo]=useState('mes');
 const inicio=inicioPeriodo(periodo,today,investments); const retorno=retornoCarteiraPeriodoMD(ativos,inicio,today,refTaxas,today); const cdi=periodoCDIExato(refTaxas,inicio,today); const dif=retorno!==null&&cdi!==null?retorno-cdi:null; const pct=retorno!==null&&cdi>0?retorno/cdi*100:null;
 const grupos=grupoInstituicoes(ativos,metricsById); const porInst=grupos.map(g=>({name:g.nome,value:g.liquido,cor:['#2F80ED','#32D583','#D7A84A','#A66BFF','#7C93AC','#F06A6A'][grupos.indexOf(g)%6]}));
 const evolucao=buildEvolutionSeries(ativos,metricsById,today);
 const venc30=ativos.filter(i=>metricsById[i.id].diasRestantes>=0&&metricsById[i.id].diasRestantes<=30); const venc30Val=venc30.reduce((s,i)=>s+metricsById[i.id].valorAtualLiquido,0);
 const melhores=ativos.slice().sort((a,b)=>(metricsById[b.id].rentLiquidaMensal??-999)-(metricsById[a.id].rentLiquidaMensal??-999)).slice(0,3); const revisar=ativos.slice().sort((a,b)=>(metricsById[a.id].rentLiquidaMensal??999)-(metricsById[b.id].rentLiquidaMensal??999)).slice(0,3);
 const maior=grupos[0]; const alerts=[]; if(maior&&totais.liquido>0&&maior.liquido/totais.liquido>=.4)alerts.push({t:'Concentração',d:`${fmtPct(maior.liquido/totais.liquido*100)} da carteira está em ${nomeInstituicao(maior.nome)}.`,c:'#A66BFF'}); if(venc30Val>0)alerts.push({t:'Vencimentos',d:`${fmtBRL(venc30Val)} vencem nos próximos 30 dias.`,c:'#D7A84A'}); const abaixo=ativos.filter(i=>i.indexador==='CDI'&&!i.isentoIR&&Number(i.parametroValor)>0&&Number(i.parametroValor)<90); if(abaixo.length)alerts.push({t:'Revisar',d:`${abaixo.length} posição(ões) estão abaixo de 90% do CDI.`,c:'#F06A6A'}); if(!alerts.length)alerts.push({t:'Tudo em ordem',d:'Nenhum ponto prioritário encontrado pelos critérios atuais.',c:'#32D583'});
 return <div style={{display:'flex',flexDirection:'column',gap:14}}>
   <section style={{background:'linear-gradient(145deg,#0D2034 0%,#08131F 72%)',border:'1px solid rgba(215,168,74,.30)',borderRadius:22,padding:'20px 18px',boxShadow:'0 18px 45px rgba(0,0,0,.25)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}><div><div style={{fontSize:10,color:'#D7A84A',fontWeight:800,letterSpacing:1.2,textTransform:'uppercase'}}>Patrimônio líquido</div><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:32,fontWeight:700,marginTop:5,letterSpacing:'-.045em'}}>{fmtBRL(totais.liquido)}</div><div style={{display:'flex',gap:10,alignItems:'center',marginTop:7}}><span style={{color:ganhoLiquido>=0?'#32D583':'#F06A6A',fontSize:12.5,fontWeight:800}}>{ganhoLiquido>=0?'+':''}{fmtBRL(ganhoLiquido)}</span><span style={{color:C.muted,fontSize:10.5}}>ganho acumulado</span></div></div><div style={{textAlign:'right'}}><div style={{fontSize:9,color:C.muted}}>{ativos.length} posições</div><div style={{fontSize:9,color:C.muted}}>{grupos.length} instituições</div></div></div></section>
   <section style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}><MetricTile label="Rentabilidade no mês" value={fmtPct(retornoCarteiraPeriodoMD(ativos,inicioPeriodo('mes',today,investments),today,refTaxas,today))} accent="#32D583"/><MetricTile label="Rentabilidade no ano" value={fmtPct(retornoCarteiraPeriodoMD(ativos,inicioPeriodo('ano',today,investments),today,refTaxas,today))} accent="#32D583"/><MetricTile label="% do CDI no mês" value={(()=>{const r=retornoCarteiraPeriodoMD(ativos,inicioPeriodo('mes',today,investments),today,refTaxas,today),c=periodoCDIExato(refTaxas,inicioPeriodo('mes',today,investments),today);return r!=null&&c>0?fmtPct(r/c*100):'—'})()} accent="#32D583"/><MetricTile label="A vencer em 60 dias" value={fmtBRL(ativos.filter(i=>metricsById[i.id].diasRestantes>=0&&metricsById[i.id].diasRestantes<=60).reduce((s,i)=>s+metricsById[i.id].valorAtualLiquido,0))} accent="#D7A84A"/></section>
   <section style={{background:C.panel,border:`1px solid ${C.hairline}`,borderRadius:18,padding:'15px 14px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:8}}><div><div style={{fontWeight:850,fontSize:14}}>Desempenho</div><div style={{fontSize:10,color:C.muted}}>sua carteira versus CDI</div></div><div style={{display:'flex',gap:2,background:C.panel2,borderRadius:9,padding:3}}>{PERIODOS.map(([v,l])=><button key={v} onClick={()=>setPeriodo(v)} style={{border:0,borderRadius:7,padding:'6px 9px',fontSize:9.5,fontWeight:800,cursor:'pointer',background:periodo===v?'#D7A84A':'transparent',color:periodo===v?'#10151A':C.muted}}>{l}</button>)}</div></div><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}><MetricTile label="Carteira" value={fmtPct(retorno)} accent={retorno>=0?'#32D583':'#F06A6A'}/><MetricTile label="CDI" value={fmtPct(cdi)}/><MetricTile label="Diferença" value={fmtPct(dif)} accent={dif!==null&&dif>=0?'#32D583':'#F06A6A'}/><MetricTile label="% CDI" value={pct==null?'—':fmtPct(pct)} accent={pct!=null&&pct>=100?'#32D583':'#D7A84A'}/></div></section>
   <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:12}}><Panel title="Rentabilidade" subtitle="performance mensal · carteira x CDI"><MonthlyPerformanceChart ativos={ativos} refTaxas={refTaxas} today={today} investments={investments}/></Panel><Panel title="Composição" subtitle="patrimônio por instituição"><DonutChart data={porInst} total={totais.liquido}/></Panel></section>
   <Panel title="Evolução patrimonial" subtitle="variação do patrimônio ao longo do tempo"><EvolutionChart data={evolucao}/></Panel>
   <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12}}><Panel title="Insights" subtitle="foco no que merece atenção"><div style={{display:'flex',flexDirection:'column',gap:11}}>{alerts.slice(0,3).map((x,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'9px 1fr',gap:9,alignItems:'start'}}><div style={{width:9,height:9,borderRadius:99,background:x.c,marginTop:4}}/><div><div style={{fontSize:11.5,fontWeight:850}}>{x.t}</div><div style={{fontSize:10,color:C.muted,lineHeight:1.4,marginTop:2}}>{x.d}</div></div></div>)}</div></Panel><Panel title="Melhores investimentos" subtitle="rentabilidade líquida equivalente / mês"><CompactInvestmentTable items={melhores} metricsById={metricsById} mode="best" refTaxas={refTaxas}/></Panel><Panel title="Revisar primeiro" subtitle="menor rentabilidade líquida equivalente / mês"><CompactInvestmentTable items={revisar} metricsById={metricsById} mode="review" refTaxas={refTaxas}/></Panel></section>
   <Panel title="Instituições" subtitle="consolidado por emissor"><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:7}}>{grupos.slice(0,6).map(g=><div key={g.key} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'center',padding:'9px 10px',background:C.panel2,borderRadius:10}}><div><div style={{fontSize:11.5,fontWeight:850}}>{nomeInstituicao(g.nome)}</div><div style={{fontSize:9,color:C.muted}}>{g.items.length} posições · {fmtPct(g.liquido/totais.liquido*100)}</div></div><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>{fmtBRL(g.liquido)}</div></div>)}</div></Panel>
 </div>;
}
function MetricTile({label,value,accent}){return <div style={{background:C.panel2,borderRadius:9,padding:'10px 11px'}}><div style={{fontSize:9.5,color:C.muted,textTransform:'uppercase',fontWeight:800}}>{label}</div><div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:15,fontWeight:700,color:accent||C.text,marginTop:4}}>{value}</div></div>}
function CompactInvestmentTable({items,metricsById,mode,refTaxas}){return <div>{items.map(i=>{const m=metricsById[i.id];return <div key={i.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:9,alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${C.hairline}`}}><div style={{minWidth:0}}><div style={{fontSize:11.5,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{i.tituloTesouro||i.tipo} · {i.instituicao}</div><div style={{fontSize:9.5,color:C.muted}}>{descricaoTaxa(i,refTaxas)} · {fmtBRL(m.valorAtualLiquido)}</div></div><div style={{textAlign:'right',fontFamily:"'IBM Plex Mono', monospace",fontSize:11.5,color:m.rentLiquidaMensal>=0?(mode==='best'?C.lime:C.text):C.red}}>{fmtPct(m.rentLiquidaMensal)}<div style={{fontSize:8.5,color:C.muted}}>líq./mês</div></div></div>})}</div>}

function RankingTab({ investments, ativos, metricsById, refTaxas }){
  const [filtroInst,setFiltroInst]=useState('Todas');
  const [filtroTipo,setFiltroTipo]=useState('Todos');
  const [ordenacao,setOrdenacao]=useState('rent');
  const [periodo,setPeriodo]=useState('mes');
  const hoje=todayStr(); const inicio=inicioPeriodo(periodo,hoje,investments); const cdi=periodoCDIExato(refTaxas,inicio,hoje);
  const insts=[...new Map(ativos.map(i=>[normalizarInstituicao(i.instituicao),i.instituicao])).values()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const tipos=[...new Set(ativos.map(i=>i.tipo))].sort();
  const rows=ativos.filter(i=>(filtroInst==='Todas'||i.instituicao===filtroInst)&&(filtroTipo==='Todos'||i.tipo===filtroTipo)).slice().sort((a,b)=>ordenacao==='rent'?(metricsById[b.id].rentLiquidaMensal??-999)-(metricsById[a.id].rentLiquidaMensal??-999):ordenacao==='valor'?metricsById[b.id].valorAtualLiquido-metricsById[a.id].valorAtualLiquido:a.dataVencimento.localeCompare(b.dataVencimento));
  const retorno=retornoCarteiraPeriodoMD(rows,inicio,hoje,refTaxas,hoje); const dif=retorno!==null&&cdi!==null?retorno-cdi:null; const pct=retorno!==null&&cdi>0?retorno/cdi*100:null;
  const grupos=grupoInstituicoes(rows,metricsById);
  return <div style={{display:'flex',flexDirection:'column',gap:11}}>
    <Panel title="Análises" subtitle="compare mês, ano ou todo o período — sem a visão diária">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:7}}><select style={inputStyle} value={periodo} onChange={e=>setPeriodo(e.target.value)}>{PERIODOS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select style={inputStyle} value={filtroInst} onChange={e=>setFiltroInst(e.target.value)}><option>Todas</option>{insts.map(x=><option key={x}>{x}</option>)}</select><select style={inputStyle} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}><option>Todos</option>{tipos.map(x=><option key={x}>{x}</option>)}</select><select style={inputStyle} value={ordenacao} onChange={e=>setOrdenacao(e.target.value)}><option value="rent">Rent. líquida / mês</option><option value="valor">Maior patrimônio</option><option value="vencimento">Vencimento</option></select></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginTop:9}}><MetricTile label="Carteira" value={fmtPct(retorno)} accent={retorno!==null&&retorno>=0?'#45D6A2':'#F06A6A'}/><MetricTile label="CDI" value={fmtPct(cdi)}/><MetricTile label="Diferença" value={fmtPct(dif)} accent={dif!==null&&dif>=0?'#45D6A2':'#F06A6A'}/><MetricTile label="% CDI" value={pct===null?'—':fmtPct(pct)} accent={pct!==null&&pct>=100?'#45D6A2':'#F3B55B'}/></div>
      <div style={{fontSize:9.5,color:C.muted,marginTop:8}}>Período: {fmtData(inicio)} → {fmtData(hoje)} · comparação bruta com CDI · {rows.length} posição(ões).</div>
    </Panel>
    <Panel title="Por instituição" subtitle="consolidação do filtro atual"><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:7}}>{grupos.map(g=><div key={g.key} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'center',background:C.panel2,borderRadius:11,padding:'9px 10px'}}><div><div style={{fontSize:11.5,fontWeight:800}}>{nomeInstituicao(g.nome)}</div><div style={{fontSize:9.5,color:C.muted}}>{g.items.length} posições</div></div><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11.5}}>{fmtBRL(g.liquido)}</div></div>)}</div></Panel>
    <Panel title="Comparativo" subtitle="rentabilidade líquida mensal e posição atual"><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:650}}><thead><tr>{['','Aplicação','Líquido/mês','% CDI líq.','Atual líquido','Vencimento'].map(h=><th key={h} style={{textAlign:'left',color:C.muted,fontSize:9,textTransform:'uppercase',padding:'7px 6px',borderBottom:`1px solid ${C.hairline}`,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>{rows.map(i=>{const m=metricsById[i.id];return <tr key={i.id}><td style={{padding:'7px 6px'}}><InstitutionMark nome={i.instituicao} size={27}/></td><td style={{padding:'7px 6px',fontSize:10.5}}><b>{i.tituloTesouro||i.tipo}</b><div style={{fontSize:8.8,color:C.muted}}>{nomeInstituicao(i.instituicao)} · {descricaoTaxa(i,refTaxas)}</div></td><td style={{padding:'7px 6px',fontFamily:"'IBM Plex Mono',monospace",fontSize:10.5,color:m.rentLiquidaMensal>=0?'#45D6A2':'#F06A6A'}}>{fmtPct(m.rentLiquidaMensal)}</td><td style={{padding:'7px 6px',fontFamily:"'IBM Plex Mono',monospace",fontSize:10.5}}>{m.pctCDILiquido==null?'—':fmtPct(m.pctCDILiquido)}</td><td style={{padding:'7px 6px',fontFamily:"'IBM Plex Mono',monospace",fontSize:10.5}}>{fmtBRL(m.valorAtualLiquido)}</td><td style={{padding:'7px 6px',fontSize:9.5}}>{fmtData(i.dataVencimento)}</td></tr>})}</tbody></table></div></Panel>
  </div>;
}
function exportarCSV(lista, metricsById, refTaxas) {
  const header = ['Grupo', 'Instituição', 'Tipo', 'Indexador', 'Taxa contratada', 'Carteira', 'Data aplicação', 'Data vencimento', 'Valor aplicado', 'Valor atual bruto', 'Valor atual líquido', 'Rent. líquida mensal %', 'Rent. líquida total %', '% do CDI líquido', 'Status'];
  const linhas = lista.map(inv => { const m = metricsById[inv.id]; return [grupoIdDe(inv), inv.instituicao, inv.tipo, inv.indexador, descricaoTaxa(inv, refTaxas), inv.carteira || '', fmtData(inv.dataAplicacao), fmtData(inv.dataVencimento), inv.valorAplicado.toFixed(2), m.valorAtualBruto.toFixed(2), m.valorAtualLiquido.toFixed(2), m.rentLiquidaMensal !== null ? m.rentLiquidaMensal.toFixed(2) : '', m.rentLiquidaTotal.toFixed(2), m.pctCDILiquido !== null ? m.pctCDILiquido.toFixed(1) : '', inv.status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'); });
  const csv = '\uFEFF' + [header.join(';'), ...linhas].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `razao-aplicacoes-${todayStr()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function grupoIdDe(inv) { return inv.groupId || inv.id; }
function resumoGrupo(lista, metricsById, groupId) {
  const itens = lista.filter(inv => grupoIdDe(inv) === groupId);
  return itens.reduce((acc, inv) => { const m = metricsById[inv.id]; acc.qtd += 1; acc.aplicado += inv.valorAplicado; acc.bruto += m.valorAtualBruto; acc.liquido += m.valorAtualLiquido; acc.estimado += m.valorEstLiquidoVenc; return acc; }, { qtd: 0, aplicado: 0, bruto: 0, liquido: 0, estimado: 0 });
}
function ListaAplicacoes({ investments, filtro, setFiltro, metricsById, refTaxas, expandedId, setExpandedId, openEdit, deleteInvestment, historicoDraft, setHistoricoDraft, addHistorico, resgatandoId, setResgatandoId, resgateDraft, setResgateDraft, confirmResgate, reabrir }){
  const [inst,setInst]=useState('Todas'),[tipo,setTipo]=useState('Todos'),[busca,setBusca]=useState('');
  const ativos=investments.filter(i=>i.status==='ativo'); const insts=[...new Map(investments.map(i=>[normalizarInstituicao(i.instituicao),i.instituicao])).values()].sort((a,b)=>a.localeCompare(b,'pt-BR')); const tipos=[...new Set(investments.map(i=>i.tipo))].sort();
  let lista=investments.filter(i=>{if(filtro==='Ativas'&&!(i.status==='ativo'&&metricsById[i.id].diasRestantes>=0))return false;if(filtro==='Vencidas'&&!(i.status==='ativo'&&metricsById[i.id].diasRestantes<0))return false;if(filtro==='Resgatadas'&&i.status!=='resgatado')return false;if(inst!=='Todas'&&i.instituicao!==inst)return false;if(tipo!=='Todos'&&i.tipo!==tipo)return false;if(busca&&!`${i.instituicao} ${i.tipo} ${i.indexador} ${i.tituloTesouro||''}`.toLowerCase().includes(busca.toLowerCase()))return false;return true;});
  const grupos=grupoInstituicoes(lista,metricsById);
  return <div style={{display:'flex',flexDirection:'column',gap:12}}>
    <div style={{background:C.panel,borderRadius:12,padding:10,display:'grid',gridTemplateColumns:'1.4fr repeat(3,minmax(110px,1fr))',gap:7,position:'sticky',top:120,zIndex:5}}><input style={inputStyle} placeholder="Pesquisar instituição, título..." value={busca} onChange={e=>setBusca(e.target.value)}/><select style={inputStyle} value={filtro} onChange={e=>setFiltro(e.target.value)}><option>Ativas</option><option>Vencidas</option><option>Resgatadas</option><option>Todas</option></select><select style={inputStyle} value={inst} onChange={e=>setInst(e.target.value)}><option>Todas</option>{insts.map(x=><option key={x}>{x}</option>)}</select><select style={inputStyle} value={tipo} onChange={e=>setTipo(e.target.value)}><option>Todos</option>{tipos.map(x=><option key={x}>{x}</option>)}</select></div>
    {grupos.length===0?<div style={{color:C.muted,fontSize:13,padding:20}}>Nenhuma aplicação encontrada.</div>:grupos.map(g=><InstitutionGroup key={g.key} group={g} metricsById={metricsById} expandedId={expandedId} setExpandedId={setExpandedId} openEdit={openEdit} deleteInvestment={deleteInvestment} historicoDraft={historicoDraft} setHistoricoDraft={setHistoricoDraft} addHistorico={addHistorico} resgatandoId={resgatandoId} setResgatandoId={setResgatandoId} resgateDraft={resgateDraft} setResgateDraft={setResgateDraft} confirmResgate={confirmResgate} reabrir={reabrir} refTaxas={refTaxas}/>) }
  </div>;
}
function InstitutionGroup({group,metricsById,expandedId,setExpandedId,openEdit,deleteInvestment,historicoDraft,setHistoricoDraft,addHistorico,resgatandoId,setResgatandoId,resgateDraft,setResgateDraft,confirmResgate,reabrir,refTaxas}){
  const [open,setOpen]=useState(true); return <section style={{background:C.panel,borderRadius:14,padding:13,boxShadow:shadow,borderTop:`1px solid ${C.hairline}`}}>
    <button onClick={()=>setOpen(!open)} style={{width:'100%',background:'none',border:'none',color:C.text,cursor:'pointer',display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'center',textAlign:'left',padding:0}}><div><div style={{fontSize:14,fontWeight:800}}>{nomeInstituicao(group.nome)}</div><div style={{fontSize:10,color:C.muted}}>{group.items.length} aplicação(ões) · {fmtBRL(group.liquido)} líquido · {fmtPct(group.rent)} acumulado</div></div><Icon name={open?'chevronUp':'chevronDown'} size={16} color={C.muted}/></button>
    {open&&<div style={{marginTop:10,borderTop:`1px solid ${C.hairline}`,paddingTop:6}}>{group.items.sort((a,b)=>a.dataVencimento.localeCompare(b.dataVencimento)).map(inv=><InvestmentCompact key={inv.id} inv={inv} metricsById={metricsById} expandedId={expandedId} setExpandedId={setExpandedId} openEdit={openEdit} deleteInvestment={deleteInvestment} historicoDraft={historicoDraft} setHistoricoDraft={setHistoricoDraft} addHistorico={addHistorico} resgatandoId={resgatandoId} setResgatandoId={setResgatandoId} resgateDraft={resgateDraft} setResgateDraft={setResgateDraft} confirmResgate={confirmResgate} reabrir={reabrir} refTaxas={refTaxas}/>)}</div>}
  </section>;
}
function InvestmentCompact({inv,metricsById,expandedId,setExpandedId,openEdit,deleteInvestment,historicoDraft,setHistoricoDraft,addHistorico,resgatandoId,setResgatandoId,resgateDraft,setResgateDraft,confirmResgate,reabrir,refTaxas}){
 const m=metricsById[inv.id], expanded=expandedId===inv.id, vencida=inv.status==='ativo'&&m.diasRestantes<0;
 return <div style={{padding:'10px 2px',borderBottom:`1px solid ${C.hairline}`}}><div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'start'}}><div style={{minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}><TipoTag tipo={inv.tipo}/><span style={{fontWeight:700,fontSize:12.5}}>{inv.tituloTesouro||descricaoTaxa(inv,refTaxas)}</span>{vencida&&<Badge cor={C.red} texto="Vencida"/>}</div><div style={{fontSize:9.5,color:C.muted,marginTop:3}}>{inv.tituloTesouro?`${descricaoTaxa(inv,refTaxas)} · `:''}{fmtData(inv.dataAplicacao)} → {fmtData(inv.dataVencimento)}{inv.liquidez==='Diária'?' · liquidez diária':''}</div></div><div style={{display:'flex',gap:4}}><IconBtn onClick={()=>openEdit(inv)} title="Editar"><Icon name="pencil" size={13}/></IconBtn><IconBtn onClick={()=>setExpandedId(expanded?null:inv.id)} title="Detalhes"><Icon name={expanded?'chevronUp':'chevronDown'} size={13}/></IconBtn></div></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:9}}><Mini label="Atual líquido" value={fmtBRL(m.valorAtualLiquido)} accent={C.lime}/><Mini label="Líquido/mês" value={fmtPct(m.rentLiquidaMensal)} accent={m.rentLiquidaMensal>=0?C.lime:C.red}/><Mini label="Atual bruto" value={fmtBRL(m.valorAtualBruto)}/><Mini label="Vencimento" value={fmtData(inv.dataVencimento)}/></div>
 {expanded&&<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.hairline}`,display:'grid',gap:10}}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}><Mini label="Aplicado" value={fmtBRL(inv.valorAplicado)}/><Mini label="Ganho líquido" value={fmtBRL(m.valorAtualLiquido-inv.valorAplicado)} accent={m.valorAtualLiquido>=inv.valorAplicado?C.lime:C.red}/><Mini label="Est. líquido venc." value={fmtBRL(m.valorEstLiquidoVenc)} accent={C.blue}/><Mini label="% CDI líquido" value={m.pctCDILiquido==null?'—':fmtPct(m.pctCDILiquido)}/>{inv.tipo==='Tesouro Direto'&&<Mini label="Custódia est. no venc." value={fmtBRL(m.custodiaVenc)} accent={C.muted}/>}</div>{inv.tipo==='Tesouro Direto'&&<div style={{fontSize:10,color:C.muted}}>Valor atual marcado a mercado{m.precisao!=='estimado'?` · ${m.precisao.replace('mercado-','')}`:''}. A projeção de vencimento é estimativa pela taxa contratada.</div>}<div style={{display:'flex',justifyContent:'flex-end',gap:5}}><IconBtn onClick={()=>deleteInvestment(inv.id)} title="Excluir" danger><Icon name="trash" size={13}/></IconBtn></div></div>}
 </div>;
}


function DadosModal({ onClose, onExport, onImport, message }) {
  const inputRef = React.useRef(null);
  return <div style={{position:'fixed',inset:0,background:'#000000C8',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'max(20px,env(safe-area-inset-top)) 14px 28px',overflowY:'auto',zIndex:60}}>
    <div style={{background:C.panel,borderRadius:18,width:'100%',maxWidth:520,padding:20,boxShadow:shadow,borderTop:`1px solid ${C.hairline}`}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}><div><h2 style={{fontSize:17,fontWeight:800,margin:0}}>Dados e backup</h2><div style={{fontSize:11,color:C.muted,marginTop:3}}>Use isso para migrar seus investimentos entre versões ou instalações.</div></div><button onClick={onClose} style={{background:'none',border:'none',color:C.muted,cursor:'pointer'}}><Icon name="x" size={19}/></button></div>
      <div style={{background:C.panel2,borderRadius:12,padding:13,marginBottom:10}}><div style={{fontWeight:800,fontSize:12}}>Exportar</div><div style={{fontSize:11,color:C.muted,lineHeight:1.45,margin:'5px 0 10px'}}>Cria um arquivo JSON com investimentos, aportes vinculados e taxas salvas. Guarde esse arquivo fora do aparelho.</div><button onClick={onExport} style={{background:C.lime,color:'#10160A',border:'none',borderRadius:9,padding:'9px 12px',fontWeight:800,cursor:'pointer'}}>Exportar backup</button></div>
      <div style={{background:C.panel2,borderRadius:12,padding:13}}><div style={{fontWeight:800,fontSize:12}}>Importar</div><div style={{fontSize:11,color:C.muted,lineHeight:1.45,margin:'5px 0 10px'}}>Importar substitui os dados desta instalação. Faça um backup antes se já houver aplicações cadastradas.</div><input ref={inputRef} type="file" accept="application/json,.json" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)onImport(f);e.target.value='';}}/><button onClick={()=>inputRef.current?.click()} style={{background:'transparent',color:C.text,border:`1px solid ${C.hairline}`,borderRadius:9,padding:'9px 12px',fontWeight:750,cursor:'pointer'}}>Escolher backup</button></div>
      {message&&<div style={{marginTop:12,fontSize:11.5,color:C.lime,lineHeight:1.45}}>{message}</div>}
      <div style={{marginTop:14,fontSize:10.5,color:C.muted,lineHeight:1.45}}>O backup é local: seus dados não são enviados para o GitHub nem para um servidor.</div>
    </div>
  </div>;
}

function FormModal({ form, setForm, editingId, formError, refTaxas, investments, onClose, onSave, onTipoChange }) {
  const set=(k)=>(e)=>setForm(f=>({...f,[k]:e.target.value}));
  const bancos=[...new Map(investments.map(i=>[normalizarInstituicao(i.instituicao),i.instituicao]).filter(x=>x[0])).values()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const bancoExistente=bancos.includes(form.instituicao);
  function selecionarBanco(e){const v=e.target.value;setForm(f=>({...f,instituicao:v==='__novo__'?'':v}));}
  function handleVincularChange(e){const value=e.target.value;const base=value?investments.find(inv=>inv.id===value||(inv.groupId||inv.id)===value):null;if(!base){setForm(f=>({...f,vincularA:''}));return;}setForm(f=>({...f,vincularA:base.groupId||base.id,instituicao:base.instituicao,tipo:base.tipo,indexador:base.indexador,parametroValor:base.parametroValor??'',liquidez:base.liquidez||f.liquidez,isentoIR:!!base.isentoIR,aliquotaIRManual:base.aliquotaIRManual??'',taxaOverrideAnual:base.taxaOverrideAnual??'',carteira:base.carteira||f.carteira}));}
  const efetiva=taxaAnualEfetiva({...form,parametroValor:form.parametroValor},refTaxas);
  const gruposExistentes=investments.filter(i=>i.status==='ativo'&&i.id!==editingId).reduce((acc,inv)=>{const gid=inv.groupId||inv.id;if(!acc.some(x=>x.id===gid))acc.push({id:gid,inv});return acc;},[]);
  const tesouro=form.tipo==='Tesouro Direto';
  return <div style={{position:'fixed',inset:0,background:'#000000C8',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'max(20px,env(safe-area-inset-top)) 14px 28px',overflowY:'auto',zIndex:50}}>
    <div style={{background:C.panel,borderRadius:18,width:'100%',maxWidth:680,padding:20,boxShadow:shadow,borderTop:`1px solid ${C.hairline}`}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}><div><h2 style={{fontSize:17,fontWeight:750,margin:0}}>{editingId?'Editar aplicação':'Nova aplicação'}</h2><div style={{fontSize:11,color:C.muted,marginTop:3}}>Preencha só o que é necessário; os detalhes avançados ficam abaixo.</div></div><button onClick={onClose} style={{background:'none',border:'none',color:C.muted,cursor:'pointer'}}><Icon name="x" size={19}/></button></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:13}}>
        <Field label="Instituição / emissor"><select style={inputStyle} value={bancoExistente?form.instituicao:'__novo__'} onChange={selecionarBanco}><option value="__novo__">+ Nova instituição</option>{bancos.map(b=><option key={b} value={b}>{b}</option>)}</select>{!bancoExistente&&<input style={{...inputStyle,marginTop:6}} placeholder="Nome da instituição" value={form.instituicao} onChange={set('instituicao')}/>}</Field>
        <Field label="Vincular a investimento existente" hint="Agrupa aportes sem misturar as datas de rendimento."><select style={inputStyle} value={form.vincularA||''} onChange={handleVincularChange}><option value="">Não vincular</option>{gruposExistentes.map(({id,inv})=><option key={id} value={id}>{inv.instituicao} · {inv.tipo} · {descricaoTaxa(inv,refTaxas)}</option>)}</select></Field>
        <Field label="Tipo"><select style={inputStyle} value={form.tipo} onChange={e=>onTipoChange(e.target.value)}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Indexador"><select style={inputStyle} value={form.indexador} onChange={set('indexador')}>{INDEXADORES.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label={parametroLabel(form.indexador)} hint={tesouro?`Taxa contratada: ${fmtPct(efetiva)} a.a. · mercado pode variar`:`taxa efetiva: ${fmtPct(efetiva)} a.a.`}><input type="number" style={inputStyle} placeholder="Ex.: 100 / 89 / 12,5" value={form.parametroValor} onChange={set('parametroValor')}/></Field>
        <Field label="Data de aplicação"><input type="date" style={inputStyle} value={form.dataAplicacao} onChange={set('dataAplicacao')}/></Field>
        <Field label="Vencimento"><input type="date" style={inputStyle} value={form.dataVencimento} onChange={set('dataVencimento')}/></Field>
        <Field label="Valor aplicado"><input type="number" style={inputStyle} placeholder="0,00" value={form.valorAplicado} onChange={set('valorAplicado')}/></Field>
        <Field label="Liquidez"><select style={inputStyle} value={form.liquidez} onChange={set('liquidez')}>{LIQUIDEZ_OPTS.map(t=><option key={t}>{t}</option>)}</select></Field>
        {tesouro&&<>
          <div style={{gridColumn:'1 / -1',background:C.panel2,borderRadius:12,padding:13,border:`1px solid ${C.hairline}`}}><div style={{fontSize:11,fontWeight:800,color:C.slate,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10}}>Dados específicos do Tesouro Direto</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:11}}>
            <Field label="Título"><input style={inputStyle} placeholder="Ex.: Tesouro Selic 2029" value={form.tituloTesouro} onChange={set('tituloTesouro')}/></Field>
            <Field label="Quantidade"><input type="number" step="0.001" style={inputStyle} placeholder="Ex.: 2,35" value={form.quantidade} onChange={set('quantidade')}/></Field>
            <Field label="Preço unitário de compra"><input type="number" step="0.01" style={inputStyle} placeholder="R$" value={form.precoUnitarioCompra} onChange={set('precoUnitarioCompra')}/></Field>
            <Field label="Preço unitário atual (opcional)"><input type="number" step="0.01" style={inputStyle} placeholder="do extrato/Portal" value={form.precoUnitarioAtual} onChange={set('precoUnitarioAtual')}/></Field>
            <Field label="Valor bruto atual (preferível)"><input type="number" step="0.01" style={inputStyle} placeholder="do banco/Portal" value={form.valorAtualBrutoManual} onChange={set('valorAtualBrutoManual')}/></Field>
            <Field label="Juros semestrais / fluxo"><select style={inputStyle} value={form.tesouroCupom} onChange={set('tesouroCupom')}><option>Não</option><option>Sim</option><option>Renda+ mensal</option><option>Educa+ mensal</option></select></Field>
          </div><div style={{fontSize:10.5,color:C.muted,lineHeight:1.45,marginTop:9}}>O valor atual do Tesouro é marcado a mercado. Por isso, quando você informar o valor bruto atual do extrato, ele prevalece sobre uma projeção matemática. A projeção até o vencimento usa a taxa contratada como referência e é identificada como estimativa.</div></div>
        </>}
        <Field label="IR manual (%)" hint="vazio = tabela regressiva"><input type="number" style={inputStyle} placeholder="automático" value={form.aliquotaIRManual} onChange={set('aliquotaIRManual')}/></Field>
        {!tesouro&&<Field label="Override de taxa projetada (% a.a.)" hint="opcional"><input type="number" style={inputStyle} placeholder="deixe vazio" value={form.taxaOverrideAnual} onChange={set('taxaOverrideAnual')}/></Field>}
        <Field label="Carteira / objetivo"><input style={inputStyle} placeholder="opcional" value={form.carteira} onChange={set('carteira')}/></Field>
        <label style={{display:'flex',alignItems:'center',gap:8,gridColumn:'1 / -1',fontSize:12.5}}><input type="checkbox" checked={form.isentoIR} onChange={e=>setForm(f=>({...f,isentoIR:e.target.checked}))}/><span>Isento de IR</span></label>
        <div style={{gridColumn:'1 / -1'}}><Field label="Observações"><textarea style={{...inputStyle,minHeight:58,resize:'vertical'}} placeholder="opcional" value={form.observacoes} onChange={set('observacoes')}/></Field></div>
      </div>
      {formError&&<p style={{color:C.red,fontSize:12.5,marginTop:12}}>{formError}</p>}
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}><button onClick={onClose} style={{background:'none',border:`1px solid ${C.hairline}`,color:C.muted,borderRadius:9,padding:'9px 14px',cursor:'pointer'}}>Cancelar</button><button onClick={onSave} style={{background:C.lime,border:'none',color:'#10160A',borderRadius:9,padding:'9px 16px',cursor:'pointer',fontWeight:750}}>{editingId?'Salvar':'Adicionar'}</button></div>
    </div>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
