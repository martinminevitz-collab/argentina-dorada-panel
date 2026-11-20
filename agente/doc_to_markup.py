import json, sys


def load_body(path):
    d = json.load(open(path, encoding='utf-8'))
    if 'content' in d and isinstance(d['content'], dict):
        d = d['content']
    if 'tabs' in d:
        return d['tabs'][0]['documentTab']['body']['content']
    return d['body']['content']


def color_of(ts):
    c = ts.get('foregroundColor', {}).get('color', {}).get('rgbColor')
    if not c:
        return None
    r, g, b = c.get('red', 0), c.get('green', 0), c.get('blue', 0)
    if r > 0.8 and g < 0.3 and b < 0.3:
        return 'red'
    if b > 0.8 and r < 0.3 and g < 0.3:
        return 'blue'
    if 0.35 < r < 0.85 and abs(r - g) < 0.1 and abs(r - b) < 0.1:
        return 'gray'
    return None


def main(path):
    out, removed, grayed = [], [], []
    paras = []
    end_index = 1
    for el in load_body(path):
        end_index = el.get('endIndex', end_index)
        if 'paragraph' not in el:
            continue
        runs = [e['textRun'] for e in el['paragraph']['elements'] if 'textRun' in e]
        paras.append(runs)
    skipping = False
    graying = False
    for runs in paras:
        text = ''.join(r['content'] for r in runs).rstrip('\n')
        vis = [r for r in runs if r['content'].strip()]
        is_title = bool(vis) and color_of(vis[0].get('textStyle', {})) == 'red' and vis[0].get('textStyle', {}).get('bold')
        if is_title:
            struck = any(r.get('textStyle', {}).get('strikethrough') for r in vis)
            marked = struck or 'PUBLICADO' in text.upper().replace('PUBLICABLE', '') or '✅' in text
            clean = text.replace('✅', '').replace(' PUBLICADO', '').replace('PUBLICADO', '').strip()
            skipping = graying = False
            if marked and clean.endswith('PUBLICABLE'):
                skipping = True
                removed.append(text)
                continue
            if marked:
                graying = True
                grayed.append(clean)
            text = clean
            tag = None
            for t in ('PUBLICABLE', '(Necesito más info)'):
                if text.endswith(' ' + t):
                    text, tag = text[:-len(t) - 1], t
            out.append('# ' + text + (' || ' + tag if tag else ''))
            continue
        if skipping:
            continue
        if not vis:
            out.append('')
            continue
        pre = '~ ' if (graying or color_of(vis[0].get('textStyle', {})) == 'gray') else ''
        if all(r.get('textStyle', {}).get('bold') for r in vis) and not any(r.get('textStyle', {}).get('link') for r in vis):
            out.append(pre + '## ' + text)
            continue
        line = ''
        for r in runs:
            c = r['content'].rstrip('\n')
            if r.get('textStyle', {}).get('bold') and c.strip() and not r.get('textStyle', {}).get('link'):
                lead = c[:len(c) - len(c.lstrip())]
                trail = c[len(c.rstrip()):]
                line += lead + '**' + c.strip() + '**' + trail
            else:
                line += c
        out.append(pre + line)
    while out and out[-1] == '':
        out.pop()
    print('\n'.join(out))
    print('END_INDEX=%d' % end_index, file=sys.stderr)
    for r in removed:
        print('ELIMINADO (publicado): ' + r, file=sys.stderr)
    for r in grayed:
        print('PASADO A GRIS (publicado en curso): ' + r, file=sys.stderr)


def _clave(t):
    import re, unicodedata
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().upper()
    t = re.sub(r'^\d{1,2}/\d{1,2}(/\d{2,4})?\s*-\s*', '', t)
    t = t.replace('PUBLICABLE', '').replace('NECESITO MAS INFO', '').replace('PUBLICADO', '')
    t = re.sub(r'\([^)]*\d[^)]*(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|HASTA| AL )[^)]*\)', ' ', t)
    stop = {'DE', 'DEL', 'LA', 'EL', 'EN', 'Y', 'A', 'LOS', 'LAS', 'AL'}
    return {w for w in re.findall(r'[A-Z0-9]+', t) if w not in stop}


def _parecido(a, b):
    if not a or not b:
        return False
    return len(a & b) / len(a | b) >= 0.7


def filtrar(nuevo_path, publicados_path):
    pub = [_clave(l) for l in open(publicados_path, encoding='utf-8').read().split('\n') if l.strip()]
    pub = [p for p in pub if len(p) >= 2]
    lines = open(nuevo_path, encoding='utf-8').read().split('\n')
    out, skipping = [], False
    for l in lines:
        s = l[2:] if l.startswith('~ ') else l
        if s.startswith('# '):
            titulo = s[2:].split('||')[0]
            k = _clave(titulo)
            skipping = titulo.strip().upper() != 'AGENDA QUE VIENE' and any(_parecido(k, p) for p in pub)
            if skipping:
                print('FILTRADO (ya publicado): ' + titulo.strip(), file=sys.stderr)
                continue
        if skipping:
            continue
        out.append(l)
    while out and out[-1] == '':
        out.pop()
    open(nuevo_path, 'w', encoding='utf-8').write('\n'.join(out) + '\n')


if __name__ == '__main__':
    if sys.argv[1] == '--filtrar':
        filtrar(sys.argv[2], sys.argv[3])
    else:
        main(sys.argv[1])
