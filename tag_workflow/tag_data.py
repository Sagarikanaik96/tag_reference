import frappe
from frappe import _
from frappe.share import add
from frappe import enqueue
from tag_workflow.utils.notification import sendmail, make_system_notification
from frappe.utils import get_datetime,now
from frappe.utils import date_diff
import json
import datetime

jobOrder = "Job Order"
assignEmployees = "Assign Employee"
NOASS = "No Access"

@frappe.whitelist(allow_guest=False)
def company_details(company_name=None):
    if frappe.session.user != 'Administrator':
        comp_data=frappe.get_doc('Company',company_name)

        sql = """ select fein, title, address, city, state, zip, contact_name, email, phone_no, primary_language, accounts_payable_contact_name, accounts_payable_email, accounts_payable_phone_number from `tabCompany` where name="{}" """.format(company_name)

        company_info = frappe.db.sql(sql, as_list=1)
        is_ok = "failed"
        if None in company_info[0]:
            return is_ok
        if(len(comp_data.industry_type)==0):
            return is_ok
        return "success"



@frappe.whitelist(allow_guest=False)
def update_timesheet(job_order_detail):
    sql = '''select select_job,from_date,to_date,per_hour,flat_rate,estimated_hours_per_day from `tabJob Order` where name = "{}" '''.format(job_order_detail)
    value = frappe.db.sql(sql, as_dict = 1)
    time_differnce=date_diff(value[0]['to_date'],value[0]['from_date'])
    per_person_rate=value[0]['per_hour']
    flat_rate=value[0]['flat_rate']
    hours=time_differnce*value[0]['estimated_hours_per_day']
    extra_hours=(hours-40) if hours>40 else 0
    extra_rate=(per_person_rate+flat_rate)*1.5 if extra_hours>0 else 0
    billing_rate=per_person_rate
    return value[0]['select_job'],value[0]['from_date'],value[0]['to_date'],hours,billing_rate,value[0]['flat_rate'],extra_hours,extra_rate



def send_email(subject = None,content = None,recipients = None):
    from frappe.core.doctype.communication.email import make
    try:
        site= frappe.utils.get_url().split('/')
        sitename=site[0]+'//'+site[2]
        make(subject = subject, content=frappe.render_template("templates/emails/email_template_custom.html",{"sitename": sitename,"content":content,"subject":subject}), recipients= recipients,send_email=True)
        frappe.msgprint("Email Sent Successfully")
        return True
    except Exception as e:
        frappe.log_error(e, "Doc Share Error")
        frappe.msgprint("Could Not Send")
        return False

def joborder_email_template(subject = None,content = None,recipients = None,link=None):
    try:
        from frappe.core.doctype.communication.email import make
        site= frappe.utils.get_url().split('/')
        sitename=site[0]+'//'+site[2]
        make(subject = subject, content=frappe.render_template("templates/emails/email_template_custom.html",
            {"sitename": sitename, "content":content,"subject":subject,"link":link}),
            recipients= recipients,send_email=True)
        frappe.msgprint("Email Sent Successfully")
        return True
    except Exception as e:
        frappe.log_error(e, "Doc Share Error")
        frappe.msgprint("Could Not Send")
        return False


@frappe.whitelist(allow_guest=False)
def send_email_staffing_user(user, company_type, email_list=None,subject = None,body=None,additional_email = None):
    try:
        if(company_type == "Staffing" and user == frappe.session.user):
            email = json.loads(email_list)
            emails = [i['email'] for i in email]
            if additional_email:
                v = additional_email.split(',')
                for i in v:
                    emails.append(i)
            value = send_email(subject, body, emails)
            if value:
                return 1
            else:
                return 0
        else:
            return 0
    except Exception as e:
        print(e)
        return 0


#----------assign data------------#
def assign_employee_data(hiringorg, name):
    try:
        sql = """ select employee from `tabAssign Employee Details` where parent = '{0}' """.format(name)
        emps = frappe.db.sql(sql, as_dict=1)
        users = frappe.db.get_list("User", {"company": hiringorg}, "name")

        for usr in users:
            for emp in emps:
                if not frappe.db.exists("DocShare", {"user": usr.name, "share_doctype": "Employee", "share_name": emp.employee}):
                    add("Employee", emp.employee, usr.name, read=1, write = 0, share = 0, everyone = 0,notify = 0, flags={"ignore_share_permission": 1})
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(e, "employee share")


