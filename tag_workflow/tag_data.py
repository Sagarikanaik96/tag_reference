import frappe
  
@frappe.whitelist()

def company_details(company_name=None):
   x=frappe.db.sql(""" select FEIN,Title,Address,City,State,Zip,contact_name,email,phone_no,primary_language,accounts_payable_contact_name,accounts_payable_email,accounts_payable_phone_number,Industry from `tabCompany` where name="{}" """.format(company_name),as_list=1)
   print(x)
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
    except:
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
def update_job_order(job_name=None,employee_filled=None):
   print("ebdch snvjdnx")
   print(job_name,employee_filled)
   x=frappe.get_doc("Job Order",job_name)
   print(x.worker_filled)
   x.worker_filled=int(employee_filled)+int(x.worker_filled)
   x.save()
   return "success"


@frappe.whitelist()
def receive_hiring_notification(hiring_org,job_order,staffing_org,emp_detail,doc_name):
    import json
    job_detail = frappe.db.sql('''select job_title,job_site,posting_date_time from `tabJob Order` where name = "{}"'''.format(job_order),as_dict=1)
    user_list = frappe.db.sql(''' select email from `tabUser` where company = "{}"'''.format(hiring_org),as_list=1)
    
    v = json.loads(emp_detail)
    s = ''
    for i in v:
        s += i['employee_name'] + ','

    l = [l[0] for l in user_list]
    msg = f'{staffing_org} has submitted a claim for {s[:-1]} for {job_detail[0]["job_title"]} at {job_detail[0]["job_site"]} on {job_detail[0]["posting_date_time"]}. Please review and/or approve this claim <a href="/app/assign-employee/{doc_name}">Assign Employee</a> .'
    return send_email(None,msg,l)

