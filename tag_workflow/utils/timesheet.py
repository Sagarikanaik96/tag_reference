import frappe
from frappe import _, msgprint
from frappe.share import add
import datetime
from pymysql.constants.ER import NO
from tag_workflow.utils.notification import sendmail, make_system_notification
import json
from frappe.utils import time_diff_in_seconds

# global #
JOB = "Job Order"

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
    return frappe.db.sql(""" select employee, employee_name from `tabAssign Employee Details` where parent in(select name from `tabAssign Employee` where job_order = %(job_order)s and tag_status = "Approved") """, { 'job_order': job_order})


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
            make_system_notification(users, message, JOB, job_order, subject)
            sendmail(users, message, subject, JOB, job_order)
    except Exception as e:
        frappe.log_error(e, "Timesheet Email Error")
        frappe.throw(e)

#-------assign employee----------#
@frappe.whitelist()
def check_employee_editable(job_order, name, creation):
    try:
        is_editable = 0
        order = frappe.get_doc(JOB, job_order)

        time_format = '%Y-%m-%d %H:%M:%S'
        from_date = datetime.datetime.strptime(str(order.from_date), time_format)
        to_date = datetime.datetime.strptime(str(order.to_date), time_format)
        creation = datetime.datetime.strptime(str(creation[0:19]), time_format)
        today = datetime.datetime.now()

        if(today.date() >= to_date.date()):
            return is_editable

        time_diff = creation - from_date
        emp_list = frappe.db.sql(""" select no_show, non_satisfactory, dnr from `tabTimesheet` where docstatus != 1 and job_order_detail = %s and employee in (select employee from `tabAssign Employee Details` where parent = %s) """,(job_order, name), as_dict=1)

        for emp in emp_list:
            if((emp.no_show == 1 or emp.dnr == 1 or emp.non_satisfactory == 1) and (time_diff.seconds/60/60 > 2)):
                is_editable = 1

        return is_editable
    except Exception as e:
        print(e)
        is_editable = 1
        frappe.error_log(frappe.get_traceback(), "check_employee_editable")
        return is_editable

@frappe.whitelist()
def company_rating(hiring_company=None,staffing_company=None,ratings=None,job_order=None):
    ratings = json.loads(ratings)
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
    if (len(company_rate)==0 or company_rate[0][0]==None):
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

@frappe.whitelist()
def approval_notification(job_order=None,staffing_company=None,date=None,hiring_company=None,timesheet_name=None,timesheet_approved_time=None,current_time=None):
    if(time_diff_in_seconds(current_time,timesheet_approved_time)<=5):
        job_order_data=frappe.db.sql(''' select select_job,job_site,creation from `tabJob Order` where name='{}' '''.format(job_order),as_dict=1)
        job_location=job_order_data[0].job_site
        job_title=job_order_data[0].select_job
        subject='Timesheet Approval'
        msg=f'{staffing_company} has approved the {timesheet_name} timesheet for {job_title} at {job_location}'
        user_list=frappe.db.sql(''' select email from `tabUser` where company='{}' '''.format(hiring_company),as_list=1)        
        hiring_user = [hiring_user[0] for hiring_user in user_list]
        make_system_notification(hiring_user,msg,'Timesheet',timesheet_name,subject)
        sendmail(hiring_user, msg, subject, 'Timesheet', timesheet_name)