@frappe.whitelist(allow_guest=False)
def update_job_order(user, company_type, sid, job_name, employee_filled, staffing_org, hiringorg, name):
    try:
        if(company_type == "Hiring" and user == frappe.session.user and sid == frappe.cache().get_value("sessions")[user]):
            job = frappe.get_doc(jobOrder, job_name)
            claimed = job.staff_org_claimed if job.staff_org_claimed else ""
            frappe.db.set_value(jobOrder, job_name, "worker_filled", (int(employee_filled)+int(job.worker_filled)))
            if(len(claimed)==0):
                frappe.db.set_value(jobOrder, job_name, "staff_org_claimed", (str(claimed)+str(staffing_org)))
            else:
                frappe.db.set_value(jobOrder, job_name, "staff_org_claimed", (str(claimed)+", "+str(staffing_org)))

            sub = f'New Message regarding {job_name} from {hiringorg} is available'
            msg = f'Your Employees has been approved for Work Order {job_name}'
            lst_sql = """ select user_id from `tabEmployee` where company = '{0}' and user_id IS NOT NULL""".format(staffing_org)
            user_list = frappe.db.sql(lst_sql, as_dict=1)
            users = [usr['user_id'] for usr in user_list]
            make_system_notification(users,msg,jobOrder,job_name,sub)   
            enqueue("tag_workflow.tag_data.assign_employee_data", hiringorg=hiringorg, name=name)

            sql = """ UPDATE `tabAssign Employee` SET approve_employee_notification = 0 where name="{0}" """.format(name)
            frappe.db.sql(sql)
            frappe.db.commit()
            return sendmail(users, msg, sub, assignEmployees, name)
        return []
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(e, "final_notification")


@frappe.whitelist(allow_guest=False)
def receive_hiring_notification(user, company_type, hiring_org, job_order, staffing_org, emp_detail, doc_name, no_of_worker_req, is_single_share, job_title):
    try:
        if(company_type == "Staffing" and user == frappe.session.user):
            update_values=frappe.db.sql(''' select data from `tabVersion` where docname='{}' '''.format(doc_name),as_list=1)
            if(len(update_values)<2):
                bid_receive=frappe.get_doc(jobOrder,job_order)

            if int(is_single_share):
                check_partial_employee(bid_receive,staffing_org,emp_detail,no_of_worker_req,job_title,hiring_org,doc_name)
                return

            bid_receive.bid=1+int(bid_receive.bid)
            if(bid_receive.claim is None):
                bid_receive.claim=staffing_org
                chat_room_created(hiring_org,staffing_org,job_order)
            else:
                if(staffing_org not in bid_receive.claim):
                    bid_receive.claim=str(bid_receive.claim)+str(",")+staffing_org
                    chat_room_created(hiring_org,staffing_org,job_order)

            bid_receive.save(ignore_permissions=True)
            job_sql = '''select select_job,job_site,posting_date_time from `tabJob Order` where name = "{}"'''.format(job_order)
            job_detail = frappe.db.sql(job_sql, as_dict=1)
            lst_sql = ''' select user_id from `tabEmployee` where company = "{}" and user_id IS NOT NULL '''.format(hiring_org)
            user_list = frappe.db.sql(lst_sql, as_list=1)
            v = json.loads(emp_detail)
            s = ''
            for i in v:
                s += i['employee_name'] + ','
            l = [l[0] for l in user_list]
            for user in l:
                add(assignEmployees, doc_name, user, read=1, write = 0, share = 0, everyone = 0)
            sub="Employee Assigned"
            msg = f'{staffing_org} has submitted a claim for {s[:-1]} for {job_detail[0]["select_job"]} at {job_detail[0]["job_site"]} on {job_detail[0]["posting_date_time"]}'
            make_system_notification(l,msg,'Assign Employee',doc_name,sub)
            msg = f'{staffing_org} has submitted a claim for {s[:-1]} for {job_detail[0]["select_job"]} at {job_detail[0]["job_site"]} on {job_detail[0]["posting_date_time"]}. Please review and/or approve this claim .'
            link =  f'  href="/app/assign-employee/{doc_name}" '
            return joborder_email_template(sub, msg, l, link)
        else:
            return NOASS
    except Exception as e:
        print(e, frappe.get_traceback())
        frappe.db.rollback()

