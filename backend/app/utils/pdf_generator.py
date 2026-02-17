from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
from datetime import datetime

def format_date(date_value):
    """Safely format date string"""
    if date_value is None:
        return 'N/A'
    
    try:
        # Convert to string first
        date_str = str(date_value)
        
        # Handle ISO format with or without time
        if 'T' in date_str:
            date_str = date_str.split('T')[0]
        
        # Parse and format
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return date_obj.strftime('%B %d, %Y')
    except Exception as e:
        # Return the original value as string if parsing fails
        return str(date_value) if date_value else 'N/A'

def generate_invoice_pdf(sale_data: dict, company_data: dict) -> BytesIO:
    """Generate PDF for invoice or credit note"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a202c'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#2d3748'),
        spaceAfter=12,
    )
    
    normal_style = styles["Normal"]
    
    # Determine document type
    doc_type = "CREDIT NOTE" if sale_data.get('sale_type') == 'credit_note' else "INVOICE"
    
    # Title
    title = Paragraph(f"<b>{doc_type}</b>", title_style)
    elements.append(title)
    elements.append(Spacer(1, 12))
    
    # Format sale date
    formatted_date = format_date(sale_data.get('sale_date'))
    
    # Company and customer info side by side
    info_data = [
        [Paragraph(f"<b>{company_data.get('name', 'Company Name')}</b>", normal_style), 
         Paragraph(f"<b>{doc_type} #:</b> {sale_data.get('sale_number')}", normal_style)],
        [Paragraph(company_data.get('address', ''), normal_style),
         Paragraph(f"<b>Date:</b> {formatted_date}", normal_style)],
        ['', ''],
        [Paragraph(f"<b>Bill To:</b>", heading_style), ''],
        [Paragraph(f"<b>{sale_data.get('customer', {}).get('name', 'Customer')}</b>", normal_style), ''],
        [Paragraph(sale_data.get('customer', {}).get('email', ''), normal_style), ''],
        [Paragraph(sale_data.get('customer', {}).get('phone', ''), normal_style), ''],
    ]
    
    info_table = Table(info_data, colWidths=[3*inch, 3*inch])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 24))
    
    # Items table
    items_data = [['Product', 'Quantity', 'Unit Price', 'Discount', 'Total']]
    
    for item in sale_data.get('items', []):
        variant = item.get('product_variant', {})
        product_name = variant.get('products', {}).get('name', 'Product')
        variant_name = variant.get('variant_name', '')
        full_name = f"{product_name} - {variant_name}" if variant_name else product_name
        
        items_data.append([
            Paragraph(full_name, normal_style),
            str(item.get('quantity', 0)),
            f"KES {item.get('unit_price', 0):,.2f}",
            f"{item.get('discount_percentage', 0)}%" if item.get('discount_percentage', 0) > 0 else '-',
            f"KES {item.get('line_total', 0):,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[3*inch, 0.8*inch, 1.2*inch, 0.8*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 24))
    
    # Totals
    totals_data = [
        ['Subtotal:', f"KES {sale_data.get('subtotal', 0):,.2f}"],
    ]
    
    if sale_data.get('discount_percentage', 0) > 0:
        totals_data.append([
            f"Discount ({sale_data.get('discount_percentage', 0)}%):",
            f"- KES {sale_data.get('discount_amount', 0):,.2f}"
        ])
    
    totals_data.append(['<b>Total:</b>', f"<b>KES {sale_data.get('total_amount', 0):,.2f}</b>"])
    totals_data.append(['<b>Amount Paid:</b>', f"<b>KES {sale_data.get('amount_paid', 0):,.2f}</b>"])
    totals_data.append(['<b>Amount Due:</b>', f"<b>KES {sale_data.get('amount_due', 0):,.2f}</b>"])
    
    # Convert to Paragraphs
    totals_data_formatted = []
    for row in totals_data:
        totals_data_formatted.append([
            Paragraph(row[0], normal_style),
            Paragraph(row[1], normal_style)
        ])
    
    totals_table = Table(totals_data_formatted, colWidths=[4.5*inch, 1.5*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('LINEABOVE', (0, -3), (-1, -3), 1, colors.black),
        ('LINEABOVE', (0, -2), (-1, -2), 1, colors.black),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 24))
    
    # Payment history if exists
    if sale_data.get('payments') and len(sale_data.get('payments', [])) > 0:
        elements.append(Paragraph("<b>Payment History</b>", heading_style))
        elements.append(Spacer(1, 12))
        
        payment_data = [['Date', 'Method', 'Reference', 'Amount']]
        for payment in sale_data.get('payments', []):
            payment_data.append([
                format_date(payment.get('payment_date')),
                payment.get('payment_method', '').upper(),
                payment.get('reference_number', '-'),
                f"KES {payment.get('amount', 0):,.2f}"
            ])
        
        payment_table = Table(payment_data, colWidths=[1.5*inch, 1.2*inch, 1.8*inch, 1.5*inch])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(payment_table)
        elements.append(Spacer(1, 24))
    
    # Notes
    if sale_data.get('notes'):
        elements.append(Paragraph("<b>Notes:</b>", heading_style))
        elements.append(Paragraph(sale_data.get('notes', ''), normal_style))
        elements.append(Spacer(1, 24))
    
    # Footer
    elements.append(Spacer(1, 36))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#718096'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph("Thank you for your business!", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer