import frappe
from frappe import _, msgprint
from frappe.share import add
from pymysql.constants.ER import NO
from tag_workflow.utils.notification import sendmail, make_system_notification
import json
@frappe.whitelist()
def send_timesheet_for_approval(employee, docname):
    try:
        user_list = frappe.db.sql(""" select parent from `tabHas Role` where role = "Staffing Admin" and parent in(select user_id from `tabEmployee` where user_id != '' and company = (select company from `tabEmployee` where name = %s)) """, employee, as_dict=1)

        for user in user_list:
            if not frappe.db.exists("User Permission",{"user": user.parent,"allow": "Timesheet","apply_to_all_doctypes":1, "for_value": docname}):
                add("Timesheet", docname, user=user.parent, read=1, write=1, submit=1, notify=1)
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

@frappe.whitelist()
def company_rating(hiring_company=None,staffing_company=None,ratings=None,job_order=None):
    ratings = json.loads(ratings)
    if 'Rating' in ratings.keys():
        doc = frappe.new_doc('Company Review')
        doc.staffing_company=staffing_company
        doc.hiring_company=hiring_company
        doc.job_order=job_order
        doc.rating=ratings['Rating']
        if 'Comment' in ratings.keys():
            doc.comments=ratings['Comment']
        doc.save(ignore_permissions=True)
        staff_member=frappe.db.sql(''' select email from `tabUser` where company='{}' '''.format(staffing_company),as_list=1)
        for staff in staff_member:
            add("Company Review", doc.name, staff[0], read=1, write = 0, share = 0, everyone = 0,notify = 1, flags={"ignore_share_permission": 1})
        company_rate=frappe.db.sql(''' select average_rating from `tabCompany` where name='{}' '''.format(staffing_company),as_list=1)
        if (company_rate[0][0]==None):
            doc=frappe.get_doc('Company',staffing_company)
            doc.average_rating=ratings['Rating']
            doc.save()
        else:
            average_rate=frappe.db.sql(''' select rating from `tabCompany Review` where staffing_company='{}' '''.format(staffing_company),as_list=1)
            if average_rate[0][0]!=None:
                rating=[float(i) for i in average_rate[0]]
                doc=frappe.get_doc('Company',staffing_company)
                avg_rating=sum(rating)/len(rating)
                doc.average_rating=str(avg_rating)
                doc.save()

        return "success"