def check_partial_employee(job_order,staffing_org,emp_detail,no_of_worker_req,job_title,hiring_org,doc_name):
    try:
        emp_detail = json.loads(emp_detail)
        job_order.is_single_share = '0'

        job_order.bid=1+int(job_order.bid)
        if(job_order.claim is None):
            job_order.claim=staffing_org
            chat_room_created(hiring_org,staffing_org,job_order.name)

        else:
            if(staffing_org not in job_order.claim):
                job_order.claim=str(job_order.claim)+str(",")+staffing_org
                chat_room_created(hiring_org,staffing_org,job_order.name)

        job_order.save(ignore_permissions=True)

        sql1 = '''select email from `tabUser` where organization_type='hiring' and company = "{}"'''.format(hiring_org)
        
        hiring_list = frappe.db.sql(sql1,as_list=True)
        hiring_user_list = [user[0] for user in hiring_list]

        if int(no_of_worker_req) > len(emp_detail):
            sql = '''select email from `tabUser` where organization_type='staffing' and company != "{}"'''.format(staffing_org)
            share_list = frappe.db.sql(sql, as_list = True)
            assign_notification(share_list,hiring_user_list,doc_name,job_order) 
            subject = 'Job Order Notification' 
            msg=f'{staffing_org} placed partial claim on your work order: {job_title}. Please review & approve the candidates matched with this work order.'
            make_system_notification(hiring_user_list,msg,assignEmployees,doc_name,subject)
            return send_email(subject,msg,hiring_user_list)
        else:
            if hiring_user_list:
                subject = 'Job Order Notification' 
                for user in hiring_user_list:
                    add(assignEmployees, doc_name, user, read=1, write = 0, share = 0, everyone = 0)   
               
                msg=f'{staffing_org} placed Full claim on your work order: {job_title}. Please review & approve the candidates matched with this work order.'
                make_system_notification(hiring_user_list,msg,assignEmployees,doc_name,subject)
                return send_email(subject,msg,hiring_user_list)
            
    except Exception as e:
        frappe.log_error(e, "Partial Job order Failed ")
                
   
@frappe.whitelist(allow_guest=False)
def staff_email_notification(hiring_org=None,job_order=None,job_order_title=None,staff_company=None):
    try:
        doc = frappe.get_doc(jobOrder,job_order)
        subject="New Work Order"

        sql = ''' select data from `tabVersion` where ref_doctype='Job Order' and docname='{}' '''.format(job_order)
        update_values=frappe.db.sql(sql, as_list=1)
        if(len(update_values)<2):
            sql = '''select organization_type from `tabCompany` where name='{}' '''.format(hiring_org)
            org_type=frappe.db.sql(sql, as_list=1)
            if staff_company and org_type[0][0]=="Hiring":
                doc.company_type = 'Non Exclusive'
                doc.is_single_share = 1
                doc.save(ignore_permissions = True)
                user_list=frappe.db.sql(''' select user_id from `tabEmployee` where company='{}' and user_id IS NOT NULL'''.format(staff_company),as_list=1)
                l = [l[0] for l in user_list]
                for user in l:
                    add(jobOrder, job_order, user, read=1, write = 0, share = 0, everyone = 0)
                single_job_order_notification(job_order_title,hiring_org,job_order,subject,l)
            else:
                staff_email_notification_cont(hiring_org, job_order, job_order_title,doc,subject)
    except Exception as e:
        print(e, frappe.get_traceback())

def staff_email_notification_cont(hiring_org=None,job_order=None,job_order_title=None,doc=None,subject=None):
    try:
        sql = '''select organization_type from `tabCompany` where name='{}' '''.format(hiring_org)
        org_type=frappe.db.sql(sql, as_list=1)
        if(org_type[0][0]=='Hiring'):
            doc.company_type = 'Non Exclusive'
            doc.save(ignore_permissions = True)

            sql = ''' select email from `tabUser` where organization_type='staffing' '''
            user_list=frappe.db.sql(sql, as_list=1)
            l = [l[0] for l in user_list]
            for user in l:
                add(jobOrder, job_order, user, read=1, write = 0, share = 0, everyone = 0)
            job_order_notification(job_order_title,hiring_org,job_order,subject,l)
        elif org_type[0][0]=="Exclusive Hiring":
            doc.company_type = 'Exclusive'
            doc.save(ignore_permissions = True)

            own_sql = ''' select owner from `tabCompany` where organization_type="Exclusive Hiring" and name="{}" '''.format(hiring_org)
            owner_info=frappe.db.sql(own_sql, as_list=1)

            com_sql = ''' select company from `tabUser` where name='{}' '''.format(owner_info[0][0])
            company_info=frappe.db.sql(com_sql, as_list=1)

            usr_sql = ''' select user_id from `tabEmployee` where company='{}' and user_id IS NOT NULL '''.format(company_info[0][0])
            user_list = frappe.db.sql(usr_sql, as_list=1)
            l = [l[0] for l in user_list]
            for user in l:
                add(jobOrder, job_order, user, read=1, write = 0, share = 0, everyone = 0)
            job_order_notification(job_order_title,hiring_org,job_order,subject,l)
    except Exception as e:
        print(e)

