# Copyright (c) 2022, SourceFuse and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
import json, datetime
from tag_workflow.utils.notification import sendmail, make_system_notification
from frappe import enqueue
from frappe.share import add
from tag_workflow.utils.timesheet import unsatisfied_organization, do_not_return, no_show_org

TM_FT = "%Y-%m-%d %H:%M:%S"

class AddTimesheet(Document):
    pass


#------------------------------------#
def get_child_time(posting_date, from_time, to_time, child_from=None, child_to=None, break_from=None, break_to=None):
    try:
        if(child_from and child_to):
            from_time = datetime.datetime.strptime((posting_date+" "+str(child_from)), TM_FT)
            to_time = datetime.datetime.strptime((posting_date+" "+str(child_to)), TM_FT)

        if(break_from and break_to):
            break_from = datetime.datetime.strptime((posting_date+" "+str(break_from)), TM_FT)
            break_to = datetime.datetime.strptime((posting_date+" "+str(break_to)), TM_FT)
        else:
            break_from = ''
            break_to = ''
        return from_time, to_time, break_from, break_to
    except Exception:
        return from_time, to_time, '', ''

def check_old_timesheet(child_from, child_to, employee, job_order):
    try:
        sql = """select c.name, c.parent from `tabTimesheet Detail` c where (('{1}' >= c.from_time and '{1}' <= c.to_time) or ('{2}' >= c.from_time and '{2}' <= c.to_time) or ('{1}' <= c.from_time and '{2}' >= c.to_time)) and parent in (select name from `tabTimesheet` where employee = '{0}') """.format(employee, child_from, child_to)
        data = frappe.db.sql(sql, as_dict=1)
        return 1 if(len(data) > 0) else 0
    except Exception as e:
        print(e)
        return 0

def check_if_employee_assign(items, job_order):
    try:
        is_employee = 1
        for item in items:
            sql = """ select employee from `tabAssign Employee Details` where employee = '{0}' and parent in (select name from `tabAssign Employee` where tag_status = "Approved" and job_order = '{1}') """.format(item['employee'], job_order)
            result = frappe.db.sql(sql, as_dict=1)
            if(len(result) == 0):
                frappe.msgprint(_("Employee with ID <b>{0}</b> not assigned to this Job Order(<b>{1}</b>). Please fill the details correctly and re-submit timesheets").format(item['employee'], job_order))
                is_employee = 0
        return is_employee
    except Exception as e:
        frappe.msgprint(e)
        return False

def get_datetime(date, from_time, to_time):
    try:
        from_time = datetime.datetime.strptime((date+" "+from_time), TM_FT)
        to_time = datetime.datetime.strptime((date+" "+to_time), TM_FT)
        return from_time, to_time
    except Exception as e:
        frappe.msgprint(e)

#---------------------------------------------------#

@frappe.whitelist()
def update_timesheet(user, company_type, items, job_order, date, from_time, to_time, break_from_time=None, break_to_time=None):
    try:
        added = 0
        timesheets = []
        items = json.loads(items)
        is_employee = check_if_employee_assign(items, job_order)
        if(is_employee == 0):
            return False

        job = frappe.get_doc("Job Order", {"name": job_order})
        posting_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
        if(posting_date >= job.from_date and posting_date <= job.to_date):
            from_time, to_time = get_datetime(date, from_time, to_time)
            for item in items:
                child_from, child_to, break_from, break_to = get_child_time(date, from_time, to_time, item['from_time'], item['to_time'], item['break_from'], item['break_to'])
                is_ok = check_old_timesheet(child_from, child_to, item['employee'], job_order)
                if(is_ok == 0):
                    timesheet = frappe.get_doc(dict(doctype = "Timesheet", company=job.company, job_order_detail=job_order, employee = item['employee'], from_date=job.from_date, to_date=job.to_date, job_name=job.select_job, per_hour_rate=job.per_hour, flat_rate=job.flat_rate, status_of_work_order=job.order_status, date_of_timesheet=date))

                    timesheet.append("time_logs", {
                        "activity_type": job.select_job, "from_time": child_from, "to_time": child_to, "hrs": str(item['hours'])+" hrs",
                        "hours": float(item['hours']), "is_billable": 1, "billing_rate": job.per_hour, "flat_rate": job.flat_rate, "break_start_time": break_from,
                        "break_end_time": break_to, "extra_hours": float(item['overtime_hours']), "extra_rate": float(item['overtime_rate'])
                    })

                    timesheet.insert(ignore_permissions=True)
                    timesheet = add_status(timesheet, item['status'], item['employee'], job.company, job_order)
                    timesheet.save(ignore_permissions=True)
                    timesheet_status_data=f'update `tabTimesheet` set workflow_state="Approval Request" where name="{timesheet.name}"'
                    frappe.db.sql(timesheet_status_data)
                    frappe.db.commit()
                    timesheets.append({"employee": item['employee'], "docname": timesheet.name, "company": job.company, "job_title": job.select_job})
                    added = 1
                else:
                    frappe.msgprint(_("Timesheet is already available for employee <b>{0}</b>(<b>{1}</b>) on the given datetime.").format(item["employee_name"],item['employee']))
        else:
            frappe.msgprint(_("Date must be in between Job Order start date and end date for timesheets"))

        enqueue("tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.send_timesheet_for_approval", timesheets=timesheets)
        return True if added == 1 else False
    except Exception as e:
        frappe.msgprint(e)

