import frappe

jobOrder = "Job Order"

@frappe.whitelist()
def company_details(company_name=None):
   x=frappe.db.sql(""" select FEIN,Title,Address,City,State,Zip,contact_name,email,phone_no,primary_language,accounts_payable_contact_name,accounts_payable_email,accounts_payable_phone_number,Industry from `tabCompany` where name="{}" """.format(company_name),as_list=1)
   
   for i in range(len(x[0])):
       if x[0][i]==None:
           break
   else:
       return "success"

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
 
@frappe.whitelist()
def update_job_order(job_name=None,employee_filled=None,staffing_org=None,hiringorg=None):
    user_list = frappe.db.sql(''' select email from `tabUser` where company = "{}"'''.format(staffing_org),as_list=1)
    l = [l[0] for l in user_list]
    from frappe.share import add
    for user in l:
        add(jobOrder, job_name, user, read=1, write = 0, share = 0, everyone = 0,notify = 1)
    x=frappe.get_doc(jobOrder,job_name)
    x.worker_filled=int(employee_filled)+int(x.worker_filled)
    x.staff_org_claimed=str(x.staff_org_claimed)+staffing_org
    x.save()
    sub=f'New Message regarding {job_name} from {hiringorg} is available'
    msg = f'Your Employees has been approved for Work Order {job_name}'
    return send_email(sub,msg,l)


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
    from frappe.share import add
    for user in l:
        add("Assign Employee", doc_name, user, read=1, write = 0, share = 0, everyone = 0,notify = 1)

    msg = f'{staffing_org} has submitted a claim for {s[:-1]} for {job_detail[0]["job_title"]} at {job_detail[0]["job_site"]} on {job_detail[0]["posting_date_time"]}. Please review and/or approve this claim <a href="/app/assign-employee/{doc_name}">Assign Employee</a> .'
    return send_email(None,msg,l)

@frappe.whitelist()
def staff_email_notification(hiring_org=None,job_order=None,job_order_title=None):
    from frappe.share import add

    org_type=frappe.db.sql('''select organization_type from `tabCompany` where name='{}' '''.format(hiring_org),as_list=1)
    if(org_type[0][0]=='Hiring'):
        user_list=frappe.db.sql(''' select email from `tabUser` where organization_type='staffing' ''',as_list=1)
        l = [l[0] for l in user_list]
        for user in l:
            add(jobOrder, job_order, user, read=1, write = 0, share = 0, everyone = 0,notify = 1)
        message=f'New Work Order for {job_order_title} has been created by {hiring_org}.<a href="/app/job-<a href="/app/job-order/{{doc.name}}">Job Order</a>order/{job_order}">View Work Order</a>'
        return send_email("New Work Order",message,l)
    elif org_type[0][0]=="Exclusive Hiring":
        owner_info=frappe.db.sql(''' select owner from `tabCompany` where organization_type="Exclusive Hiring" and name="{}" '''.format(hiring_org),as_list=1)
        company_info=frappe.db.sql(''' select company from `tabUser` where name='{}' '''.format(owner_info[0][0]),as_list=1)
        user_list=frappe.db.sql(''' select email from `tabUser` where company='{}' '''.format(company_info[0][0]),as_list=1)        
        l = [l[0] for l in user_list]
        for user in l:
            add(jobOrder, job_order, user, read=1, write = 0, share = 0, everyone = 0,notify = 1)
        message=f'New Work Order for {job_order_title} has been created by {hiring_org}. <a href="/app/job-<a href="/app/job-order/{{doc.name}}">Job Order</a>order/{job_order}">View Work Order</a>'
        return send_email("New Work Order",message,l)


@frappe.whitelist()
def update_exclusive_org(exclusive_email,staffing_email,staffing_comapny,exclusive_company):
    from frappe.share import add
    try:
        add("Company",staffing_comapny,exclusive_email,write = 0,read = 1,share = 0,everyone=0,notify=1,flags={"ignore_share_permission": 1})
        add("Company",exclusive_company,exclusive_email,write = 0,read = 1,share = 0,everyone=0,notify=1,flags={"ignore_share_permission": 1})

    except Exception as e:
         frappe.log_error(e, "doc share error")