@frappe.whitelist(allow_guest=False)
def update_exclusive_org(exclusive_email,staffing_email,staffing_comapny,exclusive_company):
    from frappe.share import add
    try:
        add("Company",staffing_comapny,exclusive_email,write = 0,read = 1,share = 0,everyone=0,notify=1,flags={"ignore_share_permission": 1})
        add("Company",exclusive_company,exclusive_email,write = 0,read = 1,share = 0,everyone=0,notify=1,flags={"ignore_share_permission": 1})

    except Exception as e:
         frappe.log_error(e, "doc share error")

@frappe.whitelist(allow_guest=False)
def staff_org_details(company_details=None):
    comp_data=frappe.get_doc('Company',company_details)

    sql = """ select fein, title, address, city, state, zip, contact_name, email, phone_no, primary_language,accounts_receivable_rep_email,accounts_receivable_name,accounts_receivable_phone_number, cert_of_insurance,safety_manual,w9 from `tabCompany` where name="{}" """.format(company_details)

    company_info = frappe.db.sql(sql, as_list=1)
    is_ok = "failed"
    if None in company_info[0]:
        return is_ok
    if(len(comp_data.job_site)==0 or len(comp_data.industry_type)==0 or len(comp_data.employees)==0):
        return is_ok
    return "success"


@frappe.whitelist(allow_guest=False)
def update_staffing_user_with_exclusive(company,company_name):
    from frappe.share import add

    sql = '''select name from `tabUser` where company = "{}" and tag_user_type = 'Staffing User' '''.format(company)
    a = frappe.db.sql(sql, as_list=1)
    try:
        for i in a:
            add("Company",company_name,i[0],write = 0,read = 1,share = 0,notify=1,flags={"ignore_share_permission": 1})

    except Exception as e:
         frappe.log_error(e, "doc share error")

@frappe.whitelist(allow_guest=False)
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

@frappe.whitelist(allow_guest=False)
def api_sec(frm=None):
    try:
        emp = frappe.get_doc("Employee",frm)
        ssn_decrypt = emp.get_password('ssn')
        return ssn_decrypt
    except Exception:
        frappe.log_error("No Employee in Database", "Warning")
    

@frappe.whitelist(allow_guest=False)
def filter_blocked_employee(doctype, txt, searchfield, page_len, start, filters):
    emp_company = filters.get('emp_company')
    job_category = filters.get('job_category')

    company = filters.get('company')

    if job_category is None:
        sql = """ select name, employee_name from `tabEmployee` where company=%(emp_company)s and status='Active' and (name NOT IN (select parent from `tabBlocked Employees`  where blocked_from=%(company)s) and (name NOT IN (select parent from `tabUnsatisfied Organization`  where unsatisfied_organization_name='{0}')) and (name NOT IN (select parent from `tabDNR` BE where dnr='{1}')) """.format(emp_company, company)

        return frappe.db.sql(sql)
    else:
        sql = """select name, employee_name from `tabEmployee` where company='{0}' and status='Active' and (job_category = '{1}' or job_category IS NULL) and (name NOT IN (select parent from `tabBlocked Employees`  where blocked_from='{2}')) and (name NOT IN (select parent from `tabDNR`  where dnr='{2}' )) and (name NOT IN (select parent from `tabUnsatisfied Organization`  where unsatisfied_organization_name='{2}'))""".format(emp_company, job_category, company)


        return frappe.db.sql(sql)
    
@frappe.whitelist(allow_guest=False)
def get_org_site(doctype, txt, searchfield, page_len, start, filters):
    company=filters.get('job_order_company')
    sql = ''' select job_site from `tabCompany Site` where parent='{0}' '''.format(company)
    return frappe.db.sql(sql)

