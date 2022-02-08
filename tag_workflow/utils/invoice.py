from calendar import month
import frappe
from frappe import _
import datetime
from dateutil.relativedelta import relativedelta
from frappe.model.mapper import get_mapped_doc

start = datetime.datetime.now().date() + relativedelta(day=1)
end = datetime.datetime.now().date() + relativedelta(day=31)
time_format = " 12:00:00"

#-----------------#
COM = "Company"
payment = "Payment Schedule"
taxes= "Sales Taxes and Charges"
team = "Sales Team"

#-----------------------------------#
def set_missing_values(source, target, customer=None, ignore_permissions=True):
    if customer:
        target.customer = customer.name
        target.customer_name = customer.customer_name
    target.ignore_pricing_rule = 1
    target.flags.ignore_permissions = ignore_permissions
    target.run_method("set_missing_values")
    target.run_method("calculate_taxes_and_totals")

def make_sales_invoice(source_name, company, target_doc=None, ignore_permissions=True):
    def customer_doc(source_name):
        return frappe.get_doc("Customer", {"name": source_name})

    def update_item(company, source, doclist, target):
        total_amount = 0
        
        income_account, cost_center, default_expense_account, tag_charges = frappe.db.get_value("Company", company, ["default_income_account", "cost_center", "default_expense_account", "tag_charges"])

        sql = """ select grand_total from `tabSales Invoice` where docstatus = 1 and company = '{0}' and posting_date between '{1}' and '{2}' """.format(source, start, end)
        invoice = frappe.db.sql(sql, as_dict=1)

        for inv in invoice:
            total_amount += (inv.grand_total * tag_charges)/100
        
        item = {"item_name": "Service charges for "+str(source), "description": "Service", "uom": "Nos", "qty": 1, "stock_uom": "Nos", "conversion_factor": 1, "stock_qty": 1, "rate": total_amount, "amount": total_amount, "income_account": income_account, "cost_center": cost_center, "default_expense_account": default_expense_account}
        doclist.append("items", item)

    def make_invoice(source_name, target_doc):
        return get_mapped_doc(COM, source_name, {
            COM: {"doctype": "Sales Invoice", "validation": {"docstatus": ["=", 0]}},
            taxes: {"doctype": taxes, "add_if_empty": True},
            team: {"doctype": team, "add_if_empty": True},
            payment: {"doctype": payment,"add_if_empty": True}
        }, target_doc, set_missing_values, ignore_permissions=ignore_permissions)

    customer = customer_doc(source_name)
    doclist = make_invoice(source_name, target_doc)
    doclist.company = company
    update_item(company, source_name, doclist, target_doc)
    set_missing_values(source_name, doclist, customer=customer, ignore_permissions=ignore_permissions)
    return doclist

@frappe.whitelist()
def make_invoice(source_name, target_doc=None):
    try:
        company = frappe.db.get_value("User", frappe.session.user, "company") or "TAG"
        sql = """ select name from `tabSales Invoice` where docstatus = 1 and company = '{0}' and posting_date between '{1}' and '{2}' """.format(source_name, start, end)
        invoice_list = frappe.db.sql(sql, as_dict=1)
        if(len(invoice_list) <= 0):
            frappe.msgprint(_("No Invoice found for <b>{0}</b> for current month").format(source_name))
            return 0
        else:
            return make_sales_invoice(source_name, company)
    except Exception as e:
        print(e)
        frappe.msgprint(frappe.get_traceback())


