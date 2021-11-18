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
def update_timesheet(job_order_detail):
    value = frappe.db.sql('''select select_job,posting_date_time from `tabJob Order` where name = "{}" '''.format(job_order_detail),as_dict = 1)
    return value[0]['select_job'],value[0]['posting_date_time']