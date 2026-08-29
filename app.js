const RAZAO_BUILD = 'v15.2-local-react';
const ReactDOM = window.ReactDOM;
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
    lime: '#22C55E', green: '#22C55E', red: '#F0555D', blue: '#2F80ED', slate: '#7C93AC',
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
const IOF_TABLE = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0];
const BANK_BRANDS = [
    ['BANCO DO BRASIL', 'BB', { bg: '#FFCC29', fg: '#0B3D2E' }],
    ['BTG PACTUAL', 'BTG', { bg: '#0B1E3D', fg: '#FFFFFF', ring: '#2F6FED' }],
    ['BTG', 'BTG', { bg: '#0B1E3D', fg: '#FFFFFF', ring: '#2F6FED' }],
    ['ITAÚ', 'Itaú', { bg: '#EC7000', fg: '#FFFFFF' }],
    ['ITAU', 'Itaú', { bg: '#EC7000', fg: '#FFFFFF' }],
    ['BRADESCO', 'Bradesco', { bg: '#CC092F', fg: '#FFFFFF' }],
    ['SANTANDER', 'Santander', { bg: '#EC0000', fg: '#FFFFFF' }],
    ['CAIXA', 'Caixa', { bg: '#005CA9', fg: '#FFCC29' }],
    ['NUBANK', 'nu', { bg: '#820AD1', fg: '#FFFFFF' }],
    ['INTER', 'inter', { bg: '#FF7A00', fg: '#FFFFFF' }],
    ['XP', 'xp', { bg: '#F5F5F5', fg: '#0A0D12' }],
    ['RICO', 'Rico', { bg: '#F4B400', fg: '#0A0D12' }],
    ['SAFRA', 'Safra', { bg: '#1E3A8A', fg: '#FFFFFF' }],
    ['DAYCOVAL', 'Daycoval', { bg: '#00A98F', fg: '#FFFFFF' }],
    ['BMG', 'BMG', { bg: '#0B5CAB', fg: '#FFFFFF' }],
    ['PICPAY', 'PicPay', { bg: '#21C25E', fg: '#0A0D12' }],
    ['PAGBANK', 'PagBank', { bg: '#00AEEF', fg: '#0A0D12' }],
    ['MERCADO PAGO', 'Mercado Pago', { bg: '#00B1EA', fg: '#0A0D12' }],
    ['GENIAL', 'Genial', { bg: '#00A3FF', fg: '#FFFFFF' }],
    ['C6', 'C6', { bg: '#1A1A1A', fg: '#FFCC29' }],
];
function normalizarInstituicao(nome) {
    return String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
        .replace(/\bS\.?\s*A\.?\b/g, '').replace(/\bSA\b/g, '').replace(/\bBANCO\b/g, '').replace(/\bBANK\b/g, '').replace(/\s+/g, ' ').trim();
}
function marcaInstituicao(nome) {
    const n = normalizarInstituicao(nome);
    const hit = BANK_BRANDS.find(([key]) => n.includes(normalizarInstituicao(key)));
    if (hit)
        return { label: hit[1], ...hit[2] };
    // Sem marca conhecida: gera uma cor estável a partir do nome.
    const palette = ['#2F80ED', '#8B5CF6', '#F59E0B', '#20C997', '#FF5D73', '#16B7D8'];
    let h = 0;
    for (let i = 0; i < n.length; i++)
        h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return { label: nomeInstituicao(nome).slice(0, 2).toUpperCase(), bg: palette[h % palette.length], fg: '#FFFFFF' };
}
function nomeInstituicao(nome) {
    const n = normalizarInstituicao(nome);
    const mapa = [
        ['BANCO DO BRASIL', 'Banco do Brasil'], ['BTG PACTUAL', 'BTG Pactual'], ['BTG', 'BTG Pactual'],
        ['ITAÚ', 'Itaú'], ['ITAU', 'Itaú'], ['BRADESCO', 'Bradesco'], ['SANTANDER', 'Santander'],
        ['CAIXA', 'Caixa'], ['NUBANK', 'Nubank'], ['INTER', 'Inter'], ['XP', 'XP'], ['RICO', 'Rico'],
        ['SAFRA', 'Safra'], ['DAYCOVAL', 'Daycoval'], ['BMG', 'BMG'], ['PICPAY', 'PicPay'], ['PAGBANK', 'PagBank'],
        ['MERCADO PAGO', 'Mercado Pago'], ['GENIAL', 'Genial'], ['C6', 'C6 Bank']
    ];
    const hit = mapa.find(([key]) => n.includes(normalizarInstituicao(key)));
    return hit ? hit[1] : String(nome || '').trim();
}
function InstitutionMark({ nome, size = 27 }) {
    const m = marcaInstituicao(nome);
    const fontSize = Math.max(9, size * (m.label.length > 3 ? 0.26 : 0.34));
    return React.createElement("div", {
        className: "inst-mark", style: {
            width: size, height: size, fontSize,
            background: m.bg, color: m.fg,
            border: m.ring ? `2px solid ${m.ring}` : '1px solid rgba(255,255,255,0.08)',
            fontStyle: /^[a-z]/.test(m.label) ? 'normal' : 'normal',
        }
    }, m.label);
}
const PERIODOS = [['mes', 'Mês'], ['ano', 'Ano'], ['todo', 'Todo o período']];
function inicioPeriodo(periodo, today, investments) {
    if (periodo === 'dia')
        return hojeAnteriorISO(today);
    if (periodo === 'mes')
        return `${today.slice(0, 8)}01`;
    if (periodo === 'ano')
        return `${today.slice(0, 4)}-01-01`;
    const datas = investments.map(i => i.dataAplicacao).filter(Boolean).sort();
    return datas[0] || today;
}
function hojeAnteriorISO(iso) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() - 1); return isoDate(d); }
function retornoPeriodoInvestimento(inv, inicio, fim, ref) {
    if (!inv || !inicio || !fim || inv.dataAplicacao > fim)
        return null;
    const inicioCalc = inv.dataAplicacao > inicio ? inv.dataAplicacao : inicio;
    const valorIni = valorProjetadoEm(inv, inicioCalc, ref, fim);
    const valorFim = valorProjetadoEm(inv, fim, ref, fim);
    if (!(valorIni > 0))
        return null;
    return (valorFim / valorIni - 1) * 100;
}
function retornoCarteiraPeriodo(ativos, inicio, fim, ref) {
    let peso = 0, retorno = 0;
    ativos.forEach(inv => { const r = retornoPeriodoInvestimento(inv, inicio, fim, ref); if (r === null)
        return; const ini = valorProjetadoEm(inv, inv.dataAplicacao > inicio ? inv.dataAplicacao : inicio, ref, fim); if (ini > 0) {
        peso += ini;
        retorno += ini * r;
    } });
    return peso ? retorno / peso : null;
}
function cdiPeriodo(ref, inicio, fim) {
    if (ref.historicoCDI?.length) {
        const ultimo = ultimaDataDisponivel(ref.historicoCDI, fim) || inicio;
        return (fatorAcumulado(ref.historicoCDI, inicio, ultimo, 1, true) - 1) * 100;
    }
    const du = diasUteisEntre(inicio, fim);
    return du ? (Math.pow(1 + ref.cdi / 100, du / 252) - 1) * 100 : null;
}
function retornoCarteiraPeriodoMD(ativos, inicio, fim, ref, today) {
    if (!ativos.length || !inicio || !fim || inicio >= fim)
        return null;
    let valorInicio = 0, valorFim = 0, fluxoPonderado = 0, fluxos = 0;
    const totalDias = Math.max(diffDays(inicio, fim), 1);
    ativos.forEach(inv => {
        if (inv.dataAplicacao > fim)
            return;
        const m = calcMetrics(inv, today, ref);
        const aplicado = Number(inv.valorAplicado) || 0;
        const entrouNoPeriodo = inv.dataAplicacao >= inicio && inv.dataAplicacao <= fim;
        if (!entrouNoPeriodo) {
            const vi = valorProjetadoEm(inv, inicio, ref, today);
            if (vi > 0)
                valorInicio += vi;
        }
        else {
            // Aporte feito no início do período é fluxo, não patrimônio inicial.
            fluxos += aplicado;
            const peso = Math.max(0, Math.min(1, diffDays(inv.dataAplicacao, fim) / totalDias));
            fluxoPonderado += aplicado * peso;
        }
        valorFim += m.valorAtualBruto || 0;
    });
    const denominador = valorInicio + fluxoPonderado;
    if (!(denominador > 0))
        return null;
    return ((valorFim - valorInicio - fluxos) / denominador) * 100;
}
function periodoCDIExato(ref, inicio, fim) {
    if (ref.historicoCDI?.length) {
        const ate = ultimaDataDisponivel(ref.historicoCDI, fim);
        if (!ate || ate <= inicio)
            return null;
        return (fatorAcumulado(ref.historicoCDI, inicio, ate, 1, false) - 1) * 100;
    }
    const du = diasUteisEntre(inicio, fim);
    return du ? (Math.pow(1 + ref.cdi / 100, du / 252) - 1) * 100 : null;
}
function grupoInstituicoes(ativos, metricsById) {
    const map = {};
    ativos.forEach(inv => { const key = normalizarInstituicao(inv.instituicao); if (!map[key])
        map[key] = { key, nome: inv.instituicao, items: [], bruto: 0, liquido: 0, aplicado: 0 }; const g = map[key], m = metricsById[inv.id]; g.items.push(inv); g.bruto += m.valorAtualBruto; g.liquido += m.valorAtualLiquido; g.aplicado += inv.valorAplicado; });
    return Object.values(map).map(g => ({ ...g, ganho: g.liquido - g.aplicado, rent: g.aplicado ? (g.liquido / g.aplicado - 1) * 100 : 0 })).sort((a, b) => b.liquido - a.liquido);
}
// Duas aplicações são a "mesma posição" quando têm a mesma instituição, tipo,
// indexador, taxa contratada, vencimento e liquidez — exatamente como bancos e
// plataformas (Gorila, XP, etc.) consolidam extratos de um mesmo título/CDB
// comprado em datas diferentes.
function chavePosicao(inv) {
    return [normalizarInstituicao(inv.instituicao), inv.tipo, inv.indexador, Number(inv.parametroValor) || 0, inv.dataVencimento, inv.liquidez || '', inv.isentoIR ? 1 : 0].join('|');
}
function agruparPosicoes(items, metricsById) {
    const map = {};
    items.forEach(inv => {
        const k = chavePosicao(inv), m = metricsById[inv.id];
        if (!map[k])
            map[k] = { key: k, tipo: inv.tipo, indexador: inv.indexador, parametroValor: inv.parametroValor, dataVencimento: inv.dataVencimento, liquidez: inv.liquidez, isentoIR: inv.isentoIR, instituicao: inv.instituicao, valorAplicado: 0, valorAtualBruto: 0, valorAtualLiquido: 0, diasRestantes: m.diasRestantes, lots: [] };
        const g = map[k];
        g.valorAplicado += Number(inv.valorAplicado) || 0;
        g.valorAtualBruto += m.valorAtualBruto || 0;
        g.valorAtualLiquido += m.valorAtualLiquido || 0;
        g.lots.push(inv);
    });
    return Object.values(map).map(g => ({ ...g, ganhoLiquido: g.valorAtualLiquido - g.valorAplicado, rentLiquidaTotal: g.valorAplicado ? (g.valorAtualLiquido / g.valorAplicado - 1) * 100 : 0 })).sort((a, b) => b.valorAtualLiquido - a.valorAtualLiquido);
}
/* ------------------------------------------------------------------ */
/* Ícones (SVG próprios — evita depender de mais um pacote externo)    */
/* ------------------------------------------------------------------ */
function Icon({ name, size = 16, color = 'currentColor' }) {
    const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
    const paths = {
        plus: React.createElement(React.Fragment, null,
            React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
            React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })),
        x: React.createElement(React.Fragment, null,
            React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
            React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })),
        pencil: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M12 20h9" }),
            React.createElement("path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" })),
        trash: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M3 6h18" }),
            React.createElement("path", { d: "M8 6V4h8v2" }),
            React.createElement("path", { d: "M19 6l-1 14H6L5 6" })),
        chevronDown: React.createElement("polyline", { points: "6 9 12 15 18 9" }),
        chevronUp: React.createElement("polyline", { points: "18 15 12 9 6 15" }),
        alert: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M12 9v4" }),
            React.createElement("path", { d: "M12 17h.01" }),
            React.createElement("path", { d: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" })),
        history: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M3 3v5h5" }),
            React.createElement("path", { d: "M3.1 13a9 9 0 1 0 2.6-7.4L3 8" }),
            React.createElement("path", { d: "M12 7v5l4 2" })),
        fileText: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }),
            React.createElement("polyline", { points: "14 2 14 8 20 8" }),
            React.createElement("line", { x1: "8", y1: "13", x2: "16", y2: "13" }),
            React.createElement("line", { x1: "8", y1: "17", x2: "16", y2: "17" }),
            React.createElement("line", { x1: "8", y1: "9", x2: "10", y2: "9" })),
        printer: React.createElement(React.Fragment, null,
            React.createElement("polyline", { points: "6 9 6 2 18 2 18 9" }),
            React.createElement("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
            React.createElement("rect", { x: "6", y: "14", width: "12", height: "8" })),
        wallet: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" }),
            React.createElement("path", { d: "M18 12h.01" })),
        check: React.createElement("path", { d: "m5 13 4 4L19 7" }),
        info: React.createElement(React.Fragment, null,
            React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
            React.createElement("path", { d: "M12 16v-4" }),
            React.createElement("path", { d: "M12 8h.01" })),
        trophy: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M8 21h8" }),
            React.createElement("path", { d: "M12 17v4" }),
            React.createElement("path", { d: "M7 4h10v5a5 5 0 0 1-10 0Z" }),
            React.createElement("path", { d: "M17 5h3a3 3 0 0 1-3 4" }),
            React.createElement("path", { d: "M7 5H4a3 3 0 0 0 3 4" })),
        refresh: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M21 12a9 9 0 1 1-3-6.7" }),
            React.createElement("polyline", { points: "21 3 21 9 15 9" })),
        grid: React.createElement(React.Fragment, null,
            React.createElement("rect", { x: "3", y: "3", width: "7", height: "7" }),
            React.createElement("rect", { x: "14", y: "3", width: "7", height: "7" }),
            React.createElement("rect", { x: "14", y: "14", width: "7", height: "7" }),
            React.createElement("rect", { x: "3", y: "14", width: "7", height: "7" })),
        listOrdered: React.createElement(React.Fragment, null,
            React.createElement("line", { x1: "10", y1: "6", x2: "21", y2: "6" }),
            React.createElement("line", { x1: "10", y1: "12", x2: "21", y2: "12" }),
            React.createElement("line", { x1: "10", y1: "18", x2: "21", y2: "18" }),
            React.createElement("path", { d: "M4 6h1v4" }),
            React.createElement("path", { d: "M4 10h2" }),
            React.createElement("path", { d: "M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" })),
        listChecks: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "m3 6 2 2 4-4" }),
            React.createElement("path", { d: "m3 14 2 2 4-4" }),
            React.createElement("line", { x1: "12", y1: "6", x2: "21", y2: "6" }),
            React.createElement("line", { x1: "12", y1: "14", x2: "21", y2: "14" })),
        home: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "m3 10 9-7 9 7" }),
            React.createElement("path", { d: "M5 9v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V9" })),
        bank: React.createElement(React.Fragment, null,
            React.createElement("polygon", { points: "12 2 21 8 3 8" }),
            React.createElement("line", { x1: "5", y1: "21", x2: "19", y2: "21" }),
            React.createElement("line", { x1: "6", y1: "18", x2: "6", y2: "10" }),
            React.createElement("line", { x1: "10", y1: "18", x2: "10", y2: "10" }),
            React.createElement("line", { x1: "14", y1: "18", x2: "14", y2: "10" }),
            React.createElement("line", { x1: "18", y1: "18", x2: "18", y2: "10" })),
        barChart: React.createElement(React.Fragment, null,
            React.createElement("line", { x1: "5", y1: "21", x2: "5", y2: "13" }),
            React.createElement("line", { x1: "12", y1: "21", x2: "12", y2: "7" }),
            React.createElement("line", { x1: "19", y1: "21", x2: "19", y2: "11" })),
        menu: React.createElement(React.Fragment, null,
            React.createElement("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
            React.createElement("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
            React.createElement("line", { x1: "4", y1: "18", x2: "20", y2: "18" })),
        search: React.createElement(React.Fragment, null,
            React.createElement("circle", { cx: "11", cy: "11", r: "7" }),
            React.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })),
        gear: React.createElement(React.Fragment, null,
            React.createElement("circle", { cx: "12", cy: "12", r: "3" }),
            React.createElement("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" })),
        chevronRight: React.createElement("polyline", { points: "9 18 15 12 9 6" }),
        download: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
            React.createElement("polyline", { points: "7 10 12 15 17 10" }),
            React.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" })),
        upload: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
            React.createElement("polyline", { points: "17 8 12 3 7 8" }),
            React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })),
        calendar: React.createElement(React.Fragment, null,
            React.createElement("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }),
            React.createElement("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
            React.createElement("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
            React.createElement("line", { x1: "3", y1: "10", x2: "21", y2: "10" })),
        pieChart: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }),
            React.createElement("path", { d: "M22 12A10 10 0 0 0 12 2v10z" })),
        trendingUp: React.createElement(React.Fragment, null,
            React.createElement("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }),
            React.createElement("polyline", { points: "17 6 23 6 23 12" })),
        coins: React.createElement(React.Fragment, null,
            React.createElement("circle", { cx: "8", cy: "8", r: "6" }),
            React.createElement("path", { d: "M18.09 10.37A6 6 0 1 1 10.34 18" }),
            React.createElement("path", { d: "M7 6h1v4" }),
            React.createElement("path", { d: "m16.71 13.88.7.71-2.82 2.82" })),
        leaf: React.createElement("path", { d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-9 4-13 4-13" }),
        flag: React.createElement(React.Fragment, null,
            React.createElement("path", { d: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" }),
            React.createElement("line", { x1: "4", y1: "22", x2: "4", y2: "15" })),
        percent: React.createElement(React.Fragment, null,
            React.createElement("line", { x1: "19", y1: "5", x2: "5", y2: "19" }),
            React.createElement("circle", { cx: "6.5", cy: "6.5", r: "2.5" }),
            React.createElement("circle", { cx: "17.5", cy: "17.5", r: "2.5" })),
        dots: React.createElement(React.Fragment, null,
            React.createElement("circle", { cx: "5", cy: "12", r: "1.5" }),
            React.createElement("circle", { cx: "12", cy: "12", r: "1.5" }),
            React.createElement("circle", { cx: "19", cy: "12", r: "1.5" })),
    };
    return React.createElement("svg", { ...p }, paths[name]);
}
/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function diffDays(d1, d2) { return Math.round((new Date(d2 + 'T00:00:00') - new Date(d1 + 'T00:00:00')) / 86400000); }
function fmtBRL(v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtData(d) { if (!d)
    return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }
function fmtPct(v) { if (v === null || v === undefined || Number.isNaN(v))
    return '—'; return (Number(v)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; }
function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function bcbDateToISO(d) { const [dd, mm, yyyy] = d.split('/'); return `${yyyy}-${mm}-${dd}`; }
function aliquotaIRPorDias(dias) { if (dias <= 180)
    return 22.5; if (dias <= 360)
    return 20; if (dias <= 720)
    return 17.5; return 15; }
function taxaComparacaoIR(inv, dias) { return inv.isentoIR ? aliquotaIRPorDias(Math.max(dias, 1)) : (inv.aliquotaIRManual !== '' && inv.aliquotaIRManual != null ? Number(inv.aliquotaIRManual) : aliquotaIRPorDias(Math.max(dias, 1))); }
function taxaAnualTributavelEquivalente(inv, ref, dias) { const taxa = taxaAnualEfetiva(inv, ref); const ir = taxaComparacaoIR(inv, dias); return inv.isentoIR ? taxa / Math.max(1 - ir / 100, 0.0001) : taxa; }
function percentualCDIEquivalente(inv, ref, dias) { const ir = taxaComparacaoIR(inv, dias); const p = Number(inv.parametroValor) || 0; if (inv.indexador === 'CDI')
    return inv.isentoIR ? p / Math.max(1 - ir / 100, 0.0001) : p; const anualTrib = taxaAnualTributavelEquivalente(inv, ref, dias); return ref.cdi > 0 ? (anualTrib / ref.cdi) * 100 : null; }
function aliquotaIOFPorDias(dias) { if (dias >= 30)
    return 0; if (dias <= 0)
    return 100; return IOF_TABLE[dias - 1]; }
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
    if (!dataInicialISO || !dataFinalISO || dataInicialISO > dataFinalISO)
        return [];
    const [yi, mi, di] = dataInicialISO.split('-');
    const [yf, mf, df] = dataFinalISO.split('-');
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?dataInicial=${di}/${mi}/${yi}&dataFinal=${df}/${mf}/${yf}&formato=json`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok)
        throw new Error('histórico BCB indisponível');
    const json = await resp.json();
    return json.map(item => ({ data: bcbDateToISO(item.data), valor: parseFloat(String(item.valor).replace(',', '.')) }))
        .filter(item => item.data && Number.isFinite(item.valor))
        .sort((a, b) => a.data.localeCompare(b.data));
}
function ultimaDataDisponivel(serie, limite) {
    if (!serie || !serie.length)
        return null;
    let ultima = null;
    for (const item of serie)
        if (item.data <= limite)
            ultima = item.data;
    return ultima;
}
function ontemISO(iso) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function pascoa(ano) {
    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T00:00:00`);
}
function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function feriadosMercadoBR(ano) {
    const out = new Set([`${ano}-01-01`, `${ano}-04-21`, `${ano}-05-01`, `${ano}-09-07`, `${ano}-10-12`, `${ano}-11-02`, `${ano}-11-15`, `${ano}-11-20`, `${ano}-12-25`]);
    const p = pascoa(ano);
    const add = (offset) => { const d = new Date(p); d.setDate(d.getDate() + offset); out.add(isoDate(d)); };
    add(-48);
    add(-47);
    add(-2);
    add(60);
    return out;
}
function ehDiaUtilMercado(d) { const dow = d.getDay(); if (dow === 0 || dow === 6)
    return false; return !feriadosMercadoBR(d.getFullYear()).has(isoDate(d)); }
function diasUteisProvisorios(d1, d2) {
    if (!d1 || !d2 || d2 <= d1)
        return 0;
    const start = new Date(d1 + 'T00:00:00'), end = new Date(d2 + 'T00:00:00');
    let n = 0, cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    while (cur <= end) {
        if (ehDiaUtilMercado(cur))
            n++;
        cur.setDate(cur.getDate() + 1);
    }
    return n;
}
function diasUteisEntre(d1, d2) {
    const start = new Date(d1 + 'T00:00:00'), end = new Date(d2 + 'T00:00:00');
    if (end <= start)
        return 0;
    let count = 0;
    const cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    while (cur <= end) {
        if (ehDiaUtilMercado(cur))
            count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}
function parametroLabel(indexador) {
    switch (indexador) {
        case 'CDI': return '% do CDI';
        case 'SELIC': return '% da Selic';
        case 'IPCA+': return 'Spread sobre o IPCA (% a.a.)';
        case 'Prefixado': return 'Taxa fixa (% a.a.)';
        default: return 'Taxa estimada (% a.a.)';
    }
}
function taxaAnualEfetiva(inv, ref) {
    const p = Number(inv.parametroValor) || 0;
    let rate;
    if (inv.indexador === 'CDI')
        rate = ref.cdi * (p / 100);
    else if (inv.indexador === 'SELIC')
        rate = ref.selic * (p / 100);
    else if (inv.indexador === 'IPCA+')
        rate = ((1 + ref.ipca / 100) * (1 + p / 100) - 1) * 100;
    else if (inv.indexador === 'Prefixado')
        rate = p;
    else
        rate = p;
    if (inv.taxaOverrideAnual !== '' && inv.taxaOverrideAnual != null && !Number.isNaN(Number(inv.taxaOverrideAnual)))
        rate = Number(inv.taxaOverrideAnual);
    return rate;
}
function descricaoTaxa(inv, ref) {
    const p = Number(inv.parametroValor) || 0;
    const efetiva = taxaAnualEfetiva(inv, ref);
    if (inv.indexador === 'CDI')
        return `${p}% do CDI (≈ ${fmtPct(efetiva)} a.a.)`;
    if (inv.indexador === 'SELIC')
        return `${p}% da Selic (≈ ${fmtPct(efetiva)} a.a.)`;
    if (inv.indexador === 'IPCA+')
        return `IPCA+ ${p}% (≈ ${fmtPct(efetiva)} a.a.)`;
    if (inv.indexador === 'Prefixado')
        return `${fmtPct(p)} a.a. (prefixado)`;
    return `${fmtPct(p)} a.a.`;
}
function taxaCurta(inv) {
    const p = Number(inv.parametroValor) || 0;
    if (inv.indexador === 'CDI')
        return `${p}% do CDI`;
    if (inv.indexador === 'SELIC')
        return `${p}% da Selic`;
    if (inv.indexador === 'IPCA+')
        return `IPCA+ ${fmtPct(p)}`;
    return `${fmtPct(p)} a.a.`;
}
function tituloInvestimento(inv) {
    if (inv.tituloTesouro)
        return inv.tituloTesouro;
    return `${inv.tipo} ${taxaCurta(inv)}`;
}
function pctCDIGrupo(items, metricsById, ref) {
    let num = 0, den = 0;
    items.forEach(inv => {
        const m = metricsById[inv.id];
        if (!m || !(m.valorAtualLiquido > 0))
            return;
        const p = percentualCDIEquivalente(inv, ref, Math.max(m.diasCorridos, 1));
        if (p == null)
            return;
        num += p * m.valorAtualLiquido;
        den += m.valorAtualLiquido;
    });
    return den > 0 ? num / den : null;
}
function bucketPrazo(diasRestantes) {
    if (diasRestantes == null)
        return 'Sem data';
    if (diasRestantes < 0)
        return 'Vencido';
    if (diasRestantes <= 180)
        return 'Até 6 meses';
    if (diasRestantes <= 365)
        return '6 a 12 meses';
    if (diasRestantes <= 730)
        return '1 a 2 anos';
    return 'Mais de 2 anos';
}
function calcMetrics(inv, today, ref) {
    const diasCorridos = Math.max(diffDays(inv.dataAplicacao, today), 0);
    const diasTotais = Math.max(diffDays(inv.dataAplicacao, inv.dataVencimento), 1);
    const diasRestantes = diffDays(today, inv.dataVencimento);
    const taxaAnual = taxaAnualEfetiva(inv, ref);
    const hist = (inv.historico || []).slice().sort((a, b) => a.data.localeCompare(b.data));
    let ancoraData = inv.dataAplicacao, ancoraValor = inv.valorAplicado;
    hist.forEach(h => { if (h.data <= today) {
        ancoraData = h.data;
        ancoraValor = h.valorBruto;
    } });
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
    }
    else if (inv.tipo === 'Tesouro Direto' && Number(inv.quantidade) > 0 && Number(inv.precoUnitarioAtual) > 0) {
        valorAtualBruto = Number(inv.quantidade) * Number(inv.precoUnitarioAtual);
        precisao = 'mercado-unitario';
    }
    else if (!usaOverride && inv.indexador === 'CDI' && ref.historicoCDI && ref.historicoCDI.length) {
        const dataRendimento = ultimaDataCDI || ancoraData;
        valorAtualBruto = ancoraValor * fatorAcumulado(ref.historicoCDI, ancoraData, dataRendimento, (Number(inv.parametroValor) || 0) / 100, ancoraData === inv.dataAplicacao);
        // O CDI diário do SGS pode aparecer com defasagem de um dia útil.
        // Enquanto o dado oficial não chega, provisionamos apenas os dias úteis
        // encerrados (até ontem), usando a última taxa anualizada conhecida.
        const diasProv = diasUteisProvisorios(dataRendimento, ontemISO(today));
        if (diasProv > 0)
            valorAtualBruto *= Math.pow(1 + taxaAnual / 100, diasProv / 252);
        precisao = diasProv > 0 ? 'historico-provisorio' : 'historico';
    }
    else if (!usaOverride && inv.indexador === 'SELIC' && ref.historicoSelic && ref.historicoSelic.length) {
        const dataRendimento = ultimaDataSelic || ancoraData;
        valorAtualBruto = ancoraValor * fatorAcumulado(ref.historicoSelic, ancoraData, dataRendimento, (Number(inv.parametroValor) || 0) / 100, ancoraData === inv.dataAplicacao);
        const diasProv = diasUteisProvisorios(dataRendimento, ontemISO(today));
        if (diasProv > 0)
            valorAtualBruto *= Math.pow(1 + taxaAnual / 100, diasProv / 252);
        precisao = diasProv > 0 ? 'historico-provisorio' : 'historico';
    }
    else {
        // Prefixados usam base DU/252. Para uma nova aplicação, a data de liquidação
        // é inclusiva; para um saldo informado por extrato, o saldo já representa
        // aquele dia e a remuneração começa no próximo pregão.
        const duPrefixado = diasUteisEntre(ancoraData, today) + (inv.indexador === 'Prefixado' && ancoraData === inv.dataAplicacao && ehDiaUtilMercado(new Date(ancoraData + 'T00:00:00')) ? 1 : 0);
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
    const custodiaVenc = inv.tipo === 'Tesouro Direto' ? valorEstBrutoVenc * (Number(inv.taxaCustodiaB3 || 0.20) / 100) * (Math.max(duRestantes, 0) / 252) : 0;
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
        events.push({ date: inv.dataAplicacao, id: inv.id, valor: inv.valorAplicado, aplicado: inv.valorAplicado });
        (inv.historico || []).forEach(h => events.push({ date: h.data, id: inv.id, valor: h.valorBruto }));
        if (metricsById && metricsById[inv.id])
            events.push({ date: today, id: inv.id, valor: metricsById[inv.id].valorAtualBruto });
    });
    const dates = [...new Set(events.map(e => e.date))].sort();
    const last = {}, aplicadoPorId = {};
    return dates.map(date => {
        events.filter(e => e.date === date).forEach(e => {
            last[e.id] = e.valor;
            if (e.aplicado != null)
                aplicadoPorId[e.id] = e.aplicado;
        });
        const total = Object.values(last).reduce((a, b) => a + b, 0);
        const aplicado = Object.values(aplicadoPorId).reduce((a, b) => a + b, 0);
        return { date: fmtData(date), total, aplicado };
    });
}
function valorProjetadoEm(inv, dataAlvo, ref, today) {
    const hist = (inv.historico || []).slice().sort((a, b) => a.data.localeCompare(b.data));
    let ancoraData = inv.dataAplicacao, ancoraValor = inv.valorAplicado;
    hist.forEach(h => { if (h.data <= dataAlvo) {
        ancoraData = h.data;
        ancoraValor = h.valorBruto;
    } });
    const usaOverride = inv.taxaOverrideAnual !== '' && inv.taxaOverrideAnual != null && !Number.isNaN(Number(inv.taxaOverrideAnual));
    const passado = dataAlvo <= today;
    if (!usaOverride && passado && inv.indexador === 'CDI' && ref.historicoCDI && ref.historicoCDI.length) {
        const ultimo = ultimaDataDisponivel(ref.historicoCDI, dataAlvo) || ancoraData;
        let valor = ancoraValor * fatorAcumulado(ref.historicoCDI, ancoraData, ultimo, (Number(inv.parametroValor) || 0) / 100, ancoraData === inv.dataAplicacao);
        const limite = dataAlvo < today ? dataAlvo : ontemISO(today);
        const diasProv = diasUteisProvisorios(ultimo, limite);
        if (diasProv > 0)
            valor *= Math.pow(1 + taxaAnualEfetiva(inv, ref) / 100, diasProv / 252);
        return valor;
    }
    if (!usaOverride && passado && inv.indexador === 'SELIC' && ref.historicoSelic && ref.historicoSelic.length) {
        const ultimo = ultimaDataDisponivel(ref.historicoSelic, dataAlvo) || ancoraData;
        let valor = ancoraValor * fatorAcumulado(ref.historicoSelic, ancoraData, ultimo, (Number(inv.parametroValor) || 0) / 100, ancoraData === inv.dataAplicacao);
        const limite = dataAlvo < today ? dataAlvo : ontemISO(today);
        const diasProv = diasUteisProvisorios(ultimo, limite);
        if (diasProv > 0)
            valor *= Math.pow(1 + taxaAnualEfetiva(inv, ref) / 100, diasProv / 252);
        return valor;
    }
    let du = diasUteisEntre(ancoraData, dataAlvo);
    if (inv.indexador === 'Prefixado' && ancoraData === inv.dataAplicacao && ehDiaUtilMercado(new Date(ancoraData + 'T00:00:00')))
        du += 1;
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
        if (fimMes >= hoje)
            break;
        const dataStr = fimMes.toISOString().slice(0, 10);
        pontos.push({ label: fimMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), bruto: valorProjetadoEm(inv, dataStr, ref, today) });
        m++;
        if (m > 11) {
            m = 0;
            y++;
        }
    }
    pontos.push({ label: 'hoje', bruto: valorProjetadoEm(inv, today, ref, today) });
    return pontos;
}
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function buildRentabilidadeMensalMatrix(ativos, ref, today) {
    if (!ativos.length)
        return { anos: [], dados: {} };
    const inicioMaisAntigo = ativos.map(i => i.dataAplicacao).sort()[0];
    const start = new Date(inicioMaisAntigo + 'T00:00:00');
    const hoje = new Date(today + 'T00:00:00');
    const anos = {};
    let y = start.getFullYear(), m = start.getMonth();
    while (true) {
        const inicioMes = new Date(y, m, 1);
        const fimMes = new Date(y, m + 1, 0);
        if (inicioMes > hoje)
            break;
        const fimEfetivo = fimMes > hoje ? hoje : fimMes;
        const inicioStr = inicioMes.toISOString().slice(0, 10);
        const fimStr = fimEfetivo.toISOString().slice(0, 10);
        let somaPeso = 0, somaPesoRetorno = 0;
        ativos.forEach(inv => {
            if (inv.dataAplicacao > fimStr)
                return;
            const inicioCalc = inv.dataAplicacao > inicioStr ? inv.dataAplicacao : inicioStr;
            const valorInicio = valorProjetadoEm(inv, inicioCalc, ref, today);
            const valorFim = valorProjetadoEm(inv, fimStr, ref, today);
            if (valorInicio > 0) {
                somaPeso += valorInicio;
                somaPesoRetorno += valorInicio * (valorFim / valorInicio - 1);
            }
        });
        const retornoCarteira = somaPeso > 0 ? (somaPesoRetorno / somaPeso) * 100 : null;
        const retornoCDI = ref.historicoCDI && ref.historicoCDI.length ? (fatorAcumulado(ref.historicoCDI, inicioStr, fimStr, 1, true) - 1) * 100 : null;
        if (!anos[y])
            anos[y] = { carteira: Array(12).fill(null), cdi: Array(12).fill(null) };
        anos[y].carteira[m] = retornoCarteira;
        anos[y].cdi[m] = retornoCDI;
        m++;
        if (m > 11) {
            m = 0;
            y++;
        }
    }
    const anosOrdenados = Object.keys(anos).map(Number).sort((a, b) => b - a);
    return { anos: anosOrdenados, dados: anos };
}
function buildAlocacaoInstituicao(ativos, metricsById) {
    const map = {};
    ativos.forEach(inv => {
        const m = metricsById[inv.id];
        if (!map[inv.instituicao])
            map[inv.instituicao] = { total: 0, aplicado: 0, ganho: 0 };
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
        if (!resp.ok)
            throw new Error('BCB indisponível: ' + chave);
        const json = await resp.json();
        const item = json[0];
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
    return React.createElement("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 20, background: meta.cor + '1C', color: meta.cor, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' } },
        React.createElement("span", { style: { width: 5, height: 5, borderRadius: '50%', background: meta.cor } }),
        tipo);
}
function Delta({ value, size = 12 }) {
    if (value === null || value === undefined || Number.isNaN(value))
        return React.createElement("span", { style: { color: C.muted, fontSize: size } }, "\u2014");
    const up = value >= 0;
    return React.createElement("span", { style: { color: up ? C.lime : C.red, fontSize: size, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 3 } },
        up ? '▲' : '▼',
        " ",
        fmtPct(Math.abs(value)));
}
function MaturityBar({ diasCorridos, diasTotais, vencida }) {
    const pct = Math.min(100, Math.max(0, (diasCorridos / diasTotais) * 100));
    return React.createElement("div", { style: { height: 4, background: C.panel2, borderRadius: 2, overflow: 'hidden' } },
        React.createElement("div", { style: { height: '100%', width: pct + '%', background: vencida ? C.red : C.lime } }));
}
function Field({ label, children, hint }) {
    return React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        React.createElement("span", { style: { color: C.muted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 } }, label),
        children,
        hint && React.createElement("span", { style: { color: C.muted, fontSize: 11 } }, hint));
}
const inputStyle = { background: C.bg, border: `1px solid ${C.hairline}`, borderRadius: 8, padding: '9px 11px', color: C.text, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: 13.5, width: '100%', outline: 'none' };
function StatCard({ label, value, delta, sub, accent }) {
    return React.createElement("div", { style: { background: C.panel, borderRadius: 16, padding: '16px 18px', boxShadow: shadow, borderTop: `1px solid ${C.hairline}` } },
        React.createElement("div", { style: { color: C.muted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 } }, label),
        React.createElement("div", { style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 600, color: accent || C.text, letterSpacing: '-0.01em' } }, value),
        React.createElement("div", { style: { marginTop: 6, minHeight: 16 } }, delta !== undefined ? React.createElement(Delta, { value: delta }) : sub ? React.createElement("span", { style: { color: C.muted, fontSize: 11.5 } }, sub) : null));
}
function Badge({ cor, texto, icon }) { return React.createElement("span", { style: { background: cor + '1C', color: cor, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 } },
    icon,
    texto); }
