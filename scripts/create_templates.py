# -*- coding: utf-8 -*-
"""
生成《毕业综合实践项目》文档模板
- 调研报告模板
- 小论文模板
"""

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn


def set_font(run, name_cn='宋体', name_en='Times New Roman', size=None, bold=False):
    """设置字体"""
    run.font.name = name_en
    run._element.rPr.rFonts.set(qn('w:eastAsia'), name_cn)
    if size:
        run.font.size = Pt(size)
    run.font.bold = bold


def add_cover_page(doc, title_type='调研报告'):
    """添加封面页"""
    # 空行
    for _ in range(3):
        doc.add_paragraph()
    
    # 学校名称
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('中山火炬职业技术学院')
    set_font(run, size=22, bold=True)
    
    # 学院名称
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('《毕业综合实践项目》' + title_type)
    set_font(run, size=18, bold=True)
    
    doc.add_paragraph()
    doc.add_paragraph()
    
    # 信息填写区域
    fields = [
        (f'{title_type}名称：', ''),
        ('撰写者：', ''),
        ('学号：', ''),
        ('二级学院：', ''),
        ('专业：', ''),
        ('指导老师：', ''),
    ]
    
    for label, value in fields:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(label + value)
        set_font(run, size=14)
        # 添加下划线
        run.font.underline = True
    
    doc.add_paragraph()
    doc.add_paragraph()
    doc.add_paragraph()
    
    # 制作单位
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('中山火炬职业技术学院财经商贸学院 制')
    set_font(run, size=12)
    
    # 分页
    doc.add_page_break()


def create_survey_report_template():
    """创建调研报告模板"""
    doc = Document()
    
    # 设置默认字体
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    style.font.size = Pt(12)
    
    # 设置页边距
    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(3.17)
        section.right_margin = Cm(3.17)
    
    # 封面
    add_cover_page(doc, '调研报告')
    
    # 标题
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('×××××调研报告')
    set_font(run, size=14, bold=True)  # 小3号约14pt
    
    doc.add_paragraph()
    
    # 前言
    p = doc.add_paragraph()
    run = p.add_run('前言')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('简要叙述本次调查的目的、调查时间、地点、被调查对象、调查的范围、经过、调查方法、调查结论等。')
    set_font(run, size=12)
    
    doc.add_paragraph()
    
    # 主体部分
    p = doc.add_paragraph()
    run = p.add_run('一、调查的目的')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写调查目的...')
    set_font(run, size=12)
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('二、调查的内容')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写调查内容...')
    set_font(run, size=12)
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('三、调查的具体过程')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写调查过程...')
    set_font(run, size=12)
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('四、调查中发现的被调查单位好的做法及可供借鉴的经验或发现的问题及解决方法')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写调查发现...')
    set_font(run, size=12)
    
    # 插图说明
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('【配图1】图片说明文字')
    set_font(run, size=10)
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('【配图2】图片说明文字')
    set_font(run, size=10)
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('【配图3】图片说明文字')
    set_font(run, size=10)
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('五、调查心得体会')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写心得体会...')
    set_font(run, size=12)
    
    # 结尾
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('结语')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('总结观点，深化主题，可视情况写。')
    set_font(run, size=12)
    
    doc.save('调研报告模板.docx')
    print('调研报告模板.docx 已生成')


def create_essay_template():
    """创建小论文模板"""
    doc = Document()
    
    # 设置默认字体
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    style.font.size = Pt(12)
    
    # 设置页边距
    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(3.17)
        section.right_margin = Cm(3.17)
    
    # 封面
    add_cover_page(doc, '小论文')
    
    # 标题
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('×××××小论文')
    set_font(run, size=14, bold=True)  # 小3号约14pt
    
    doc.add_paragraph()
    
    # 摘要
    p = doc.add_paragraph()
    run = p.add_run('摘要：')
    set_font(run, size=12, bold=True)
    run = p.add_run('简要叙述小论文撰写的目的、研究工作的主要对象和范围，采用的手段和方法，得出的结果和重要的结论（200字以内）。')
    set_font(run, size=12)
    
    doc.add_paragraph()
    
    # 主体部分
    p = doc.add_paragraph()
    run = p.add_run('一、引言')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写引言内容...')
    set_font(run, size=12)
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('二、研究背景与现状')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写研究背景...')
    set_font(run, size=12)
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('三、研究内容与方法')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写研究内容...')
    set_font(run, size=12)
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('四、研究结果与分析')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写研究结果...')
    set_font(run, size=12)
    
    # 插图说明
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('【配图1】图片说明文字')
    set_font(run, size=10)
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('【配图2】图片说明文字')
    set_font(run, size=10)
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('【配图3】图片说明文字')
    set_font(run, size=10)
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    run = p.add_run('五、结论与建议')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('在此填写结论...')
    set_font(run, size=12)
    
    # 结尾
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('结语')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('总结观点，深化主题，可视情况写。')
    set_font(run, size=12)
    
    # 参考文献
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('参考文献')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('[1] 作者. 书名[M]. 出版地: 出版社, 出版年份.')
    set_font(run, size=10)
    
    p = doc.add_paragraph()
    run = p.add_run('[2] 作者. 论文题目[J]. 期刊名, 年份, 卷(期): 页码.')
    set_font(run, size=10)
    
    # 附录
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run('附录')
    set_font(run, size=12, bold=True)
    
    p = doc.add_paragraph()
    run = p.add_run('（如有可附上）')
    set_font(run, size=12)
    
    doc.save('小论文模板.docx')
    print('小论文模板.docx 已生成')


if __name__ == '__main__':
    create_survey_report_template()
    create_essay_template()
    print('模板生成完成！')
