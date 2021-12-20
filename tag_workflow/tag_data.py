import frappe
from frappe import _
from frappe.share import add
from frappe import enqueue
from tag_workflow.utils.notification import sendmail

jobOrder = "Job Order"

@frappe.whitelist()
def company_details(company_name=None):
    if frappe.session.user != 'Administrator':
        comp_data=frappe.get_doc('Company',company_name)
        company_info = frappe.db.sql(""" select fein, title, address, city, state, zip, contact_name, email, phone_no, primary_language, accounts_payable_contact_name, accounts_payable_email, accounts_payable_phone_number from `tabCompany` where name="{}" """.format(company_name),as_list=1)
        is_ok = "failed"
        if None in company_info[0]:
            return is_ok
        if(len(comp_data.industry_type)==0):
            return is_ok
        return "success"



@frappe.whitelist()
def update_timesheet(job_order_detail):
    value = frappe.db.sql('''select select_job,posting_date_time from `tabJob Order` where name = "{}" '''.format(job_order_detail),as_dict = 1)
    return value[0]['select_job'],value[0]['posting_date_time']


def send_email(subject = None,content = None,recipients = None):
    from frappe.core.doctype.communication.email import make
    try:
        make(subject = subject, content=content, recipients= recipients,send_email=True)
        frappe.msgprint("Email Send Succesfully")
        return True
    except Exception as e:
        frappe.log_error(e, "Doc Share Error")
        frappe.msgprint("Could Not Send")
        return False

@frappe.whitelist()
def send_email_staffing_user(email_list=None,subject = None,body=None,additional_email = None):
    import json
    email = json.loads(email_list)
    l = [i['email'] for i in email]
    if additional_email:
        v = additional_email.split(',')
        for i in v:
            l.append(i)

    value = send_email(subject,body,l)
    
    if value:
        return 1
    else:
        return 0


#----------assign data------------#
def assign_employee_data(hiringorg, name):
    try:
        emps = frappe.db.sql(""" select employee from `tabAssign Employee Details` where parent = %s """,(name), as_dict=1)
        users = frappe.db.get_list("User", {"company": hiringorg}, "name")

        for usr in users:
            for emp in emps:
                if not frappe.db.exists("DocShare", {"user": usr.name, "share_doctype": "Employee", "share_name": emp.employee}):
                    add("Employee", emp.employee, usr.name, read=1, write = 0, share = 0, everyone = 0,notify = 0, flags={"ignore_share_permission": 1})
    except Exception as e:
        frappe.db.rollback()
        frappe.error_log(e, "employee share")
        frappe.throw(e)
 
@frappe.whitelist()
def update_job_order(job_name, employee_filled, staffing_org, hiringorg, name):
    try:
        job = frappe.get_doc(jobOrder, job_name)
        claimed = job.staff_org_claimed if job.staff_org_claimed else ""
        frappe.db.set_value(jobOrder, job_name, "worker_filled", (int(employee_filled)+int(job.worker_filled)))
        frappe.db.set_value(jobOrder, job_name, "staff_org_claimed", (str(claimed)+", "+str(staffing_org)))

        sub = f'New Message regarding {job_name} from {hiringorg} is available'
        msg = f'Your Employees has been approved for Work Order {job_name}'
        user_list = frappe.db.sql(""" select email from `tabUser` where company = %s """,(staffing_org), as_dict=1)
        users = [usr['email'] for usr in user_list]
        enqueue("tag_workflow.tag_data.assign_employee_data", hiringorg=hiringorg, name=name)
        return sendmail(users, msg, sub, "Assign Employee", name)
    except Exception as e:
        frappe.db.rollback()
        frappe.error_log(e, "final_notification")
        frappe.throw(e)


