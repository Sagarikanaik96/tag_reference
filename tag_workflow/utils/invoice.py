import frappe
from frappe import _
import datetime
from dateutil.relativedelta import relativedelta
from frappe.model.mapper import get_mapped_doc

start = datetime.datetime.now().date() + relativedelta(day=1)
end = datetime.datetime.now().date() + relativedelta(day=31)

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
        invoice = frappe.db.sql(""" select grand_total from `tabSales Invoice` where docstatus = 1 and company = %s and posting_date between %s and %s """,(source, start, end), as_dict=1)

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

    customer = customer_doc(company)
    doclist = make_invoice(source_name, target_doc)
    update_item(company, source_name, doclist, target_doc)
    set_missing_values(source_name, doclist, customer=customer, ignore_permissions=ignore_permissions)
    return doclist

@frappe.whitelist()
def make_invoice(source_name, target_doc=None):
    try:
        company = frappe.db.get_value("User", frappe.session.user, "company") or "TAG"
        invoice_list = frappe.db.sql(""" select name from `tabSales Invoice` where docstatus = 1 and company = %s and posting_date between %s and %s """,(source_name, start, end), as_dict=1)
        if(len(invoice_list) <= 0):
            frappe.msgprint(_("No Invoice found for <b>{0}</b> for current month").format(source_name))
            return 0
        else:
            return make_sales_invoice(source_name, company)
    except Exception as e:
        print(e)
        frappe.msgprint(frappe.get_traceback())
