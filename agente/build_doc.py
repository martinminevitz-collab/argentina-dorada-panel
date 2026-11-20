import json, re, sys

RED = {"red": 1.0, "green": 0.0, "blue": 0.0}
BLUE = {"red": 0.0, "green": 0.0, "blue": 1.0}
LINK = {"red": 0.067, "green": 0.333, "blue": 0.8}
BLACK = {"red": 0.0, "green": 0.0, "blue": 0.0}
GRAY = {"red": 0.6, "green": 0.6, "blue": 0.6}
URL_RE = re.compile(r'https?://[^\s)>\]]+')


def u16(s):
    return len(s.encode('utf-16-le')) // 2


def parse(lines):
    paras = []
    for raw in lines:
        line = raw.rstrip('\n')
        spans, checkbox = [], False
        gray = line.startswith('~ ')
        if gray:
            line = line[2:]
        if line.startswith('# '):
            body = line[2:]
            tag = None
            if '||' in body:
                body, tag = [x.strip() for x in body.split('||', 1)]
            text = body if not tag else body + ' ' + tag
            spans.append((0, u16(body), 'red', None))
            if tag:
                kind = 'blue' if tag.upper() == 'PUBLICABLE' else 'red'
                spans.append((u16(body) + 1, u16(text), kind, None))
            checkbox = body.strip().upper() != 'AGENDA QUE VIENE'
            paras.append((text, spans, checkbox))
            continue
        bold_all = False
        if line.startswith('## '):
            line, bold_all = line[3:], True
        text, pos = '', 0
        for m in re.finditer(r'\*\*(.+?)\*\*', line):
            text += line[pos:m.start()]
            s = u16(text)
            text += m.group(1)
            spans.append((s, u16(text), 'bold', None))
            pos = m.end()
        text += line[pos:]
        if bold_all and text:
            spans.append((0, u16(text), 'bold', None))
        if gray and text:
            spans.insert(0, (0, u16(text), 'gray', None))
        for m in URL_RE.finditer(text):
            s = u16(text[:m.start()])
            spans.append((s, s + u16(m.group(0)), 'link', m.group(0)))
        paras.append((text, spans, False))
    return paras


def build(paras, end_index):
    reqs = []
    if end_index > 2:
        reqs.append({"deleteContentRange": {"range": {"startIndex": 1, "endIndex": end_index - 1}}})
    full = '\n'.join(p[0] for p in paras)
    reqs.append({"insertText": {"location": {"index": 1}, "text": full}})
    total_end = 1 + u16(full) + 1
    reqs.append({"deleteParagraphBullets": {"range": {"startIndex": 1, "endIndex": total_end}}})
    reqs.append({"updateParagraphStyle": {
        "range": {"startIndex": 1, "endIndex": total_end},
        "paragraphStyle": {"namedStyleType": "NORMAL_TEXT", "spaceAbove": {"magnitude": 8, "unit": "PT"},
                           "spaceBelow": {"magnitude": 0, "unit": "PT"}, "lineSpacing": 156},
        "fields": "namedStyleType,spaceAbove,spaceBelow,lineSpacing"}})
    reqs.append({"updateTextStyle": {
        "range": {"startIndex": 1, "endIndex": total_end - 1},
        "textStyle": {"weightedFontFamily": {"fontFamily": "Arial", "weight": 400},
                      "fontSize": {"magnitude": 11, "unit": "PT"}, "bold": False, "italic": False,
                      "strikethrough": False, "underline": False,
                      "foregroundColor": {"color": {"rgbColor": BLACK}}},
        "fields": "weightedFontFamily,fontSize,bold,italic,strikethrough,underline,foregroundColor,link"}})
    idx = 1
    checkbox_ranges = []
    for text, spans, checkbox in paras:
        for s, e, kind, extra in spans:
            if e <= s:
                continue
            rng = {"startIndex": idx + s, "endIndex": idx + e}
            if kind in ('red', 'blue'):
                ts = {"bold": True, "foregroundColor": {"color": {"rgbColor": RED if kind == 'red' else BLUE}}}
                f = "bold,foregroundColor"
            elif kind == 'bold':
                ts, f = {"bold": True}, "bold"
            elif kind == 'gray':
                ts, f = {"foregroundColor": {"color": {"rgbColor": GRAY}}}, "foregroundColor"
            else:
                ts = {"link": {"url": extra}, "foregroundColor": {"color": {"rgbColor": LINK}}, "underline": True}
                f = "link,foregroundColor,underline"
            reqs.append({"updateTextStyle": {"range": rng, "textStyle": ts, "fields": f}})
        if checkbox:
            checkbox_ranges.append((idx, idx + u16(text)))
        idx += u16(text) + 1
    for s, e in reversed(checkbox_ranges):
        reqs.append({"createParagraphBullets": {"range": {"startIndex": s, "endIndex": e},
                                                "bulletPreset": "BULLET_CHECKBOX"}})
    return reqs


if __name__ == '__main__':
    lines = open(sys.argv[1], encoding='utf-8').read().split('\n')
    while lines and lines[-1] == '':
        lines.pop()
    print(json.dumps(build(parse(lines), int(sys.argv[2])), ensure_ascii=False))