@frappe.whitelist()
def receive_hiring_notification(hiring_org,job_order,staffing_org,emp_detail,doc_name):
    import json
    bid_receive=frappe.get_doc("Job Order",job_order)
    bid_receive.bid=1+int(bid_receive.bid)
    bid_receive.claim=str(bid_receive.claim)+str(",")+staffing_org
    bid_receive.save(ignore_permissions=True)

    job_detail = frappe.db.sql('''select job_title,job_site,posting_date_time from `tabJob Order` where name = "{}"'''.format(job_order),as_dict=1)
    user_list = frappe.db.sql(''' select email from `tabUser` where company = "{}"'''.format(hiring_org),as_list=1)
    
    v = json.loads(emp_detail)
    s = ''
    for i in v:
        s += i['employee_name'] + ','

    l = [l[0] for l in user_list]
    for user in l:
        add("Assign Employee", doc_name, user, read=1, write = 0, share = 0, everyone = 0,notify = 1)

    msg = f'{staffing_org} has submitted a claim for {s[:-1]} for {job_detail[0]["job_title"]} at {job_detail[0]["job_site"]} on {job_detail[0]["posting_date_time"]}. Please review and/or approve this claim <a href="/app/assign-employee/{doc_name}">Assign Employee</a> .'
    return send_email(None,msg,l)

@frappe.whitelist()
def staff_email_notification(hiring_org=None,job_order=None,job_order_title=None,staff_company=None):
    from frappe.share import add
    x = frappe.get_doc(jobOrder,job_order)
    subject="New Work Order"
    if staff_company:
        print("staffing company is:",staff_company)
        x.company_type = 'Non Exclusive'
        x.save(ignore_permissions = True)
        user_list=frappe.db.sql(''' select email from `tabUser` where company='{}' '''.format(staff_company),as_list=1)        
        l = [l[0] for l in user_list]
        for user in l:
            add(jobOrder, job_order, user, read=1, write = 0, share = 0, everyone = 0,notify = 1)
        message=f'New Work Order for {job_order_title} has been created by {hiring_org}. <a href="/app/job-<a href="/app/job-order/{{doc.name}}">Job Order</a>order/{job_order}">View Work Order</a>'
        return send_email(subject,message,l)

    else:
        org_type=frappe.db.sql('''select organization_type from `tabCompany` where name='{}' '''.format(hiring_org),as_list=1)
        if(org_type[0][0]=='Hiring'):
            x.company_type = 'Non Exclusive'
            x.save(ignore_permissions = True)
            user_list=frappe.db.sql(''' select email from `tabUser` where organization_type='staffing' ''',as_list=1)
            l = [l[0] for l in user_list]
            for user in l:
                add(jobOrder, job_order, user, read=1, write = 0, share = 0, everyone = 0,notify = 1)
            message=f'New Work Order for {job_order_title} has been created by {hiring_org}.<a href="/app/job-<a href="/app/job-order/{{doc.name}}">Job Order</a>order/{job_order}">View Work Order</a>'
            return send_email(subject,message,l)
        elif org_type[0][0]=="Exclusive Hiring":
            x.company_type = 'Exclusive'
            x.save(ignore_permissions = True)
            owner_info=frappe.db.sql(''' select owner from `tabCompany` where organization_type="Exclusive Hiring" and name="{}" '''.format(hiring_org),as_list=1)
            company_info=frappe.db.sql(''' select company from `tabUser` where name='{}' '''.format(owner_info[0][0]),as_list=1)
            user_list=frappe.db.sql(''' select email from `tabUser` where company='{}' '''.format(company_info[0][0]),as_list=1)        
            l = [l[0] for l in user_list]
            for user in l:
                add(jobOrder, job_order, user, read=1, write = 0, share = 0, everyone = 0,notify = 1)
            message=f'New Work Order for {job_order_title} has been created by {hiring_org}. <a href="/app/job-<a href="/app/job-order/{{doc.name}}">Job Order</a>order/{job_order}">View Work Order</a>'
            return send_email(subject,message,l)