function Mini({ label, value, accent }) { return React.createElement("div", null,
    React.createElement("div", { style: { color: C.muted, fontSize: 10, textTransform: 'uppercase', fontWeight: 700 } }, label),
    React.createElement("div", { style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13.5, color: accent || C.text } }, value)); }
function SectionLabel({ children, icon }) { return React.createElement("div", { style: { color: C.lime, fontSize: 10.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' } },
    icon,
    children); }
function IconBtn({ children, onClick, title, danger }) { return React.createElement("button", { onClick: onClick, title: title, style: { background: C.panel2, border: 'none', color: danger ? C.red : C.mutedLight, borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } }, children); }
function Panel({ title, subtitle, children, right }) {
    return React.createElement("section", { style: { background: C.panel, borderRadius: 16, padding: '20px 20px 8px', boxShadow: shadow, borderTop: `1px solid ${C.hairline}` } },
        React.createElement("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
            React.createElement("div", null,
                React.createElement("h3", { style: { fontSize: 13.5, fontWeight: 700, margin: 0, color: C.text } }, title),
                subtitle && React.createElement("p", { style: { color: C.muted, fontSize: 12, marginTop: 4, marginBottom: 14 } }, subtitle)),
            right),
        React.createElement("div", { style: { marginTop: subtitle ? 0 : 14, paddingBottom: 16 } }, children));
}
function PieBlock({ data }) {
    const vals = data.filter(d => d.value > 0);
    if (!vals.length)
        return React.createElement("p", { style: { color: C.muted, fontSize: 13 } }, "Sem dados.");
    const total = vals.reduce((a, b) => a + b.value, 0) || 1;
    let acc = 0;
    const stops = vals.map(d => { const s = (acc / total) * 100; acc += d.value; const e = (acc / total) * 100; return `${d.cor} ${s}% ${e}%`; }).join(', ');
    return React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' } },
        React.createElement("div", { style: { width: 150, height: 150, borderRadius: '50%', background: `conic-gradient(${stops})`, position: 'relative', flexShrink: 0 } },
            React.createElement("div", { style: { position: 'absolute', inset: 26, borderRadius: '50%', background: C.panel } })),
        React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, vals.map((d, i) => React.createElement("div", { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 } },
            React.createElement("span", { style: { width: 10, height: 10, borderRadius: 3, background: d.cor, flexShrink: 0 } }),
            React.createElement("span", { style: { color: C.muted } }, d.name),
            React.createElement("span", { style: { fontFamily: "'IBM Plex Mono', monospace", marginLeft: 16, color: C.text } }, fmtBRL(d.value))))));
}
function MiniLineChart({ data, valueKey, labelKey, height = 220, color }) {
    if (!data || data.length < 2)
        return React.createElement("div", { style: { height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 } }, "Dados insuficientes ainda.");
    const values = data.map(d => d[valueKey]);
    const min = Math.min(...values), max = Math.max(...values);
    const range = (max - min) || 1;
    const W = 600, H = 200, pad = 6;
    const pts = data.map((d, i) => { const x = pad + (i / (data.length - 1)) * (W - pad * 2); const y = pad + (1 - (d[valueKey] - min) / range) * (H - pad * 2); return [x, y]; });
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const areaPath = path + ` L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;
    return React.createElement("div", null,
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 10.5, marginBottom: 2 } },
            React.createElement("span", null, fmtBRL(max)),
            React.createElement("span", { style: { fontFamily: "'IBM Plex Mono', monospace", color: C.text } }, fmtBRL(values[values.length - 1]))),
        React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: '100%', height, display: 'block' }, preserveAspectRatio: "none" },
            React.createElement("path", { d: areaPath, fill: color + '22', stroke: "none" }),
            React.createElement("path", { d: path, fill: "none", stroke: color, strokeWidth: "2.5", vectorEffect: "non-scaling-stroke" })),
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 10.5, marginTop: 2 } },
            React.createElement("span", null, data[0][labelKey]),
            React.createElement("span", null, data[data.length - 1][labelKey])));
}
function SimpleBarsVertical({ data, labelKey, valueKey, color }) {
    const max = Math.max(...data.map(d => d[valueKey]), 1);
    return React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 190 } }, data.map((d, i) => React.createElement("div", { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 } },
        React.createElement("span", { style: { fontSize: 9, color: C.muted, fontFamily: "'IBM Plex Mono', monospace" } }, d[valueKey] > 0 ? (d[valueKey] / 1000).toFixed(0) + 'k' : ''),
        React.createElement("div", { style: { width: '100%', maxWidth: 30, height: Math.max((d[valueKey] / max) * 140, d[valueKey] > 0 ? 3 : 0), background: color, borderRadius: '4px 4px 0 0' }, title: fmtBRL(d[valueKey]) }),
        React.createElement("span", { style: { fontSize: 9.5, color: C.muted, whiteSpace: 'nowrap' } }, d[labelKey]))));
}
function SimpleBarsHorizontal({ data, labelKey, valueKey, color }) {
    const max = Math.max(...data.map(d => d[valueKey]), 1);
    return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, data.map((d, i) => React.createElement("div", { key: i },
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.text, marginBottom: 3 } },
            React.createElement("span", null, d[labelKey]),
            React.createElement("span", { style: { fontFamily: "'IBM Plex Mono', monospace", color: C.muted } }, fmtBRL(d[valueKey]))),
        React.createElement("div", { style: { height: 8, background: C.panel2, borderRadius: 4, overflow: 'hidden' } },
            React.createElement("div", { style: { height: '100%', width: `${Math.max((d[valueKey] / max) * 100, 2)}%`, background: color, borderRadius: 4 } })))));
}
function Hero({ liquido, deltaPct, ganho }) {
    return React.createElement("div", { style: { background: `linear-gradient(155deg, ${C.panel}, ${C.bg})`, borderRadius: 20, padding: 26, marginBottom: 20, boxShadow: shadow, borderTop: `1px solid ${C.hairline}` } },
        React.createElement("div", { style: { color: C.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 } }, "Patrim\u00F4nio l\u00EDquido em renda fixa"),
        React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' } },
            React.createElement("div", { style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em' } }, fmtBRL(liquido)),
            React.createElement("div", { style: { paddingBottom: 8 } },
                React.createElement(Delta, { value: deltaPct, size: 15 }))),
        React.createElement("div", { style: { color: C.muted, fontSize: 12.5, marginTop: 6 } },
            "Ganho l\u00EDquido acumulado: ",
            React.createElement("span", { style: { color: ganho >= 0 ? C.lime : C.red, fontFamily: "'IBM Plex Mono', monospace" } }, fmtBRL(ganho))));
}
function TaxasBar({ refTaxas, status, onRefresh }) {
    const data = refTaxas.dataCDI || refTaxas.atualizado || todayStr();
    const cor = status === 'conectado' ? C.lime : status === 'carregando' ? C.blue : status === 'manual' ? C.slate : C.red;
    return React.createElement("div", { style: { maxWidth: 1100, margin: '6px auto 0', padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 9, overflowX: 'auto', whiteSpace: 'nowrap' } },
        React.createElement("button", { onClick: onRefresh, title: `Atualizado: ${fmtData(data)}`, style: { background: 'none', border: 'none', padding: 0, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5 } },
            React.createElement("span", { style: { width: 6, height: 6, borderRadius: '50%', background: cor } }),
            "BCB",
            React.createElement(Icon, { name: "refresh", size: 11, color: C.muted })),
        [['CDI', refTaxas.cdi], ['Selic', refTaxas.selic], ['IPCA 12m', refTaxas.ipca]].map(([l, v]) => React.createElement("div", { key: l, style: { display: 'flex', alignItems: 'baseline', gap: 4 } },
            React.createElement("span", { style: { fontSize: 9.5, color: C.muted } }, l),
            React.createElement("span", { style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, fontWeight: 700 } }, fmtPct(v)))),
        React.createElement("span", { style: { fontSize: 9, color: C.muted } },
            "ref. ",
            fmtData(data)));
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
    a.download = `razao-renda-fixa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function lerBackupArquivo(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => { try {
            resolve(JSON.parse(reader.result));
        }
        catch (e) {
            reject(new Error('Arquivo de backup inválido.'));
        } };
        reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
        reader.readAsText(file);
    });
}
/* ------------------------------------------------------------------ */
/* App                                                                   */
/* ------------------------------------------------------------------ */
function periodReturnMD(ativos, inicio, fim, ref, today, metricsById) {
    if (!inicio || !fim || inicio >= fim)
        return null;
    const totalDays = Math.max(diffDays(inicio, fim), 1);
    let V0 = 0, V1 = 0, CF = 0, weightedCF = 0;
    ativos.forEach(inv => {
        if (inv.dataAplicacao > fim)
            return;
        const end = Math.min(0, 0);
        const vf = valorProjetadoEm(inv, fim, ref, today);
        if (!(vf > 0))
            return;
        V1 += vf;
        if (inv.dataAplicacao < inicio) {
            const vi = valorProjetadoEm(inv, inicio, ref, today);
            if (vi > 0)
                V0 += vi;
        }
        else {
            const cf = Number(inv.valorAplicado) || 0;
            CF += cf;
            const w = Math.max(0, Math.min(1, diffDays(inv.dataAplicacao, fim) / totalDays));
            weightedCF += cf * w;
        }
    });
    const den = V0 + weightedCF;
    return den > 0 ? ((V1 - V0 - CF) / den) * 100 : null;
}
// Ganho financeiro em R$ no período (mesma lógica de fluxos do Modified Dietz,
// mas sem dividir pela base ponderada) — equivalente ao "Resultado Financeiro"
// que relatórios de carteira (Gorila, corretoras) mostram por janela de tempo.
function periodGainBRL(ativos, inicio, fim, ref, today) {
    if (!inicio || !fim || inicio >= fim)
        return null;
    let V0 = 0, V1 = 0, CF = 0;
    ativos.forEach(inv => {
        if (inv.dataAplicacao > fim)
            return;
        const vf = valorProjetadoEm(inv, fim, ref, today);
        if (!(vf > 0))
            return;
        V1 += vf;
        if (inv.dataAplicacao < inicio) {
            const vi = valorProjetadoEm(inv, inicio, ref, today);
            if (vi > 0)
                V0 += vi;
        }
        else {
            CF += Number(inv.valorAplicado) || 0;
        }
    });
    return V1 - V0 - CF;
}
// Simula uma carteira hipotética que recebeu exatamente os mesmos aportes,
// nas mesmas datas, rendendo 100% do CDI — assim a comparação "carteira x CDI"
// não fica distorcida por aportes recentes (sem isso, um aporte novo faz o CDI
// de referência contar o período inteiro, inflando artificialmente a diferença).
function cdiReturnMD(ativos, inicio, fim, ref, today) {
    if (!inicio || !fim || inicio >= fim)
        return null;
    if (!ref.historicoCDI || !ref.historicoCDI.length) {
        // Sem histórico diário disponível (ex.: offline ou API do BCB fora do ar):
        // aproxima usando a taxa CDI anual atual, composta pelo número de dias corridos.
        if (!(ref.cdi > 0))
            return null;
        const dias = Math.max(diffDays(inicio, fim), 0);
        return (Math.pow(1 + ref.cdi / 100, dias / 365) - 1) * 100;
    }
    const totalDays = Math.max(diffDays(inicio, fim), 1);
    let V0 = 0, V1 = 0, CF = 0, weightedCF = 0;
    ativos.forEach(inv => {
        if (inv.dataAplicacao > fim)
            return;
        const aporte = Number(inv.valorAplicado) || 0;
        if (!(aporte > 0))
            return;
        if (inv.dataAplicacao < inicio) {
            const vi = aporte * fatorAcumulado(ref.historicoCDI, inv.dataAplicacao, inicio, 1, true);
            V0 += vi;
            V1 += vi * fatorAcumulado(ref.historicoCDI, inicio, fim, 1, false);
        }
        else {
            CF += aporte;
            const w = Math.max(0, Math.min(1, diffDays(inv.dataAplicacao, fim) / totalDays));
            weightedCF += aporte * w;
            V1 += aporte * fatorAcumulado(ref.historicoCDI, inv.dataAplicacao, fim, 1, true);
        }
    });
    const den = V0 + weightedCF;
    return den > 0 ? ((V1 - V0 - CF) / den) * 100 : null;
}
// Aproximação da inflação (IPCA) no período: como só temos a taxa acumulada
// dos últimos 12 meses (não uma série histórica diária), compomos essa taxa
// proporcionalmente aos dias corridos do período — suficiente para estimar a
// "rentabilidade real" (acima da inflação), como fazem relatórios de carteira.
function ipcaReturnApprox(inicio, fim, ref) {
    if (!inicio || !fim || inicio >= fim || !(ref.ipca > 0))
        return null;
    const dias = Math.max(diffDays(inicio, fim), 0);
    return (Math.pow(1 + ref.ipca / 100, dias / 365) - 1) * 100;
}
function rentabilidadeReal(retLiquido, ipca) {
    if (retLiquido == null || ipca == null)
        return null;
    return ((1 + retLiquido / 100) / (1 + ipca / 100) - 1) * 100;
}
function periodLabel(period) { return period === 'mes' ? 'Mês' : period === 'ano' ? 'Ano' : 'Todo o período'; }
function periodStart(period, today, ativos) {
    if (period === 'mes')
        return today.slice(0, 8) + '01';
    if (period === 'ano')
        return today.slice(0, 4) + '-01-01';
    return ativos.map(i => i.dataAplicacao).filter(Boolean).sort()[0] || today;
}
function refLogo(nome) {
    const n = normalizarInstituicao(nome);
    if (n.includes('BTG'))
        return 'BTG';
    if (n.includes('BANCO DO BRASIL'))
        return 'BB';
    if (n.includes('NUBANK'))
        return 'NU';
    if (n.includes('INTER'))
        return 'inter';
    if (n.includes('ITAU'))
        return 'itaú';
    if (n.includes('PICPAY'))
        return 'picpay';
    if (n.includes('XP'))
        return 'XP';
    return '';
}
function Donut({ items, total, centerLabel }) {
    const vals = items.filter(x => x.value > 0);
    if (!vals.length)
        return React.createElement("div", { className: "empty-chart" }, "Sem dados suficientes.");
    let acc = 0;
    const stops = vals.map(x => { const a = acc; acc += x.value; return `${x.color} ${(a / total) * 100}% ${(acc / total) * 100}%`; }).join(',');
    return React.createElement("div", { className: "donut-wrap" },
        React.createElement("div", { className: "donut", style: { background: `conic-gradient(${stops})` } },
            React.createElement("div", { className: "donut-hole" },
                React.createElement("strong", null, centerLabel),
                React.createElement("span", null, "Total l\u00EDquido"))),
        React.createElement("div", { className: "donut-legend" }, vals.slice(0, 6).map((x, i) => React.createElement("div", { className: "legend-row", key: i },
            React.createElement("i", { style: { background: x.color } }),
            React.createElement("span", null, x.name),
            React.createElement("b", null, fmtPct(x.value / total * 100))))));
}
function fmtBRLk(v) {
    const n = Number(v) || 0;
    if (Math.abs(n) >= 1000)
        return 'R$ ' + Math.round(n / 1000) + 'k';
    return fmtBRL(n);
}
function PortfolioLine({ series, showInvested = false }) {
    if (!series || series.length < 2)
        return React.createElement("div", { className: "empty-chart" }, "Cadastre posi\u00E7\u00F5es em datas diferentes para visualizar a evolu\u00E7\u00E3o.");
    const vals = series.map(x => x.total), aplic = series.map(x => x.aplicado ?? 0);
    const allVals = showInvested ? vals.concat(aplic) : vals;
    const min = Math.min(...allVals), max = Math.max(...allVals), range = max - min || 1, W = 700, H = 220, p = 12;
    const toPts = (arr) => arr.map((v, i) => [p + i / (arr.length - 1) * (W - p * 2), H - p - (v - min) / range * (H - p * 2)]);
    const toPath = (pts) => pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
    const pts = toPts(vals), path = toPath(pts);
    const area = path + ` L${W - p},${H - p} L${p},${H - p} Z`;
    const ptsAplic = showInvested ? toPts(aplic) : null, pathAplic = ptsAplic ? toPath(ptsAplic) : null;
    const gridVals = [max, min + (max - min) * 0.66, min + (max - min) * 0.33, min];
    const gridYs = gridVals.map(v => H - p - (v - min) / range * (H - p * 2));
    return React.createElement("div", { className: "chart-box" },
        React.createElement("div", { className: "chart-top" },
            React.createElement("span", null, "Evolu\u00E7\u00E3o do patrim\u00F4nio"),
            React.createElement("b", null, fmtBRL(vals[vals.length - 1]))),
        React.createElement("div", { className: "linechart-body" },
            React.createElement("div", { className: "linechart-yaxis" }, gridVals.map((v, i) => React.createElement("span", { key: i }, fmtBRLk(v)))),
            React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" },
                React.createElement("defs", null,
                    React.createElement("linearGradient", { id: "rfArea", x1: "0", x2: "0", y1: "0", y2: "1" },
                        React.createElement("stop", { offset: "0", stopColor: "#22C55E", stopOpacity: ".35" }),
                        React.createElement("stop", { offset: "1", stopColor: "#22C55E", stopOpacity: "0" }))),
                gridYs.map((y, i) => React.createElement("line", { key: i, x1: p, x2: W - p, y1: y, y2: y, stroke: "rgba(255,255,255,0.06)", strokeWidth: "1" })),
                React.createElement("path", { d: area, fill: "url(#rfArea)" }),
                pathAplic && React.createElement("path", { d: pathAplic, fill: "none", stroke: "#5B9DF0", strokeWidth: "2", strokeDasharray: "5 4", vectorEffect: "non-scaling-stroke" }),
                React.createElement("path", { d: path, fill: "none", stroke: "#22C55E", strokeWidth: "3", vectorEffect: "non-scaling-stroke" }),
                React.createElement("circle", { cx: pts.at(-1)[0], cy: pts.at(-1)[1], r: "4", fill: "#22C55E" }))),
        React.createElement("div", { className: "chart-axis" },
            React.createElement("span", null, series[0].date),
            React.createElement("span", null, series[Math.floor(series.length / 2)].date),
            React.createElement("span", null, series.at(-1).date)),
        showInvested && React.createElement("div", { className: "bar-legend" },
            React.createElement("span", null,
                React.createElement("i", { className: "dot green" }),
                " Patrim\u00F4nio"),
            React.createElement("span", null,
                React.createElement("i", { className: "dot blue" }),
                " Valor investido")));
}
function PerformanceBars({ ativos, refTaxas, today, period }) {
    const months = [];
    const end = new Date(today + 'T00:00:00');
    const inicioCarteira = periodStart('todo', today, ativos);
    const mesesDesdeInicio = Math.max(1, Math.round(diffDays(inicioCarteira, today) / 30));
    const n = period === 'ano' ? end.getMonth() + 1 : period === 'todo' ? Math.min(24, mesesDesdeInicio) : 6;
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
        const ini = d.toISOString().slice(0, 10);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const fim = last > end ? today : last.toISOString().slice(0, 10);
        const r = periodReturnMD(ativos, ini, fim, refTaxas, today, {});
        const c = cdiReturnMD(ativos, ini, fim, refTaxas, today);
        months.push({ label: MESES_ABREV[d.getMonth()], ano: d.getFullYear(), r: r ?? 0, c: c ?? 0, temDado: r != null });
    }
    const visiveis = months.filter(m => m.temDado);
    const max = Math.max(0.1, ...visiveis.flatMap(x => [x.r, x.c]));
    const showYear = n > 12;
    return React.createElement("div", { className: "bars-chart" },
        React.createElement("div", { className: "bars-scroll" },
            React.createElement("div", { className: "bars-grid", style: { minWidth: Math.max(300, months.length * 40) } }, months.map((m, i) => React.createElement("div", { className: "bar-group", key: i },
                React.createElement("small", { className: "bar-value" }, m.temDado ? fmtPct(m.r) : ''),
                React.createElement("div", { className: "bar-pair" },
                    React.createElement("span", { className: "bar green", style: { height: `${Math.max(3, (m.r / max) * 118)}px` }, title: `Carteira ${fmtPct(m.r)}` }),
                    React.createElement("span", { className: "bar blue", style: { height: `${Math.max(3, (m.c / max) * 118)}px` }, title: `CDI ${fmtPct(m.c)}` })),
                React.createElement("small", null, m.label, showYear ? "/" + String(m.ano).slice(2) : ''))))),
        React.createElement("div", { className: "bar-legend" },
            React.createElement("span", null,
                React.createElement("i", { className: "dot green" }),
                " Sua carteira"),
            React.createElement("span", null,
                React.createElement("i", { className: "dot blue" }),
                " CDI")));
}
function ReferenceHeader({ refTaxas, status, onRefresh, onNew, onDados, tab, setTab }) {
    return React.createElement(React.Fragment, null,
        React.createElement("header", { className: "ref-header" },
            React.createElement("div", { className: "topbar" },
                React.createElement("button", { className: "header-icon", onClick: () => setTab('mais'), "aria-label": "Menu" },
                    React.createElement(Icon, { name: "menu", size: 19 })),
                React.createElement("div", { className: "brand" },
                    React.createElement("div", { className: "brand-name" }, "RAZ\u00C3O"),
                    React.createElement("div", { className: "brand-sub" }, "RENDA FIXA")),
                React.createElement("button", { className: "header-icon", onClick: () => setTab('mais'), "aria-label": "Configura\u00E7\u00F5es" },
                    React.createElement(Icon, { name: "gear", size: 18 }))),
            React.createElement("nav", { className: "desktop-tabs" }, [['painel', 'Painel', 'home'], ['aplicacoes', 'Aplica\u00E7\u00F5es', 'bank'], ['analise', 'An\u00E1lise', 'barChart'], ['mais', 'Mais', 'menu']].map(([k, l, ic]) => React.createElement("button", { key: k, className: tab === k ? 'active' : '', onClick: () => setTab(k) },
                React.createElement(Icon, { name: ic, size: 15 }),
                l)))));
}
function RefCard({ children, className = '' }) { return React.createElement("section", { className: 'ref-card ' + className }, children); }
function ReferenceDashboard({ ativos, totais, ganhoLiquido, metricsById, refTaxas, today, evolucao, setTab, period, setPeriod }) {
    const grupos = grupoInstituicoes(ativos, metricsById);
    const inicioMes = periodStart('mes', today, ativos), inicioAno = periodStart('ano', today, ativos);
    const retMes = periodReturnMD(ativos, inicioMes, today, refTaxas, today, metricsById), cdiMes = cdiReturnMD(ativos, inicioMes, today, refTaxas, today);
    const retAno = periodReturnMD(ativos, inicioAno, today, refTaxas, today, metricsById), cdiAno = cdiReturnMD(ativos, inicioAno, today, refTaxas, today);
    const pctMes = retMes != null && cdiMes > 0 ? retMes / cdiMes * 100 : null, pctAno = retAno != null && cdiAno > 0 ? retAno / cdiAno * 100 : null;
    const vencProximos = ativos.filter(i => metricsById[i.id].diasRestantes != null && metricsById[i.id].diasRestantes >= 0 && metricsById[i.id].diasRestantes <= 60);
    return React.createElement("div", { className: "screen" },
        React.createElement("div", { className: "page-head" },
            React.createElement("h1", null, "Painel")),
        React.createElement(RefCard, { className: "hero-card" },
            React.createElement("div", { className: "hero-label" }, "Patrim\u00F4nio l\u00EDquido"),
            React.createElement("div", { className: "hero-row" },
                React.createElement("div", null,
                    React.createElement("div", { className: "hero-value" }, fmtBRL(totais.liquido)),
                    React.createElement("div", { className: "hero-gain" },
                        "+",
                        fmtBRL(Math.max(ganhoLiquido, 0)),
                        " ",
                        React.createElement("span", null,
                            "\u25B2 ",
                            fmtPct(totais.aplicado > 0 ? ganhoLiquido / totais.aplicado * 100 : 0))),
                    React.createElement("div", { className: "hero-note" }, "Ganho l\u00EDquido (desde o in\u00EDcio)"),
                    React.createElement("div", { className: "hero-note" }, "Patrim\u00F4nio bruto: ", React.createElement("b", null, fmtBRL(totais.bruto)))),
                React.createElement("div", { className: "hero-spark" },
                    React.createElement(PortfolioLine, { series: evolucao })))),
        React.createElement("div", { className: "two-col stats-row" },
            React.createElement(RefCard, null,
                React.createElement("div", { className: "card-title" }, "Rentabilidade (m\u00EAs)"),
                React.createElement("div", { className: "hero-value small" }, retMes == null ? '\u2014' : fmtPct(retMes)),
                React.createElement("div", { className: "hero-gain" }, pctMes == null ? '\u2014' : React.createElement(React.Fragment, null, "\u25B2 ", fmtPct(pctMes), " do CDI")),
                React.createElement("div", { className: "hero-note" }, "CDI: ", cdiMes == null ? '\u2014' : fmtPct(cdiMes))),
            React.createElement(RefCard, null,
                React.createElement("div", { className: "card-title" }, "Rentabilidade (ano)"),
                React.createElement("div", { className: "hero-value small" }, retAno == null ? '\u2014' : fmtPct(retAno)),
                React.createElement("div", { className: "hero-gain" }, pctAno == null ? '\u2014' : React.createElement(React.Fragment, null, "\u25B2 ", fmtPct(pctAno), " do CDI")),
                React.createElement("div", { className: "hero-note" }, "CDI: ", cdiAno == null ? '\u2014' : fmtPct(cdiAno)))),
        React.createElement("div", { className: "two-col stats-row" },
            React.createElement(RefCard, { className: "clickable", onClick: () => setTab('instituicoes') },
                React.createElement("div", { className: "card-title" }, "Carteira"),
                React.createElement("div", { className: "carteira-stats" },
                    React.createElement("div", null,
                        React.createElement("strong", null, grupos.length),
                        React.createElement("span", null, "institui\u00E7\u00F5es")),
                    React.createElement("div", null,
                        React.createElement("strong", null, ativos.length),
                        React.createElement("span", null, "investimentos"))),
                React.createElement("div", { className: "hero-note" }, "IR + IOF a pagar (estimado): ", React.createElement("b", { className: "warn" }, fmtBRL(Math.max(totais.bruto - totais.liquido, 0))))),
            React.createElement(RefCard, { className: "clickable atencao-card", onClick: () => setTab('aplicacoes') },
                React.createElement("div", { className: "card-title" }, "Aten\u00E7\u00E3o"),
                React.createElement("div", { className: "atencao-row" },
                    React.createElement("div", { className: "atencao-icon" },
                        React.createElement(Icon, { name: "alert", size: 17 })),
                    React.createElement("div", null,
                        React.createElement("strong", null, vencProximos.length),
                        React.createElement("span", null, "vencimentos em at\u00E9 60 dias"))))));
}
function ReferenceApplications({ ativos, metricsById, refTaxas, today, setTab, onNew, openEdit, deleteInvestment, onResgatar }) {
    const [filter, setFilter] = useState('Todas'), [q, setQ] = useState(''), [searchOpen, setSearchOpen] = useState(false), [selected, setSelected] = useState(null), [selectedPos, setSelectedPos] = useState(null), [selectedInv, setSelectedInv] = useState(null);
    const passaFiltro = (g) => filter === 'Todas' || (filter === 'CDB' && g.items.some(i => i.tipo === 'CDB')) || (filter === 'LCI/LCA' && g.items.some(i => ['LCI', 'LCA'].includes(i.tipo))) || (filter === 'Tesouro' && g.items.some(i => i.tipo === 'Tesouro Direto')) || (filter === 'Outros' && g.items.some(i => !['CDB', 'LCI', 'LCA', 'Tesouro Direto'].includes(i.tipo)));
    const grupos = grupoInstituicoes(ativos, metricsById).filter(g => passaFiltro(g) && nomeInstituicao(g.nome).toLowerCase().includes(q.toLowerCase()));
    const totalCarteira = ativos.reduce((s, i) => s + metricsById[i.id].valorAtualLiquido, 0) || 1;
    const g = selected ? grupos.find(x => x.key === selected) || grupoInstituicoes(ativos, metricsById).find(x => x.key === selected) : null;
    const backToList = () => { setSelected(null); setSelectedPos(null); setSelectedInv(null); };
    if (g && selectedInv) {
        const inv = g.items.find(x => x.id === selectedInv), m = inv ? metricsById[inv.id] : null;
        if (!inv)
            return null;
        return React.createElement("div", { className: "screen" },
            React.createElement("button", { className: "back-btn", onClick: () => setSelectedInv(null) },
                "\u2039 ",
                selectedPos ? "posi\u00E7\u00E3o" : nomeInstituicao(g.nome)),
            React.createElement(RefCard, { className: "detail-hero" },
                React.createElement("div", null,
                    React.createElement("span", { className: "type-pill green" }, inv.tipo),
                    React.createElement("h1", null, tituloInvestimento(inv)),
                    React.createElement("p", null,
                        fmtData(inv.dataAplicacao),
                        " \u2192 ",
                        fmtData(inv.dataVencimento))),
                React.createElement(InstitutionMark, { nome: inv.instituicao, size: 40 })),
            React.createElement(RefCard, { className: "detail-rows" },
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Valor aplicado"),
                    React.createElement("strong", null, fmtBRL(inv.valorAplicado))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Valor bruto atual"),
                    React.createElement("strong", null, fmtBRL(m.valorAtualBruto))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Valor l\u00EDquido atual"),
                    React.createElement("strong", null, fmtBRL(m.valorAtualLiquido))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "IR + IOF estimados"),
                    React.createElement("strong", { className: "warn" }, fmtBRL(m.irValor + m.iofValor))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Rentabilidade"),
                    React.createElement("strong", null, taxaCurta(inv))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Vencimento"),
                    React.createElement("strong", null, fmtData(inv.dataVencimento))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Dias restantes"),
                    React.createElement("strong", null, m.diasRestantes >= 0 ? m.diasRestantes : 'vencido')),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Ganho l\u00EDquido (total)"),
                    React.createElement("strong", { className: "green-txt" },
                        fmtBRL(m.valorAtualLiquido - inv.valorAplicado),
                        " \u25B2 ",
                        fmtPct(m.rentLiquidaTotal))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Liquidez"),
                    React.createElement("strong", null, inv.liquidez))),
            React.createElement("div", { className: "detail-actions" },
                React.createElement("button", { className: "text-btn", onClick: () => openEdit(inv) }, "Editar"),
                React.createElement("button", { className: "text-btn blue", onClick: () => onResgatar(inv.id) }, "Marcar como resgatado"),
                React.createElement("button", { className: "text-btn warn", onClick: () => deleteInvestment(inv.id) }, "Excluir")));
    }
    if (g && selectedPos) {
        const posicoes = agruparPosicoes(g.items, metricsById);
        const pos = posicoes.find(p => p.key === selectedPos);
        if (!pos)
            return null;
        return React.createElement("div", { className: "screen" },
            React.createElement("button", { className: "back-btn", onClick: () => setSelectedPos(null) },
                "\u2039 ",
                nomeInstituicao(g.nome)),
            React.createElement(RefCard, { className: "detail-hero" },
                React.createElement("div", null,
                    React.createElement("span", { className: "type-pill green" }, pos.tipo),
                    React.createElement("h1", null, tituloInvestimento(pos)),
                    React.createElement("p", null,
                        pos.lots.length,
                        " aportes consolidados nesta posi\u00E7\u00E3o")),
                React.createElement(InstitutionMark, { nome: pos.instituicao, size: 40 })),
            React.createElement(RefCard, { className: "detail-rows" },
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Valor aplicado (total)"),
                    React.createElement("strong", null, fmtBRL(pos.valorAplicado))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Valor bruto atual"),
                    React.createElement("strong", null, fmtBRL(pos.valorAtualBruto))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Valor l\u00EDquido atual"),
                    React.createElement("strong", null, fmtBRL(pos.valorAtualLiquido))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Rentabilidade"),
                    React.createElement("strong", null, taxaCurta(pos))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Vencimento"),
                    React.createElement("strong", null, fmtData(pos.dataVencimento))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Ganho l\u00EDquido (total)"),
                    React.createElement("strong", { className: "green-txt" },
                        fmtBRL(pos.ganhoLiquido),
                        " \u25B2 ",
                        fmtPct(pos.rentLiquidaTotal))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Liquidez"),
                    React.createElement("strong", null, pos.liquidez))),
            React.createElement("div", { className: "section-head" },
                React.createElement("h2", null, "Aportes desta posi\u00E7\u00E3o")),
            React.createElement("div", { className: "detail-list" }, pos.lots.slice().sort((a, b) => a.dataAplicacao.localeCompare(b.dataAplicacao)).map(inv => {
                const m = metricsById[inv.id];
                return React.createElement(RefCard, { key: inv.id, className: "investment-card" },
                    React.createElement("button", { className: "investment-hit", onClick: () => setSelectedInv(inv.id) },
                        React.createElement("div", { className: "inv-top" },
                            React.createElement("h3", null,
                                "Aporte de ",
                                fmtData(inv.dataAplicacao)),
                            React.createElement(Icon, { name: "chevronRight", size: 15, color: "var(--muted)" })),
                        React.createElement("div", { className: "inv-mid" },
                            React.createElement("strong", { className: "green-txt" }, fmtBRL(m.valorAtualLiquido)),
                            React.createElement("span", { className: "inv-venc" }, "aplicado: ", fmtBRL(inv.valorAplicado)))));
            })));
    }
    if (g) {
        const pctCDI = pctCDIGrupo(g.items, metricsById, refTaxas);
        const posicoes = agruparPosicoes(g.items, metricsById);
        return React.createElement("div", { className: "screen" },
            React.createElement("button", { className: "back-btn", onClick: backToList }, "\u2039 Aplica\u00E7\u00F5es"),
            React.createElement(RefCard, { className: "institution-hero" },
                React.createElement("div", { className: "inst-head-left" },
                    React.createElement(InstitutionMark, { nome: g.nome, size: 48 }),
                    React.createElement("div", null,
                        React.createElement("div", { className: "eyebrow" }, nomeInstituicao(g.nome)),
                        React.createElement("span", null,
                            g.items.length,
                            " investimentos"))),
                React.createElement("div", { className: "inst-total" },
                    React.createElement("span", null, "Total l\u00EDquido"),
                    React.createElement("strong", null, fmtBRL(g.liquido)),
                    React.createElement("small", { className: "muted" }, "Bruto: ", fmtBRL(g.bruto)),
                    pctCDI != null && React.createElement("small", { className: "green-txt" }, fmtPct(pctCDI), " do CDI"))),
            pctCDI != null && React.createElement("div", { className: "cdi-bar" },
                React.createElement("div", { style: { width: Math.min(100, Math.max(4, pctCDI)) + '%' } })),
            React.createElement("div", { className: "section-head" },
                React.createElement("h2", null, "Investimentos"),
                posicoes.length !== g.items.length && React.createElement("p", null,
                    g.items.length,
                    " aportes agrupados em ",
                    posicoes.length,
                    " posi\u00E7\u00F5es")),
            React.createElement("div", { className: "detail-list" }, posicoes.map(pos => {
                const card = React.createElement("button", { className: "investment-hit", onClick: () => pos.lots.length > 1 ? setSelectedPos(pos.key) : setSelectedInv(pos.lots[0].id) },
                    React.createElement("div", { className: "inv-top" },
                        React.createElement("h3", null, tituloInvestimento(pos)),
                        React.createElement("span", { className: "type-pill" }, pos.tipo)),
                    React.createElement("div", { className: "inv-mid" },
                        React.createElement("strong", { className: "green-txt" }, fmtBRL(pos.valorAtualLiquido)),
                        React.createElement("span", { className: "inv-venc" },
                            React.createElement("i", { className: "dot green" }),
                            pos.diasRestantes >= 0 ? `Vence em ${fmtData(pos.dataVencimento)}` : 'Vencido')),
                    React.createElement("div", { className: "inv-rate" },
                        React.createElement("i", { className: "dot green" }),
                        "Bruto: ",
                        fmtBRL(pos.valorAtualBruto),
                        pos.lots.length > 1 && React.createElement("span", { className: "lots-badge" },
                            pos.lots.length,
                            " aportes")));
                return React.createElement(RefCard, { key: pos.key, className: "investment-card" }, card);
            })));
    }
    return React.createElement("div", { className: "screen" },
        React.createElement("div", { className: "page-head" },
            React.createElement("h1", null, "Aplica\u00E7\u00F5es"),
            React.createElement("div", { className: "head-actions-row" },
                React.createElement("button", { className: "header-icon", onClick: () => setSearchOpen(s => !s), "aria-label": "Buscar" },
                    React.createElement(Icon, { name: "search", size: 17 })),
                React.createElement("button", { className: "circle-plus", onClick: onNew },
                    React.createElement(Icon, { name: "plus", size: 18 })))),
        searchOpen && React.createElement("input", { className: "search-input", autoFocus: true, value: q, onChange: e => setQ(e.target.value), placeholder: "Buscar institui\u00E7\u00E3o\u2026" }),
        React.createElement("div", { className: "chips" }, ['Todas', 'CDB', 'LCI/LCA', 'Tesouro', 'Outros'].map(x => React.createElement("button", { key: x, className: filter === x ? 'on' : '', onClick: () => setFilter(x) }, x))),
        React.createElement("div", { className: "subhead" }, "Por institui\u00E7\u00E3o"),
        React.createElement("div", { className: "institution-list" }, grupos.map(gr => {
            const pctCDI = pctCDIGrupo(gr.items, metricsById, refTaxas);
            return React.createElement("button", { className: "institution-row", key: gr.key, onClick: () => setSelected(gr.key) },
                React.createElement("div", { className: "brandless" },
                    React.createElement(InstitutionMark, { nome: gr.nome, size: 42 }),
                    React.createElement("div", null,
                        React.createElement("b", null, nomeInstituicao(gr.nome)),
                        React.createElement("small", null,
                            gr.items.length,
                            " investimentos \u00B7 ",
                            React.createElement("span", { className: "green-txt" }, pctCDI == null ? '\u2014' : fmtPct(pctCDI) + ' CDI')))),
                React.createElement("div", { className: "inst-row-right" },
                    React.createElement("strong", null, fmtBRL(gr.liquido)),
                    React.createElement("small", { className: "muted" }, "bruto: ", fmtBRL(gr.bruto)),
                    React.createElement("small", { className: "muted" },
                        fmtPct(gr.liquido / totalCarteira * 100),
                        " da carteira")),
                React.createElement(Icon, { name: "chevronRight", size: 17, color: "var(--muted)" }));
        })));
}

