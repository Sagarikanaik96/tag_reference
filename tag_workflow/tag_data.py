import frappe


@frappe.whitelist()
def submit_values(job_order_name=None,quotation_number=None):
    print(job_order_name)
    q = frappe.db.sql(
        """ select docstatus from `tabQuotation` where job_order='{}'; """.format(job_order_name),as_list=1)
    print(q)
    for i in range(len(q)):
        if q[i][0]==1:
            print(q[i][0])
            break
    else:        
        return "success"
        
@frappe.whitelist()
def update_job_order(job_order_name=None,quotation_name=None):
    print(job_order_name,quotation_name)
    d=frappe.get_doc("Job Order",job_order_name)
    d.quotation_submitted=quotation_name
    d.save()

    return "success"
    
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


@frappe.whitelist()
def send_email_staffing_user(email_list=None,subject = None,body=None,additional_email = None):
    import json
    from frappe.core.doctype.communication.email import make
    email = json.loads(email_list)
    l = [i['email'] for i in email]
    if additional_email:
        v = additional_email.split(',')
        for i in v:
            l.append(i)
    try:
        make(subject = subject, content=body, recipients= l,send_email=True)
        frappe.msgprint("Email Send Succesfully")
        return 1
    except:
        frappe.msgprint("Could Not Send")
        return 0

