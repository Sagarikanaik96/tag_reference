# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe
from frappe.utils import user
from frappe.share import add
from tag_workflow.utils.notification import sendmail
from tag_workflow.utils.notification import make_system_notification
from frappe.model.document import Document
from datetime import datetime
import json
from frappe import _
from frappe.model.mapper import get_mapped_doc

class JobOrder(Document):
    pass

#-----------------#
ORD = "Job Order"
item = "Timesheet Activity Cost"
payment = "Payment Schedule"
taxes= "Sales Taxes and Charges"
team = "Sales Team"

@frappe.whitelist()
def joborder_notification(organizaton,doc_name,company,job_title,posting_date,job_site=None):
    sql = '''select data from `tabVersion` where docname = "{}" '''.format(doc_name)
    change = frappe.db.sql(sql, as_dict= True)
    if len(change) > 2:
        sql = ''' select data from `tabVersion` where docname='{}' order by modified DESC'''.format(doc_name)
        data=frappe.db.sql(sql, as_list=1)
        new_data=json.loads(data[0][0])
        if(new_data['changed'][0][0]=='no_of_workers'):
            msg = 'The number of employees requested for '+doc_name+' on '+str(datetime.now())+' has been modified. '
            is_send_mail_required(organizaton,doc_name,msg)
        else:
            msg = f'{company} has updated details for {job_title} work order at {job_site} for {posting_date}. Please review work order details.'
            is_send_mail_required(organizaton,doc_name,msg)

def is_send_mail_required(organizaton,doc_name,msg):
    try:
        staffing = organizaton.split(',')
        staffing_list = []
        for name in staffing:
            sql = '''select name from `tabUser` where company = "{}"'''.format(name.strip())
            staffing_name = frappe.db.sql(sql, as_list = True) 
            for value in staffing_name:
                staffing_list.append(value[0])
                subject = 'Job Order Notification'
        if staffing_list:
            make_system_notification(staffing_list, message = msg, doctype = ORD, docname =  doc_name, subject = subject)
            sendmail(emails = staffing_list, message = msg, subject = subject, doctype = ORD, docname = doc_name)
    except Exception as e:
        frappe.log_error(e, "Job Order Notification Error")
        frappe.throw(e)


@frappe.whitelist()
def get_jobtitle_list(doctype, txt, searchfield, page_len, start, filters):
    company=filters.get('job_order_company')
    if company is None:
        return None
    else:
        sql = ''' select job_titles from `tabJob Titles` where parent = '{0}' '''.format(company)
        return frappe.db.sql(sql)

@frappe.whitelist()
def update_joborder_rate_desc(company = None,job = None):
    if job is None or company is None:
        return None

    sql = ''' select wages,description from `tabJob Titles` where parent = "{}" and job_titles = "{}"'''.format(company, job)
    org_detail = frappe.db.sql(sql, as_dict=True)
    if org_detail:
        return org_detail[0]

@frappe.whitelist()
def after_denied_joborder(staff_company,joborder_name,job_title,hiring_name):
    sql = '''select email from `tabUser` where organization_type='staffing' and company != "{}"'''.format(staff_company)
    share_list = frappe.db.sql(sql, as_list=True)
    sql1 = ''' select email from `tabUser` where organization_type = 'hiring' and company = "{}"'''.format(hiring_name)
    hiring_list = frappe.db.sql(sql1,as_list=True)
    hiring_user_list = [user[0] for user in hiring_list]

    
    if share_list:
        for user in share_list:
            add(ORD, joborder_name, user[0], read=1,write=0, share=1, everyone=0, notify=0,flags={"ignore_share_permission": 1})

    try:
        jb_ord = frappe.get_doc(ORD,joborder_name)
        jb_ord.is_single_share = 0
        jb_ord.save(ignore_permissions = True)
        subject = 'Job Order Notification'
        msg=f'{staff_company} placed unable to fulfill claim on your work order: {job_title}.'
        make_system_notification(hiring_user_list,msg,ORD,joborder_name,subject)   
        sendmail(emails = hiring_user_list, message = msg, subject = subject, doctype = ORD, docname = joborder_name)
        
    except Exception as e:
        frappe.log_error(e,'job order not found')
	

