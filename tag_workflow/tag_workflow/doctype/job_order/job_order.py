# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe
from frappe.utils import user
from frappe.share import add
from tag_workflow.tag_data import hiring_org_name,joborder_email_template,chat_room_created,job_order_notification
from tag_workflow.utils.notification import sendmail
from tag_workflow.utils.notification import make_system_notification
from frappe.model.document import Document
from datetime import datetime
import json
from frappe import _
from frappe.model.mapper import get_mapped_doc

#-----------------#
ORD = "Job Order"
item = "Timesheet Activity Cost"
payment = "Payment Schedule"
taxes= "Sales Taxes and Charges"
team = "Sales Team"
ASN = "Assign Employee"
CLM = "Claim Order"

site= frappe.utils.get_url().split('/')
sitename=site[0]+'//'+site[2]
class JobOrder(Document):
    def after_insert(self):
        self.check_assign()

    def check_assign(self):
        if(self.is_repeat == 1 and self.repeat_staff_company and self.repeat_from and self.is_direct == 1 and self.repeat_staff_company == self.staff_company):
            selected_companies=self.repeat_staff_company.strip()
            staff_selected_companies=selected_companies.split(',')
            frappe.db.set_value(ORD, self.name, "claim", selected_companies)
            frappe.db.set_value(ORD, self.name, "staff_org_claimed", selected_companies)
            frappe.db.set_value(ORD, self.name, "bid", len(staff_selected_companies))
            worker_filled=0
            for comp in staff_selected_companies:
                comp=comp.strip()
                if(frappe.db.exists(ASN, {"job_order": self.repeat_from, "company": comp, "tag_status": "Approved"})):
                    old_assign = frappe.get_doc(ASN, {"job_order": self.repeat_from, "company": comp, "tag_status": "Approved"})
                    new_doc = frappe.copy_doc(old_assign)
                    new_doc.tag_status = "Open"
                    new_doc.job_order= self.name
                    meta = frappe.get_meta(ASN)
                    for field in meta.get_link_fields():
                        field.ignore_user_permissions=1
                    new_doc.flags.ignore_permissions = True
                    new_doc.save(ignore_permissions=True)
                    worker_filled=len(new_doc.employee_details)+worker_filled
                    if(self.resumes_required==0):
                        dat=f'update `tabAssign Employee` set tag_status="Approved" where name="{new_doc.name}"'
                        frappe.db.sql(dat)
                        frappe.db.commit()
                    self.assign_doc(new_doc.name, ASN,comp)
                    self.auto_email(new_doc,comp)

                self.check_claims(comp)
            frappe.db.set_value(ORD, self.name, "worker_filled", worker_filled)
            self.remaining_companies(self.staff_company,self.repeat_from,self.name,self.company,self.select_job)
    def check_claims(self,comp):
        if(frappe.db.exists(CLM, {"job_order": self.repeat_from, "staffing_organization": comp})):
            frappe.db.set_value(ORD, self.name, "claim", ","+comp)
            old_claim = frappe.get_doc(CLM, {"job_order": self.repeat_from, "staffing_organization": comp})
            new_claim = frappe.copy_doc(old_claim)
            new_claim.job_order = self.name
            new_claim.save(ignore_permissions=True)
            self.assign_doc(new_claim.name, CLM,comp)

    def assign_doc(self, name, doc_type,comp):
        stf_usr = frappe.db.get_list("Employee", {"company": comp, "user_id": ["not like", None]}, "user_id as name", ignore_permissions=1)
        hir_usr = frappe.db.get_list("User", {"company": self.company}, "name", ignore_permissions=1)
        usrs = hir_usr+stf_usr
        for u in usrs:
            add(doc_type, name, u.name, read=1, write = 1, share = 1, everyone = 0,flags={"ignore_share_permission": 1})

    def auto_email(self, new_doc,comp):
        emp = ""
        for e in new_doc.employee_details:
            emp += e.employee_name + ', '

        usr = frappe.db.get_list("User", {"company": self.company}, "name")
        usrs = [u.name for u in usr]

        sub = "Employee Assigned"
        msg = f'{comp} has submitted a claim for {emp[:-1]} for {self.select_job} at {self.job_site} on {self.posting_date_time}'
        make_system_notification(usrs, msg, ASN, new_doc.name, sub)
        msg = f'{comp} has submitted a claim for {emp[:-1]} for {self.select_job} at {self.job_site} on {self.posting_date_time}. Please review and/or approve this claim .'
        link = f'href="{sitename}/app/assign-employee/{new_doc.name}"'
        email_temp = joborder_email_template(sub, msg, usrs, link)
        print(email_temp)
        chat_room_created(self.company, comp, self.name)
    def remaining_companies(self,staff_company,repeat_job_order_name,new_order,hiring_company,job_title):
        old_staff_companies=frappe.get_doc(ORD,repeat_job_order_name)
        staff_selected_companies=old_staff_companies.staff_org_claimed.split(',')
        new_selected_companies=staff_company.split(',')
        if(len(staff_selected_companies)!=len(new_selected_companies)):
            comp_list=[c.strip() for c in staff_selected_companies]
            comp_list=tuple(comp_list)
            usr_sql = '''select email from `tabUser` where organization_type='staffing' and company not in {0} '''.format(comp_list)
            user_list = frappe.db.sql(usr_sql, as_list=1)
            l = [l[0] for l in user_list if l[0]!=frappe.session.user]
            for user in l:
                add(ORD, new_order, user, read=1, write = 0, share = 0, everyone = 0)
            subject="New Work Order"
            job_order_notification(job_title,hiring_company,new_order,subject,l)

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
        elif sheet.replaced:
            status = 'Replaced'

        if time.no_show == 1:
            # add zero all value in time sheet in invoice
            activity = {"activity_type": logs.activity_type, "billing_amount": 0, "billing_hours": 0, "time_sheet": logs.parent, "from_time": 0, "to_time": 0, "description": sheet.employee,"employee_name":sheet.employee_name,'status':status,"overtime_rate":0,"overtime_hours":0,"per_hour_rate1":0,'flat_rate':0}
        else:
            activity = {"activity_type": logs.activity_type, "billing_amount": logs.billing_amount, "billing_hours": logs.billing_hours, "time_sheet": logs.parent, "from_time": logs.from_time, "to_time": logs.to_time, "description": sheet.employee,"employee_name":sheet.employee_name,'status':status,"overtime_rate":logs.extra_rate,"overtime_hours":logs.extra_hours,"per_hour_rate1":logs.billing_rate,'flat_rate':logs.flat_rate}
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



