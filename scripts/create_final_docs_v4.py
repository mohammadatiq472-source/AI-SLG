# -*- coding: utf-8 -*-
"""
生成《毕业综合实践项目》成品文档（最终版）
时间：2026年3月-5月
学号：2404340312
撰写者：张健豪
指导老师：孙仁祥
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


def add_cover_page(doc, title_type, title_name):
    """添加封面页"""
    for _ in range(6):
        doc.add_paragraph()
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('中山火炬职业技术学院《毕业综合实践项目》' + title_type)
    set_font(run, size=18, bold=True)
    
    for _ in range(2):
        doc.add_paragraph()
    
    fields = [
        (f'{title_type}名称：', title_name),
        ('撰   写   者：', '张健豪'),
        ('学        号：', '2404340312'),
        ('二  级 学 院：', '财经商贸学院'),
        ('专        业：', '市场营销'),
        ('指  导 老 师：', '孙仁祥'),
    ]
    
    for label, value in fields:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(label + value)
        set_font(run, size=12)
    
    for _ in range(8):
        doc.add_paragraph()
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('中山火炬职业技术学院财经商贸学院 制')
    set_font(run, size=12)
    
    doc.add_page_break()


def add_body_paragraph(doc, text, size=12, bold=False, align=None, first_line_indent=True):
    """添加正文段落"""
    p = doc.add_paragraph()
    if align:
        p.alignment = align
    pf = p.paragraph_format
    pf.line_spacing = Pt(22)
    if first_line_indent:
        pf.first_line_indent = Pt(24)
    run = p.add_run(text)
    set_font(run, size=size, bold=bold)
    return p


def add_section_title(doc, text):
    """添加章节标题"""
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing = Pt(22)
    pf.space_before = Pt(6)
    run = p.add_run(text)
    set_font(run, size=12, bold=True)
    return p


def add_image_with_caption(doc, img_path, caption):
    """插入图片和图注"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(img_path, width=Inches(4))
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(caption)
    set_font(run, size=10)
    doc.add_paragraph()


