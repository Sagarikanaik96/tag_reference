import frappe
from frappe import _
from frappe.share import add
from frappe import enqueue
from tag_workflow.utils.notification import sendmail, make_system_notification
from frappe.utils import get_datetime,now
from frappe.utils import date_diff
import json

jobOrder = "Job Order"
assignEmployees = "Assign Employee"

@frappe.whitelist()
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



@frappe.whitelist()
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
        make(subject = subject, content=content, recipients= recipients,send_email=True)
        frappe.msgprint("Email Send Succesfully")
        return True
    except Exception as e:
        frappe.log_error(e, "Doc Share Error")
        frappe.msgprint("Could Not Send")
        return False

def joborder_email_template(subject = None,content = None,recipients = None,link=None):
    try:
        from frappe.core.doctype.communication.email import make
        make(subject = subject, content=frappe.render_template("templates/emails/email_template_custom.html",
            {"conntent":content,"subject":subject,"link":link}),
            recipients= recipients,send_email=True)
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
        sql = """ select employee from `tabAssign Employee Details` where parent = '{0}' """.format(name)
        emps = frappe.db.sql(sql, as_dict=1)
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
        return sendmail(users, msg, sub, assignEmployees, name)
    except Exception as e:
        frappe.db.rollback()
        frappe.error_log(e, "final_notification")
        frappe.throw(e)


@frappe.whitelist()
def receive_hiring_notification(hiring_org,job_order,staffing_org,emp_detail,doc_name,no_of_worker_req,is_single_share,job_title):
    try:
        import json
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
            return joborder_email_template(sub,msg,l,link)
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
            chat_room_created(hiring_org,staffing_org,job_order)

        else:
            if(staffing_org not in job_order.claim):
                job_order.claim=str(job_order.claim)+str(",")+staffing_org
                chat_room_created(hiring_org,staffing_org,job_order)

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
        frappe.error_log(e, "Partial Job order Failed ")
                
   
@frappe.whitelist()
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
        frappe.db.rollback()

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

    sql = """ select fein, title, address, city, state, zip, contact_name, email, phone_no, primary_language,accounts_receivable_rep_email,accounts_receivable_name,accounts_receivable_phone_number, cert_of_insurance,safety_manual,w9 from `tabCompany` where name="{}" """.format(company_details)

    company_info = frappe.db.sql(sql, as_list=1)
    is_ok = "failed"
    if None in company_info[0]:
        return is_ok
    if(len(comp_data.job_site)==0 or len(comp_data.industry_type)==0 or len(comp_data.employees)==0):
        return is_ok
    return "success"


@frappe.whitelist()
def update_staffing_user_with_exclusive(company,company_name):
    from frappe.share import add

    sql = '''select name from `tabUser` where company = "{}" and tag_user_type = 'Staffing User' '''.format(company)
    a = frappe.db.sql(sql, as_list=1)
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
        sql = """ select name, employee_name from `tabEmployee` where company=%(emp_company)s and status='Active' and (name NOT IN (select parent from `tabBlocked Employees`  where blocked_from=%(company)s) and (name NOT IN (select parent from `tabUnsatisfied Organization`  where unsatisfied_organization_name='{0}')) and (name NOT IN (select parent from `tabDNR` BE where dnr='{1}')) """.format(emp_company, company)

        return frappe.db.sql(sql)
    else:
        sql = """select name, employee_name from `tabEmployee` where company='{0}' and status='Active' and (job_category = '{1}' or job_category IS NULL) and (name NOT IN (select parent from `tabBlocked Employees`  where blocked_from='{2}')) and (name NOT IN (select parent from `tabDNR`  where dnr='{2}' )) and (name NOT IN (select parent from `tabUnsatisfied Organization`  where unsatisfied_organization_name='{2}'))""".format(emp_company, job_category, company)


        return frappe.db.sql(sql)
    
@frappe.whitelist()
def get_org_site(doctype, txt, searchfield, page_len, start, filters):
    company=filters.get('job_order_company')
    sql = ''' select job_site from `tabCompany Site` where parent='{0}' '''.format(company)
    return frappe.db.sql(sql)

@frappe.whitelist()
def job_site_employee(doctype, txt, searchfield, page_len, start, filters):

    company=filters.get('job_order_company')
    sql = ''' select name from `tabEmployee` where company='{0}' '''.format(company)
    return frappe.db.sql(sql)


@frappe.whitelist()
def hiring_category(doctype,txt,searchfield,page_len,start,filters):
    company=filters.get('hiring_company')
    sql = ''' select industry_type from `tabIndustry Types` where parent='{0}' '''.format(company)
    return frappe.db.sql(sql)


@frappe.whitelist()
def org_industy_type(company=None):
    sql = ''' select industry_type from `tabIndustry Types` where parent='{0}' '''.format(company)
    return frappe.db.sql(sql)


@frappe.whitelist()
def delete_file_data(file_name):
    sql = '''Delete from `tabFile` where file_name = "{}"'''.format(file_name)
    frappe.db.sql(sql)

def job_order_notification(job_order_title,hiring_org,job_order,subject,l):
    msg=f'New Work Order for a {job_order_title} has been created by {hiring_org}.'
    make_system_notification(l,msg,jobOrder,job_order,subject)   
    message=f'New Work Order for a {job_order_title} has been created by {hiring_org}.'
    link = f' href="/app/assign-employee/{job_order}"'
    return joborder_email_template(subject,message,l,link)
    