@frappe.whitelist()
def get_redirect_doc(company, name):
    try:
        docname = frappe.db.get_value("Assign Employee", {"job_order": name, "company": ['in', tuple(json.loads(company))]}, "name")
        return docname
    except Exception as e:
        frappe.msgprint(e)
@frappe.whitelist()
def claim_data_list(job_order_name=None,exist_comp=None):
    try:
        data = []
        sql = """ select staff_org_claimed from `tabJob Order` where name='{0}' """.format(job_order_name)
        companies = frappe.db.sql(sql, as_dict=1)
        company=companies[0].staff_org_claimed
        data=company.split(",")
        comp_data=[]
        if exist_comp:
            for c in data:
                if c not in exist_comp:
                    comp_data.append(c)
        else:
            comp_data = [c for c in data]
        return "\n".join(comp_data)
    except Exception as e:
        print(e)
        return []

@frappe.whitelist()
def hiring_diff_status(job_order_name):
    doc=frappe.get_doc('Job Order',job_order_name)
    sql=f'select docstatus from `tabSales Invoice` where job_order="{job_order_name}"'
    invoice_comp_data=frappe.db.sql(sql,as_list=1)
    if(len(invoice_comp_data)>0 and doc.order_status=='Completed'):
        for i in invoice_comp_data:
            if i[0]==0:
                break
        else:
            return 'Completed'

    sql=f'select name from `tabSales Invoice` where job_order="{job_order_name}" and docstatus=1'
    invoice_data=frappe.db.sql(sql,as_list=1)
    if(len(invoice_data)>0):
        return 'Invoice'
    sql=f'select name from `tabTimesheet` where job_order_detail="{job_order_name}" and workflow_state="Denied" '
    timesheet_data=frappe.db.sql(sql,as_list=1)
    if(len(timesheet_data)>0):
        return 'Timesheet'

@frappe.whitelist()
def no_of_workers_changed(doc_name):
    change = frappe.db.sql('''SELECT data FROM `tabVersion` WHERE docname = "{0}"'''.format(doc_name), as_dict = True)
    if len(change) > 2:
        data = frappe.db.sql('''SELECT data FROM `tabVersion` WHERE docname = "{0}" ORDER BY modified DESC'''.format(doc_name), as_list = True)
        new_data = json.loads(data[0][0])
        if(new_data['changed'][0][0] == 'no_of_workers'):
            frappe.db.sql('''UPDATE `tabClaim Order` SET no_of_workers_joborder = "{0}" WHERE job_order = "{1}"'''.format(new_data['changed'][0][2], doc_name))
            frappe.db.commit()
            sql = '''SELECT name, no_of_workers_joborder, staff_claims_no FROM `tabClaim Order` WHERE job_order = "{0}"'''.format(doc_name)
            result = frappe.db.sql(sql, as_list = True)
            for i in result:
                if i[1] < i[2]:
                    frappe.db.sql('''UPDATE `tabClaim Order` SET staff_claims_no = "{0}" WHERE name = "{1}"'''.format(i[2]+(i[1]-i[2]), i[0]))
                    frappe.db.commit()
            change_assigned_emp(doc_name, new_data)

@frappe.whitelist()
def change_assigned_emp(doc_name, new_data=None):
    if new_data == None:
        data = frappe.db.sql('''SELECT data FROM `tabVersion` WHERE docname="{0}" ORDER BY modified DESC'''.format(doc_name), as_list = True)
        new_data = json.loads(data[0][0])
    if new_data['changed'][0][0] == 'no_of_workers':
        assign_emp = frappe.db.sql('''SELECT name FROM `tabAssign Employee` WHERE job_order="{0}"'''.format(doc_name), as_list=True)
        if len(assign_emp) > 0:
            for name in assign_emp:
                frappe.db.sql('''UPDATE `tabAssign Employee` SET no_of_employee_required = "{0}" WHERE name="{1}"'''.format(new_data['changed'][0][2],name[0]))
                frappe.db.commit()

