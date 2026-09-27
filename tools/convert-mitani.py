"""Extract PDF vector strokes for local Mitani experiments (pdfplumber required).
Artwork rights remain with Jun Mitani. This does not trace raster illustrations.
"""
from pathlib import Path
import json
import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
def convert(filename, output, bounds, wrap, title, url):
    page = pdfplumber.open(ROOT / 'cp_examples/mitani' / filename).pages[0]
    x0,y0,x1,y1 = bounds
    lines=[]
    for line in page.lines:
        rgb=line.get('stroking_color') or ()
        if len(rgb)!=3: continue
        if rgb[0]>.7 and rgb[1]<.3 and rgb[2]<.3: color='#ff0000'
        elif rgb[2]>.7 and rgb[0]<.3: color='#0000ff'
        else: continue
        a,b=line['pts']
        if not all(x0-.1<=p[0]<=x1+.1 and y0-.1<=p[1]<=y1+.1 for p in [a,b]): continue
        lines.append((a,b,color))
    w,h=x1-x0,y1-y0
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">',f'<title>{title} - Jun Mitani</title>',f'<desc>Vector strokes extracted from {url}. Curved creases remain a polyline approximation. Glue tabs and page labels excluded.</desc>',f'<rect x="0" y="0" width="{w}" height="{h}" fill="none" stroke="#000000"/>']
    for a,b,color in lines:
        svg.append(f'<line x1="{a[0]-x0:.6f}" y1="{a[1]-y0:.6f}" x2="{b[0]-x0:.6f}" y2="{b[1]-y0:.6f}" stroke="{color}"/>')
    svg.append('</svg>')
    (ROOT/'cp_examples/mitani'/output).write_text('\n'.join(svg),encoding='utf-8')
    return dict(title=title,svg=output,source=url,author='Jun Mitani',wrap=wrap,strokes=len(lines),crop=bounds,width=w,height=h)

if __name__=='__main__':
    entries=[
        convert('sphere-eight-flaps.pdf','sphere-eight-flaps.svg',[171.005,122.661,424.271,717.229],'y','Origami Sphere (8 flaps)','https://mitani.cs.tsukuba.ac.jp/en/data/origami_sphere.pdf'),
        convert('distorted-square-pole.pdf','distorted-square-pole.svg',[65.3857,43.0546,537.4047,630.7986],'x','Distorted Square Pole','https://mitani.cs.tsukuba.ac.jp/dl/2011/distorted_square_pole_mitani2011.pdf')]
    (ROOT/'cp_examples/mitani/manifest.json').write_text(json.dumps(entries,indent=2),encoding='utf-8')
    print(json.dumps(entries,indent=2))
