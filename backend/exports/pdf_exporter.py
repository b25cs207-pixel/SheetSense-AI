import io
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf_report(
    dataset_name: str,
    schema_profile: Dict[str, Any],
    stats: Dict[str, Any],
    insights: List[Dict[str, Any]],
    recommendations: List[Dict[str, Any]]
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#4B5563'),
        spaceAfter=14
    )
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1F2937'),
        spaceBefore=14,
        spaceAfter=8
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#374151')
    )
    bold_style = ParagraphStyle(
        'DocBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#111827')
    )

    story = []

    # Header Banner
    story.append(Paragraph("SheetSense AI — Executive Analytics Report", title_style))
    curr_time = datetime.now().strftime("%B %d, %Y - %I:%M %p")
    story.append(Paragraph(f"<b>Dataset:</b> {dataset_name} &nbsp;|&nbsp; <b>Generated:</b> {curr_time}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=14))

    # Overview Metrics Table
    summary = schema_profile.get("summary", {})
    overview_data = [
        [
            Paragraph("<b>Total Records</b>", bold_style), Paragraph(f"{summary.get('total_rows', 0):,}", body_style),
            Paragraph("<b>Columns</b>", bold_style), Paragraph(f"{summary.get('total_columns', 0)}", body_style)
        ],
        [
            Paragraph("<b>Quality Health</b>", bold_style), Paragraph(f"{summary.get('overall_quality_score', 0)}%", body_style),
            Paragraph("<b>Missing Cells</b>", bold_style), Paragraph(f"{summary.get('total_missing_cells', 0)}", body_style)
        ]
    ]
    t_overview = Table(overview_data, colWidths=[120, 150, 120, 150])
    t_overview.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_overview)
    story.append(Spacer(1, 14))

    # Executive KPIs
    kpis = stats.get("kpis", [])
    if kpis:
        story.append(Paragraph("Executive Key Performance Indicators (KPIs)", section_heading))
        kpi_table_data = [[Paragraph("<b>Metric</b>", bold_style), Paragraph("<b>Value</b>", bold_style), Paragraph("<b>Details</b>", bold_style)]]
        for k in kpis:
            kpi_table_data.append([
                Paragraph(k["label"], bold_style),
                Paragraph(f"<b>{k['value']}</b>", ParagraphStyle('KPIVal', parent=bold_style, textColor=colors.HexColor('#2563EB'), fontSize=10)),
                Paragraph(k.get("subtitle", "-"), body_style)
            ])
        t_kpi = Table(kpi_table_data, colWidths=[180, 140, 220])
        t_kpi.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EFF6FF')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ]))
        story.append(t_kpi)
        story.append(Spacer(1, 14))

    # Top AI Insights
    if insights:
        story.append(Paragraph("Verified AI Insights & Discoveries", section_heading))
        ins_table_data = [[Paragraph("<b>Category</b>", bold_style), Paragraph("<b>Finding & Significance</b>", bold_style), Paragraph("<b>Recommended Action</b>", bold_style)]]
        for ins in insights[:5]:
            ins_table_data.append([
                Paragraph(f"<b>{ins.get('category', 'Finding')}</b><br/><font size=7 color='#6B7280'>{ins.get('confidence', '')}</font>", bold_style),
                Paragraph(f"<b>{ins.get('title', '')}</b><br/>{ins.get('finding', '')}<br/><font color='#4B5563'>{ins.get('explanation', '')}</font>", body_style),
                Paragraph(ins.get('suggested_action', '-'), body_style)
            ])
        t_ins = Table(ins_table_data, colWidths=[110, 280, 150])
        t_ins.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t_ins)
        story.append(Spacer(1, 14))

    # Proactive Recommendations
    if recommendations:
        story.append(Paragraph("Proactive Recommendations & Next Steps", section_heading))
        rec_data = [[Paragraph("<b>Recommended Action</b>", bold_style), Paragraph("<b>Why It Matters</b>", bold_style), Paragraph("<b>Expected Output</b>", bold_style)]]
        for rec in recommendations[:4]:
            rec_data.append([
                Paragraph(f"<b>{rec.get('title', '')}</b>", bold_style),
                Paragraph(rec.get('why_it_matters', ''), body_style),
                Paragraph(rec.get('expected_output', ''), body_style)
            ])
        t_rec = Table(rec_data, colWidths=[150, 230, 160])
        t_rec.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F0FDF4')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#DCFCE7')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t_rec)
        story.append(Spacer(1, 14))

    # Data Quality Report
    issues = schema_profile.get("issues", [])
    if issues:
        story.append(Paragraph("Data Quality & Hygiene Audit", section_heading))
        iss_data = [[Paragraph("<b>Column</b>", bold_style), Paragraph("<b>Severity</b>", bold_style), Paragraph("<b>Issue</b>", bold_style), Paragraph("<b>Action</b>", bold_style)]]
        for iss in issues[:6]:
            sev_color = '#DC2626' if iss['severity'] == 'High' else ('#D97706' if iss['severity'] == 'Medium' else '#2563EB')
            iss_data.append([
                Paragraph(iss.get("column", ""), bold_style),
                Paragraph(f"<font color='{sev_color}'><b>{iss.get('severity', '')}</b></font>", bold_style),
                Paragraph(iss.get("message", ""), body_style),
                Paragraph(iss.get("recommendation", ""), body_style)
            ])
        t_iss = Table(iss_data, colWidths=[100, 70, 210, 160])
        t_iss.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#FEF2F2')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#FEE2E2')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_iss)

    # Footer note
    story.append(Spacer(1, 20))
    story.append(Paragraph("<i>Report generated automatically by SheetSense AI. All calculations are deterministically verified against uploaded data source.</i>", subtitle_style))

    doc.build(story)
    return buffer.getvalue()
