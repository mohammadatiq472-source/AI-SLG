# -*- coding: utf-8 -*-
"""
为文档插入图片
"""

from docx import Document
from docx.shared import Pt, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
import os


def set_font(run, name_cn='宋体', name_en='Times New Roman', size=None, bold=False):
    """设置字体"""
    run.font.name = name_en
    run._element.rPr.rFonts.set(qn('w:eastAsia'), name_cn)
    if size:
        run.font.size = Pt(size)
    run.font.bold = bold


def update_survey_report():
    """更新调研报告，插入图片"""
    doc = Document('调研报告-广东中山地标食品的传承与发展.docx')
    
    # 查找并替换图片占位符
    img_files = ['tmp/real_image_1.jpg', 'tmp/real_image_2.jpg', 'tmp/real_image_3.jpg']
    img_captions = [
        '图1 走访黄圃腊味传统制作工坊',
        '图2 黄圃腊味非遗文化周活动现场',
        '图3 中山美食旅游线路宣传海报'
    ]
    
    img_index = 0
    new_doc = Document()
    
    # 复制样式
    style = new_doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    style.font.size = Pt(12)
    
    for section in new_doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(3.17)
        section.right_margin = Cm(3.17)
    
    for i, para in enumerate(doc.paragraphs):
        if '【此处插入图片】' in para.text:
            # 插入图片
            if img_index < len(img_files) and os.path.exists(img_files[img_index]):
                p = new_doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run()
                run.add_picture(img_files[img_index], width=Inches(4))
                
                # 添加图注
                p = new_doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(img_captions[img_index])
                set_font(run, size=10)
                
                img_index += 1
            continue
        
        # 复制段落
        new_para = new_doc.add_paragraph()
        new_para.alignment = para.alignment
        new_para.paragraph_format.line_spacing = para.paragraph_format.line_spacing
        new_para.paragraph_format.first_line_indent = para.paragraph_format.first_line_indent
        
        for run in para.runs:
            new_run = new_para.add_run(run.text)
            new_run.font.name = run.font.name
            new_run.font.size = run.font.size
            new_run.font.bold = run.font.bold
    
    new_doc.save('调研报告-广东中山地标食品的传承与发展.docx')
    print('调研报告已更新，图片已插入')


def update_essay():
    """更新小论文，插入图片"""
    doc = Document('小论文-广东中山火炬开发区近五年突出变化.docx')
    
    img_files = ['tmp/real_image_3.jpg', 'tmp/real_image_1.jpg', 'tmp/real_image_2.jpg']
    img_captions = [
        '图1 中山生命科学园园区实景',
        '图2 火炬开发区城市新貌',
        '图3 火炬开发区生态公园景观'
    ]
    
    img_index = 0
    new_doc = Document()
    
    style = new_doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    style.font.size = Pt(12)
    
    for section in new_doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(3.17)
        section.right_margin = Cm(3.17)
    
    for i, para in enumerate(doc.paragraphs):
        if '【此处插入图片】' in para.text:
            if img_index < len(img_files) and os.path.exists(img_files[img_index]):
                p = new_doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run()
                run.add_picture(img_files[img_index], width=Inches(4))
                
                p = new_doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(img_captions[img_index])
                set_font(run, size=10)
                
                img_index += 1
            continue
        
        new_para = new_doc.add_paragraph()
        new_para.alignment = para.alignment
        new_para.paragraph_format.line_spacing = para.paragraph_format.line_spacing
        new_para.paragraph_format.first_line_indent = para.paragraph_format.first_line_indent
        
        for run in para.runs:
            new_run = new_para.add_run(run.text)
            new_run.font.name = run.font.name
            new_run.font.size = run.font.size
            new_run.font.bold = run.font.bold
    
    new_doc.save('小论文-广东中山火炬开发区近五年突出变化.docx')
    print('小论文已更新，图片已插入')


if __name__ == '__main__':
    update_survey_report()
    update_essay()
    print('所有文档更新完成！')