@frappe.whitelist()
def claim_headcount(job_order):
    sql = '''SELECT approved_no_of_workers from `tabClaim Order` where job_order = "{0}"'''.format(job_order)
    res = frappe.db.sql(sql, as_list = True)
    return [element for innerList in res for element in innerList]

@frappe.whitelist()
def assigned_emp_comp(job_order):
    sql = '''SELECT company from `tabAssign Employee` where job_order = "{0}"'''.format(job_order)
    res = frappe.db.sql(sql, as_list = True)
    return [element for innerList in res for element in innerList]
@frappe.whitelist()
def check_order_already_exist(frm):    
    try:
        data=json.loads(frm)
        company=data['company']
        job_site=data['job_site']
        category=data['category']
        select_job=data['select_job']
        start_date=data['from_date']
        end_date=data['to_date']
        check_data_base=f'select name from `tabJob Order` where company="{company}" and job_site="{job_site}" and category="{category}" and select_job="{select_job}" and order_status!="Completed" and ((from_date between "{start_date}" and "{end_date}") or (to_date between "{start_date}" and "{end_date}")  )'
        data_exist=frappe.db.sql(check_data_base,as_dict=1)
        if(data_exist):
            l=[]
            for i in data_exist:
                l.append(i['name'])
            s = ", ".join(l)
            return l,s
        else:
            return 1
    except Exception as e:
        frappe.error_log(e,'Check same order') 
@frappe.whitelist()
def my_used_job_orders(company_name,status):
    my_aval_claims=[]
    unclaimed_noresume_by_company=[]
    if status=='All':
        my_claims,my_aval_claims,unclaimed_noresume_by_company=all_orders_data(company_name)
    elif status=='Available':
        unclaimed_resume_by_comp=f'select name from `tabJob Order` where (claim not like "%{company_name}%" or claim is Null) and order_status!="Completed" and resumes_required=1 and worker_filled!=no_of_workers'
        my_aval_claims=frappe.db.sql(unclaimed_resume_by_comp,as_list=1)
        my_claims=check_avail(company_name,unclaimed_noresume_by_company)
    else:
        l=f'select name from `tabJob Order` where claim like "%{company_name}%" and order_status="{status}"'
        my_claims=frappe.db.sql(l,as_list=1)
    z=[]
    for i in my_claims:
        z.append(i[0])
    if(len(my_aval_claims)>0):
        for i in my_aval_claims:
            z.append(i[0])
    if(len(unclaimed_noresume_by_company)>0):
        for i in unclaimed_noresume_by_company:
            z.append(i)
    return list(set(z)) 
@frappe.whitelist()
def claims_left(name,comp):
    data=frappe.get_doc(ORD,name)
    claims=data.claim
    if claims is not None and comp in claims:
        return "success"
    else:
        if(data.resumes_required==1):
            if(data.no_of_workers!=data.worker_filled):
                return data.no_of_workers-data.worker_filled
        else:
            claims=f'select sum(approved_no_of_workers) from `tabClaim Order` where job_order="{name}"'
            data1=frappe.db.sql(claims,as_list=1)
            if(data1[0][0]!=None):
                return int(data.no_of_workers)-int(data1[0][0])
            else:
                return int(data.no_of_workers) 
def all_orders_data(company_name):
    my_aval_claims=[]
    unclaimed_noresume_by_company=[]
    l=f'select name from `tabJob Order` where claim like "%{company_name}%"  '
    my_claims=frappe.db.sql(l,as_list=1)
    unclaimed_resume_by_comp=f'select name from `tabJob Order` where (claim not like "%{company_name}%" or claim is Null) and order_status!="Completed" and resumes_required=1 and worker_filled!=no_of_workers'
    my_aval_claims=frappe.db.sql(unclaimed_resume_by_comp,as_list=1)
    unclaimed_noresume_by_company=check_avail(company_name,unclaimed_noresume_by_company)
    return my_claims,my_aval_claims,unclaimed_noresume_by_company

def check_avail(company_name,unclaimed_noresume_by_company):
    unclaimed_noresume_by_comp=f'select name from `tabJob Order` where (claim not like "%{company_name}%" or claim is Null) and order_status!="Completed" and resumes_required=0'
    my_unaval_claims=frappe.db.sql(unclaimed_noresume_by_comp,as_list=1)
    for i in my_unaval_claims:
        data=frappe.get_doc(ORD,i[0])
        claims=f'select sum(approved_no_of_workers) from `tabClaim Order` where job_order="{data.name}"'
        data1=frappe.db.sql(claims,as_list=1)
        if(data1[0][0]!=None):
            if int(data.no_of_workers)-int(data1[0][0])!=0:
                unclaimed_noresume_by_company.append(data.name)
        else:
            unclaimed_noresume_by_company.append(data.name)
    return unclaimed_noresume_by_company