function monthsAgoISO(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
}
function rentabilidadeAcumuladaPeriods(ativos, refTaxas, today) {
    const defs = [
        ['1m', '1 mês', monthsAgoISO(today, 1)],
        ['3m', '3 meses', monthsAgoISO(today, 3)],
        ['6m', '6 meses', monthsAgoISO(today, 6)],
        ['12m', '12 meses', monthsAgoISO(today, 12)],
        ['inicio', 'Desde o início', periodStart('todo', today, ativos)],
    ];
    return defs.map(([key, label, start]) => {
        const ret = periodReturnMD(ativos, start, today, refTaxas, today, {});
        const cdi = cdiReturnMD(ativos, start, today, refTaxas, today);
        const ipca = ipcaReturnApprox(start, today, refTaxas);
        const ganhoBRL = periodGainBRL(ativos, start, today, refTaxas, today);
        const pctCDI = ret != null && cdi > 0 ? (ret / cdi) * 100 : null;
        return { key, label, ret, cdi, ipca, ganhoBRL, pctCDI };
    });
}
function ReferenceAccumulatedTable({ ativos, refTaxas, today }) {
    const rows = rentabilidadeAcumuladaPeriods(ativos, refTaxas, today);
    const doze = rows.find(r => r.key === '12m');
    const destaque = (doze && doze.ret != null && doze.cdi != null) ? doze : [...rows].reverse().find(r => r.ret != null && r.cdi != null);
    const acima = destaque ? destaque.ret - destaque.cdi >= 0 : null;
    return React.createElement(RefCard, null,
        React.createElement("div", { className: "section-head" },
            React.createElement("div", null,
                React.createElement("h2", null, "Rentabilidade acumulada"),
                React.createElement("p", null, "Resultado financeiro e comparativo por janela de tempo"))),
        React.createElement("div", { className: "accum-table" },
            rows.map(r => React.createElement("div", { className: "accum-row2", key: r.key },
                React.createElement("div", { className: "accum-row2-top" },
                    React.createElement("span", { className: "accum-label" }, r.label),
                    React.createElement("strong", { className: r.ganhoBRL != null && r.ganhoBRL < 0 ? 'warn' : 'green-txt' }, r.ganhoBRL == null ? '\u2014' : fmtBRL(r.ganhoBRL))),
                React.createElement("div", { className: "accum-row2-bottom" },
                    React.createElement("span", { className: r.ret != null && r.cdi != null && r.ret < r.cdi ? 'warn' : 'green-txt' }, r.ret == null ? '\u2014' : fmtPct(r.ret)),
                    React.createElement("span", { className: "accum-cdi" + (r.pctCDI != null && r.pctCDI < 100 ? ' below' : '') }, r.pctCDI == null ? '\u2014' : fmtPct(r.pctCDI) + ' CDI'),
                    React.createElement("span", { className: "muted" }, "IPCA ", r.ipca == null ? '\u2014' : fmtPct(r.ipca)))))),
        destaque ? React.createElement("div", { className: "accum-callout" + (acima ? '' : ' warn-bg') },
            React.createElement(Icon, { name: "info", size: 15 }),
            React.createElement("span", null,
                "Sua carteira est\u00E1 ",
                React.createElement("b", null, fmtPct(Math.abs(destaque.ret - destaque.cdi))),
                acima ? ' acima' : ' abaixo',
                " do CDI no acumulado de ",
                destaque.label.toLowerCase(),
                ".")) : null);
}
function buildInsights(ativos, metricsById, refTaxas, today) {
    const insights = [];
    const totalLiquido = ativos.reduce((s, i) => s + metricsById[i.id].valorAtualLiquido, 0) || 1;
    const venc30 = ativos.filter(i => metricsById[i.id].diasRestantes != null && metricsById[i.id].diasRestantes >= 0 && metricsById[i.id].diasRestantes <= 30);
    const valorVenc30 = venc30.reduce((s, i) => s + metricsById[i.id].valorAtualLiquido, 0);
    if (venc30.length)
        insights.push({ tipo: 'vencimentos', icon: 'calendar', titulo: 'Vencimentos', valor: fmtBRL(valorVenc30), texto: 'vencem nos pr\u00F3ximos 30 dias.' });
    const grupos = grupoInstituicoes(ativos, metricsById);
    if (grupos[0]) {
        const pct = grupos[0].liquido / totalLiquido * 100;
        insights.push({ tipo: 'concentracao', icon: 'pieChart', titulo: 'Concentra\u00E7\u00E3o', valor: `${fmtPct(pct)} da carteira`, texto: `est\u00E1 em ${nomeInstituicao(grupos[0].nome)}.`, tag: pct >= 40 ? 'Vale diversificar' : 'N\u00EDvel saud\u00E1vel', tagWarn: pct >= 40 });
    }
    const media = pctCDIGrupo(ativos, metricsById, refTaxas);
    let pior = null, piorPct = null;
    ativos.forEach(inv => {
        const m = metricsById[inv.id];
        if (!m || !(m.valorAtualLiquido > 0))
            return;
        const p = percentualCDIEquivalente(inv, refTaxas, Math.max(m.diasCorridos, 1));
        if (p == null)
            return;
        if (piorPct == null || p < piorPct) {
            piorPct = p;
            pior = inv;
        }
    });
    if (pior && media != null && piorPct < media)
        insights.push({ tipo: 'oportunidade', icon: 'trendingUp', titulo: 'Oportunidade', valor: `${pior.tipo} (${fmtPct(piorPct)} CDI)`, texto: `Rende abaixo da m\u00E9dia da sua carteira (${fmtPct(media)} CDI).` });
    return insights;
}
const INSIGHT_STYLE = { vencimentos: 'i0', concentracao: 'i1', oportunidade: 'i2' };
function InsightsList({ ativos, metricsById, refTaxas, today }) {
    const insights = buildInsights(ativos, metricsById, refTaxas, today);
    if (!insights.length)
        return null;
    return React.createElement(RefCard, null,
        React.createElement("div", { className: "section-head" },
            React.createElement("div", { className: "insights-title" },
                React.createElement(Icon, { name: "trendingUp", size: 18, color: "#F59E0B" }),
                React.createElement("div", null,
                    React.createElement("h2", null, "Insights"),
                    React.createElement("p", null, "Foco no que importa.")))),
        React.createElement("div", { className: "insight-list" }, insights.map((a, i) => { const cls = INSIGHT_STYLE[a.tipo] || 'i0'; return React.createElement("div", { className: "insight", key: i },
            React.createElement("div", { className: `insight-icon ${cls}` },
                React.createElement(Icon, { name: a.icon, size: 18 })),
            React.createElement("div", null,
                React.createElement("b", { className: `insight-title ${cls}` }, a.titulo),
                React.createElement("strong", null, a.valor),
                React.createElement("span", null, a.texto),
                a.tag && React.createElement("small", { className: a.tagWarn ? 'warn' : 'green-txt' }, a.tag)),
            React.createElement(Icon, { name: "chevronRight", size: 16, color: "var(--muted)" })); })));
}
function ReferenceComposicao({ ativos, metricsById, refTaxas, today }) {
    const [modo, setModo] = useState('instituicao');
    const total = ativos.reduce((s, i) => s + metricsById[i.id].valorAtualLiquido, 0) || 1;
    const palette = ['#2F80ED', '#F59E0B', '#22C55E', '#8B5CF6', '#FF5D73', '#16B7D8', '#E4C441'];
    let grupos;
    if (modo === 'instituicao') {
        grupos = grupoInstituicoes(ativos, metricsById).map(g => ({ key: g.key, nome: nomeInstituicao(g.nome), valor: g.liquido }));
    }
    else if (modo === 'tipo') {
        const map = {};
        ativos.forEach(inv => { const k = inv.tipo; map[k] = (map[k] || 0) + metricsById[inv.id].valorAtualLiquido; });
        grupos = Object.entries(map).map(([k, v]) => ({ key: k, nome: k, valor: v }));
    }
    else {
        const map = {};
        ativos.forEach(inv => { const k = bucketPrazo(metricsById[inv.id].diasRestantes); map[k] = (map[k] || 0) + metricsById[inv.id].valorAtualLiquido; });
        grupos = Object.entries(map).map(([k, v]) => ({ key: k, nome: k, valor: v }));
    }
    grupos = grupos.filter(g => g.valor > 0).sort((a, b) => b.valor - a.valor);
    const donutItems = grupos.map((g, i) => ({ name: g.nome, value: g.valor, color: palette[i % palette.length] }));
    return React.createElement(RefCard, null,
        React.createElement("div", { className: "section-head" },
            React.createElement("h2", null, "Composi\u00E7\u00E3o")),
        React.createElement("div", { className: "chips compact" }, [['instituicao', 'Por institui\u00E7\u00E3o'], ['tipo', 'Por tipo'], ['prazo', 'Por prazo']].map(x => React.createElement("button", { key: x[0], className: modo === x[0] ? 'on' : '', onClick: () => setModo(x[0]) }, x[1]))),
        React.createElement(Donut, { items: donutItems, total: total, centerLabel: fmtBRL(total) }));
}
function ReferenceAnalysis({ ativos, metricsById, refTaxas, today, evolucao, setTab }) {
    const [period, setPeriod] = useState('mes'), [group, setGroup] = useState('tipo');
    const start = periodStart(period, today, ativos);
    const ret = periodReturnMD(ativos, start, today, refTaxas, today, metricsById), cdi = cdiReturnMD(ativos, start, today, refTaxas, today), diff = ret != null && cdi != null ? ret - cdi : null, pct = ret != null && cdi > 0 ? ret / cdi * 100 : null;
    const ipca = ipcaReturnApprox(start, today, refTaxas), real = rentabilidadeReal(ret, ipca);
    const groups = {};
    ativos.forEach(inv => { const key = group === 'tipo' ? inv.tipo : normalizarInstituicao(inv.instituicao); if (!groups[key])
        groups[key] = []; groups[key].push(inv); });
    const rows = Object.entries(groups).map(([k, items]) => { const a = items.reduce((s, i) => s + i.valorAplicado, 0), l = items.reduce((s, i) => s + metricsById[i.id].valorAtualLiquido, 0), r = a ? ((l / a) - 1) * 100 : 0, rm = items.reduce((s, i) => s + (metricsById[i.id].rentLiquidaMensal || 0) * metricsById[i.id].valorAtualLiquido, 0) / (l || 1); return { k, a, l, r, rm }; }).sort((a, b) => b.l - a.l);
    return React.createElement("div", { className: "screen" },
        React.createElement("div", { className: "page-head" },
            React.createElement("h1", null, "An\u00E1lise")),
        React.createElement("div", { className: "chips wide" }, [['mes', 'Mês'], ['ano', 'Ano'], ['todo', 'Desde o início']].map(x => React.createElement("button", { key: x[0], className: period === x[0] ? 'on' : '', onClick: () => setPeriod(x[0]) }, x[1]))),
        React.createElement("div", { className: "subhead" }, "Rentabilidade no per\u00EDodo"),
        React.createElement("div", { className: "two-col stats-row" },
            React.createElement(RefCard, null,
                React.createElement("div", { className: "card-title" }, "Sua carteira"),
                React.createElement("div", { className: "hero-value small" }, ret == null ? '\u2014' : fmtPct(ret)),
                pct != null && React.createElement("div", { className: `hero-gain ${diff < 0 ? 'warn-txt' : ''}` }, "\u25B2 ", fmtPct(pct), " do CDI")),
            React.createElement(RefCard, null,
                React.createElement("div", { className: "card-title" }, "CDI"),
                React.createElement("div", { className: "hero-value small" }, cdi == null ? '\u2014' : fmtPct(cdi)))),
        React.createElement(RefCard, { className: "real-card" },
            React.createElement("div", { className: "card-title" }, "Rentabilidade real (acima da infla\u00E7\u00E3o)"),
            React.createElement("div", { className: "real-row" },
                React.createElement("div", null,
                    React.createElement("span", null, "IPCA no per\u00EDodo"),
                    React.createElement("b", null, ipca == null ? '\u2014' : fmtPct(ipca))),
                React.createElement("div", null,
                    React.createElement("span", null, "Rentabilidade real"),
                    React.createElement("b", { className: real != null && real < 0 ? 'warn' : 'green-txt' }, real == null ? '\u2014' : fmtPct(real))))),
        React.createElement(RefCard, null,
            React.createElement("div", { className: "section-head" },
                React.createElement("div", null,
                    React.createElement("h2", null, "Sua carteira vs CDI"),
                    React.createElement("p", null,
                        periodLabel(period),
                        " \u00B7 retorno bruto com fluxos tratados como aportes"))),
            React.createElement(PerformanceBars, { ativos: ativos, refTaxas: refTaxas, today: today, period: period })),
        React.createElement(ReferenceComposicao, { ativos: ativos, metricsById: metricsById, refTaxas: refTaxas, today: today }),
        React.createElement(RefCard, null,
            React.createElement("div", { className: "section-head" },
                React.createElement("div", null,
                    React.createElement("h2", null, "Desempenho"),
                    React.createElement("p", null, "Evolu\u00E7\u00E3o do patrim\u00F4nio l\u00EDquido"))),
            React.createElement(PortfolioLine, { series: evolucao, showInvested: true })),
        React.createElement(ReferenceAccumulatedTable, { ativos: ativos, refTaxas: refTaxas, today: today }),
        React.createElement(RefCard, null,
            React.createElement("div", { className: "section-head" },
                React.createElement("div", null,
                    React.createElement("h2", null, "Comparativo"),
                    React.createElement("p", null, "Rentabilidade l\u00EDquida equivalente por m\u00EAs")),
                React.createElement("div", { className: "chips compact" }, [['tipo', 'Por tipo'], ['instituicao', 'Por instituição']].map(x => React.createElement("button", { key: x[0], className: group === x[0] ? 'on' : '', onClick: () => setGroup(x[0]) }, x[1])))),
            React.createElement("div", { className: "comparison-table" },
                React.createElement("div", { className: "ct-head" },
                    React.createElement("span", null, group === 'tipo' ? 'Tipo' : 'Instituição'),
                    React.createElement("span", null, "Atual l\u00EDquido"),
                    React.createElement("span", null, "Acumulado"),
                    React.createElement("span", null, "/m\u00EAs")),
                rows.map(r => React.createElement("div", { className: "ct-row", key: r.k },
                    React.createElement("span", null, group === 'instituicao' ? nomeInstituicao(r.k) : r.k),
                    React.createElement("b", null, fmtBRL(r.l)),
                    React.createElement("strong", { className: r.r < 0 ? 'warn' : 'green-txt' }, fmtPct(r.r)),
                    React.createElement("strong", { className: "green-txt" }, fmtPct(r.rm))))),
        React.createElement(RankingRendimentoMensal, { ativos: ativos, metricsById: metricsById }),
        React.createElement(InsightsList, { ativos: ativos, metricsById: metricsById, refTaxas: refTaxas, today: today })));
}
function RankingRendimentoMensal({ ativos, metricsById }) {
    if (ativos.length < 1)
        return null;
    const linhas = ativos.map(inv => ({ inv, m: metricsById[inv.id] })).filter(x => x.m && x.m.rentLiquidaMensal != null).sort((a, b) => b.m.rentLiquidaMensal - a.m.rentLiquidaMensal);
    if (!linhas.length)
        return null;
    const max = Math.max(...linhas.map(x => Math.abs(x.m.rentLiquidaMensal)), 0.01);
    return React.createElement(RefCard, null,
        React.createElement("div", { className: "section-head" },
            React.createElement("div", null,
                React.createElement("h2", null, "Ranking de rendimento (l\u00EDq./m\u00EAs)"),
                React.createElement("p", null, "Do melhor para o pior \u2014 compare e revise estrat\u00E9gias"))),
        React.createElement("div", { className: "rank-yield-list" }, linhas.map(({ inv, m }, i) => React.createElement("div", { className: "rank-yield-row", key: inv.id },
            React.createElement("span", { className: "rank-yield-pos" }, i + 1),
            React.createElement("div", { className: "rank-yield-mid" },
                React.createElement("div", { className: "rank-yield-top" },
                    React.createElement("b", null, tituloInvestimento(inv)),
                    React.createElement("strong", { className: m.rentLiquidaMensal >= 0 ? 'green-txt' : 'warn' }, fmtPct(m.rentLiquidaMensal))),
                React.createElement("div", { className: "rank-yield-bar" },
                    React.createElement("div", { className: m.rentLiquidaMensal >= 0 ? 'pos' : 'neg', style: { width: Math.max(4, Math.abs(m.rentLiquidaMensal) / max * 100) + '%' } })),
                React.createElement("span", { className: "muted" }, nomeInstituicao(inv.instituicao)))))));
}
function ReferenceInstitutions({ ativos, metricsById, setTab }) {
    const grupos = grupoInstituicoes(ativos, metricsById), total = grupos.reduce((s, g) => s + g.liquido, 0) || 1;
    return React.createElement("div", { className: "screen" },
        React.createElement("div", { className: "page-head" },
            React.createElement("div", null,
                React.createElement("h1", null, "Institui\u00E7\u00F5es"),
                React.createElement("p", null, "Consolida\u00E7\u00E3o por emissor"))),
        React.createElement("div", { className: "two-col" },
            React.createElement(RefCard, null,
                React.createElement("div", { className: "section-head" },
                    React.createElement("div", null,
                        React.createElement("h2", null, "Aloca\u00E7\u00E3o"),
                        React.createElement("p", null, "Patrim\u00F4nio l\u00EDquido"))),
                React.createElement(Donut, { items: grupos.map((g, i) => ({ name: nomeInstituicao(g.nome), value: g.liquido, color: ['#157EFF', '#20C997', '#F6B73C', '#8B5CF6', '#FF5D73', '#16B7D8'][i % 6] })), total: total, centerLabel: fmtBRL(total) })),
            React.createElement(RefCard, null,
                React.createElement("div", { className: "section-head" },
                    React.createElement("div", null,
                        React.createElement("h2", null, "Emissores"),
                        React.createElement("p", null, "Concentra\u00E7\u00E3o da carteira"))),
                React.createElement("div", { className: "issuer-table" }, grupos.map(g => React.createElement("button", { key: g.key, className: "issuer-row", onClick: () => setTab('aplicacoes') },
                    React.createElement("div", { className: "issuer-left" },
                        React.createElement(InstitutionMark, { nome: g.nome, size: 30 }),
                        React.createElement("div", null,
                            React.createElement("b", null, nomeInstituicao(g.nome)),
                            React.createElement("span", null,
                                g.items.length,
                                " investimentos"))),
                    React.createElement("div", null,
                        React.createElement("strong", null, fmtBRL(g.liquido)),
                        React.createElement("small", null, fmtPct(g.liquido / total * 100)))))))));
}
function MoreScreen({ onDados, onNew, setTab, refTaxas, taxaStatus, onRefresh, onRelatorio, historicoCount }) {
    return React.createElement("div", { className: "screen" },
        React.createElement("div", { className: "page-head" },
            React.createElement("h1", null, "Mais")),
        React.createElement(RefCard, { className: "settings-card" },
            React.createElement("div", { className: "settings-title" }, "Carteira"),
            React.createElement("button", { className: "settings-row", onClick: () => setTab('historico') },
                React.createElement("span", { className: "settings-icon-label" },
                    React.createElement("span", { className: "settings-icon blue" }, React.createElement(Icon, { name: "history", size: 15 })),
                    "Hist\u00F3rico de resgates"),
                React.createElement("span", { className: "settings-val" },
                    historicoCount > 0 ? `${historicoCount}` : '',
                    React.createElement(Icon, { name: "chevronRight", size: 15 }))),
            React.createElement("button", { className: "settings-row", onClick: onRelatorio },
                React.createElement("span", { className: "settings-icon-label" },
                    React.createElement("span", { className: "settings-icon blue" }, React.createElement(Icon, { name: "fileText", size: 15 })),
                    "Gerar relat\u00F3rio (PDF)"),
                React.createElement(Icon, { name: "chevronRight", size: 15 }))),
        React.createElement(RefCard, { className: "settings-card" },
            React.createElement("div", { className: "settings-title" }, "Geral"),
            React.createElement("button", { className: "settings-row" },
                React.createElement("span", null, "Moeda"),
                React.createElement("span", { className: "settings-val" }, "Real (R$)",
                    React.createElement(Icon, { name: "chevronRight", size: 15 }))),
            React.createElement("button", { className: "settings-row" },
                React.createElement("span", null, "Tema"),
                React.createElement("span", { className: "settings-val" }, "Autom\u00E1tico",
                    React.createElement(Icon, { name: "chevronRight", size: 15 }))),
            React.createElement("button", { className: "settings-row" },
                React.createElement("span", null, "Notifica\u00E7\u00F5es"),
                React.createElement("span", { className: "settings-val" }, "Vencimentos",
                    React.createElement(Icon, { name: "chevronRight", size: 15 })))),
        React.createElement(RefCard, { className: "settings-card" },
            React.createElement("div", { className: "settings-title" }, "Taxas de refer\u00EAncia"),
            React.createElement("button", { className: "settings-row tall", onClick: onRefresh },
                React.createElement("span", null, "CDI"),
                React.createElement("div", { className: "settings-val-col" },
                    React.createElement("span", { className: "settings-val" }, "Autom\u00E1tico (Bacen)",
                        React.createElement(Icon, { name: "chevronRight", size: 15 })),
                    React.createElement("small", { className: taxaStatus === 'conectado' ? 'green-txt' : 'muted' }, taxaStatus === 'conectado' ? 'Atualizado diariamente' : taxaStatus === 'carregando' ? 'Atualizando\u2026' : 'Taxa manual \u2014 toque para atualizar')))),
        React.createElement(RefCard, { className: "settings-card" },
            React.createElement("div", { className: "settings-title" }, "Dados"),
            React.createElement("button", { className: "settings-row", onClick: onDados },
                React.createElement("span", { className: "settings-icon-label" },
                    React.createElement("span", { className: "settings-icon blue" }, React.createElement(Icon, { name: "download", size: 15 })),
                    "Exportar backup"),
                React.createElement(Icon, { name: "chevronRight", size: 15 })),
            React.createElement("button", { className: "settings-row", onClick: onDados },
                React.createElement("span", { className: "settings-icon-label" },
                    React.createElement("span", { className: "settings-icon blue" }, React.createElement(Icon, { name: "upload", size: 15 })),
                    "Importar backup"),
                React.createElement(Icon, { name: "chevronRight", size: 15 }))),
        React.createElement(RefCard, { className: "settings-card" },
            React.createElement("div", { className: "safe-card" },
                React.createElement("div", { className: "safe-check" },
                    React.createElement(Icon, { name: "check", size: 15 })),
                React.createElement("div", null,
                    React.createElement("b", null, "Tudo sob controle"),
                    React.createElement("p", null, "Seus dados ficam armazenados localmente neste dispositivo. O aplicativo n\u00E3o depende de um servidor para guardar sua carteira.")))));
}
function App() {
    const [loading, setLoading] = useState(true), [investments, setInvestments] = useState([]), [refTaxas, setRefTaxas] = useState(defaultRef), [taxaStatus, setTaxaStatus] = useState('manual'), [historicoIndices, setHistoricoIndices] = useState({ cdi: [], selic: [], status: 'idle' }), [tab, setTab] = useState('painel'), [period, setPeriod] = useState('mes'), [showForm, setShowForm] = useState(false), [editingId, setEditingId] = useState(null), [form, setForm] = useState(emptyForm), [formError, setFormError] = useState(''), [showDados, setShowDados] = useState(false), [backupMsg, setBackupMsg] = useState(''), [today, setToday] = useState(todayStr()), [historicoTick, setHistoricoTick] = useState(0), [showResgate, setShowResgate] = useState(null), [showRelatorio, setShowRelatorio] = useState(false);
    const refreshTaxas = useCallback(() => { setTaxaStatus('carregando'); fetchTaxasBCB().then(data => { const novo = { cdi: data.cdi.valor, selic: data.selic.valor, ipca: data.ipca.valor, dataCDI: data.cdi.data, dataSelic: data.selic.data, dataIPCA: data.ipca.data, atualizado: today, fonte: 'bcb' }; setRefTaxas(novo); setTaxaStatus('conectado'); storage.set('rf-taxas-referencia', JSON.stringify(novo)); }).catch(() => setTaxaStatus('offline')); }, [today]);
    useEffect(() => { (async () => { const r = await storage.get('rf-investimentos'); if (r)
        try {
            setInvestments(JSON.parse(r.value));
        }
        catch (e) { } const r2 = await storage.get('rf-taxas-referencia'); if (r2)
        try {
            setRefTaxas(JSON.parse(r2.value));
        }
        catch (e) { } setLoading(false); refreshTaxas(); })(); const it = setInterval(() => { setToday(todayStr()); setHistoricoTick(x => x + 1); refreshTaxas(); }, 3600000); const vis = () => { if (document.visibilityState === 'visible') {
        setToday(todayStr());
        setHistoricoTick(x => x + 1);
        refreshTaxas();
    } }; document.addEventListener('visibilitychange', vis); return () => { clearInterval(it); document.removeEventListener('visibilitychange', vis); }; }, []);
    // O histórico de CDI precisa cobrir desde o investimento mais antigo da
    // carteira (não só os indexados a CDI), porque ele também é usado como
    // referência de comparação ("desde o início") para a carteira inteira.
    // Sem isso, se o investimento mais antigo for Prefixado/Tesouro, o CDI de
    // comparação ficava artificialmente baixo (faltando o início do período).
    const minDataCDI = useMemo(() => investments.map(i => i.dataAplicacao).filter(Boolean).sort()[0] || null, [investments]), minDataSelic = useMemo(() => investments.filter(i => i.indexador === 'SELIC').map(i => i.dataAplicacao).sort()[0] || null, [investments]);
    useEffect(() => { let cancel = false; (async () => { try {
        const [cdi, selic] = await Promise.all([minDataCDI ? fetchHistoricoDiario(12, minDataCDI, today) : Promise.resolve([]), minDataSelic ? fetchHistoricoDiario(11, minDataSelic, today) : Promise.resolve([])]);
        if (!cancel)
            setHistoricoIndices({ cdi, selic, status: 'ok' });
    }
    catch (e) {
        if (!cancel)
            setHistoricoIndices(h => ({ ...h, status: 'erro' }));
    } })(); return () => { cancel = true; }; }, [minDataCDI, minDataSelic, today, historicoTick]);
    const ref = { ...refTaxas, historicoCDI: historicoIndices.cdi, historicoSelic: historicoIndices.selic };
    const [vTick, setVTick] = useState(0);
    async function persist(list) { setInvestments(list); await storage.set('rf-investimentos', JSON.stringify(list)); setVTick(x => x + 1); }
    function openNew() { setForm(emptyForm); setEditingId(null); setFormError(''); setShowForm(true); }
    function openEdit(inv) { setForm({ ...emptyForm, ...inv, valorAplicado: String(inv.valorAplicado), parametroValor: inv.parametroValor ?? '', aliquotaIRManual: inv.aliquotaIRManual ?? '', taxaOverrideAnual: inv.taxaOverrideAnual ?? '', carteira: inv.carteira || '', vincularA: inv.groupId || '', tituloTesouro: inv.tituloTesouro || '', quantidade: inv.quantidade ?? '', precoUnitarioCompra: inv.precoUnitarioCompra ?? '', precoUnitarioAtual: inv.precoUnitarioAtual ?? '', valorAtualBrutoManual: inv.valorAtualBrutoManual ?? '', taxaCustodiaB3: inv.taxaCustodiaB3 ?? '0.20', tesouroCupom: inv.tesouroCupom || 'Não' }); setEditingId(inv.id); setFormError(''); setShowForm(true); }
    function handleTipoChange(tipo) { setForm(f => ({ ...f, tipo, isentoIR: TIPO_META[tipo].isentoDefault })); }
    function handleSave() { if (!form.instituicao.trim())
        return setFormError('Informe a instituição / emissor.'); if (!form.dataAplicacao)
        return setFormError('Informe a data de aplicação.'); if (!form.dataVencimento)
        return setFormError('Informe o vencimento.'); const valor = Number(form.valorAplicado); if (!valor || valor <= 0)
        return setFormError('Informe um valor aplicado válido.'); const grupoSelecionado = form.vincularA ? investments.find(inv => inv.id === form.vincularA || (inv.groupId || inv.id) === form.vincularA) : null; const groupId = grupoSelecionado ? (grupoSelecionado.groupId || grupoSelecionado.id) : (editingId ? ((investments.find(inv => inv.id === editingId)?.groupId) || editingId) : uid()); const campos = { instituicao: form.instituicao.trim(), tipo: form.tipo, indexador: form.indexador, parametroValor: form.parametroValor === '' ? 0 : Number(form.parametroValor), dataAplicacao: form.dataAplicacao, dataVencimento: form.dataVencimento, valorAplicado: valor, liquidez: form.liquidez, isentoIR: !!form.isentoIR, aliquotaIRManual: form.aliquotaIRManual === '' ? '' : Number(form.aliquotaIRManual), taxaOverrideAnual: form.taxaOverrideAnual === '' ? '' : Number(form.taxaOverrideAnual), carteira: form.carteira.trim(), observacoes: form.observacoes, groupId, tituloTesouro: form.tituloTesouro?.trim() || '', quantidade: form.quantidade === '' ? '' : Number(form.quantidade), precoUnitarioCompra: form.precoUnitarioCompra === '' ? '' : Number(form.precoUnitarioCompra), precoUnitarioAtual: form.precoUnitarioAtual === '' ? '' : Number(form.precoUnitarioAtual), valorAtualBrutoManual: form.valorAtualBrutoManual === '' ? '' : Number(form.valorAtualBrutoManual), taxaCustodiaB3: form.taxaCustodiaB3 === '' ? 0.20 : Number(form.taxaCustodiaB3), tesouroCupom: form.tesouroCupom || 'Não' }; if (editingId)
        persist(investments.map(inv => inv.id === editingId ? { ...inv, ...campos } : inv));
    else
        persist([...investments, { id: uid(), ...campos, status: 'ativo', historico: [{ id: uid(), data: campos.dataAplicacao, valorBruto: valor }] }]); setShowForm(false); }
    function deleteInvestment(id) { if (confirm('Excluir esta aplicação? Essa ação não pode ser desfeita e não fica no histórico.'))
        persist(investments.filter(i => i.id !== id)); }
    function resgatarInvestimento(id, dataResgate, valorLiquido, valorBruto) {
        persist(investments.map(inv => inv.id === id ? { ...inv, status: 'resgatado', dataResgate, valorResgatadoLiquido: valorLiquido, valorResgatadoBruto: valorBruto } : inv));
    }
    function reabrirInvestimento(id) {
        persist(investments.map(inv => inv.id === id ? { ...inv, status: 'ativo', dataResgate: undefined, valorResgatadoLiquido: undefined, valorResgatadoBruto: undefined } : inv));
    }
    function exportarBackup() { try {
        baixarBackup();
        setBackupMsg('Backup exportado.');
    }
    catch (e) {
        setBackupMsg('Não foi possível exportar o backup.');
    } }
    async function importarBackup(file) { try {
        const payload = await lerBackupArquivo(file);
        if (!payload || !Array.isArray(payload.investments))
            throw new Error('Arquivo de backup inválido: não encontrei a lista de investimentos.');
        // Saneamento defensivo: preenche campos essenciais que possam faltar em
        // backups mais antigos, em vez de rejeitar o arquivo inteiro ou quebrar
        // a tela depois de importado.
        const sane = payload.investments.filter(i => i && i.instituicao && i.tipo && i.valorAplicado && i.dataAplicacao && i.dataVencimento).map(i => ({ ...i, id: i.id || uid(), status: i.status === 'resgatado' ? 'resgatado' : 'ativo', historico: Array.isArray(i.historico) ? i.historico : [] }));
        const ignorados = payload.investments.length - sane.length;
        const nAtivos = sane.filter(i => i.status === 'ativo').length, nHistorico = sane.filter(i => i.status === 'resgatado').length;
        if (!confirm(`Importar ${sane.length} investimento${sane.length === 1 ? '' : 's'} (${nAtivos} ativo${nAtivos === 1 ? '' : 's'} + ${nHistorico} no hist\u00F3rico)${ignorados ? `, ignorando ${ignorados} registro(s) incompleto(s)` : ''}? Isso substitui os dados atuais deste aparelho.`))
            return;
        await storage.set('rf-investimentos', JSON.stringify(sane));
        if (payload.taxas)
            await storage.set('rf-taxas-referencia', JSON.stringify(payload.taxas));
        setInvestments(sane);
        if (payload.taxas)
            setRefTaxas(payload.taxas);
        setBackupMsg(`Importados ${sane.length} investimentos (${nAtivos} ativos, ${nHistorico} no histórico)${ignorados ? ` — ${ignorados} registro(s) ignorado(s) por estarem incompletos` : ''}.`);
    }
    catch (e) {
        setBackupMsg(e.message || 'Falha ao importar backup.');
    } }
    const ativos = useMemo(() => investments.filter(i => i.status === 'ativo'), [investments]), historico = useMemo(() => investments.filter(i => i.status === 'resgatado'), [investments]), metricsById = useMemo(() => { const m = {}; investments.forEach(i => m[i.id] = calcMetrics(i, today, ref)); return m; }, [investments, today, refTaxas, historicoIndices, vTick]);
    const totais = useMemo(() => ativos.reduce((a, i) => { const m = metricsById[i.id]; a.aplicado += Number(i.valorAplicado) || 0; a.bruto += m.valorAtualBruto || 0; a.liquido += m.valorAtualLiquido || 0; a.estimadoVenc += m.valorEstLiquidoVenc || 0; return a; }, { aplicado: 0, bruto: 0, liquido: 0, estimadoVenc: 0 }), [ativos, metricsById]), ganhoLiquido = totais.liquido - totais.aplicado, evolucao = useMemo(() => buildEvolutionSeries(ativos, metricsById, today), [ativos, metricsById, today]);
    if (loading)
        return React.createElement("div", { className: "loading-screen" }, "Carregando sua carteira\u2026");
    if (showRelatorio)
        return React.createElement(RelatorioPrint, { ativos: ativos, historico: historico, totais: totais, ganhoLiquido: ganhoLiquido, metricsById: metricsById, refTaxas: ref, today: today, onClose: () => setShowRelatorio(false) });
    return React.createElement("div", { className: "ref-app" },
        React.createElement(ReferenceHeader, { refTaxas: refTaxas, status: taxaStatus, onRefresh: refreshTaxas, onNew: openNew, onDados: () => { setBackupMsg(''); setShowDados(true); }, tab: tab, setTab: setTab }),
        React.createElement("main", null,
            tab === 'painel' && React.createElement(ReferenceDashboard, { ativos: ativos, totais: totais, ganhoLiquido: ganhoLiquido, metricsById: metricsById, refTaxas: ref, today: today, evolucao: evolucao, setTab: setTab, period: period, setPeriod: setPeriod }),
            " ",
            tab === 'aplicacoes' && React.createElement(ReferenceApplications, { ativos: ativos, metricsById: metricsById, refTaxas: ref, today: today, setTab: setTab, onNew: openNew, openEdit: openEdit, deleteInvestment: deleteInvestment, onResgatar: setShowResgate }),
            " ",
            tab === 'analise' && React.createElement(ReferenceAnalysis, { ativos: ativos, metricsById: metricsById, refTaxas: ref, today: today, evolucao: evolucao, setTab: setTab }),
            " ",
            tab === 'instituicoes' && React.createElement(ReferenceInstitutions, { ativos: ativos, metricsById: metricsById, setTab: setTab }),
            " ",
            tab === 'historico' && React.createElement(HistoricoScreen, { historico: historico, refTaxas: ref, today: today, reabrirInvestimento: reabrirInvestimento, deleteInvestment: deleteInvestment, setTab: setTab }),
            " ",
            tab === 'mais' && React.createElement(MoreScreen, { onDados: () => { setBackupMsg(''); setShowDados(true); }, onNew: openNew, setTab: setTab, refTaxas: refTaxas, taxaStatus: taxaStatus, onRefresh: refreshTaxas, onRelatorio: () => setShowRelatorio(true), historicoCount: historico.length })),
        React.createElement("nav", { className: "bottom-nav" }, [['painel', 'Painel', 'home'], ['aplicacoes', 'Aplicações', 'bank'], ['analise', 'Análise', 'barChart'], ['mais', 'Mais', 'menu']].map(([k, l, ic]) => React.createElement("button", { key: k, className: tab === k ? 'active' : '', onClick: () => setTab(k) },
            React.createElement(Icon, { name: ic, size: 18 }),
            React.createElement("span", null, l)))),
        showDados && React.createElement(DadosModal, { onClose: () => setShowDados(false), onExport: exportarBackup, onImport: importarBackup, message: backupMsg, investmentsCount: investments.length }),
        " ",
        showResgate && React.createElement(ResgateModal, { inv: investments.find(i => i.id === showResgate), metrics: metricsById[showResgate], onClose: () => setShowResgate(null), onConfirm: (data, liq, bru) => { resgatarInvestimento(showResgate, data, liq, bru); setShowResgate(null); } }),
        " ",
        showForm && React.createElement(FormModal, { form: form, setForm: setForm, editingId: editingId, formError: formError, refTaxas: ref, investments: investments, onClose: () => setShowForm(false), onSave: handleSave, onTipoChange: handleTipoChange }));
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
    const maiorEmissor = Object.entries(porInstituicao).sort((a, b) => b[1] - a[1])[0];
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
    return React.createElement(Panel, { title: "Vis\u00E3o geral", subtitle: "os principais n\u00FAmeros, sem excesso de informa\u00E7\u00E3o" },
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 } }, cards.map(([label, value, sub, accent]) => React.createElement("div", { key: label, style: { background: C.panel2, border: `1px solid ${C.hairline}`, borderRadius: 10, padding: '12px 13px', minHeight: 82 } },
            React.createElement("div", { style: { color: C.muted, fontSize: 9.5, textTransform: 'uppercase', fontWeight: 800, letterSpacing: .3 } }, label),
            React.createElement("div", { style: { color: accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 700, marginTop: 7, lineHeight: 1.1 } }, value),
            React.createElement("div", { style: { color: C.muted, fontSize: 9.5, marginTop: 5, lineHeight: 1.25 } }, sub)))));
}
function InsightsCarteira({ ativos, metricsById, refTaxas, today }) {
    const total = ativos.reduce((s, inv) => s + (metricsById[inv.id]?.valorAtualBruto || 0), 0) || 1;
    const porInstituicao = {};
    ativos.forEach(inv => { porInstituicao[inv.instituicao] = (porInstituicao[inv.instituicao] || 0) + (metricsById[inv.id]?.valorAtualBruto || 0); });
    const maior = Object.entries(porInstituicao).sort((a, b) => b[1] - a[1])[0];
    const maiorPct = maior ? maior[1] / total * 100 : 0;
    const agora = new Date(today + 'T00:00:00');
    const limite30 = new Date(agora);
    limite30.setDate(limite30.getDate() + 30);
    const venc30 = ativos.filter(inv => { const d = new Date(inv.dataVencimento + 'T00:00:00'); return d >= agora && d <= limite30; });
    const valorVenc30 = venc30.reduce((s, inv) => s + (metricsById[inv.id]?.valorAtualBruto || 0), 0);
    const pctVenc30 = valorVenc30 / total * 100;
    const semLiquidez = ativos.filter(inv => String(inv.liquidez || '').toLowerCase().includes('vencimento')).reduce((s, inv) => s + (metricsById[inv.id]?.valorAtualBruto || 0), 0) / total * 100;
    const baixos = ativos.filter(inv => inv.indexador === 'CDI' && !inv.isentoIR && (Number(inv.parametroValor) || 0) > 0 && (Number(inv.parametroValor) || 0) < 90)
        .sort((a, b) => (metricsById[a.id]?.rentLiquidaMensal ?? 999) - (metricsById[b.id]?.rentLiquidaMensal ?? 999));
    const equivalentes = ativos.filter(inv => inv.isentoIR && metricsById[inv.id]?.percentualCDIEquivalente != null);
    const oportunidades = equivalentes.filter(inv => metricsById[inv.id].percentualCDIEquivalente >= 110)
        .sort((a, b) => metricsById[b.id].percentualCDIEquivalente - metricsById[a.id].percentualCDIEquivalente);
    const melhores = ativos.slice().sort((a, b) => (metricsById[b.id]?.rentLiquidaMensal ?? -999) - (metricsById[a.id]?.rentLiquidaMensal ?? -999)).slice(0, 3);
    const piores = ativos.slice().sort((a, b) => (metricsById[a.id]?.rentLiquidaMensal ?? 999) - (metricsById[b.id]?.rentLiquidaMensal ?? 999)).slice(0, 3);
    const insights = [];
    if (maior && maiorPct >= 40)
        insights.push({ tipo: 'atenção', titulo: 'Concentração elevada em um emissor', texto: `${maior[0]} representa ${fmtPct(maiorPct)} do patrimônio. Vale revisar a concentração e a cobertura do FGC, quando aplicável.`, cor: C.red });
    if (pctVenc30 >= 20 && venc30.length)
        insights.push({ tipo: 'atenção', titulo: 'Vencimentos próximos', texto: `${fmtPct(pctVenc30)} da carteira vence nos próximos 30 dias. Vale planejar a destinação do dinheiro antes dos vencimentos.`, cor: C.blue });
    if (semLiquidez >= 50)
        insights.push({ tipo: 'atenção', titulo: 'Liquidez concentrada no vencimento', texto: `${fmtPct(semLiquidez)} da carteira está marcada como “No vencimento”. Vale conferir se a reserva de liquidez está separada desses recursos.`, cor: C.blue });
    if (baixos.length)
        insights.push({ tipo: 'revisar', titulo: 'Taxas CDI abaixo de 90%', texto: `Há ${baixos.length} aplicação${baixos.length > 1 ? 'ões' : ''} tributável${baixos.length > 1 ? 'eis' : ''} em CDI abaixo de 90%. São candidatas a revisão quando houver liquidez ou vencimento.`, cor: C.lime });
    if (oportunidades.length)
        insights.push({ tipo: 'oportunidade', titulo: 'Produtos isentos com boa equivalência tributável', texto: `${oportunidades.length} aplicação${oportunidades.length > 1 ? 'ões' : ''} isenta${oportunidades.length > 1 ? 's' : ''} equivale${oportunidades.length > 1 ? 'm' : ''} a pelo menos 110% do CDI em um produto tributável na alíquota aplicável. Compare também prazo, liquidez e risco do emissor.`, cor: C.blue });
    if (!insights.length)
        insights.push({ tipo: 'ok', titulo: 'Nenhum alerta prioritário', texto: 'A carteira não apresenta, pelos critérios atuais, um ponto de revisão que mereça destaque imediato.', cor: C.lime });
    const Row = ({ inv, tipo }) => { const m = metricsById[inv.id]; return React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.hairline}` } },
        React.createElement("div", { style: { minWidth: 0 } },
            React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, inv.instituicao),
            React.createElement("div", { style: { fontSize: 10.5, color: C.muted } },
                descricaoTaxa(inv, refTaxas),
                " \u00B7 ",
                fmtBRL(m.valorAtualLiquido),
                inv.isentoIR ? ` · equiv. ${fmtPct(m.percentualCDIEquivalente)} CDI` : '')),
        React.createElement("div", { style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: m.rentLiquidaMensal >= 0 ? C.lime : C.red } },
            fmtPct(m.rentLiquidaMensal),
            React.createElement("div", { style: { fontFamily: 'inherit', fontSize: 9, color: C.muted, textAlign: 'right' } }, "l\u00EDq./m\u00EAs"))); };
    return React.createElement(Panel, { title: "Insights", subtitle: "pontos que merecem revis\u00E3o; n\u00E3o s\u00E3o recomenda\u00E7\u00F5es autom\u00E1ticas" },
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 10 } },
            React.createElement("div", { style: { background: C.panel2, border: `1px solid ${C.hairline}`, borderRadius: 10, padding: '12px 13px' } },
                React.createElement(SectionLabel, { icon: React.createElement(Icon, { name: "alert", size: 13 }) }, "Leitura autom\u00E1tica"),
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 9 } }, insights.slice(0, 3).map((x, i) => React.createElement("div", { key: i, style: { borderLeft: `3px solid ${x.cor}`, paddingLeft: 9 } },
                    React.createElement("div", { style: { fontSize: 12.5, fontWeight: 800 } }, x.titulo),
                    React.createElement("div", { style: { fontSize: 10.5, color: C.muted, lineHeight: 1.35, marginTop: 3 } }, x.texto))))),
            React.createElement("div", { style: { background: C.panel2, border: `1px solid ${C.hairline}`, borderRadius: 10, padding: '12px 13px' } },
                React.createElement(SectionLabel, { icon: React.createElement(Icon, { name: "trophy", size: 13 }) }, "Melhores \u00B7 l\u00EDquido/m\u00EAs"),
                melhores.length ? melhores.map(inv => React.createElement(Row, { key: inv.id, inv: inv })) : React.createElement("div", { style: { color: C.muted, fontSize: 11 } }, "Sem aplica\u00E7\u00F5es.")),
            React.createElement("div", { style: { background: C.panel2, border: `1px solid ${C.hairline}`, borderRadius: 10, padding: '12px 13px' } },
                React.createElement(SectionLabel, { icon: React.createElement(Icon, { name: "chevronDown", size: 13 }) }, "Revisar primeiro"),
                piores.length ? piores.map(inv => React.createElement(Row, { key: inv.id, inv: inv })) : React.createElement("div", { style: { color: C.muted, fontSize: 11 } }, "Sem aplica\u00E7\u00F5es."))),
        React.createElement("div", { style: { marginTop: 10, color: C.muted, fontSize: 10, lineHeight: 1.35 } }, "Equival\u00EAncia tribut\u00E1vel: transforma a taxa de um produto isento na taxa bruta aproximada que um produto tribut\u00E1vel precisaria oferecer para gerar o mesmo retorno l\u00EDquido, usando a al\u00EDquota de IR aplic\u00E1vel ao prazo. A compara\u00E7\u00E3o n\u00E3o considera diferen\u00E7as de liquidez, risco, car\u00EAncia ou custos."));
}
function monthStartISO(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}-01`; }
function shiftMonth(y, m, delta) { const d = new Date(y, m + 1, 1); d.setMonth(d.getMonth() + delta); return [d.getFullYear(), d.getMonth() - 1]; }
function monthEndISO(y, m) { const d = new Date(y, m + 1, 0); return isoDate(d); }
function MonthlyPerformanceChart({ ativos, refTaxas, today, investments }) {
    const d = new Date(today + 'T00:00:00');
    const points = [];
    for (let k = 5; k >= 0; k--) {
        const x = new Date(d.getFullYear(), d.getMonth() - k, 1);
        const y = x.getFullYear(), m = x.getMonth();
        const ini = monthStartISO(y, m);
        const fim = (y === d.getFullYear() && m === d.getMonth()) ? today : monthEndISO(y, m);
        const r = retornoCarteiraPeriodoMD(ativos, ini, fim, refTaxas, today);
        const c = periodoCDIExato(refTaxas, ini, fim);
        points.push({ label: x.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), ret: r ?? 0, cdi: c ?? 0 });
    }
    const max = Math.max(0.2, ...points.flatMap(x => [x.ret, x.cdi].map(v => Math.abs(v))));
    return React.createElement("div", { style: { paddingTop: 4 } },
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, alignItems: 'end', height: 175 } }, points.map((p, i) => React.createElement("div", { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 5 } },
            React.createElement("div", { style: { fontSize: 8.5, color: C.muted, fontFamily: "'IBM Plex Mono',monospace" } }, fmtPct(p.ret)),
            React.createElement("div", { style: { width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', justifyContent: 'center', height: 112 } },
                React.createElement("div", { title: `Carteira ${fmtPct(p.ret)}`, style: { width: 16, maxWidth: '40%', height: `${Math.max(4, Math.min(100, Math.abs(p.ret) / max * 100))}%`, background: '#32D583', borderRadius: '5px 5px 2px 2px' } }),
                React.createElement("div", { title: `CDI ${fmtPct(p.cdi)}`, style: { width: 16, maxWidth: '40%', height: `${Math.max(4, Math.min(100, Math.abs(p.cdi) / max * 100))}%`, background: '#8E99A8', borderRadius: '5px 5px 2px 2px' } })),
            React.createElement("div", { style: { fontSize: 9, color: C.muted, textTransform: 'capitalize' } }, p.label)))),
        React.createElement("div", { style: { display: 'flex', gap: 14, fontSize: 9.5, color: C.muted, justifyContent: 'center', marginTop: 4 } },
            React.createElement("span", null,
                React.createElement("i", { style: { display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: '#32D583', marginRight: 4 } }),
                "Carteira"),
            React.createElement("span", null,
                React.createElement("i", { style: { display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: '#8E99A8', marginRight: 4 } }),
                "CDI")));
}
function DonutChart({ data, total }) {
    const vals = data.filter(x => x.value > 0);
    if (!vals.length)
        return React.createElement("div", { style: { color: C.muted, fontSize: 11 } }, "Sem dados.");
    let acc = 0;
    const stops = vals.map(x => { const a = acc; acc += x.value; return `${x.cor} ${(a / total) * 100}% ${(acc / total) * 100}%`; }).join(',');
    return React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 16 } },
        React.createElement("div", { style: { width: 150, height: 150, borderRadius: '50%', background: `conic-gradient(${stops})`, position: 'relative', flexShrink: 0 } },
            React.createElement("div", { style: { position: 'absolute', inset: 28, borderRadius: '50%', background: C.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' } },
                React.createElement("div", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700 } }, fmtBRL(total).replace('R$', 'R$')),
                React.createElement("div", { style: { fontSize: 8.5, color: C.muted } }, "Patrim\u00F4nio"))),
        React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 } }, vals.slice(0, 5).map((x, i) => React.createElement("div", { key: i, style: { display: 'grid', gridTemplateColumns: '8px 1fr auto', gap: 6, alignItems: 'center', fontSize: 10.5 } },
            React.createElement("span", { style: { width: 8, height: 8, borderRadius: 99, background: x.cor } }),
            React.createElement("span", { style: { color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, nomeInstituicao(x.name)),
            React.createElement("span", { style: { fontFamily: "'IBM Plex Mono',monospace", color: C.text } }, fmtPct(x.value / total * 100))))));
}
function EvolutionChart({ data }) { if (!data || data.length < 2)
    return React.createElement("div", { style: { height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 11 } }, "Dados insuficientes para o gr\u00E1fico."); const vals = data.map(x => x.total), min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1, W = 640, H = 190, pad = 12; const pts = vals.map((v, i) => [pad + (i / (vals.length - 1)) * (W - pad * 2), H - pad - (v - min) / range * (H - pad * 2)]); const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '); const area = path + ` L${W - pad},${H - pad} L${pad},${H - pad} Z`; return React.createElement("div", null,
    React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted } },
        React.createElement("span", null, fmtBRL(max)),
        React.createElement("span", { style: { fontFamily: "'IBM Plex Mono',monospace", color: C.text } }, fmtBRL(vals[vals.length - 1]))),
    React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: '100%', height: 190, display: 'block' }, preserveAspectRatio: "none" },
        React.createElement("defs", null,
            React.createElement("linearGradient", { id: "evg", x1: "0", x2: "0", y1: "0", y2: "1" },
                React.createElement("stop", { offset: "0%", stopColor: "#32D583", stopOpacity: ".30" }),
                React.createElement("stop", { offset: "100%", stopColor: "#32D583", stopOpacity: ".02" }))),
        React.createElement("path", { d: area, fill: "url(#evg)" }),
        React.createElement("path", { d: path, fill: "none", stroke: "#32D583", strokeWidth: "3", vectorEffect: "non-scaling-stroke" }),
        React.createElement("circle", { cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: "4", fill: "#32D583" })),
    React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted } },
        React.createElement("span", null, data[0].date),
        React.createElement("span", null, data[data.length - 1].date))); }