@frappe.whitelist(allow_guest=False)
def job_site_employee(doctype, txt, searchfield, page_len, start, filters):

    company=filters.get('job_order_company')
    sql = ''' select name,employee_name,user_id from `tabEmployee` where company='{0}' '''.format(company)
    return frappe.db.sql(sql)


@frappe.whitelist(allow_guest=False)
def hiring_category(doctype,txt,searchfield,page_len,start,filters):
    company=filters.get('hiring_company')
    sql = ''' select industry_type from `tabIndustry Types` where parent='{0}' '''.format(company)
    return frappe.db.sql(sql)


@frappe.whitelist(allow_guest=False)
def org_industy_type(company=None):
    sql = ''' select industry_type from `tabIndustry Types` where parent='{0}' '''.format(company)
    return frappe.db.sql(sql)


@frappe.whitelist(allow_guest=False)
def delete_file_data(file_name):
    sql = '''Delete from `tabFile` where file_name = "{}"'''.format(file_name)
    frappe.db.sql(sql)

def job_order_notification(job_order_title,hiring_org,job_order,subject,l):
    msg=f'New Work Order for a {job_order_title} has been created by {hiring_org}.'
    make_system_notification(l,msg,jobOrder,job_order,subject)   
    message=f'New Work Order for a {job_order_title} has been created by {hiring_org}.'
    link = f' href="/app/assign-employee/{job_order}"'
    return joborder_email_template(subject,message,l,link)
    
@frappe.whitelist(allow_guest=False)
def disable_user(company, check):
    try:
        if check=="1":
            check=int(0)
        else:
            check=int(1)

        sql = """ UPDATE `tabUser` SET `tabUser`.enabled ="{0}" where company="{1}" and `terminated`!=1 """.format(check, company)
        frappe.db.sql(sql)
        frappe.db.commit()
    except Exception as e:
        frappe.msgprint(e)


@frappe.whitelist()
def update_job_order_status():
    try:
        job_order_data=frappe.get_all(jobOrder,fields=['name','from_date','to_date','bid','staff_org_claimed','order_status'])
        now_date=datetime.date.today()
        for job in job_order_data:
            start_date = job.from_date if job.from_date else ""
            end_date = job.to_date if job.to_date else ""
            if(type(start_date) is not str):
                if start_date <= now_date <= end_date:
                    frappe.db.set_value(jobOrder, job.name, "order_status", "Ongoing")
                    unshare_job_order(job)
                elif  now_date < start_date:
                    frappe.db.set_value(jobOrder, job.name, "order_status", "Upcoming")
                elif now_date > end_date:
                    frappe.db.set_value(jobOrder, job.name, "order_status", "Completed")
    except Exception as e:
        frappe.msgprint(e)


@frappe.whitelist(allow_guest=False)
def sales_invoice_notification(user, sid, job_order, company, invoice_name):
    try:
        sql = """ select company,select_job,job_site from `tabJob Order` where name='{0}' """.format(job_order)
        job_order_details = frappe.db.sql(sql, as_dict=1)
        msg = f'{company} has submitted an invoice for {job_order_details[0].select_job} at {job_order_details[0].job_site}.'
        subject = "Invoice Submitted"
        sql = ''' select name from `tabUser` where company='{}' '''.format(job_order_details[0].company)
        user_list = frappe.db.sql(sql, as_dict=1)
        users = [l.name for l in user_list]
        for usr in users:
            add("Sales Invoice", invoice_name, usr, read=1, write = 0, share = 0, everyone = 0, flags={"ignore_share_permission": 1})
        if(users):
            make_system_notification(users, msg, 'Sales Invoice', invoice_name, subject)
            send_email(subject, msg, users)
            return True
    except Exception as e:
        frappe.msgprint(frappe.get_traceback())
        frappe.log_error(e, "invoice notification")


@frappe.whitelist(allow_guest=False)
def hiring_org_name(current_user):
    sql = ''' select company from `tabEmployee` where email='{0}' and company in (select name from `tabCompany` where make_organization_inactive='0') '''.format(current_user)
    user_company=frappe.db.sql(sql, as_list=1)
    if(len(user_company)==1):
        return 'success'
           
@frappe.whitelist(allow_guest=False)
def designation_activity_data(doc,method):
    docs=frappe.new_doc('Activity Type')
    docs.activity_type=doc.name
    docs.insert()