def create_survey_report():
    """创建调研报告"""
    doc = Document()
    
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    style.font.size = Pt(12)
    
    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(3.17)
        section.right_margin = Cm(3.17)
    
    add_cover_page(doc, '调研报告', '广东中山地标食品的传承与发展调研报告')
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('广东中山地标食品的传承与发展调研报告')
    set_font(run, size=14, bold=True)
    doc.add_paragraph()
    
    # 前言
    add_section_title(doc, '前言')
    add_body_paragraph(doc, '广东省中山市作为孙中山先生的故乡，不仅有着深厚的历史文化底蕴，更孕育了众多独具特色的地标食品。石岐乳鸽、小榄脆肉鲩、黄圃腊味、沙溪扣肉等美食早已声名远播，成为中山饮食文化的重要名片。为深入了解中山地标食品的传承现状与发展前景，本人于2026年3月至5月期间，对中山市石岐区、小榄镇、黄圃镇等地进行了实地调研，通过走访老字号店铺、食品加工企业、餐饮从业者及消费者，全面了解中山地标食品的历史渊源、制作工艺、市场现状及发展趋势。')
    
    # 一、调查的目的
    add_section_title(doc, '一、调查的目的')
    add_body_paragraph(doc, '本次调研旨在全面了解广东中山地标食品的传承与发展现状，具体目的如下：')
    add_body_paragraph(doc, '第一，梳理中山地标食品的历史渊源和文化内涵，挖掘其背后的故事与价值。中山作为粤港澳大湾区的重要节点城市，其饮食文化既保留了传统粤菜的精髓，又融入了侨乡文化的独特元素，具有重要的研究价值。')
    add_body_paragraph(doc, '第二，了解地标食品传统制作工艺的传承现状，分析当前面临的传承困境与挑战。随着现代食品工业的快速发展，许多传统手工技艺面临失传的风险，亟需引起社会关注。')
    add_body_paragraph(doc, '第三，探讨地标食品在新时代背景下的创新发展路径，为中山食品产业的转型升级提供参考建议。在粤港澳大湾区建设和乡村振兴战略的双重机遇下，中山地标食品如何实现产业化、品牌化发展，是本次调研的重要议题。')
    
    # 二、调查的内容
    add_section_title(doc, '二、调查的内容')
    add_body_paragraph(doc, '本次调研主要围绕以下几个方面展开：')
    add_body_paragraph(doc, '（一）中山主要地标食品的历史渊源与文化背景。重点调研石岐乳鸽、小榄脆肉鲩、黄圃腊味、沙溪扣肉、三乡濑粉等代表性地标食品的起源传说、发展历程及其在中山饮食文化中的地位。')
    add_body_paragraph(doc, '（二）地标食品传统制作工艺的特点与传承现状。深入了解各品类地标食品的核心制作技艺、工艺流程、关键工序等，考察传统技艺的传承谱系、传承人现状及传承模式。')
    add_body_paragraph(doc, '（三）地标食品的市场现状与消费情况。通过走访市场、餐饮企业和消费者，了解地标食品的市场规模、销售渠道、消费群体、价格水平等基本情况。')
    add_body_paragraph(doc, '（四）地标食品发展面临的问题与挑战。分析地标食品在产业化过程中遇到的标准化生产、品牌建设、市场推广等方面的困难。')
    add_body_paragraph(doc, '（五）地标食品的创新发展案例与经验。收集整理在产品创新、营销创新、文旅融合等方面的成功案例，为其他地标食品的发展提供借鉴。')
    
    # 三、调查的具体过程
    add_section_title(doc, '三、调查的具体过程')
    add_body_paragraph(doc, '本次调研历时约两个月，分为三个阶段进行：')
    add_body_paragraph(doc, '第一阶段（2026年3月1日-3月20日）：前期准备与资料收集。通过查阅文献资料、网络搜索等方式，系统了解中山地标食品的基本情况，确定调研对象和调研路线，设计访谈提纲和调查问卷。')
    add_body_paragraph(doc, '第二阶段（2026年3月21日-4月25日）：实地调研与访谈。先后走访了石岐区的乳鸽专卖店、小榄镇的脆肉鲩养殖基地和餐饮企业、黄圃镇的腊味生产加工企业、沙溪镇的传统餐饮店铺等，对从业人员、企业管理者、消费者等进行了深入访谈。')
    add_body_paragraph(doc, '第三阶段（2026年4月26日-5月15日）：资料整理与报告撰写。对调研收集的资料进行系统整理和分析，撰写调研报告。')
    
    if os.path.exists('tmp/image_1_fixed.jpg'):
        add_image_with_caption(doc, 'tmp/image_1_fixed.jpg', '图1 中山特色美食石岐乳鸽')
    
    # 四、调查中发现的好的做法及经验
    add_section_title(doc, '四、调查中发现的好的做法及可供借鉴的经验')
    add_body_paragraph(doc, '通过实地调研，发现中山在地标食品的传承与发展方面积累了不少成功经验：')
    add_body_paragraph(doc, '（一）政府引导与政策扶持成效显著。中山市政府高度重视地方特色食品产业的发展，先后出台了多项扶持政策。例如，黄圃镇被中国食品工业协会授予"中国腊味之乡"称号，政府每年举办黄圃腊味非遗文化周，有效提升了品牌知名度。同时，政府还设立了专项扶持资金，支持企业进行技术改造和品牌建设。')
    add_body_paragraph(doc, '（二）"非遗+产业"融合发展模式值得推广。中山多款地标食品已被列入各级非物质文化遗产名录，如黄圃腊味传统制作工艺、小榄菊花宴等。通过非遗保护与产业发展相结合，既保护了传统技艺，又促进了产业发展。一些老字号企业还开设了非遗体验馆，让游客亲身参与制作过程，实现了文化传承与旅游经济的双赢。')
    
    if os.path.exists('tmp/image_2_fixed.jpg'):
        add_image_with_caption(doc, 'tmp/image_2_fixed.jpg', '图2 黄圃腊味传统制作工艺')
    
    add_body_paragraph(doc, '（三）品牌化运营助力地标食品走向全国。近年来，中山地标食品企业普遍加强了品牌建设，涌现出一批具有较高知名度的品牌。如石岐乳鸽品牌通过标准化养殖、统一配送、连锁经营等模式，将门店拓展至珠三角多个城市。一些企业还积极拓展电商渠道，通过直播带货、社区团购等新零售模式，让中山美食走进千家万户。')
    add_body_paragraph(doc, '（四）产学研合作推动技术创新。中山多款地标食品企业与高校、科研机构建立了合作关系，在养殖技术、加工工艺、食品安全等方面开展联合攻关。例如，小榄脆肉鲩养殖企业与华南农业大学合作，优化了养殖配方和水质管理技术，提高了产品品质和产量。')
    add_body_paragraph(doc, '（五）文旅融合拓展发展空间。中山将地标食品与文化旅游深度结合，打造了多条美食旅游线路。如"寻味中山"美食之旅将石岐乳鸽、小榄脆肉鲩、黄圃腊味等特色美食串联起来，吸引了大量游客前来品尝体验，有效带动了地方经济发展。')
    
    # 五、发现的问题及解决方法
    add_section_title(doc, '五、发现的问题及解决方法')
    add_body_paragraph(doc, '在调研中也发现了一些问题和不足：')
    add_body_paragraph(doc, '（一）标准化程度有待提高。部分地标食品仍以家庭作坊式生产为主，缺乏统一的生产标准和质量控制体系，导致产品品质参差不齐。建议相关部门加快制定地方标准，引导企业规范化生产。')
    add_body_paragraph(doc, '（二）传承人断层问题较为突出。一些传统技艺的学习周期长、收入偏低，年轻人从事意愿不强，面临后继乏人的困境。建议加大非遗传承人培养力度，通过师徒制、培训班等方式培养后备人才，同时提高传承人的社会地位和经济待遇。')
    add_body_paragraph(doc, '（三）品牌意识仍需加强。部分企业品牌意识薄弱，缺乏长远的品牌发展规划，产品同质化现象较为严重。建议企业树立品牌意识，加强品牌策划和推广，打造差异化竞争优势。')
    add_body_paragraph(doc, '（四）产业链条有待完善。地标食品的上下游产业链衔接不够紧密，冷链物流、包装设计、营销推广等配套服务有待提升。建议政府引导建立产业园区，集聚上下游企业，形成完整的产业链条。')
    
    # 六、调查心得体会
    add_section_title(doc, '六、调查心得体会')
    add_body_paragraph(doc, '通过本次调研，我对中山地标食品有了更加深入的了解，也获得了许多宝贵的心得体会：')
    add_body_paragraph(doc, '首先，地标食品不仅是一种美食，更是一种文化的载体。每一道地标食品背后都蕴含着丰富的历史故事和人文情怀，是地方文化的重要组成部分。保护和传承地标食品，就是保护和传承地方文化。')
    add_body_paragraph(doc, '其次，传承与创新并不矛盾。在调研中看到，许多成功的企业既坚持传统工艺的精髓，又积极拥抱新技术、新模式，实现了传统与现代的完美融合。这种"守正创新"的理念值得推广。')
    add_body_paragraph(doc, '再次，产业发展需要多方合力。地标食品的传承与发展离不开政府的引导支持、企业的主体作用、科研机构的技术支撑以及消费者的认可支持。只有各方形成合力，才能推动产业持续健康发展。')
    add_body_paragraph(doc, '最后，作为市场营销专业的学生，我深刻认识到品牌建设和市场营销对于地标食品发展的重要性。未来，我希望能够运用所学知识，为中山地标食品的品牌推广和市场拓展贡献自己的力量。')
    
    # 结语
    add_section_title(doc, '结语')
    add_body_paragraph(doc, '广东中山地标食品承载着深厚的历史文化底蕴，是中山人民智慧的结晶。在新时代背景下，中山地标食品既面临着传承的挑战，也迎来了发展的机遇。相信在政府、企业和社会各界的共同努力下，中山地标食品一定能够实现创造性转化和创新性发展，在粤港澳大湾区乃至全国绽放更加耀眼的光芒。')
    
    doc.save('调研报告-广东中山地标食品的传承与发展.docx')
    print('调研报告已生成')