@frappe.whitelist()
def update_exclusive_org(exclusive_email,staffing_email,staffing_comapny,exclusive_company):
    from frappe.share import add
    try:
        add("Company",staffing_comapny,exclusive_email,write = 0,read = 1,share = 0,everyone=0,notify=1,flags={"ignore_share_permission": 1})
        add("Company",exclusive_company,exclusive_email,write = 0,read = 1,share = 0,everyone=0,notify=1,flags={"ignore_share_permission": 1})

    except Exception as e:
         frappe.log_error(e, "doc share error")

@frappe.whitelist()
def staff_org_details(company_details=None):
    comp_data=frappe.get_doc('Company',company_details)
    company_info = frappe.db.sql(""" select fein, title, address, city, state, zip, contact_name, email, phone_no, primary_language,accounts_receivable_rep_email,accounts_receivable_name,accounts_receivable_phone_number, cert_of_insurance,safety_manual,w9 from `tabCompany` where name="{}" """.format(company_details),as_list=1)
    is_ok = "failed"
    if None in company_info[0]:
        return is_ok
    if(len(comp_data.branch)==0 or len(comp_data.industry_type)==0 or len(comp_data.employees)==0):
        return is_ok
    return "success"


@frappe.whitelist()
def update_staffing_user_with_exclusive(company,company_name):
    from frappe.share import add
    a = frappe.db.sql('''select name from `tabUser` where company = "{}" and tag_user_type = 'Staffing User' '''.format(company),as_list=1)
    try:
        for i in a:
            add("Company",company_name,i[0],write = 0,read = 1,share = 0,notify=1,flags={"ignore_share_permission": 1})

    except Exception as e:
         frappe.log_error(e, "doc share error")

@frappe.whitelist()
def check_assign_employee(total_employee_required,employee_detail = None):
    import json
    total = int(total_employee_required)
    try:
        if employee_detail:
            v = json.loads(employee_detail)
            total_employee = [i['employee_name'] for i in v]
            unique_employee = set(total_employee)
            
            if len(total_employee) == len(unique_employee):
                if len(total_employee) > total:
                    return 'exceeds'
            else:
                return 'duplicate'
        else:
            return 'insert'
    except Exception:
        return 0

@frappe.whitelist()
def api_sec(frm=None):
    try:
        emp = frappe.get_doc("Employee",frm)
        ssn_decrypt = emp.get_password('ssn')
        return ssn_decrypt
    except Exception:
        frappe.log_error("No Employee in Database", "Warning")
    

@frappe.whitelist()
def filter_blocked_employee(doctype, txt, searchfield, page_len, start, filters):
    emp_company = filters.get('emp_company')
    job_category = filters.get('job_category')

    company = filters.get('company')

    if job_category is None:
        return frappe.db.sql("""select name from `tabEmployee` where company=%(emp_company)s and name NOT IN (select parent from `tabBlocked Employees` BE where blocked_from=%(company)s)""",{'emp_company':emp_company,'company':company})
    else:
        return frappe.db.sql("""select name from `tabEmployee` where company=%(emp_company)s and job_category = %(job_category)s or job_category IS NULL and name NOT IN (select parent from `tabBlocked Employees` BE where blocked_from=%(company)s)""",{'emp_company':emp_company,'company':company,'job_category':job_category})
    
@frappe.whitelist()
def get_org_site(doctype, txt, searchfield, page_len, start, filters):
    company=filters.get('job_order_company')   
    return frappe.db.sql(''' select job_site from `tabCompany Site` where parent=%(company)s''',{'company':company})
    
@frappe.whitelist()
def hiring_category(doctype,txt,searchfield,page_len,start,filters):
    company=filters.get('hiring_company')
    return frappe.db.sql(''' select industry_type from `tabIndustry Types` where parent=%(company)s''',{'company':company})


@frappe.whitelist()
def org_industy_type(company=None):
    return frappe.db.sql(''' select industry_type from `tabIndustry Types` where parent='{}' '''.format(company))


@frappe.whitelist()
def delete_file_data(file_name):
    frappe.db.sql('''Delete from `tabFile` where file_name = "{}"'''.format(file_name))