#--------------------------------------------------#
def add_status(timesheet, status, employee, company, job_order):
    try:
        emp = frappe.get_doc("Employee", employee, ignore_permissions=True)
        if(status == "DNR"):
            timesheet.dnr = 1
            do_not_return(emp, company, job_order)
        elif(status == "No Show"):
            timesheet.no_show = 1
            for item in timesheet.time_logs:
                item.hours = 0
                item.is_billable = 0
                item.billing_rate = 0
                item.flat_rate = 0
                item.billing_amount = 0
            no_show_org(emp, company, job_order)
        elif(status == "Non Satisfactory"):
            timesheet.non_satisfactory = 1
            unsatisfied_organization(emp, company, job_order)
        return timesheet
    except Exception:
        return timesheet

#-------------------------------------------------------#
def send_timesheet_for_approval(timesheets):
    try:
        for time in timesheets:
            sql = """ select parent from `tabHas Role` where role in ("Staffing Admin", "Staffing User") and parent in(select user_id from `tabEmployee` where user_id != '' and company = (select company from `tabEmployee` where name = '{0}')) """.format(time['employee'])
            user_list = frappe.db.sql(sql, as_dict=1)
            staffing_user = []

            for user in user_list:
                if not frappe.db.exists("User Permission",{"user": user.parent,"allow": "Timesheet","apply_to_all_doctypes":1, "for_value": time['docname']}):
                    add("Timesheet", time['docname'], user=user.parent, read=1, write=1, submit=1, notify=0, flags={"ignore_share_permission": 1})
                    perm_doc = frappe.get_doc(dict(doctype="User Permission", user=user.parent, allow="Timesheet", for_value=time['docname'], apply_to_all_doctypes=1))
                    perm_doc.save(ignore_permissions=True)
                if user.parent not in staffing_user:
                    staffing_user.append(user.parent)

            today = datetime.date.today()
            msg = f'{time["company"]} has submitted a timesheet on {today} for {time["job_title"]} for approval.'
            subject = 'Timesheet For Approval'
            make_system_notification(staffing_user, msg, 'Timesheet', time['docname'], subject)
            dnr_notification(time,staffing_user)
            subject = 'Timesheet For Approval'

            sendmail(staffing_user, msg, subject, 'Timesheet', time['docname'])
    except Exception as e:
        frappe.log_error(e, "Timesheet Approval")

@frappe.whitelist()
def job_order_name(doctype,txt,searchfield,page_len,start,filters):
    try:
        company=filters.get('company')
        company_type=filters.get('company_type')
        if(company_type=='Staffing'):
            sql=f'''select name from `tabJob Order` where company_type="Exclusive" and bid>0 and company in (select name from `tabCompany` where parent_staffing="{company}") '''
            return frappe.db.sql(sql)
    except Exception as e:
        frappe.log_error(e, "Job Order For Timesheet")
        frappe.throw(e)
@frappe.whitelist()
def dnr_notification(time,staffing_user):
    dnr_timesheet=frappe.get_doc('Timesheet',time['docname'])

    if(dnr_timesheet.dnr==1):
        message = f'<b>{dnr_timesheet.employee_name}</b> has been marked as <b>DNR</b> for work order <b>{dnr_timesheet.job_order_detail}</b> on <b>{datetime.datetime.now()}</b> with <b>{dnr_timesheet.company}</b>. There is time to substitute this employee for today’s work order {datetime.date.today()}'
        subject = 'DNR'
        make_system_notification(staffing_user, message, 'Timesheet', time['docname'], subject)
    if(dnr_timesheet.non_satisfactory==1):
        message = f'<b>{dnr_timesheet.employee_name}</b> has been marked as <b>Non Satisfactory</b> for work order <b>{dnr_timesheet.job_order_detail}</b> on <b>{datetime.datetime.now()}</b> with <b>{dnr_timesheet.company}</b>.'
        subject = 'Non Satisfactory'
        make_system_notification(staffing_user, message, 'Timesheet', time['docname'], subject)
    if(dnr_timesheet.no_show==1):
        message = f'<b>{dnr_timesheet.employee_name}</b> has been marked as <b>No Show</b> for work order <b>{dnr_timesheet.job_order_detail}</b> on <b>{datetime.datetime.now()}</b> with <b>{dnr_timesheet.company}</b>.'
        subject = 'No Show'
        make_system_notification(staffing_user, message, 'Timesheet', time['docname'], subject)
       