#-----------------------------------#
def set_missing_values(source, target, customer=None, ignore_permissions=True):
    if customer:
        target.customer = customer.name
        target.customer_name = customer.customer_name
    target.ignore_pricing_rule = 1
    target.flags.ignore_permissions = ignore_permissions
    target.run_method("set_missing_values")
    target.run_method("calculate_taxes_and_totals")

def make_sales_invoice(source_name, company, emp_list, emp_sql,target_doc=None, ignore_permissions=True):
    def customer_doc(source_name):
        return frappe.get_doc("Customer", {"name": source_name})

    def update_timesheet(company, source, doclist, target, emp_list,emp_sql):
        income_account, cost_center, default_expense_account = frappe.db.get_value("Company", company, ["default_income_account", "cost_center", "default_expense_account"])
        total_amount = 0
        total_hours = 0
        sql = """ select name from `tabTimesheet` where job_order_detail = '{0}' and docstatus = 1 and employee in ({1}) """.format(source, emp_sql)
        timesheet = frappe.db.sql(sql, as_dict=1)

        for time in timesheet:
            sheet = frappe.get_doc("Timesheet", {"name": time.name})
            total_amount += sheet.total_billable_amount
            total_hours += sheet.total_billable_hours

            for logs in sheet.time_logs:
                activity = {"activity_type": logs.activity_type, "billing_amount": logs.billing_amount, "billing_hours": logs.billing_hours, "time_sheet": logs.parent, "from_time": logs.from_time, "to_time": logs.to_time, "description": sheet.employee,"employee_name":sheet.employee_name,'is_dnr':sheet.dnr,"overtime_rate":logs.extra_rate,"overtime_hours":logs.extra_hours}
                doclist.append("timesheets", activity)

        doclist.total_billing_amount = total_amount
        doclist.total_billing_hours = total_hours
        timesheet_item = {"item_name": "Service", "description": "Service", "uom": "Nos", "qty": 1, "stock_uom": "Nos", "conversion_factor": 1, "stock_qty": 1, "rate": total_amount, "amount": total_amount, "income_account": income_account, "cost_center": cost_center, "default_expense_account": default_expense_account}
        doclist.append("items", timesheet_item)
        doclist.company = company

    def make_invoice(source_name, target_doc):
        return get_mapped_doc(ORD, source_name, {
            ORD: {"doctype": "Sales Invoice", "validation": {"docstatus": ["=", 0]}},
            taxes: {"doctype": taxes, "add_if_empty": True},
            team: {"doctype": team, "add_if_empty": True},
            payment: {"doctype": payment,"add_if_empty": True}
        }, target_doc, set_missing_values, ignore_permissions=ignore_permissions)

    customer = customer_doc(company)
    doclist = make_invoice(source_name, target_doc)
    update_timesheet(company, source_name, doclist, target_doc, emp_list,emp_sql)
    set_missing_values(source_name, doclist, customer=customer, ignore_permissions=ignore_permissions)
    return doclist

#--------invoice-------#
@frappe.whitelist()
def make_invoice(source_name, target_doc=None):
    try:
        company = frappe.db.get_value("User", frappe.session.user, "company")
        emp_sql = """ select name from `tabEmployee` where company = '{0}' """.format(company)
        emp_list = frappe.db.sql(emp_sql)

        len_sql = """ select name from `tabTimesheet` where job_order_detail = '{0}' and employee in ({1}) """.format(source_name, emp_sql)
        if(len(frappe.db.sql(len_sql, as_dict=1)) <= 0):
            frappe.msgprint(_("No Timesheet found for this Job Order(<b>{0}</b>)").format(source_name))
        else:
            return prepare_invoice(company, source_name, emp_list,emp_sql)
    except Exception as e:
        frappe.msgprint(frappe.get_traceback())
        frappe.log_error(e, 'make_invoice')

def prepare_invoice(company, source_name, emp_list,emp_sql):
    try:
        return make_sales_invoice(source_name, company, emp_list,emp_sql, target_doc=None)
    except Exception as e:
        frappe.msgprint(frappe.get_traceback())
        frappe.log_error(e, 'make_invoice')

@frappe.whitelist()
def make_notes(company):
    try:
        doc=frappe.get_doc("Company",company)
        l=[doc.drug_screen,doc.background_check,doc.shovel,doc.mvr]
        return l
    except Exception as e:
        frappe.msgprint(frappe.get_traceback())
        frappe.log_error(e, 'job order company')