@frappe.whitelist()
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
    job_order_data=frappe.get_all(jobOrder,fields=['name','from_date','to_date','order_status'])
    now_date = get_datetime(now())
    for job in job_order_data:
        start_date = job.from_date if job.from_date else ""
        end_date = job.to_date if job.to_date else ""

        if now_date<start_date:
            frappe.db.set_value(jobOrder, job.name, "order_status", "Upcoming")
        elif now_date>end_date:
            frappe.db.set_value(jobOrder, job.name, "order_status", "Completed")
        else:
            frappe.db.set_value(jobOrder, job.name, "order_status", "Ongoing")



@frappe.whitelist()
def sales_invoice_notification(job_order=None,company=None,invoice_name=None):
    try:
        sql = '''  select workflow_state from `tabTimesheet` where job_order_detail='{0}' and employee_company='{1}' '''.format(job_order, company)
        data=frappe.db.sql(sql, as_list=1)
        if(len(data)>0):
            for i in data:
                if i[0]!="Approved":
                    break
            else:
                sql = """ Select company,select_job,job_site from `tabJob Order` where name='{0}' """.format(job_order)
                job_order_details=frappe.db.sql(sql, as_dict=1)
                msg=f'{company} has submitted an invoice for {job_order_details[0].select_job} at {job_order_details[0].job_site}.'
                subject="Invoice Submitted"

                sql = ''' select user_id from `tabEmployee` where company='{}' and user_id IS NOT NULL '''.format(job_order_details[0].company)
                user_list=frappe.db.sql(sql, as_list=1)
                if(len(user_list)>0):
                    l = [l[0] for l in user_list]
                    for user in l:
                        add("Sales Invoice", invoice_name, user, read=1, write = 0, share = 0, everyone = 0)
                    make_system_notification(l,msg,'Sales Invoice',invoice_name,subject)   
                    return send_email(subject,msg,l)
    except Exception as e:
        frappe.db.rollback()
        frappe.error_log(e, "invoice notification")
        frappe.throw(e)
             
@frappe.whitelist()
def hiring_org_name(current_user):
    sql = ''' select company from `tabEmployee` where email='{0}' '''.format(current_user)
    user_company=frappe.db.sql(sql, as_list=1)
    if(len(user_company)==1):
        return 'success'
           
@frappe.whitelist()
def designation_activity_data(doc,method):
    docs=frappe.new_doc('Activity Type')
    docs.activity_type=doc.name
    docs.insert()

@frappe.whitelist()
def filter_company_employee(doctype, txt, searchfield, page_len, start, filters):
    try:
        company=filters.get('company')
        sql = """ select name, employee_name,company from `tabEmployee` where company='{0}' """.format(company)
        return frappe.db.sql(sql)
    except Exception as e:
        frappe.db.rollback()
        frappe.error_log(e, "Staffing Company Error")
        frappe.throw(e)

@frappe.whitelist()
def contact_company(doctype, txt, searchfield, page_len, start, filters):
    company=filters.get('company')
    sql = """ select name from `tabCompany` where name='{}' """.format(company)
    return frappe.db.sql(sql) 

@frappe.whitelist()
def email_recipient(doctype, txt, searchfield, page_len, start, filters):
    company=filters.get('company')
    sql = """ select name from `tabContact` where company='{}' """.format(company)
    return frappe.db.sql(sql) 



 
def single_job_order_notification(job_order_title,hiring_org,job_order,subject,l):
    try:
        msg=f'{hiring_org} is requesting a fulfillment of a work order for {job_order_title} specifically with your Company.  Please respond.'
        make_system_notification(l,msg,jobOrder,job_order,subject)   
        message=f'{hiring_org} is requesting a fulfillment of a work order for {job_order_title} specifically with your Company . Please respond. <a href="/app/job-order/{{doc.name}}">View Work Order</a>'
        return send_email(subject,message,l)
    except Exception as e:
        frappe.error_log(e, "Single Job Order Notification Error")

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
        doc.room_name=str(job_order.name)+"_"+staffing_org
        doc.type="Group"
        doc.members=members
        doc.save()
    except Exception as e:
        frappe.error_log(e, "chat room creation error")

@frappe.whitelist()
def assign_employee_resume_update(employee,name):
    sql = """ select resume from `tabEmployee` where name='{}' """.format(employee)
    data = frappe.db.sql(sql,as_dict=1)
    if (len(data)>0 and data[0]["resume"]):
        sql =""" UPDATE `tabAssign Employee Details` SET resume='{0}' WHERE name='{1}'; """.format(data[0]["resume"],name)
        frappe.db.sql( sql)
        frappe.db.commit()
    return True
@frappe.whitelist()
def joborder_resume(name):
    sql = """ select resume from `tabEmployee` where name='{}' """.format(name)
    return frappe.db.sql(sql,as_dict=1)

@frappe.whitelist()
def lead_org(current_user):
    sql = ''' select company from `tabEmployee` where email='{0}' '''.format(current_user)
    user_company=frappe.db.sql(sql, as_list=1)
    if(len(user_company)==1):
        return 'success'
    

@frappe.whitelist()
def timesheet_detail(job_order):
    sql = ''' select * from `tabTimesheet` where job_order_detail='{0}' '''.format(job_order)
    sales_sql= ''' select * from `tabSales Invoice` where job_order='{0}' '''.format(job_order)

    user_company=frappe.db.sql(sql, as_list=1)
    sales_company=frappe.db.sql(sales_sql, as_list=1)


    if(len(user_company)>0 and len(sales_company)>1):
        return 'success1'
    elif(len(user_company)>0):
        return 'success'

