import frappe


@frappe.whitelist()
def assign_quotation(quotation_name=None, job_order_name=None):
    print('assign quotation')
    q = frappe.db.sql(
        """ select owner from `tabJob Order` where name='{}'; """.format(job_order_name))
    print(q[0][0])
    d = frappe.get_doc({
        "doctype": "ToDo",
        "owner": q[0][0],
        "reference_type": "Quotation",
        "reference_name": quotation_name,
        "description": "Quotation Made for Job order assigned "+job_order_name,
        "priority": "Medium",
        "status": "Open",
        "assigned_by": frappe.session.user,
    }).insert(ignore_permissions=True)

    return "success"
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
    print(d)
    print(d.no_of_workers)
    d.quotation_submitted=quotation_name
    d.save()

    return "success"