@frappe.whitelist(allow_guest=False)
def filter_company_employee(doctype, txt, searchfield, page_len, start, filters):
    try:
        company=filters.get('company')
        sql = """ select name, employee_name,company from `tabEmployee` where company='{0}' """.format(company)
        return frappe.db.sql(sql)
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(e, "Staffing Company Error")
        frappe.throw(e)

@frappe.whitelist(allow_guest=False)
def contact_company(doctype, txt, searchfield, page_len, start, filters):
    company=filters.get('company')
    sql = """ select name from `tabCompany` where name='{}' """.format(company)
    return frappe.db.sql(sql) 

@frappe.whitelist(allow_guest=False)
def email_recipient(doctype, txt, searchfield, page_len, start, filters):
    company=filters.get('company')
    sql = """ select name from `tabContact` where company='{}' """.format(company)
    return frappe.db.sql(sql) 



 
def single_job_order_notification(job_order_title,hiring_org,job_order,subject,l):
    try:
        msg=f'{hiring_org} is requesting a fulfillment of a work order for {job_order_title} specifically with your Company. Please respond.'
        make_system_notification(l,msg,jobOrder,job_order,subject)   
        message=f'{hiring_org} is requesting a fulfillment of a work order for {job_order_title} specifically with your Company. Please respond. <br> <br><a href="/app/job-order/{job_order}">View Work Order</a>'
        return send_email(subject,message,l)
    except Exception as e:
        frappe.log_error(e, "Single Job Order Notification Error")

def assign_notification(share_list,hiring_user_list,doc_name,job_order):
    if share_list:
        for user in share_list:
            add(jobOrder, job_order.name, user[0], read=1,write=0, share=1, everyone=0, notify=0,flags={"ignore_share_permission": 1})
    for user in hiring_user_list:
        add(assignEmployees, doc_name, user, read=1, write = 0, share = 0, everyone = 0)  
        
      
def chat_room_created(hiring_org,staffing_org,job_order):
    try:
        hiring_comp_users=frappe.db.sql(''' select user_id from `tabEmployee` where company='{0}' and user_id IS NOT NULL'''.format(hiring_org),as_list=1)
        staffing_users=frappe.db.sql(''' select user_id from `tabEmployee` where company='{0}' and user_id IS NOT NULL '''.format(staffing_org),as_list=1)
        tag_users=frappe.db.sql(''' select email from `tabUser` where tag_user_type='Tag Admin' ''',as_list=1)

        user_list=hiring_comp_users+staffing_users+tag_users
        total_user_list=[]
        members=''
        for claim in user_list:
            value = claim[0].split(',')
            for name in value:
                if name:
                    total_user_list.append(name.strip())
        for k in total_user_list:
            members+=k+','
        doc=frappe.new_doc("Chat Room")
        doc.room_name=str(job_order)+"_"+staffing_org
        doc.type="Group"
        doc.members=members
        doc.save()
    except Exception as e:
        frappe.log_error(e, "chat room creation error")

@frappe.whitelist(allow_guest=False)
def assign_employee_resume_update(employee, name):
    if(company_type == "Staffing" and user == frappe.session.user):
        sql = """ select resume from `tabEmployee` where name='{}' """.format(employee)
        data = frappe.db.sql(sql,as_dict=1)
        if(len(data) > 0 and data[0]["resume"]):
            sql =""" UPDATE `tabAssign Employee Details` SET resume='{0}' WHERE name='{1}'; """.format(data[0]["resume"],name)
            frappe.db.sql(sql)
            frappe.db.commit()
        return True
    else:
        return NOASS
@frappe.whitelist(allow_guest=False)
def joborder_resume(name):
    sql = """ select resume from `tabEmployee` where name='{}' """.format(name)
    return frappe.db.sql(sql,as_dict=1)

@frappe.whitelist(allow_guest=False)
def lead_org(current_user):
    sql = ''' select company from `tabEmployee` where email='{0}' '''.format(current_user)
    user_company=frappe.db.sql(sql, as_list=1)
    if(len(user_company)==1):
        return 'success'
    

@frappe.whitelist(allow_guest=False)
def timesheet_detail(job_order):
    sql = ''' select * from `tabTimesheet` where job_order_detail='{0}' '''.format(job_order)
    sales_sql= ''' select * from `tabSales Invoice` where job_order='{0}' '''.format(job_order)

    user_company=frappe.db.sql(sql, as_list=1)
    sales_company=frappe.db.sql(sales_sql, as_list=1)


    if(len(user_company)>0 and len(sales_company)>1):
        return 'success1'
    elif(len(user_company)>0):
        return 'success'