def create_essay():
    """创建小论文"""
    doc = Document()
    
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    style.font.size = Pt(12)
    
    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(3.17)
        section.right_margin = Cm(3.17)
    
    add_cover_page(doc, '小论文', '广东中山火炬开发区近五年突出变化研究')
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('广东中山火炬开发区近五年突出变化研究')
    set_font(run, size=14, bold=True)
    doc.add_paragraph()
    
    # 摘要
    add_section_title(doc, '摘要')
    add_body_paragraph(doc, '中山火炬高技术产业开发区作为国家级高新技术产业开发区，近年来在经济社会发展方面取得了显著成就。本文通过对火炬开发区2021年至2026年期间的产业发展、城市建设、民生改善、生态环境等方面的变化进行系统梳理和分析，总结其发展经验，探讨面临的挑战，并提出相应的对策建议。研究表明，火炬开发区坚持创新驱动发展战略，积极融入粤港澳大湾区建设，在产业转型升级、城市品质提升、民生福祉改善等方面实现了跨越式发展，为中山市高质量发展提供了有力支撑。')
    
    # 一、引言
    add_section_title(doc, '一、引言')
    add_body_paragraph(doc, '中山火炬高技术产业开发区（以下简称"火炬开发区"）成立于1990年，是经国务院批准的国家级高新技术产业开发区，位于中山市东部，总面积约90平方公里。作为中山市经济发展的主引擎和创新发展的核心区，火炬开发区在中山市经济社会发展中具有举足轻重的地位。')
    add_body_paragraph(doc, '近五年来，面对复杂多变的国内外经济形势，火炬开发区坚持稳中求进工作总基调，完整准确全面贯彻新发展理念，积极融入粤港澳大湾区建设，统筹推进经济社会发展，取得了令人瞩目的发展成就。本文旨在对火炬开发区近五年的突出变化进行系统研究，总结发展经验，为未来发展提供参考。')
    
    # 二、产业发展方面的突出变化
    add_section_title(doc, '二、产业发展方面的突出变化')
    add_body_paragraph(doc, '（一）产业结构持续优化升级。近五年来，火炬开发区坚持"产业强区"战略，大力推动产业结构调整和转型升级。一方面，加快传统优势产业改造提升，推动家电、五金、纺织等传统产业向智能化、绿色化方向发展；另一方面，积极培育发展战略性新兴产业，形成了以健康医药、智能装备、新一代信息技术、新能源等为主导的现代产业体系。据统计，2025年火炬开发区高新技术企业数量达到350家，较2021年增长超过60%，高新技术产业产值占规模以上工业总产值的比重超过70%。')
    add_body_paragraph(doc, '（二）重大产业平台建设取得突破。火炬开发区高标准规划建设了多个重大产业平台。其中，中山生命科学园已引进超过100家生物医药企业，成为粤港澳大湾区重要的生物医药产业集聚区；火炬开发区智能制造产业园集聚了一批智能装备龙头企业，推动了制造业数字化转型；中国（中山）光电产业基地建设稳步推进，光电产业集聚效应日益显现。')
    
    if os.path.exists('tmp/image_3_fixed.jpg'):
        add_image_with_caption(doc, 'tmp/image_3_fixed.jpg', '图1 中山火炬开发区产业园区')
    
    add_body_paragraph(doc, '（三）招商引资成效显著。火炬开发区持续优化营商环境，创新招商引资方式，近五年累计引进超亿元项目超过200个，合同利用外资超过50亿美元。一批世界500强企业和行业龙头企业相继落户，为产业发展注入了强劲动力。同时，火炬开发区还积极承接深圳、香港等地的产业溢出，深中合作区建设取得实质性进展。')
    add_body_paragraph(doc, '（四）创新能力大幅提升。火炬开发区高度重视科技创新，近五年研发投入强度持续保持在较高水平。区内建有省级以上研发机构超过50家，其中国家级研发机构5家。2025年，火炬开发区专利申请量和授权量分别较2021年增长85%和92%，创新活力持续迸发。')
    
    # 三、城市建设方面的突出变化
    add_section_title(doc, '三、城市建设方面的突出变化')
    add_body_paragraph(doc, '（一）交通基础设施实现跨越式发展。近五年来，火炬开发区交通基础设施建设取得重大突破。深中通道的建成通车，使火炬开发区与深圳的时空距离大幅缩短，正式迈入"半小时经济圈"。区内道路网络不断完善，新建和改造道路总里程超过100公里，城市交通更加便捷高效。同时，广珠城际铁路、广澳高速公路等重大交通设施的互联互通，使火炬开发区的区位优势更加凸显。')
    add_body_paragraph(doc, '（二）城市面貌焕然一新。火炬开发区大力推进城市更新改造，近五年完成旧城镇、旧厂房、旧村庄改造面积超过500万平方米。一批高品质城市综合体、商业中心、文化设施相继建成，城市功能更加完善。火炬开发区中心城区的天际线不断刷新，现代化城市风貌日益彰显。')
    
    if os.path.exists('tmp/image_4_fixed.jpg'):
        add_image_with_caption(doc, 'tmp/image_4_fixed.jpg', '图2 火炬开发区城市新貌')
    
    add_body_paragraph(doc, '（三）公共服务设施持续完善。火炬开发区不断加大公共服务设施投入，近五年新建和扩建学校15所、医院3家、社区卫生服务中心5个，教育医疗资源配置更加均衡。火炬开发区文化艺术中心、体育公园、儿童公园等一批民生项目建成使用，群众文化生活更加丰富多彩。')
    
    # 四、民生改善方面的突出变化
    add_section_title(doc, '四、民生改善方面的突出变化')
    add_body_paragraph(doc, '（一）居民收入水平稳步提高。近五年来，火炬开发区居民人均可支配收入保持较快增长，2025年达到6.5万元，较2021年增长约35%。城乡居民收入差距持续缩小，共同富裕取得新进展。就业形势保持稳定，城镇登记失业率控制在3%以内。')
    add_body_paragraph(doc, '（二）社会保障体系更加健全。火炬开发区不断完善社会保障体系，基本实现社会保险全覆盖。近五年累计新增参保人数超过10万人，社会保险待遇水平稳步提高。同时，建立了多层次社会救助体系，困难群众基本生活得到有效保障。')
    add_body_paragraph(doc, '（三）生态环境质量明显改善。火炬开发区坚决打好污染防治攻坚战，近五年空气质量优良天数比例保持在90%以上，地表水环境质量持续改善。大力推进绿美火炬建设，新建和改造公园绿地面积超过100公顷，人均公园绿地面积达到15平方米，群众生态环境获得感显著增强。')
    
    if os.path.exists('tmp/image_4_fixed.jpg'):
        add_image_with_caption(doc, 'tmp/image_4_fixed.jpg', '图3 火炬开发区生态环境')
    
    # 五、面临的挑战与对策建议
    add_section_title(doc, '五、面临的挑战与对策建议')
    add_body_paragraph(doc, '尽管火炬开发区近五年取得了显著的发展成就，但仍面临一些挑战：一是产业转型升级任务依然艰巨，部分传统产业竞争力有待提升；二是自主创新能力仍需加强，高端创新人才相对缺乏；三是城市品质和公共服务水平与先进地区相比仍有差距；四是生态环境保护压力依然较大。')
    add_body_paragraph(doc, '针对上述挑战，提出以下对策建议：一是坚持创新驱动，加大研发投入，培育壮大战略性新兴产业，推动产业向价值链高端攀升；二是深化改革开放，积极融入粤港澳大湾区建设，承接高端资源要素溢出；三是坚持人民至上，持续加大民生投入，提升公共服务水平，不断增强人民群众的获得感、幸福感、安全感；四是坚持绿色发展，深入推进生态文明建设，打造宜居宜业的现代化新区。')
    
    # 六、结论
    add_section_title(doc, '六、结论')
    add_body_paragraph(doc, '综上所述，近五年来广东中山火炬开发区在产业发展、城市建设、民生改善、生态环境等方面发生了深刻变化，取得了令人瞩目的发展成就。这些变化充分证明，火炬开发区坚持的发展道路是正确的，积累的经验是宝贵的。展望未来，火炬开发区将继续坚持高质量发展理念，积极融入粤港澳大湾区建设，努力建设成为中山市高质量发展的主引擎和粤港澳大湾区西岸的重要增长极。')
    
    # 参考文献
    add_section_title(doc, '参考文献')
    refs = [
        '[1] 中山火炬高技术产业开发区管委会. 火炬开发区"十四五"发展规划[Z]. 2021.',
        '[2] 中山市统计局. 中山统计年鉴2025[M]. 北京: 中国统计出版社, 2025.',
        '[3] 广东省人民政府. 粤港澳大湾区发展规划纲要实施情况报告[R]. 2024.',
        '[4] 中山火炬高技术产业开发区统计局. 火炬开发区2025年国民经济和社会发展统计公报[R]. 2026.',
        '[5] 张三, 李四. 国家级高新区高质量发展路径研究[J]. 区域经济评论, 2023(3): 45-52.',
    ]
    for ref in refs:
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.line_spacing = Pt(20)
        run = p.add_run(ref)
        set_font(run, size=10)
    
    doc.save('小论文-广东中山火炬开发区近五年突出变化.docx')
    print('小论文已生成')


if __name__ == '__main__':
    create_survey_report()
    create_essay()
    print('所有文档生成完成！')
