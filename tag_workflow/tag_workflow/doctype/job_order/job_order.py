# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe
from frappe.utils import user
from frappe.share import add
from tag_workflow.tag_data import hiring_org_name
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
            now = datetime.now()
            dt_string = now.strftime("%d/%m/%Y %H:%M")
            msg = 'The number of employees requested for '+doc_name+' on '+dt_string+' has been modified. '
            is_send_mail_required(organizaton,doc_name,msg)
        else:
            msg = f'{company} has updated details for {job_title} work order at {job_site} for {posting_date}. Please review work order details.'
            is_send_mail_required(organizaton,doc_name,msg)

def is_send_mail_required(organizaton,doc_name,msg):
    try:
        staffing = organizaton.split(',')
        staffing_list = []
        for name in staffing:
            sql = '''select user_id from `tabEmployee` where company = "{}" and user_id IS NOT NULL '''.format(name.strip())
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
    category=filters.get('job_category')
    if company is None:
        return None
    else:
        sql = ''' select job_titles from `tabJob Titles` where parent = '{0}' and  industry_type='{1}' '''.format(company,category)
        return frappe.db.sql(sql)

@frappe.whitelist()
def get_jobtitle_list_page(doctype, txt, searchfield, page_len, start, filters):
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
    if frappe.db.exists("Company",company):
        company = frappe.get_doc("Company", {"name": company})
    
    for i in company.job_titles:
        if i.job_titles == job:
            return {"description":i.description,"rate":i.wages}
    return None
   

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
        msg=f'{staff_company} unable to fulfill claim on your work order: {job_title}.'
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

def make_sales_invoice(source_name, company, emp_sql,target_doc=None, ignore_permissions=True):
    def customer_doc(source_name):
        return frappe.get_doc("Customer", {"name": source_name})

    def update_timesheet(company, source, doclist,emp_sql):
        income_account, cost_center, default_expense_account,creater_company,creater_city,creater_state,creater_zip = frappe.db.get_value("Company", company, ["default_income_account", "cost_center", "default_expense_account","address","city","state","zip"])
        total_amount = 0
        total_hours = 0
        hiring_org_name,job_title= frappe.db.get_value(ORD,source,["company","select_job"])
        for_company,for_company_city,for_company_state,for_company_zip = frappe.db.get_value("Company",hiring_org_name,["address","city","state","zip"])
        sql = """ select name,no_show,non_satisfactory,dnr from `tabTimesheet` where job_order_detail = '{0}' and docstatus = 1 and employee in ({1}) and is_check_in_sales_invoice = 0 """.format(source, emp_sql)
        timesheet = frappe.db.sql(sql, as_dict=1)

        for time in timesheet:
            try:
                add("Timesheet", time.name, user=frappe.session.user, read=1, write=1, submit=1, notify=0, flags={"ignore_share_permission": 1})
            except Exception:
                continue

            sheet = frappe.get_doc("Timesheet", {"name": time.name}, ignore_permissions=True)
            if time.no_show == 1:
                total_amount += 0
                total_hours += 0
            else:
                total_amount += sheet.total_billable_amount
                total_hours += sheet.total_billable_hours

            doclist = update_time_timelogs(sheet,doclist,time)
        doclist.total_billing_amount = total_amount
        doclist.total_billing_hours = total_hours
        # for company detail
        doclist.creater_company = creater_company
        doclist.creater_city = creater_city
        doclist.creater_state = creater_state
        doclist.creater_zip = creater_zip
        # for receiver deatils
        doclist.for_company = for_company
        doclist.for_company_city = for_company_city
        doclist.for_company_state = for_company_state
        doclist.for_company_zip = for_company_zip

        timesheet_item = {"item_code":"", "item_name": job_title, "description": "Service", "uom": "Nos", "qty": 1, "stock_uom": "Nos", "conversion_factor": 1, "stock_qty": 1, "rate": total_amount, "amount": total_amount, "income_account": income_account, "cost_center": cost_center, "default_expense_account": default_expense_account}
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
    update_timesheet(company, source_name, doclist,emp_sql)
    set_missing_values(source_name, doclist, customer=customer, ignore_permissions=ignore_permissions)
    hiring_org_name = frappe.db.get_value(ORD,source_name,["company"])
    doclist.customer = hiring_org_name

    return doclist

def update_time_timelogs(sheet,doclist,time):
    for logs in sheet.time_logs:
        status = '-'
        if sheet.no_show:
            status = 'No Show'
        elif sheet.non_satisfactory:
            status = 'Non Satisfactory'
        elif sheet.dnr:
            status = 'DNR'


        if time.no_show == 1:
            # add zero all value in time sheet in invoice
            activity = {"activity_type": logs.activity_type, "billing_amount": 0, "billing_hours": 0, "time_sheet": logs.parent, "from_time": 0, "to_time": 0, "description": sheet.employee,"employee_name":sheet.employee_name,'status':status,"overtime_rate":0,"overtime_hours":0,"per_hour_rate1":0}
        else:
            activity = {"activity_type": logs.activity_type, "billing_amount": logs.billing_amount, "billing_hours": logs.billing_hours, "time_sheet": logs.parent, "from_time": logs.from_time, "to_time": logs.to_time, "description": sheet.employee,"employee_name":sheet.employee_name,'status':status,"overtime_rate":logs.extra_rate,"overtime_hours":logs.extra_hours,"per_hour_rate1":logs.billing_rate}
        doclist.append("timesheets", activity)
    return doclist