function Dashboard({ ativos, totais, ganhoLiquido, metricsById, refTaxas, today, investments, setTab }) {
    const [periodo, setPeriodo] = useState('mes');
    const inicio = inicioPeriodo(periodo, today, investments);
    const retorno = retornoCarteiraPeriodoMD(ativos, inicio, today, refTaxas, today);
    const cdi = periodoCDIExato(refTaxas, inicio, today);
    const dif = retorno !== null && cdi !== null ? retorno - cdi : null;
    const pct = retorno !== null && cdi > 0 ? retorno / cdi * 100 : null;
    const grupos = grupoInstituicoes(ativos, metricsById);
    const porInst = grupos.map(g => ({ name: g.nome, value: g.liquido, cor: ['#2F80ED', '#32D583', '#D7A84A', '#A66BFF', '#7C93AC', '#F06A6A'][grupos.indexOf(g) % 6] }));
    const evolucao = buildEvolutionSeries(ativos, metricsById, today);
    const venc30 = ativos.filter(i => metricsById[i.id].diasRestantes >= 0 && metricsById[i.id].diasRestantes <= 30);
    const venc30Val = venc30.reduce((s, i) => s + metricsById[i.id].valorAtualLiquido, 0);
    const melhores = ativos.slice().sort((a, b) => (metricsById[b.id].rentLiquidaMensal ?? -999) - (metricsById[a.id].rentLiquidaMensal ?? -999)).slice(0, 3);
    const revisar = ativos.slice().sort((a, b) => (metricsById[a.id].rentLiquidaMensal ?? 999) - (metricsById[b.id].rentLiquidaMensal ?? 999)).slice(0, 3);
    const maior = grupos[0];
    const alerts = [];
    if (maior && totais.liquido > 0 && maior.liquido / totais.liquido >= .4)
        alerts.push({ t: 'Concentração', d: `${fmtPct(maior.liquido / totais.liquido * 100)} da carteira está em ${nomeInstituicao(maior.nome)}.`, c: '#A66BFF' });
    if (venc30Val > 0)
        alerts.push({ t: 'Vencimentos', d: `${fmtBRL(venc30Val)} vencem nos próximos 30 dias.`, c: '#D7A84A' });
    const abaixo = ativos.filter(i => i.indexador === 'CDI' && !i.isentoIR && Number(i.parametroValor) > 0 && Number(i.parametroValor) < 90);
    if (abaixo.length)
        alerts.push({ t: 'Revisar', d: `${abaixo.length} posição(ões) estão abaixo de 90% do CDI.`, c: '#F06A6A' });
    if (!alerts.length)
        alerts.push({ t: 'Tudo em ordem', d: 'Nenhum ponto prioritário encontrado pelos critérios atuais.', c: '#32D583' });
    return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        React.createElement("section", { style: { background: 'linear-gradient(145deg,#0D2034 0%,#08131F 72%)', border: '1px solid rgba(215,168,74,.30)', borderRadius: 22, padding: '20px 18px', boxShadow: '0 18px 45px rgba(0,0,0,.25)' } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 10, color: '#D7A84A', fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase' } }, "Patrim\u00F4nio l\u00EDquido"),
                    React.createElement("div", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 32, fontWeight: 700, marginTop: 5, letterSpacing: '-.045em' } }, fmtBRL(totais.liquido)),
                    React.createElement("div", { style: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 7 } },
                        React.createElement("span", { style: { color: ganhoLiquido >= 0 ? '#32D583' : '#F06A6A', fontSize: 12.5, fontWeight: 800 } },
                            ganhoLiquido >= 0 ? '+' : '',
                            fmtBRL(ganhoLiquido)),
                        React.createElement("span", { style: { color: C.muted, fontSize: 10.5 } }, "ganho acumulado"))),
                React.createElement("div", { style: { textAlign: 'right' } },
                    React.createElement("div", { style: { fontSize: 9, color: C.muted } },
                        ativos.length,
                        " posi\u00E7\u00F5es"),
                    React.createElement("div", { style: { fontSize: 9, color: C.muted } },
                        grupos.length,
                        " institui\u00E7\u00F5es")))),
        React.createElement("section", { className: "reference-stat-grid" },
            React.createElement(MetricTile, { label: "Rentabilidade no m\u00EAs", value: fmtPct(retornoCarteiraPeriodoMD(ativos, inicioPeriodo('mes', today, investments), today, refTaxas, today)), accent: "#32D583" }),
            React.createElement(MetricTile, { label: "Rentabilidade no ano", value: fmtPct(retornoCarteiraPeriodoMD(ativos, inicioPeriodo('ano', today, investments), today, refTaxas, today)), accent: "#32D583" }),
            React.createElement(MetricTile, { label: "Carteira", value: `${grupos.length} instituições · ${ativos.length} investimentos`, accent: "#EDEFF3" }),
            React.createElement(MetricTile, { label: "Aten\u00E7\u00E3o", value: `${venc30.length} vencimento${venc30.length === 1 ? '' : 's'} em até 30 dias`, accent: venc30.length ? '#D7A84A' : '#32D583' })),
        React.createElement("section", { style: { background: C.panel, border: `1px solid ${C.hairline}`, borderRadius: 18, padding: '15px 14px' } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontWeight: 850, fontSize: 14 } }, "Desempenho"),
                    React.createElement("div", { style: { fontSize: 10, color: C.muted } }, "sua carteira versus CDI")),
                React.createElement("div", { style: { display: 'flex', gap: 2, background: C.panel2, borderRadius: 9, padding: 3 } }, PERIODOS.map(([v, l]) => React.createElement("button", { key: v, onClick: () => setPeriodo(v), style: { border: 0, borderRadius: 7, padding: '6px 9px', fontSize: 9.5, fontWeight: 800, cursor: 'pointer', background: periodo === v ? '#D7A84A' : 'transparent', color: periodo === v ? '#10151A' : C.muted } }, l)))),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 } },
                React.createElement(MetricTile, { label: "Carteira", value: fmtPct(retorno), accent: retorno >= 0 ? '#32D583' : '#F06A6A' }),
                React.createElement(MetricTile, { label: "CDI", value: fmtPct(cdi) }),
                React.createElement(MetricTile, { label: "Diferen\u00E7a", value: fmtPct(dif), accent: dif !== null && dif >= 0 ? '#32D583' : '#F06A6A' }),
                React.createElement(MetricTile, { label: "% CDI", value: pct == null ? '—' : fmtPct(pct), accent: pct != null && pct >= 100 ? '#32D583' : '#D7A84A' }))),
        React.createElement("section", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 12 } },
            React.createElement(Panel, { title: "Rentabilidade", subtitle: "performance mensal \u00B7 carteira x CDI" },
                React.createElement(MonthlyPerformanceChart, { ativos: ativos, refTaxas: refTaxas, today: today, investments: investments })),
            React.createElement(Panel, { title: "Composi\u00E7\u00E3o", subtitle: "patrim\u00F4nio por institui\u00E7\u00E3o" },
                React.createElement(DonutChart, { data: porInst, total: totais.liquido }))),
        React.createElement(Panel, { title: "Evolu\u00E7\u00E3o patrimonial", subtitle: "varia\u00E7\u00E3o do patrim\u00F4nio ao longo do tempo" },
            React.createElement(EvolutionChart, { data: evolucao })),
        React.createElement("section", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 } },
            React.createElement(Panel, { title: "Insights", subtitle: "foco no que merece aten\u00E7\u00E3o" },
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 11 } }, alerts.slice(0, 3).map((x, i) => React.createElement("div", { key: i, style: { display: 'grid', gridTemplateColumns: '9px 1fr', gap: 9, alignItems: 'start' } },
                    React.createElement("div", { style: { width: 9, height: 9, borderRadius: 99, background: x.c, marginTop: 4 } }),
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontSize: 11.5, fontWeight: 850 } }, x.t),
                        React.createElement("div", { style: { fontSize: 10, color: C.muted, lineHeight: 1.4, marginTop: 2 } }, x.d)))))),
            React.createElement(Panel, { title: "Melhores investimentos", subtitle: "rentabilidade l\u00EDquida equivalente / m\u00EAs" },
                React.createElement(CompactInvestmentTable, { items: melhores, metricsById: metricsById, mode: "best", refTaxas: refTaxas })),
            React.createElement(Panel, { title: "Revisar primeiro", subtitle: "menor rentabilidade l\u00EDquida equivalente / m\u00EAs" },
                React.createElement(CompactInvestmentTable, { items: revisar, metricsById: metricsById, mode: "review", refTaxas: refTaxas }))),
        React.createElement(Panel, { title: "Institui\u00E7\u00F5es", subtitle: "consolidado por emissor" },
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 7 } }, grupos.slice(0, 6).map(g => React.createElement("div", { key: g.key, style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', padding: '9px 10px', background: C.panel2, borderRadius: 10 } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 11.5, fontWeight: 850 } }, nomeInstituicao(g.nome)),
                    React.createElement("div", { style: { fontSize: 9, color: C.muted } },
                        g.items.length,
                        " posi\u00E7\u00F5es \u00B7 ",
                        fmtPct(g.liquido / totais.liquido * 100))),
                React.createElement("div", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 } }, fmtBRL(g.liquido)))))));
}
function MetricTile({ label, value, accent }) { return React.createElement("div", { style: { background: C.panel2, borderRadius: 9, padding: '10px 11px' } },
    React.createElement("div", { style: { fontSize: 9.5, color: C.muted, textTransform: 'uppercase', fontWeight: 800 } }, label),
    React.createElement("div", { style: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 700, color: accent || C.text, marginTop: 4 } }, value)); }
