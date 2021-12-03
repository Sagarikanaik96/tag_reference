import frappe
from frappe import _, msgprint
from frappe.share import add

@frappe.whitelist()
def send_timesheet_for_approval(employee, docname):
    try:
        user_list = frappe.db.sql(""" select parent from `tabHas Role` where role = "Staffing Admin" and parent in(select user_id from `tabEmployee` where user_id != '' and company = (select company from `tabEmployee` where name = %s)) """, employee, as_dict=1)

        for user in user_list:
            if not frappe.db.exists("User Permission",{"user": user.parent,"allow": "Timesheet","apply_to_all_doctypes":1, "for_value": docname}):
                add("Timesheet", docname, user=user.parent, read=1, write=1)
                perm_doc = frappe.get_doc(dict(doctype="User Permission",user=user.parent,allow="Timesheet",for_value=docname,apply_to_all_doctypes=1))
                perm_doc.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, "Job Order Approval")
        frappe.throw(e)

@frappe.whitelist(allow_guest=True)
@frappe.validate_and_sanitize_search_inputs
def get_timesheet_employee(doctype, txt, searchfield, start, page_len, filters):
    job_order = filters.get('job_order')
    return frappe.db.sql(""" select employee,employee_name from `tabAssign Employee Details` where parent in(select name from `tabAssign Employee` where job_order = %(job_order)s and tag_status = "Approved") """, { 'job_order': job_order})


@frappe.whitelist()
def notify_email(job_order, employee, value, subject, company, employee_name, date):
    try:
        user_list = frappe.db.sql(""" select name from `tabUser` where company = (select company from `tabEmployee` where name = %s) """,employee, as_dict=1)
        
        if(int(value)):
            message = f'<b>{employee_name}</b> has been marked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>.'
        else:
            message = f'<b>{employee_name}</b> has been unmarked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>.'

        users = []
        for user in user_list:
            users.append(user['name'])

        if users:
            make_system_notification(users, message, "Job Order", job_order, subject)
            sendmail(users, message, subject, "Job Order", job_order)
    except Exception as e:
        frappe.log_error(e, "Timesheet Email Error")
        frappe.throw(e)


def sendmail(emails, message, subject, doctype, docname):
    try:
        frappe.sendmail(emails, subject=subject, delayed=False, reference_doctype=doctype, reference_name=docname, message=message)
    except Exception as e:
        frappe.error_log(e, "Frappe Mail")
        frappe.throw(e)


def make_system_notification(users, message, doctype, docname, subject):
    try:
        for user in users:
            notification = frappe.get_doc(dict(doctype="Notification Log", document_type=doctype, document_name=docname, subject=message, for_user=user, from_user=frappe.session.user, email_content=message))
            notification.save(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(e, "System Notification")
        frappe.throw(e)