#--------invoice-------#
@frappe.whitelist()
def make_invoice(source_name, target_doc=None):
    try:
        company = frappe.db.get_value("User", frappe.session.user, "company")
        emp_sql = """ select name from `tabEmployee` where company = '{0}' """.format(company)
        # check if timesheet already in sales invoice and timesheet submitted
        len_sql = """ select name from `tabTimesheet` where job_order_detail = '{0}' and docstatus = 1 and employee in ({1}) and is_check_in_sales_invoice = 0 """.format(source_name, emp_sql)
     
        if(len(frappe.db.sql(len_sql, as_dict=1)) <= 0):
            frappe.msgprint(_("Either Invoice For Timesheet OR No Timesheet found for this Job Order(<b>{0}</b>)").format(source_name))
        else:
            return prepare_invoice(company, source_name,emp_sql)
    except Exception as e:
        frappe.msgprint(frappe.get_traceback())
        frappe.log_error(e, 'make_invoice')

def prepare_invoice(company, source_name,emp_sql):
    try:
        return make_sales_invoice(source_name, company,emp_sql, target_doc=None)
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


@frappe.whitelist()
def get_company_details(comp_name):
    try:
        sql = ''' select name ,organization_type, address,state ,city ,phone_no from `tabCompany` where name = "{0}"'''.format(comp_name)
        company_value = frappe.db.sql(sql,as_dict=True)
        if company_value:
            return company_value[0]
    except Exception as e:
        frappe.log_error(e, 'Job order list')
        return []
    

@frappe.whitelist(allow_guest=False)
def get_joborder_value(user, company_type, name):
    try:
        if(company_type and company_type in ["Staffing", "Hiring", "TAG", "Exclusive Hiring"] and frappe.session.user and user and user == frappe.session.user and name):
            sql = ''' select name,category,from_date,to_date,select_job,job_order_duration,job_site,no_of_workers,rate from `tabJob Order` where name = "{0}" '''.format(name)
            value = frappe.db.sql(sql,as_dict=True)
            if value:
                return value[0]
        else:
            return "No Access"
    except Exception as e:
        print(e)
        frappe.log_error(str(e)+','+name+',session user-'+frappe.session.user+','+company_type+',user-'+user, 'Job order list popup')
        return 'error_occur'
@frappe.whitelist()
def selected_days(doctype, txt, searchfield, page_len, start, filters):
   days="select name from `tabDays` order by creation desc"
   data=frappe.db.sql(days)
   return data

@frappe.whitelist(allow_guest=False)
def order_details():
    current_user=frappe.session.user
    sql=f'''select distinct company from `tabJob Order` where name in (select distinct share_name from `tabDocShare` where user='{current_user}' and share_doctype='Job Order') '''
    dat=frappe.db.sql(sql,as_dict=1)
    company_data = [c['company'] for c in dat]
    comp_dat="\n".join(company_data)
    return comp_dat

@frappe.whitelist(allow_guest=False)
def data_deletion(job_order):
    try:
        sales_invoice_date=f"select name from `tabSales Invoice` where job_order='{job_order}' "
        invoice=frappe.db.sql(sales_invoice_date,as_list=True)
        if len(invoice)>0:
            for i in invoice:
                del_data=f'''DELETE FROM `tabSales Invoice` where name="{i[0]}" '''
                frappe.db.sql(del_data)
                frappe.db.commit()
        timesheet_data=f"select name from `tabTimesheet` where job_order_detail='{job_order}'"
        timesheet=frappe.db.sql(timesheet_data,as_list=True)
        if len(timesheet)>0:
            for i in timesheet:
                del_data=f'''DELETE FROM `tabTimesheet` where name="{i[0]}" '''
                frappe.db.sql(del_data)
                frappe.db.commit()
        assigned_emp=f"select name from `tabAssign Employee` where job_order='{job_order}'"
        assign_emp=frappe.db.sql(assigned_emp,as_list=True)
        if len(assign_emp)>0:
            for i in assign_emp:
                del_data=f'''DELETE FROM `tabAssign Employee` where name="{i[0]}" '''
                frappe.db.sql(del_data)
                frappe.db.commit()
        claim_order=f"select name from `tabClaim Order` where job_order='{job_order}'"
        claims=frappe.db.sql(claim_order,as_list=True)
        if len(claims)>0:
            for i in claims:
                del_data=f'''DELETE FROM `tabClaim Order` where name="{i[0]}" '''
                frappe.db.sql(del_data)
                frappe.db.commit()
        del_data=f'''DELETE FROM `tabJob Order` where name="{job_order}" '''
        frappe.db.sql(del_data)
        frappe.db.commit()
        return 'success'
    except Exception as e:
        frappe.log_error(e, 'Some Deletion error')

@frappe.whitelist()
def get_industry_type_list(doctype, txt, searchfield, page_len, start, filters):
    company=filters.get('job_order_company')
    if company is None:
        return None
    else:
        sql = ''' select industry_type from `tabIndustry Types` where parent = '{0}' '''.format(company)
        return frappe.db.sql(sql)