@frappe.whitelist(allow_guest=False)
def update_timesheet_is_check_in_sales_invoice(time_list):
    try:
        time_list = json.loads(time_list)

        for i in time_list:
            sql = """ UPDATE `tabTimesheet` SET `tabTimesheet`.is_check_in_sales_invoice = 1 where name = "{}" """.format(i['time_sheet'])
            frappe.db.sql(sql)
            frappe.db.commit()
    except Exception as e:
        frappe.log_error(e, "Update time sheet Invoice")

@frappe.whitelist(allow_guest=False)
def assigned_employees(job_order):
    try:
        sql=f" select name from `tabAssign Employee` where job_order='{job_order}' and tag_status='Approved'"
        assigned_data=frappe.db.sql(sql)
        if(len(assigned_data)>0):
            return "success1"
    except Exception as e:
        frappe.log_error(e, "Assign Employee List")

    
@frappe.whitelist(allow_guest=False)
def assigned_employee_data(job_order):
    try:
        assigne_employee=f""" select `tabAssign Employee`.company as staff_company,`tabAssign Employee Details`.employee_name as employee_name,`tabAssign Employee Details`.employee as employee from `tabAssign Employee`,`tabAssign Employee Details` where `tabAssign Employee`.name=`tabAssign Employee Details`.parent and job_order="{job_order}" and tag_status="Approved" """;

        emp_data=frappe.db.sql(assigne_employee,as_dict=1)
        emp_list=[]
        for i in range(len(emp_data)):
            emp_dic={}
            sql3=f"""select IF(no_show=1, "No Show", " ") as no_show,IF(non_satisfactory=1,"Non Satisfactory"," ") as non_satisfactory,IF(dnr=1,"DNR"," ") as dnr from `tabTimesheet` where job_order_detail='{job_order}' and employee='{emp_data[i].employee}' """
            employees_data=frappe.db.sql(sql3,as_dict=True)
            if(len(employees_data)==0):
                emp_dic["staff_company"]=emp_data[i].staff_company
                emp_dic["employee"]=emp_data[i].employee_name
                emp_dic["no_show"]=""
                emp_dic["non_satisfactory"]=""
                emp_dic["dnr"]=""
                emp_list.append(emp_dic)
            else:
                emp_dic["staff_company"]=emp_data[i].staff_company
                emp_dic["employee"]=emp_data[i].employee_name
                emp_dic["no_show"]=employees_data[0].no_show
                emp_dic["non_satisfactory"]=employees_data[0].non_satisfactory
                emp_dic["dnr"]=employees_data[0].dnr
                emp_list.append(emp_dic)
        return emp_list
    except Exception as e:
        frappe.log_error(e, "Assigned Employee")

@frappe.whitelist(allow_guest=False)
def staff_assigned_employees(job_order):
    try:
        sql=f" select name from `tabAssign Employee` where job_order='{job_order}' and tag_status='Approved' and  company in (select company from `tabEmployee` where email='{frappe.session.user}')"
        assigned_data=frappe.db.sql(sql)
        if(len(assigned_data)>0):
            return "success1"
    except Exception as e:
        frappe.log_error(e, "Staff Employee")


@frappe.whitelist(allow_guest=False)
def staffing_assigned_employee(job_order):
    try:
        assigned_emp=f""" select `tabAssign Employee`.company,`tabAssign Employee`.name as name,`tabAssign Employee Details`.employee_name as employee_name,`tabAssign Employee Details`.employee as employee from `tabAssign Employee`,`tabAssign Employee Details` where `tabAssign Employee`.name=`tabAssign Employee Details`.parent and job_order="{job_order}" and tag_status="Approved" and `tabAssign Employee`.company in (select company from `tabEmployee` where email='{frappe.session.user}' )  """
        emp_data=frappe.db.sql(assigned_emp,as_dict=1)
        emp_list=[]
        for i in range(len(emp_data)):
            emp_dic={}
            sql3=f"""select IF(no_show=1, "No Show", " ") as no_show,IF(non_satisfactory=1,"Non Satisfactory"," ") as non_satisfactory,IF(dnr=1,"DNR"," ") as dnr from `tabTimesheet` where job_order_detail='{job_order}' and employee='{emp_data[i].employee}' """
            employees_data=frappe.db.sql(sql3,as_dict=True)
            if(len(employees_data)==0):
                emp_dic['assign_name']=emp_data[i].name
                emp_dic["staff_company"]=emp_data[i].staff_company
                emp_dic["employee"]=emp_data[i].employee_name
                emp_dic["no_show"]=""
                emp_dic["non_satisfactory"]=""
                emp_dic["dnr"]=""
                emp_list.append(emp_dic)
            else:
                emp_dic['assign_name']=emp_data[i].name
                emp_dic["staff_company"]=emp_data[i].staff_company
                emp_dic["employee"]=emp_data[i].employee_name
                emp_dic["no_show"]=employees_data[0].no_show
                emp_dic["non_satisfactory"]=employees_data[0].non_satisfactory
                emp_dic["dnr"]=employees_data[0].dnr
                emp_list.append(emp_dic)
        return emp_list
    except Exception as e:
        frappe.log_error(e, "Approved Employee")