#--------------
@frappe.whitelist()
def make_month_invoice(frm):
    import json
    frm_value = json.loads(frm)
    months = {"January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,"July": 7, "August": 8, "September": 10, "October": 10, "November": 11, "December": 12}
    
    date = frm_value['month']
    year = frm_value['year']
    company = frm_value['company']
    get_month_digit = months[date]
# get previous month start date and end date
    current_month_str = str(year)+'-'+str(get_month_digit)+'-'+'01' 
    current_date = frappe.utils.getdate(current_month_str)
    previous_month = frappe.utils.add_months(current_date, months=-1)
    first_day = frappe.utils.get_first_day(previous_month)
    last_day = frappe.utils.get_last_day(first_day)
    
    tag_company = frappe.db.get_value("User", frappe.session.user, "company") or "TAG"
    
    sql1 =  f""" select month,year from `tabSales Invoice` where docstatus = 1 and company = '{tag_company}' and month = '{date}' and  year = '{year}'"""
    invoice_check_list = frappe.db.sql(sql1,as_dict=1)
    
    sql = f""" select name from `tabSales Invoice` where docstatus = 1 and company = '{company}' and posting_date between '{first_day}{time_format}' and '{last_day}{time_format}' """
    invoice_list = frappe.db.sql(sql, as_dict=1)

    if(len(invoice_list) <= 0):
        frappe.msgprint(_("No Invoice found for <b>{0}</b> for current month").format(company))
        return 0
    elif invoice_check_list:
        frappe.msgprint(_("Monthly Invoice is already created for this Month"))
        return 0
    else:
        return create_month_sales_invoice(company, tag_company,date,year,first_day,last_day)



def create_month_sales_invoice(source_name, company,month,year,first_day,last_day, target_doc=None, ignore_permissions=True):
    def customer_doc(source_name):
        return frappe.get_doc("Customer", {"name": source_name})

    def update_item(company, source, doclist, target):
        total_amount = 0
        
        income_account, cost_center, default_expense_account, tag_charges = frappe.db.get_value("Company", company, ["default_income_account", "cost_center", "default_expense_account", "tag_charges"])

        sql = """ select grand_total from `tabSales Invoice` where docstatus = 1 and company = '{0}' and posting_date between '{1}' and '{2}' """.format(source, start, end)
        invoice = frappe.db.sql(sql, as_dict=1)

        for inv in invoice:
            total_amount += (inv.grand_total * tag_charges)/100
        
        item = {"item_name": "Service charges for "+str(source), "description": "Service", "uom": "Nos", "qty": 1, "stock_uom": "Nos", "conversion_factor": 1, "stock_qty": 1, "rate": total_amount, "amount": total_amount, "income_account": income_account, "cost_center": cost_center, "default_expense_account": default_expense_account}
        doclist.append("items", item)

    def update_salesinvoice_list(company, doclist, target,first_day,last_day):
        sql = f""" select name,company,job_order,total_billing_hours,total_billing_amount from `tabSales Invoice` where docstatus = 1 and company = '{company}' and posting_date between '{first_day}{time_format}' and '{last_day}{time_format}' """
        salesinvoice_data = frappe.db.sql(sql, as_dict=True)

        for d in salesinvoice_data:
            if d.job_order:
                joborder = frappe.db.sql(f'''select company,select_job,from_date,to_date,rate from `tabJob Order` where name = "{d.job_order}"''', as_dict=True)
            
                activity = {"sales_invoice_id":d.name,"job_order_id":d.job_order,"start_date":joborder[0].from_date,"end_date":joborder[0].to_date,"job_title":joborder[0].select_job,"total_hours":d.total_billing_hours,"total_rate":d.rate,"total_amount":d.total_billing_amount}
                doclist.append("sales_invoice_data", activity)

    def make_invoice(source_name, target_doc):
        return get_mapped_doc(COM, source_name, {
            COM: {"doctype": "Sales Invoice", "validation": {"docstatus": ["=", 0]}},
            taxes: {"doctype": taxes, "add_if_empty": True},
            team: {"doctype": team, "add_if_empty": True},
            payment: {"doctype": payment,"add_if_empty": True}
        }, target_doc, set_missing_values, ignore_permissions=ignore_permissions)

    customer = customer_doc(source_name)
    doclist = make_invoice(source_name, target_doc)

    doclist.company = company
    doclist.month = month
    doclist.year = year

    update_item(company, source_name, doclist, target_doc)
    update_salesinvoice_list(source_name, doclist, target_doc,first_day,last_day)
    set_missing_values(source_name, doclist, customer=customer, ignore_permissions=ignore_permissions)
    doclist.save()
    doclist.submit()
    return doclist.name
