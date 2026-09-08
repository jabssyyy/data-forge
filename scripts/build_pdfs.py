#!/usr/bin/env python3
"""Generate both deliverables from editable Markdown. Run from repository root."""
from pathlib import Path
import re
from html import escape
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
INK, BLUE, MUTED = map(HexColor, ['#172a3a','#1665a7','#526778'])

def inline(s):
    # Standard PDF fonts: explicit ASCII mathematical names avoid missing glyphs.
    for a,b in {'⊙':'(elementwise product)','×':'x','→':' to ','−':'-','Ł':'L','ł':'l','ó':'o','á':'a','ü':'u','ń':'n','ś':'s','ř':'r'}.items(): s=s.replace(a,b)
    s=escape(s)
    s=re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)',r'<link href="\2" color="#1665a7">\1</link>',s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'`([^`]+)`',r'<font name="Courier">\1</font>',s)
    return s

def build(name, compact):
    source=(ROOT/'docs'/f'{name}.md').read_text()
    size,lead=(9.4,12.1) if compact else (10.5,14.7)
    styles={
      'p':ParagraphStyle('body',fontName='Helvetica',fontSize=size,leading=lead,textColor=INK,spaceAfter=5 if compact else 10),
      'h1':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=22 if compact else 29,leading=25 if compact else 34,textColor=INK,spaceAfter=10),
      'h2':ParagraphStyle('section',fontName='Helvetica-Bold',fontSize=10.3 if compact else 14,leading=13 if compact else 19,textColor=BLUE,spaceBefore=6 if compact else 12,spaceAfter=5),
      'ref':ParagraphStyle('reference',fontName='Helvetica',fontSize=7.7 if compact else 10,leading=9.5 if compact else 14,textColor=MUTED,spaceAfter=3),
      'cell':ParagraphStyle('cell',fontName='Helvetica',fontSize=8 if compact else 10,leading=10 if compact else 13,textColor=INK),
    }
    w,h=A4; margin=33 if compact else 48
    doc=BaseDocTemplate(str(ROOT/'docs'/f'{name}.pdf'),pagesize=A4,leftMargin=margin,rightMargin=margin,topMargin=42,bottomMargin=36,title=source.splitlines()[0][2:],author='DataForge project')
    def footer(c,d):
      c.setStrokeColor(BLUE);c.setLineWidth(2);c.line(margin,h-25,w-margin,h-25)
      c.setFont('Helvetica',7);c.setFillColor(MUTED);c.drawString(margin,20,'DATAFORGE / INDEPENDENT BDH PROBE / 08 SEPTEMBER 2026');c.drawRightString(w-margin,20,str(d.page))
    doc.addPageTemplates(PageTemplate(id='main',frames=[Frame(margin,36,w-2*margin,h-78,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=footer))
    blocks=re.split(r'\n\s*\n',source.strip()); flow=[]
    for block in blocks:
      if block.startswith('|'):
        rows=[]
        for line in block.splitlines():
          if re.match(r'^\|[\s:|\-]+$',line):continue
          rows.append([Paragraph(inline(cell.strip()),styles['cell']) for cell in line.strip('|').split('|')])
        table=Table(rows,colWidths=[(w-2*margin)/len(rows[0])]*len(rows[0]),hAlign='LEFT')
        table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),HexColor('#eaf2f9')),('LINEBELOW',(0,0),(-1,0),.6,BLUE),('LINEBELOW',(0,1),(-1,-1),.3,HexColor('#d5dfe6')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]));flow.extend([table,Spacer(1,6)]);continue
      key='h1' if block.startswith('# ') else 'h2' if block.startswith('## ') else 'ref' if re.match(r'^\[\d\]',block) else 'p'
      text=re.sub(r'^#+ ','',block).replace('\n',' ')
      flow.append(Paragraph(inline(text),styles[key]))
    doc.build(flow)
    visible=re.sub(r'\[([^\]]+)\]\([^)]+\)',r'\1',source)
    visible=re.sub(r'^\|[\s:|\-]+$','',visible,flags=re.M)
    print(f'{name}: source-visible words={len(visible.split())}; pages={doc.page}')
    if compact and doc.page != 1: raise RuntimeError('Concept briefing must fit exactly one page')

if __name__=='__main__':
    build('concept-summary',True)
    build('blog',False)