def unshare_job_order(job):
    if job.bid>0 and job.staff_org_claimed:
        comp_name=f""" select distinct company from `tabUser` where organization_type='Staffing' and email in (select user from `tabDocShare` where share_doctype='Job Order' and share_name='{job.name}' )"""
        comp_data=frappe.db.sql(comp_name,as_list=True)
        for i in comp_data:
            if i[0] not in job.staff_org_claimed:
                user_name=f'select name from `tabUser` where company="{i[0]}"'
                user_data=frappe.db.sql(user_name,as_list=0)
                for i in user_data:
                    del_data=f'''DELETE FROM `tabDocShare` where share_doctype='Job Order' and share_name="{job.name}" and user="{i[0]}"'''
                    frappe.db.sql(del_data)
                    frappe.db.commit()
                
@frappe.whitelist()
def vals(name,comp):
    data=frappe.get_doc('Job Order',name)
    claims=data.claim
    if claims is not None and comp in claims:
        return "success"


@frappe.whitelist(allow_guest=False)
def receive_hire_notification(user, company_type, hiring_org, job_order, staffing_org, emp_detail, doc_name,worker_fill):
    try:
        if(company_type == "Staffing" and user == frappe.session.user):
            dat=f'update `tabAssign Employee` set tag_status="Approved" where name="{doc_name}"'
            frappe.db.sql(dat)
            frappe.db.commit()
            job = frappe.get_doc(jobOrder, job_order)
            frappe.db.set_value(jobOrder, job_order, "worker_filled", (int(worker_fill)+int(job.worker_filled)))
            
            job_sql = '''select select_job,job_site,posting_date_time from `tabJob Order` where name = "{}"'''.format(job_order)
            job_detail = frappe.db.sql(job_sql, as_dict=1)
            lst_sql = ''' select user_id from `tabEmployee` where company = "{}" and user_id IS NOT NULL '''.format(hiring_org)
            user_list = frappe.db.sql(lst_sql, as_list=1)
            l = [l[0] for l in user_list]
            for user in l:
                add(assignEmployees, doc_name, user, read=1, write = 0, share = 0, everyone = 0)
            sub="Employee Assigned"
            msg = f'{staffing_org} has assigned the Employees to the {job_detail[0]["select_job"]}'
            make_system_notification(l,msg,'Assign Employee',doc_name,sub)
            msg = f'{staffing_org} has assigned the Employees to the {job_detail[0]["select_job"]}'
            link =  f'  href="/app/assign-employee/{doc_name}" '
            return joborder_email_template(sub, msg, l, link)
        else:
            return "Something Went Access"
    except Exception as e:
        print(e, frappe.get_traceback())
        frappe.db.rollback()


@frappe.whitelist()
def jobcategory_data(job_order):
    print(job_order,"job_order")
    sql = """ select job_category from `tabJob Category` where parent='{}' """.format(job_order)
    print(sql,"sqllll")
    print(frappe.db.sql(sql),"sql")
    return frappe.db.sql(sql)

@frappe.whitelist()
def claim_order_company(user_name,claimed):
    data=f'select company from `tabEmployee` where email="{user_name}"'
    sq=frappe.db.sql(data,as_list=True)
    for i in sq:
        if i[0] in claimed:
            break
    else:
        return 'unsuccess'


@frappe.whitelist(allow_guest=False)
def staffing_exclussive_org_name(job_order):
    sql = ''' select staff_company from `tabJob Order` where name='{0}' '''.format(job_order)
    return frappe.db.sql(sql, as_dict=1)
    
    