function CompactInvestmentTable({ items, metricsById, mode, refTaxas }) { return React.createElement("div", null, items.map(i => { const m = metricsById[i.id]; return React.createElement("div", { key: i.id, style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 9, alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.hairline}` } },
    React.createElement("div", { style: { minWidth: 0 } },
        React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
            i.tituloTesouro || i.tipo,
            " \u00B7 ",
            i.instituicao),
        React.createElement("div", { style: { fontSize: 9.5, color: C.muted } },
            descricaoTaxa(i, refTaxas),
            " \u00B7 ",
            fmtBRL(m.valorAtualLiquido))),
    React.createElement("div", { style: { textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: m.rentLiquidaMensal >= 0 ? (mode === 'best' ? C.lime : C.text) : C.red } },
        fmtPct(m.rentLiquidaMensal),
        React.createElement("div", { style: { fontSize: 8.5, color: C.muted } }, "l\u00EDq./m\u00EAs"))); })); }
function RankingTab({ investments, ativos, metricsById, refTaxas }) {
    const [filtroInst, setFiltroInst] = useState('Todas');
    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [ordenacao, setOrdenacao] = useState('rent');
    const [periodo, setPeriodo] = useState('mes');
    const hoje = todayStr();
    const inicio = inicioPeriodo(periodo, hoje, investments);
    const cdi = periodoCDIExato(refTaxas, inicio, hoje);
    const insts = [...new Map(ativos.map(i => [normalizarInstituicao(i.instituicao), i.instituicao])).values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const tipos = [...new Set(ativos.map(i => i.tipo))].sort();
    const rows = ativos.filter(i => (filtroInst === 'Todas' || i.instituicao === filtroInst) && (filtroTipo === 'Todos' || i.tipo === filtroTipo)).slice().sort((a, b) => ordenacao === 'rent' ? (metricsById[b.id].rentLiquidaMensal ?? -999) - (metricsById[a.id].rentLiquidaMensal ?? -999) : ordenacao === 'valor' ? metricsById[b.id].valorAtualLiquido - metricsById[a.id].valorAtualLiquido : a.dataVencimento.localeCompare(b.dataVencimento));
    const retorno = retornoCarteiraPeriodoMD(rows, inicio, hoje, refTaxas, hoje);
    const dif = retorno !== null && cdi !== null ? retorno - cdi : null;
    const pct = retorno !== null && cdi > 0 ? retorno / cdi * 100 : null;
    const grupos = grupoInstituicoes(rows, metricsById);
    return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 11 } },
        React.createElement(Panel, { title: "An\u00E1lises", subtitle: "compare m\u00EAs, ano ou todo o per\u00EDodo \u2014 sem a vis\u00E3o di\u00E1ria" },
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 7 } },
                React.createElement("select", { style: inputStyle, value: periodo, onChange: e => setPeriodo(e.target.value) }, PERIODOS.map(([v, l]) => React.createElement("option", { key: v, value: v }, l))),
                React.createElement("select", { style: inputStyle, value: filtroInst, onChange: e => setFiltroInst(e.target.value) },
                    React.createElement("option", null, "Todas"),
                    insts.map(x => React.createElement("option", { key: x }, x))),
                React.createElement("select", { style: inputStyle, value: filtroTipo, onChange: e => setFiltroTipo(e.target.value) },
                    React.createElement("option", null, "Todos"),
                    tipos.map(x => React.createElement("option", { key: x }, x))),
                React.createElement("select", { style: inputStyle, value: ordenacao, onChange: e => setOrdenacao(e.target.value) },
                    React.createElement("option", { value: "rent" }, "Rent. l\u00EDquida / m\u00EAs"),
                    React.createElement("option", { value: "valor" }, "Maior patrim\u00F4nio"),
                    React.createElement("option", { value: "vencimento" }, "Vencimento"))),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginTop: 9 } },
                React.createElement(MetricTile, { label: "Carteira", value: fmtPct(retorno), accent: retorno !== null && retorno >= 0 ? '#45D6A2' : '#F06A6A' }),
                React.createElement(MetricTile, { label: "CDI", value: fmtPct(cdi) }),
                React.createElement(MetricTile, { label: "Diferen\u00E7a", value: fmtPct(dif), accent: dif !== null && dif >= 0 ? '#45D6A2' : '#F06A6A' }),
                React.createElement(MetricTile, { label: "% CDI", value: pct === null ? '—' : fmtPct(pct), accent: pct !== null && pct >= 100 ? '#45D6A2' : '#F3B55B' })),
            React.createElement("div", { style: { fontSize: 9.5, color: C.muted, marginTop: 8 } },
                "Per\u00EDodo: ",
                fmtData(inicio),
                " \u2192 ",
                fmtData(hoje),
                " \u00B7 compara\u00E7\u00E3o bruta com CDI \u00B7 ",
                rows.length,
                " posi\u00E7\u00E3o(\u00F5es).")),
        React.createElement(Panel, { title: "Por institui\u00E7\u00E3o", subtitle: "consolida\u00E7\u00E3o do filtro atual" },
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 7 } }, grupos.map(g => React.createElement("div", { key: g.key, style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', background: C.panel2, borderRadius: 11, padding: '9px 10px' } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 11.5, fontWeight: 800 } }, nomeInstituicao(g.nome)),
                    React.createElement("div", { style: { fontSize: 9.5, color: C.muted } },
                        g.items.length,
                        " posi\u00E7\u00F5es")),
                React.createElement("div", { style: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5 } }, fmtBRL(g.liquido)))))),
        React.createElement(Panel, { title: "Comparativo", subtitle: "rentabilidade l\u00EDquida mensal e posi\u00E7\u00E3o atual" },
            React.createElement("div", { style: { overflowX: 'auto' } },
                React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse', minWidth: 650 } },
                    React.createElement("thead", null,
                        React.createElement("tr", null, ['', 'Aplicação', 'Líquido/mês', '% CDI líq.', 'Atual líquido', 'Vencimento'].map(h => React.createElement("th", { key: h, style: { textAlign: 'left', color: C.muted, fontSize: 9, textTransform: 'uppercase', padding: '7px 6px', borderBottom: `1px solid ${C.hairline}`, whiteSpace: 'nowrap' } }, h)))),
                    React.createElement("tbody", null, rows.map(i => { const m = metricsById[i.id]; return React.createElement("tr", { key: i.id },
                        React.createElement("td", { style: { padding: '7px 6px' } },
                            React.createElement(InstitutionMark, { nome: i.instituicao, size: 27 })),
                        React.createElement("td", { style: { padding: '7px 6px', fontSize: 10.5 } },
                            React.createElement("b", null, i.tituloTesouro || i.tipo),
                            React.createElement("div", { style: { fontSize: 8.8, color: C.muted } },
                                nomeInstituicao(i.instituicao),
                                " \u00B7 ",
                                descricaoTaxa(i, refTaxas))),
                        React.createElement("td", { style: { padding: '7px 6px', fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, color: m.rentLiquidaMensal >= 0 ? '#45D6A2' : '#F06A6A' } }, fmtPct(m.rentLiquidaMensal)),
                        React.createElement("td", { style: { padding: '7px 6px', fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5 } }, m.pctCDILiquido == null ? '—' : fmtPct(m.pctCDILiquido)),
                        React.createElement("td", { style: { padding: '7px 6px', fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5 } }, fmtBRL(m.valorAtualLiquido)),
                        React.createElement("td", { style: { padding: '7px 6px', fontSize: 9.5 } }, fmtData(i.dataVencimento))); }))))));
}
function exportarCSV(lista, metricsById, refTaxas) {
    const header = ['Grupo', 'Instituição', 'Tipo', 'Indexador', 'Taxa contratada', 'Carteira', 'Data aplicação', 'Data vencimento', 'Valor aplicado', 'Valor atual bruto', 'Valor atual líquido', 'Rent. líquida mensal %', 'Rent. líquida total %', '% do CDI líquido', 'Status'];
    const linhas = lista.map(inv => { const m = metricsById[inv.id]; return [grupoIdDe(inv), inv.instituicao, inv.tipo, inv.indexador, descricaoTaxa(inv, refTaxas), inv.carteira || '', fmtData(inv.dataAplicacao), fmtData(inv.dataVencimento), inv.valorAplicado.toFixed(2), m.valorAtualBruto.toFixed(2), m.valorAtualLiquido.toFixed(2), m.rentLiquidaMensal !== null ? m.rentLiquidaMensal.toFixed(2) : '', m.rentLiquidaTotal.toFixed(2), m.pctCDILiquido !== null ? m.pctCDILiquido.toFixed(1) : '', inv.status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'); });
    const csv = '\uFEFF' + [header.join(';'), ...linhas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `razao-aplicacoes-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
function grupoIdDe(inv) { return inv.groupId || inv.id; }
function resumoGrupo(lista, metricsById, groupId) {
    const itens = lista.filter(inv => grupoIdDe(inv) === groupId);
    return itens.reduce((acc, inv) => { const m = metricsById[inv.id]; acc.qtd += 1; acc.aplicado += inv.valorAplicado; acc.bruto += m.valorAtualBruto; acc.liquido += m.valorAtualLiquido; acc.estimado += m.valorEstLiquidoVenc; return acc; }, { qtd: 0, aplicado: 0, bruto: 0, liquido: 0, estimado: 0 });
}
function ListaAplicacoes({ investments, filtro, setFiltro, metricsById, refTaxas, expandedId, setExpandedId, openEdit, deleteInvestment, historicoDraft, setHistoricoDraft, addHistorico, resgatandoId, setResgatandoId, resgateDraft, setResgateDraft, confirmResgate, reabrir }) {
    const [inst, setInst] = useState('Todas'), [tipo, setTipo] = useState('Todos'), [busca, setBusca] = useState('');
    const ativos = investments.filter(i => i.status === 'ativo');
    const insts = [...new Map(investments.map(i => [normalizarInstituicao(i.instituicao), i.instituicao])).values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const tipos = [...new Set(investments.map(i => i.tipo))].sort();
    let lista = investments.filter(i => { if (filtro === 'Ativas' && !(i.status === 'ativo' && metricsById[i.id].diasRestantes >= 0))
        return false; if (filtro === 'Vencidas' && !(i.status === 'ativo' && metricsById[i.id].diasRestantes < 0))
        return false; if (filtro === 'Resgatadas' && i.status !== 'resgatado')
        return false; if (inst !== 'Todas' && i.instituicao !== inst)
        return false; if (tipo !== 'Todos' && i.tipo !== tipo)
        return false; if (busca && !`${i.instituicao} ${i.tipo} ${i.indexador} ${i.tituloTesouro || ''}`.toLowerCase().includes(busca.toLowerCase()))
        return false; return true; });
    const grupos = grupoInstituicoes(lista, metricsById);
    return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        React.createElement("div", { style: { background: C.panel, borderRadius: 12, padding: 10, display: 'grid', gridTemplateColumns: '1.4fr repeat(3,minmax(110px,1fr))', gap: 7, position: 'sticky', top: 120, zIndex: 5 } },
            React.createElement("input", { style: inputStyle, placeholder: "Pesquisar institui\u00E7\u00E3o, t\u00EDtulo...", value: busca, onChange: e => setBusca(e.target.value) }),
            React.createElement("select", { style: inputStyle, value: filtro, onChange: e => setFiltro(e.target.value) },
                React.createElement("option", null, "Ativas"),
                React.createElement("option", null, "Vencidas"),
                React.createElement("option", null, "Resgatadas"),
                React.createElement("option", null, "Todas")),
            React.createElement("select", { style: inputStyle, value: inst, onChange: e => setInst(e.target.value) },
                React.createElement("option", null, "Todas"),
                insts.map(x => React.createElement("option", { key: x }, x))),
            React.createElement("select", { style: inputStyle, value: tipo, onChange: e => setTipo(e.target.value) },
                React.createElement("option", null, "Todos"),
                tipos.map(x => React.createElement("option", { key: x }, x)))),
        grupos.length === 0 ? React.createElement("div", { style: { color: C.muted, fontSize: 13, padding: 20 } }, "Nenhuma aplica\u00E7\u00E3o encontrada.") : grupos.map(g => React.createElement(InstitutionGroup, { key: g.key, group: g, metricsById: metricsById, expandedId: expandedId, setExpandedId: setExpandedId, openEdit: openEdit, deleteInvestment: deleteInvestment, historicoDraft: historicoDraft, setHistoricoDraft: setHistoricoDraft, addHistorico: addHistorico, resgatandoId: resgatandoId, setResgatandoId: setResgatandoId, resgateDraft: resgateDraft, setResgateDraft: setResgateDraft, confirmResgate: confirmResgate, reabrir: reabrir, refTaxas: refTaxas })));
}
function InstitutionGroup({ group, metricsById, expandedId, setExpandedId, openEdit, deleteInvestment, historicoDraft, setHistoricoDraft, addHistorico, resgatandoId, setResgatandoId, resgateDraft, setResgateDraft, confirmResgate, reabrir, refTaxas }) {
    const [open, setOpen] = useState(true);
    return React.createElement("section", { style: { background: C.panel, borderRadius: 14, padding: 13, boxShadow: shadow, borderTop: `1px solid ${C.hairline}` } },
        React.createElement("button", { onClick: () => setOpen(!open), style: { width: '100%', background: 'none', border: 'none', color: C.text, cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', textAlign: 'left', padding: 0 } },
            React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 14, fontWeight: 800 } }, nomeInstituicao(group.nome)),
                React.createElement("div", { style: { fontSize: 10, color: C.muted } },
                    group.items.length,
                    " aplica\u00E7\u00E3o(\u00F5es) \u00B7 ",
                    fmtBRL(group.liquido),
                    " l\u00EDquido \u00B7 ",
                    fmtPct(group.rent),
                    " acumulado")),
            React.createElement(Icon, { name: open ? 'chevronUp' : 'chevronDown', size: 16, color: C.muted })),
        open && React.createElement("div", { style: { marginTop: 10, borderTop: `1px solid ${C.hairline}`, paddingTop: 6 } }, group.items.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)).map(inv => React.createElement(InvestmentCompact, { key: inv.id, inv: inv, metricsById: metricsById, expandedId: expandedId, setExpandedId: setExpandedId, openEdit: openEdit, deleteInvestment: deleteInvestment, historicoDraft: historicoDraft, setHistoricoDraft: setHistoricoDraft, addHistorico: addHistorico, resgatandoId: resgatandoId, setResgatandoId: setResgatandoId, resgateDraft: resgateDraft, setResgateDraft: setResgateDraft, confirmResgate: confirmResgate, reabrir: reabrir, refTaxas: refTaxas }))));
}
function InvestmentCompact({ inv, metricsById, expandedId, setExpandedId, openEdit, deleteInvestment, historicoDraft, setHistoricoDraft, addHistorico, resgatandoId, setResgatandoId, resgateDraft, setResgateDraft, confirmResgate, reabrir, refTaxas }) {
    const m = metricsById[inv.id], expanded = expandedId === inv.id, vencida = inv.status === 'ativo' && m.diasRestantes < 0;
    return React.createElement("div", { style: { padding: '10px 2px', borderBottom: `1px solid ${C.hairline}` } },
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start' } },
            React.createElement("div", { style: { minWidth: 0 } },
                React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' } },
                    React.createElement(TipoTag, { tipo: inv.tipo }),
                    React.createElement("span", { style: { fontWeight: 700, fontSize: 12.5 } }, inv.tituloTesouro || descricaoTaxa(inv, refTaxas)),
                    vencida && React.createElement(Badge, { cor: C.red, texto: "Vencida" })),
                React.createElement("div", { style: { fontSize: 9.5, color: C.muted, marginTop: 3 } },
                    inv.tituloTesouro ? `${descricaoTaxa(inv, refTaxas)} · ` : '',
                    fmtData(inv.dataAplicacao),
                    " \u2192 ",
                    fmtData(inv.dataVencimento),
                    inv.liquidez === 'Diária' ? ' · liquidez diária' : '')),
            React.createElement("div", { style: { display: 'flex', gap: 4 } },
                React.createElement(IconBtn, { onClick: () => openEdit(inv), title: "Editar" },
                    React.createElement(Icon, { name: "pencil", size: 13 })),
                React.createElement(IconBtn, { onClick: () => setExpandedId(expanded ? null : inv.id), title: "Detalhes" },
                    React.createElement(Icon, { name: expanded ? 'chevronUp' : 'chevronDown', size: 13 })))),
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 9 } },
            React.createElement(Mini, { label: "Atual l\u00EDquido", value: fmtBRL(m.valorAtualLiquido), accent: C.lime }),
            React.createElement(Mini, { label: "L\u00EDquido/m\u00EAs", value: fmtPct(m.rentLiquidaMensal), accent: m.rentLiquidaMensal >= 0 ? C.lime : C.red }),
            React.createElement(Mini, { label: "Atual bruto", value: fmtBRL(m.valorAtualBruto) }),
            React.createElement(Mini, { label: "Vencimento", value: fmtData(inv.dataVencimento) })),
        expanded && React.createElement("div", { style: { marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.hairline}`, display: 'grid', gap: 10 } },
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 } },
                React.createElement(Mini, { label: "Aplicado", value: fmtBRL(inv.valorAplicado) }),
                React.createElement(Mini, { label: "Ganho l\u00EDquido", value: fmtBRL(m.valorAtualLiquido - inv.valorAplicado), accent: m.valorAtualLiquido >= inv.valorAplicado ? C.lime : C.red }),
                React.createElement(Mini, { label: "Est. l\u00EDquido venc.", value: fmtBRL(m.valorEstLiquidoVenc), accent: C.blue }),
                React.createElement(Mini, { label: "% CDI l\u00EDquido", value: m.pctCDILiquido == null ? '—' : fmtPct(m.pctCDILiquido) }),
                inv.tipo === 'Tesouro Direto' && React.createElement(Mini, { label: "Cust\u00F3dia est. no venc.", value: fmtBRL(m.custodiaVenc), accent: C.muted })),
            inv.tipo === 'Tesouro Direto' && React.createElement("div", { style: { fontSize: 10, color: C.muted } },
                "Valor atual marcado a mercado",
                m.precisao !== 'estimado' ? ` · ${m.precisao.replace('mercado-', '')}` : '',
                ". A proje\u00E7\u00E3o de vencimento \u00E9 estimativa pela taxa contratada."),
            React.createElement("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 5 } },
                React.createElement(IconBtn, { onClick: () => deleteInvestment(inv.id), title: "Excluir", danger: true },
                    React.createElement(Icon, { name: "trash", size: 13 })))));
}
function ResgateModal({ inv, metrics, onClose, onConfirm }) {
    const [data, setData] = useState(todayStr());
    const [valorLiquido, setValorLiquido] = useState(metrics ? String(Math.round(metrics.valorAtualLiquido * 100) / 100) : '');
    const [valorBruto, setValorBruto] = useState(metrics ? String(Math.round(metrics.valorAtualBruto * 100) / 100) : '');
    if (!inv)
        return null;
    const vl = Number(valorLiquido) || 0, ganho = vl - Number(inv.valorAplicado), rentPct = inv.valorAplicado ? (vl / Number(inv.valorAplicado) - 1) * 100 : 0;
    return React.createElement("div", { style: { position: 'fixed', inset: 0, background: '#000000C8', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(20px,env(safe-area-inset-top)) 14px 28px', overflowY: 'auto', zIndex: 60 } },
        React.createElement("div", { style: { background: C.panel, borderRadius: 18, width: '100%', maxWidth: 480, padding: 20, boxShadow: shadow, borderTop: `1px solid ${C.hairline}` } },
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
                React.createElement("h2", { style: { fontSize: 17, fontWeight: 800, margin: 0 } }, "Marcar como resgatado"),
                React.createElement("button", { onClick: onClose, style: { background: 'none', border: 'none', color: C.muted, cursor: 'pointer' } },
                    React.createElement(Icon, { name: "x", size: 19 }))),
            React.createElement("div", { style: { fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 } },
                tituloInvestimento(inv),
                " \u2014 ",
                nomeInstituicao(inv.instituicao),
                ". Isso remove a aplica\u00E7\u00E3o das suas posi\u00E7\u00F5es ativas e guarda no Hist\u00F3rico, com o quanto ela rendeu."),
            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 13 } },
                React.createElement(Field, { label: "Data do resgate" },
                    React.createElement("input", { type: "date", style: inputStyle, value: data, onChange: e => setData(e.target.value) })),
                React.createElement(Field, { label: "Valor l\u00EDquido recebido", hint: "J\u00E1 descontando IR/IOF, se houver" },
                    React.createElement("input", { type: "number", step: "0.01", style: inputStyle, value: valorLiquido, onChange: e => setValorLiquido(e.target.value) })),
                React.createElement(Field, { label: "Valor bruto (opcional)" },
                    React.createElement("input", { type: "number", step: "0.01", style: inputStyle, value: valorBruto, onChange: e => setValorBruto(e.target.value) })),
                React.createElement("div", { style: { background: C.panel2, borderRadius: 10, padding: 12, fontSize: 12 } },
                    React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                        React.createElement("span", { style: { color: C.muted } }, "Valor aplicado"),
                        React.createElement("b", null, fmtBRL(inv.valorAplicado))),
                    React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between' } },
                        React.createElement("span", { style: { color: C.muted } }, "Ganho / Rentabilidade"),
                        React.createElement("b", { style: { color: ganho >= 0 ? C.green : C.red } },
                            fmtBRL(ganho),
                            " (",
                            fmtPct(rentPct),
                            ")")))),
            React.createElement("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 } },
                React.createElement("button", { onClick: onClose, style: { background: 'none', border: `1px solid ${C.hairline}`, color: C.muted, borderRadius: 9, padding: '9px 14px', cursor: 'pointer' } }, "Cancelar"),
                React.createElement("button", { onClick: () => onConfirm(data, vl, Number(valorBruto) || vl), disabled: !data || !valorLiquido, style: { background: C.blue, border: 'none', color: '#fff', borderRadius: 9, padding: '9px 16px', cursor: 'pointer', fontWeight: 750, opacity: (!data || !valorLiquido) ? .5 : 1 } }, "Confirmar resgate"))));
}
function HistoricoScreen({ historico, refTaxas, today, reabrirInvestimento, deleteInvestment, setTab }) {
    const [selectedInv, setSelectedInv] = useState(null);
    const linhas = historico.map(inv => {
        const dias = Math.max(diffDays(inv.dataAplicacao, inv.dataResgate || today), 1);
        const vl = inv.valorResgatadoLiquido ?? 0;
        const rentTotal = inv.valorAplicado ? (vl / inv.valorAplicado - 1) * 100 : 0;
        const rentMensal = (Math.pow(Math.max(vl, 0.0001) / inv.valorAplicado, 30 / dias) - 1) * 100;
        return { inv, dias, ganho: vl - inv.valorAplicado, rentTotal, rentMensal };
    }).sort((a, b) => (b.inv.dataResgate || '').localeCompare(a.inv.dataResgate || ''));
    const totalGanho = linhas.reduce((s, l) => s + l.ganho, 0);
    const sel = selectedInv ? linhas.find(l => l.inv.id === selectedInv) : null;
    if (sel) {
        const { inv, dias, ganho, rentTotal, rentMensal } = sel;
        return React.createElement("div", { className: "screen" },
            React.createElement("button", { className: "back-btn", onClick: () => setSelectedInv(null) }, "\u2039 Hist\u00F3rico"),
            React.createElement(RefCard, { className: "detail-hero" },
                React.createElement("div", null,
                    React.createElement("span", { className: "type-pill" }, inv.tipo),
                    React.createElement("h1", null, tituloInvestimento(inv)),
                    React.createElement("p", null,
                        fmtData(inv.dataAplicacao),
                        " \u2192 ",
                        fmtData(inv.dataResgate))),
                React.createElement(InstitutionMark, { nome: inv.instituicao, size: 40 })),
            React.createElement(RefCard, { className: "detail-rows" },
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Valor aplicado"),
                    React.createElement("strong", null, fmtBRL(inv.valorAplicado))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Valor resgatado (l\u00EDquido)"),
                    React.createElement("strong", null, fmtBRL(inv.valorResgatadoLiquido))),
                inv.valorResgatadoBruto != null && React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Valor resgatado (bruto)"),
                    React.createElement("strong", null, fmtBRL(inv.valorResgatadoBruto))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Dias que ficou aplicado"),
                    React.createElement("strong", null, dias)),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Rentabilidade total"),
                    React.createElement("strong", { className: ganho >= 0 ? 'green-txt' : 'warn' },
                        fmtBRL(ganho),
                        " \u25B2 ",
                        fmtPct(rentTotal))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Equivalente ao m\u00EAs"),
                    React.createElement("strong", { className: rentMensal >= 0 ? 'green-txt' : 'warn' }, fmtPct(rentMensal))),
                React.createElement("div", { className: "detail-row" },
                    React.createElement("span", null, "Taxa contratada"),
                    React.createElement("strong", null, taxaCurta(inv)))),
            React.createElement("div", { className: "detail-actions" },
                React.createElement("button", { className: "text-btn", onClick: () => { reabrirInvestimento(inv.id); setSelectedInv(null); } }, "Reabrir como ativo"),
                React.createElement("button", { className: "text-btn warn", onClick: () => deleteInvestment(inv.id) }, "Excluir do hist\u00F3rico")));
    }
    return React.createElement("div", { className: "screen" },
        React.createElement("button", { className: "back-btn", onClick: () => setTab('mais') }, "\u2039 Mais"),
        React.createElement("div", { className: "page-head" },
            React.createElement("h1", null, "Hist\u00F3rico")),
        linhas.length > 0 && React.createElement(RefCard, null,
            React.createElement("div", { className: "card-title" }, "Total resgatado \u2014 ganho acumulado"),
            React.createElement("div", { className: "hero-value small" },
                React.createElement("span", { className: totalGanho >= 0 ? 'green-txt' : 'warn' }, fmtBRL(totalGanho))),
            React.createElement("div", { className: "hero-note" },
                linhas.length,
                " aplica\u00E7\u00E3o",
                linhas.length > 1 ? '\u00F5es' : '',
                " encerrada",
                linhas.length > 1 ? 's' : '')),
        linhas.length === 0 && React.createElement(RefCard, null,
            React.createElement("div", { className: "empty-chart" }, "Quando voc\u00EA marcar uma aplica\u00E7\u00E3o como resgatada, ela aparece aqui \u2014 com o quanto rendeu em % e em R$.")),
        React.createElement("div", { className: "detail-list" }, linhas.map(({ inv, ganho, rentTotal, rentMensal }) => React.createElement(RefCard, { key: inv.id, className: "investment-card" },
            React.createElement("button", { className: "investment-hit", onClick: () => setSelectedInv(inv.id) },
                React.createElement("div", { className: "inv-top" },
                    React.createElement("h3", null, tituloInvestimento(inv)),
                    React.createElement("span", { className: "type-pill" }, inv.tipo)),
                React.createElement("div", { className: "inv-mid" },
                    React.createElement("strong", { className: ganho >= 0 ? 'green-txt' : 'warn' }, fmtBRL(ganho)),
                    React.createElement("span", { className: "inv-venc" },
                        "resgatado em ",
                        fmtData(inv.dataResgate))),
                React.createElement("div", { className: "inv-rate" },
                    React.createElement("i", { className: `dot ${ganho >= 0 ? 'green' : 'red'}` }),
                    fmtPct(rentTotal),
                    " total \u00B7 ",
                    fmtPct(rentMensal),
                    " equiv./m\u00EAs \u00B7 ",
                    nomeInstituicao(inv.instituicao)))))));
}
function RelatorioPrint({ ativos, historico, totais, ganhoLiquido, metricsById, refTaxas, today, onClose }) {
    const mesIni = periodStart('mes', today, ativos), anoIni = periodStart('ano', today, ativos), inicioIni = periodStart('todo', today, ativos);
    const periodos = [
        ['M\u00EAs', mesIni], ['Ano', anoIni], ['Desde o in\u00EDcio', inicioIni],
    ].map(([label, start]) => {
        const ret = periodReturnMD(ativos, start, today, refTaxas, today, metricsById);
        const cdi = cdiReturnMD(ativos, start, today, refTaxas, today);
        const ipca = ipcaReturnApprox(start, today, refTaxas);
        const ganho = periodGainBRL(ativos, start, today, refTaxas, today);
        return { label, ret, cdi, ipca, ganho };
    });
    const grupos = grupoInstituicoes(ativos, metricsById);
    const porTipo = {};
    ativos.forEach(inv => { const k = inv.tipo; if (!porTipo[k])
        porTipo[k] = { valor: 0, aplicado: 0 }; porTipo[k].valor += metricsById[inv.id].valorAtualLiquido; porTipo[k].aplicado += Number(inv.valorAplicado) || 0; });
    const tipos = Object.entries(porTipo).map(([k, v]) => ({ tipo: k, valor: v.valor, aplicado: v.aplicado })).sort((a, b) => b.valor - a.valor);
    const ranking = ativos.map(inv => ({ inv, m: metricsById[inv.id] })).filter(x => x.m.rentLiquidaMensal != null).sort((a, b) => b.m.rentLiquidaMensal - a.m.rentLiquidaMensal);
    const historicoOrdenado = historico.slice().sort((a, b) => (b.dataResgate || '').localeCompare(a.dataResgate || ''));
    const totalHistoricoGanho = historicoOrdenado.reduce((s, i) => s + ((i.valorResgatadoLiquido ?? 0) - i.valorAplicado), 0);
    const th = { textAlign: 'left', padding: '6px 8px', fontSize: 10, color: '#667085', textTransform: 'uppercase', letterSpacing: '.03em', borderBottom: '1px solid #E4E7EC' };
    const td = { padding: '7px 8px', fontSize: 11.5, borderBottom: '1px solid #F0F1F3' };
    const section = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: '14px 16px', marginBottom: 14, overflowX: 'auto' };
    const h2 = { fontSize: 13, fontWeight: 800, marginBottom: 10, color: '#101828' };
    return React.createElement("div", { style: { background: '#F5F6F8', minHeight: '100dvh', color: '#101828', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" } },
        React.createElement("div", { className: "no-print", style: { position: 'sticky', top: 0, zIndex: 10, background: '#101828', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
            React.createElement("button", { onClick: onClose, style: { background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' } }, "\u2039 Voltar"),
            React.createElement("button", { onClick: () => window.print(), style: { background: '#2F80ED', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 } },
                React.createElement(Icon, { name: "printer", size: 14 }),
                " Baixar / imprimir PDF")),
        React.createElement("div", { style: { maxWidth: 720, margin: '0 auto', padding: '18px 16px 40px' } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontFamily: 'Georgia, serif', fontWeight: 800, fontSize: 20, color: '#101828' } }, "RAZ\u00C3O"),
                    React.createElement("div", { style: { fontSize: 9.5, letterSpacing: '.15em', color: '#98A2AF', fontWeight: 700 } }, "RENDA FIXA")),
                React.createElement("div", { style: { textAlign: 'right', fontSize: 11, color: '#667085' } },
                    React.createElement("div", null, "Relat\u00F3rio da carteira"),
                    React.createElement("div", null, fmtData(today)))),
            React.createElement("div", { style: section },
                React.createElement("div", { style: h2 }, "Resumo"),
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontSize: 10.5, color: '#667085' } }, "Patrim\u00F4nio l\u00EDquido"),
                        React.createElement("div", { style: { fontSize: 19, fontWeight: 800 } }, fmtBRL(totais.liquido))),
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontSize: 10.5, color: '#667085' } }, "Patrim\u00F4nio bruto"),
                        React.createElement("div", { style: { fontSize: 19, fontWeight: 800 } }, fmtBRL(totais.bruto))),
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontSize: 10.5, color: '#667085' } }, "Ganho l\u00EDquido (desde o in\u00EDcio)"),
                        React.createElement("div", { style: { fontSize: 15, fontWeight: 800, color: ganhoLiquido >= 0 ? '#16A34A' : '#DC2626' } }, fmtBRL(ganhoLiquido))),
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontSize: 10.5, color: '#667085' } }, "Investimentos ativos"),
                        React.createElement("div", { style: { fontSize: 15, fontWeight: 800 } },
                            ativos.length,
                            " em ",
                            grupos.length,
                            " institui\u00E7\u00F5es")))),
            React.createElement("div", { style: section },
                React.createElement("div", { style: h2 }, "Rentabilidade x CDI x IPCA"),
                React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", { style: th }, "Per\u00EDodo"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Resultado"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Carteira"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "CDI"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "IPCA"))),
                    React.createElement("tbody", null, periodos.map(p => React.createElement("tr", { key: p.label },
                        React.createElement("td", { style: td }, p.label),
                        React.createElement("td", { style: { ...td, textAlign: 'right', fontWeight: 700 } }, p.ganho == null ? '\u2014' : fmtBRL(p.ganho)),
                        React.createElement("td", { style: { ...td, textAlign: 'right', fontWeight: 700, color: p.ret != null && p.cdi != null && p.ret < p.cdi ? '#DC2626' : '#16A34A' } }, p.ret == null ? '\u2014' : fmtPct(p.ret)),
                        React.createElement("td", { style: { ...td, textAlign: 'right' } }, p.cdi == null ? '\u2014' : fmtPct(p.cdi)),
                        React.createElement("td", { style: { ...td, textAlign: 'right' } }, p.ipca == null ? '\u2014' : fmtPct(p.ipca))))))),
            React.createElement("div", { style: section },
                React.createElement("div", { style: h2 }, "Aloca\u00E7\u00E3o por institui\u00E7\u00E3o"),
                React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", { style: th }, "Institui\u00E7\u00E3o"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Valor l\u00EDquido"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "% carteira"))),
                    React.createElement("tbody", null, grupos.map(g => React.createElement("tr", { key: g.key },
                        React.createElement("td", { style: td }, nomeInstituicao(g.nome)),
                        React.createElement("td", { style: { ...td, textAlign: 'right' } }, fmtBRL(g.liquido)),
                        React.createElement("td", { style: { ...td, textAlign: 'right' } }, fmtPct(g.liquido / (totais.liquido || 1) * 100))))))),
            React.createElement("div", { style: section },
                React.createElement("div", { style: h2 }, "Aloca\u00E7\u00E3o por tipo de ativo"),
                React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", { style: th }, "Tipo"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Valor l\u00EDquido"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "% carteira"))),
                    React.createElement("tbody", null, tipos.map(t => React.createElement("tr", { key: t.tipo },
                        React.createElement("td", { style: td }, t.tipo),
                        React.createElement("td", { style: { ...td, textAlign: 'right' } }, fmtBRL(t.valor)),
                        React.createElement("td", { style: { ...td, textAlign: 'right' } }, fmtPct(t.valor / (totais.liquido || 1) * 100))))))),
            React.createElement("div", { style: section },
                React.createElement("div", { style: h2 }, "Posi\u00E7\u00F5es ativas"),
                React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", { style: th }, "Aplica\u00E7\u00E3o"),
                            React.createElement("th", { style: th }, "Institui\u00E7\u00E3o"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Aplicado"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Atual l\u00EDq."),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Rent. total"),
                            React.createElement("th", { style: th }, "Vencimento"))),
                    React.createElement("tbody", null, ativos.map(inv => { const m = metricsById[inv.id]; return React.createElement("tr", { key: inv.id },
                        React.createElement("td", { style: td }, tituloInvestimento(inv)),
                        React.createElement("td", { style: td }, nomeInstituicao(inv.instituicao)),
                        React.createElement("td", { style: { ...td, textAlign: 'right' } }, fmtBRL(inv.valorAplicado)),
                        React.createElement("td", { style: { ...td, textAlign: 'right', fontWeight: 700 } }, fmtBRL(m.valorAtualLiquido)),
                        React.createElement("td", { style: { ...td, textAlign: 'right', color: m.rentLiquidaTotal >= 0 ? '#16A34A' : '#DC2626' } }, fmtPct(m.rentLiquidaTotal)),
                        React.createElement("td", { style: td }, fmtData(inv.dataVencimento))); })))),
            ranking.length > 1 && React.createElement("div", { style: section },
                React.createElement("div", { style: h2 }, "Ranking de rendimento l\u00EDquido/m\u00EAs"),
                React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", { style: th }, "#"),
                            React.createElement("th", { style: th }, "Aplica\u00E7\u00E3o"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "L\u00EDq./m\u00EAs"))),
                    React.createElement("tbody", null, ranking.map(({ inv, m }, i) => React.createElement("tr", { key: inv.id },
                        React.createElement("td", { style: td }, i + 1),
                        React.createElement("td", { style: td },
                            tituloInvestimento(inv),
                            " \u2014 ",
                            nomeInstituicao(inv.instituicao)),
                        React.createElement("td", { style: { ...td, textAlign: 'right', fontWeight: 700, color: m.rentLiquidaMensal >= 0 ? '#16A34A' : '#DC2626' } }, fmtPct(m.rentLiquidaMensal))))))),
            historicoOrdenado.length > 0 && React.createElement("div", { style: section },
                React.createElement("div", { style: h2 }, "Hist\u00F3rico de resgates"),
                React.createElement("div", { style: { fontSize: 11, color: '#667085', marginBottom: 8 } },
                    "Ganho acumulado em posi\u00E7\u00F5es encerradas: ",
                    React.createElement("b", { style: { color: totalHistoricoGanho >= 0 ? '#16A34A' : '#DC2626' } }, fmtBRL(totalHistoricoGanho))),
                React.createElement("table", { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement("thead", null,
                        React.createElement("tr", null,
                            React.createElement("th", { style: th }, "Aplica\u00E7\u00E3o"),
                            React.createElement("th", { style: th }, "Resgate"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Aplicado"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Resgatado"),
                            React.createElement("th", { style: { ...th, textAlign: 'right' } }, "Rentab."))),
                    React.createElement("tbody", null, historicoOrdenado.map(inv => { const vl = inv.valorResgatadoLiquido ?? 0, rent = inv.valorAplicado ? (vl / inv.valorAplicado - 1) * 100 : 0; return React.createElement("tr", { key: inv.id },
                        React.createElement("td", { style: td }, tituloInvestimento(inv)),
                        React.createElement("td", { style: td }, fmtData(inv.dataResgate)),
                        React.createElement("td", { style: { ...td, textAlign: 'right' } }, fmtBRL(inv.valorAplicado)),
                        React.createElement("td", { style: { ...td, textAlign: 'right', fontWeight: 700 } }, fmtBRL(vl)),
                        React.createElement("td", { style: { ...td, textAlign: 'right', color: rent >= 0 ? '#16A34A' : '#DC2626' } }, fmtPct(rent))); })))),
            React.createElement("div", { style: { textAlign: 'center', fontSize: 10, color: '#98A2AF', marginTop: 20 } }, "Gerado pelo app R\u00E1z\u00E3o \u00B7 Renda Fixa \u2014 dados armazenados apenas neste dispositivo.")));
}
function DadosModal({ onClose, onExport, onImport, message, investmentsCount }) {
    const inputRef = React.useRef(null);
    return React.createElement("div", { style: { position: 'fixed', inset: 0, background: '#000000C8', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(20px,env(safe-area-inset-top)) 14px 28px', overflowY: 'auto', zIndex: 60 } },
        React.createElement("div", { style: { background: C.panel, borderRadius: 18, width: '100%', maxWidth: 520, padding: 20, boxShadow: shadow, borderTop: `1px solid ${C.hairline}` } },
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
                React.createElement("div", null,
                    React.createElement("h2", { style: { fontSize: 17, fontWeight: 800, margin: 0 } }, "Dados e backup"),
                    React.createElement("div", { style: { fontSize: 11, color: C.muted, marginTop: 3 } }, "Use isso para migrar seus investimentos entre vers\u00F5es ou instala\u00E7\u00F5es.")),
                React.createElement("button", { onClick: onClose, style: { background: 'none', border: 'none', color: C.muted, cursor: 'pointer' } },
                    React.createElement(Icon, { name: "x", size: 19 }))),
            React.createElement("div", { style: { background: C.panel2, borderRadius: 12, padding: 13, marginBottom: 10 } },
                React.createElement("div", { style: { fontWeight: 800, fontSize: 12 } }, "Exportar"),
                React.createElement("div", { style: { fontSize: 11, color: C.muted, lineHeight: 1.45, margin: '5px 0 10px' } },
                    "Cria um arquivo JSON com todas as suas aplica\u00E7\u00F5es (ativas e do hist\u00F3rico), aportes vinculados e taxas salvas \u2014 ",
                    React.createElement("b", { style: { color: C.text } },
                        investmentsCount,
                        " no total"),
                    ". Guarde esse arquivo fora do aparelho (e-mail, nuvem, etc.) para poder restaurar em outro celular."),
                React.createElement("button", { onClick: onExport, style: { background: C.blue, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 12px', fontWeight: 800, cursor: 'pointer' } }, "Exportar backup")),
            React.createElement("div", { style: { background: C.panel2, borderRadius: 12, padding: 13 } },
                React.createElement("div", { style: { fontWeight: 800, fontSize: 12 } }, "Importar"),
                React.createElement("div", { style: { fontSize: 11, color: C.muted, lineHeight: 1.45, margin: '5px 0 10px' } }, "Importar substitui os dados desta instala\u00E7\u00E3o. Fa\u00E7a um backup antes se j\u00E1 houver aplica\u00E7\u00F5es cadastradas."),
                React.createElement("input", { ref: inputRef, type: "file", accept: "application/json,.json", style: { display: 'none' }, onChange: e => { const f = e.target.files?.[0]; if (f)
                        onImport(f); e.target.value = ''; } }),
                React.createElement("button", { onClick: () => inputRef.current?.click(), style: { background: 'transparent', color: C.text, border: `1px solid ${C.hairline}`, borderRadius: 9, padding: '9px 12px', fontWeight: 750, cursor: 'pointer' } }, "Escolher backup")),
            message && React.createElement("div", { style: { marginTop: 12, fontSize: 11.5, color: C.lime, lineHeight: 1.45 } }, message),
            React.createElement("div", { style: { marginTop: 14, fontSize: 10.5, color: C.muted, lineHeight: 1.45 } }, "O backup \u00E9 local: seus dados n\u00E3o s\u00E3o enviados para o GitHub nem para um servidor.")));
}
const TIPO_ICON = {
    'CDB': { icon: 'coins', color: '#2F80ED' }, 'LCI': { icon: 'leaf', color: '#22C55E' }, 'LCA': { icon: 'leaf', color: '#22C55E' },
    'CRI': { icon: 'flag', color: '#F59E0B' }, 'CRA': { icon: 'flag', color: '#F59E0B' }, 'Tesouro Direto': { icon: 'flag', color: '#16B7D8' },
    'Debênture': { icon: 'dots', color: '#8B5CF6' },
};
function TipoSelector({ value, onChange }) {
    return React.createElement("div", { className: "tipo-selector" }, TIPOS.map(t => {
        const meta = TIPO_ICON[t] || { icon: 'dots', color: C.slate };
        return React.createElement("button", { type: "button", key: t, className: "tipo-row" + (value === t ? ' sel' : ''), onClick: () => onChange(t) },
            React.createElement("span", { className: "tipo-icon", style: { background: meta.color + '22', color: meta.color } },
                React.createElement(Icon, { name: meta.icon, size: 16 })),
            React.createElement("span", { className: "tipo-label" }, t),
            React.createElement("span", { className: "tipo-pill" }, t === 'Tesouro Direto' ? 'Tesouro' : t));
    }));
}
function FormModal({ form, setForm, editingId, formError, refTaxas, investments, onClose, onSave, onTipoChange }) {
    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const bancos = [...new Map(investments.map(i => [normalizarInstituicao(i.instituicao), i.instituicao]).filter(x => x[0])).values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const bancoExistente = bancos.includes(form.instituicao);
    function selecionarBanco(e) { const v = e.target.value; setForm(f => ({ ...f, instituicao: v === '__novo__' ? '' : v })); }
    function handleVincularChange(e) { const value = e.target.value; const base = value ? investments.find(inv => inv.id === value || (inv.groupId || inv.id) === value) : null; if (!base) {
        setForm(f => ({ ...f, vincularA: '' }));
        return;
    } setForm(f => ({ ...f, vincularA: base.groupId || base.id, instituicao: base.instituicao, tipo: base.tipo, indexador: base.indexador, parametroValor: base.parametroValor ?? '', liquidez: base.liquidez || f.liquidez, isentoIR: !!base.isentoIR, aliquotaIRManual: base.aliquotaIRManual ?? '', taxaOverrideAnual: base.taxaOverrideAnual ?? '', carteira: base.carteira || f.carteira })); }
    const efetiva = taxaAnualEfetiva({ ...form, parametroValor: form.parametroValor }, refTaxas);
    const gruposExistentes = investments.filter(i => i.status === 'ativo' && i.id !== editingId).reduce((acc, inv) => { const gid = inv.groupId || inv.id; if (!acc.some(x => x.id === gid))
        acc.push({ id: gid, inv }); return acc; }, []);
    const tesouro = form.tipo === 'Tesouro Direto';
    return React.createElement("div", { style: { position: 'fixed', inset: 0, background: '#000000C8', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(20px,env(safe-area-inset-top)) 14px 28px', overflowY: 'auto', zIndex: 50 } },
        React.createElement("div", { style: { background: C.panel, borderRadius: 18, width: '100%', maxWidth: 680, padding: 20, boxShadow: shadow, borderTop: `1px solid ${C.hairline}` } },
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
                React.createElement("div", null,
                    React.createElement("h2", { style: { fontSize: 17, fontWeight: 750, margin: 0 } }, editingId ? 'Editar aplicação' : 'Nova aplicação'),
                    React.createElement("div", { style: { fontSize: 11, color: C.muted, marginTop: 3 } }, "Preencha s\u00F3 o que \u00E9 necess\u00E1rio; os detalhes avan\u00E7ados ficam abaixo.")),
                React.createElement("button", { onClick: onClose, style: { background: 'none', border: 'none', color: C.muted, cursor: 'pointer' } },
                    React.createElement(Icon, { name: "x", size: 19 }))),
            React.createElement("div", { className: "step-indicator" },
                [['1', 'Tipo'], ['2', 'Detalhes'], ['3', 'Confirma\u00E7\u00E3o']].map(([n, l], i) => React.createElement(React.Fragment, { key: n },
                    i > 0 && React.createElement("div", { className: "step-line" }),
                    React.createElement("div", { className: "step-dot" + (i === 0 ? ' active' : '') },
                        React.createElement("span", { className: "step-num" }, n),
                        React.createElement("span", { className: "step-label" }, l))))),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 13 } },
                React.createElement(Field, { label: "Institui\u00E7\u00E3o / emissor" },
                    React.createElement("select", { style: inputStyle, value: bancoExistente ? form.instituicao : '__novo__', onChange: selecionarBanco },
                        React.createElement("option", { value: "__novo__" }, "+ Nova institui\u00E7\u00E3o"),
                        bancos.map(b => React.createElement("option", { key: b, value: b }, b))),
                    !bancoExistente && React.createElement("input", { style: { ...inputStyle, marginTop: 6 }, placeholder: "Nome da institui\u00E7\u00E3o", value: form.instituicao, onChange: set('instituicao') })),
                React.createElement(Field, { label: "Vincular a investimento existente", hint: "Agrupa aportes sem misturar as datas de rendimento." },
                    React.createElement("select", { style: inputStyle, value: form.vincularA || '', onChange: handleVincularChange },
                        React.createElement("option", { value: "" }, "N\u00E3o vincular"),
                        gruposExistentes.map(({ id, inv }) => React.createElement("option", { key: id, value: id },
                            inv.instituicao,
                            " \u00B7 ",
                            inv.tipo,
                            " \u00B7 ",
                            descricaoTaxa(inv, refTaxas))))),
                React.createElement(Field, { label: "Tipo" },
                    React.createElement(TipoSelector, { value: form.tipo, onChange: onTipoChange })),
                React.createElement(Field, { label: "Indexador" },
                    React.createElement("select", { style: inputStyle, value: form.indexador, onChange: set('indexador') }, INDEXADORES.map(t => React.createElement("option", { key: t }, t)))),
                React.createElement(Field, { label: parametroLabel(form.indexador), hint: tesouro ? `Taxa contratada: ${fmtPct(efetiva)} a.a. · mercado pode variar` : `taxa efetiva: ${fmtPct(efetiva)} a.a.` },
                    React.createElement("input", { type: "number", style: inputStyle, placeholder: "Ex.: 100 / 89 / 12,5", value: form.parametroValor, onChange: set('parametroValor') })),
                React.createElement(Field, { label: "Data de aplica\u00E7\u00E3o" },
                    React.createElement("input", { type: "date", style: inputStyle, value: form.dataAplicacao, onChange: set('dataAplicacao') })),
                React.createElement(Field, { label: "Vencimento" },
                    React.createElement("input", { type: "date", style: inputStyle, value: form.dataVencimento, onChange: set('dataVencimento') })),
                React.createElement(Field, { label: "Valor aplicado" },
                    React.createElement("input", { type: "number", style: inputStyle, placeholder: "0,00", value: form.valorAplicado, onChange: set('valorAplicado') })),
                React.createElement(Field, { label: "Liquidez" },
                    React.createElement("select", { style: inputStyle, value: form.liquidez, onChange: set('liquidez') }, LIQUIDEZ_OPTS.map(t => React.createElement("option", { key: t }, t)))),
                tesouro && React.createElement(React.Fragment, null,
                    React.createElement("div", { style: { gridColumn: '1 / -1', background: C.panel2, borderRadius: 12, padding: 13, border: `1px solid ${C.hairline}` } },
                        React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: C.slate, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 } }, "Dados espec\u00EDficos do Tesouro Direto"),
                        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 11 } },
                            React.createElement(Field, { label: "T\u00EDtulo" },
                                React.createElement("input", { style: inputStyle, placeholder: "Ex.: Tesouro Selic 2029", value: form.tituloTesouro, onChange: set('tituloTesouro') })),
                            React.createElement(Field, { label: "Quantidade" },
                                React.createElement("input", { type: "number", step: "0.001", style: inputStyle, placeholder: "Ex.: 2,35", value: form.quantidade, onChange: set('quantidade') })),
                            React.createElement(Field, { label: "Pre\u00E7o unit\u00E1rio de compra" },
                                React.createElement("input", { type: "number", step: "0.01", style: inputStyle, placeholder: "R$", value: form.precoUnitarioCompra, onChange: set('precoUnitarioCompra') })),
                            React.createElement(Field, { label: "Pre\u00E7o unit\u00E1rio atual (opcional)" },
                                React.createElement("input", { type: "number", step: "0.01", style: inputStyle, placeholder: "do extrato/Portal", value: form.precoUnitarioAtual, onChange: set('precoUnitarioAtual') })),
                            React.createElement(Field, { label: "Valor bruto atual (prefer\u00EDvel)" },
                                React.createElement("input", { type: "number", step: "0.01", style: inputStyle, placeholder: "do banco/Portal", value: form.valorAtualBrutoManual, onChange: set('valorAtualBrutoManual') })),
                            React.createElement(Field, { label: "Juros semestrais / fluxo" },
                                React.createElement("select", { style: inputStyle, value: form.tesouroCupom, onChange: set('tesouroCupom') },
                                    React.createElement("option", null, "N\u00E3o"),
                                    React.createElement("option", null, "Sim"),
                                    React.createElement("option", null, "Renda+ mensal"),
                                    React.createElement("option", null, "Educa+ mensal")))),
                        React.createElement("div", { style: { fontSize: 10.5, color: C.muted, lineHeight: 1.45, marginTop: 9 } }, "O valor atual do Tesouro \u00E9 marcado a mercado. Por isso, quando voc\u00EA informar o valor bruto atual do extrato, ele prevalece sobre uma proje\u00E7\u00E3o matem\u00E1tica. A proje\u00E7\u00E3o at\u00E9 o vencimento usa a taxa contratada como refer\u00EAncia e \u00E9 identificada como estimativa."))),
                React.createElement(Field, { label: "IR manual (%)", hint: "vazio = tabela regressiva" },
                    React.createElement("input", { type: "number", style: inputStyle, placeholder: "autom\u00E1tico", value: form.aliquotaIRManual, onChange: set('aliquotaIRManual') })),
                !tesouro && React.createElement(Field, { label: "Override de taxa projetada (% a.a.)", hint: "opcional" },
                    React.createElement("input", { type: "number", style: inputStyle, placeholder: "deixe vazio", value: form.taxaOverrideAnual, onChange: set('taxaOverrideAnual') })),
                React.createElement(Field, { label: "Carteira / objetivo" },
                    React.createElement("input", { style: inputStyle, placeholder: "opcional", value: form.carteira, onChange: set('carteira') })),
                React.createElement("label", { style: { display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1', fontSize: 12.5 } },
                    React.createElement("input", { type: "checkbox", checked: form.isentoIR, onChange: e => setForm(f => ({ ...f, isentoIR: e.target.checked })) }),
                    React.createElement("span", null, "Isento de IR")),
                React.createElement("div", { style: { gridColumn: '1 / -1' } },
                    React.createElement(Field, { label: "Observa\u00E7\u00F5es" },
                        React.createElement("textarea", { style: { ...inputStyle, minHeight: 58, resize: 'vertical' }, placeholder: "opcional", value: form.observacoes, onChange: set('observacoes') })))),
            formError && React.createElement("p", { style: { color: C.red, fontSize: 12.5, marginTop: 12 } }, formError),
            React.createElement("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 } },
                React.createElement("button", { onClick: onClose, style: { background: 'none', border: `1px solid ${C.hairline}`, color: C.muted, borderRadius: 9, padding: '9px 14px', cursor: 'pointer' } }, "Cancelar"),
                React.createElement("button", { onClick: onSave, style: { background: C.blue, border: 'none', color: '#fff', borderRadius: 9, padding: '9px 16px', cursor: 'pointer', fontWeight: 750 } }, editingId ? 'Salvar' : 'Adicionar'))));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
