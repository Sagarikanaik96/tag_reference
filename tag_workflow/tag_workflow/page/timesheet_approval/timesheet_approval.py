import frappe
from frappe import _
import json, ast
from frappe.share import add_docshare as add
from tag_workflow.utils.timesheet import approval_notification, denied_notification
from tag_workflow.tag_data import check_mandatory_field
import ast
jobOrder='Job Order'
#-----------------------------#
def get_status(order, company, date):
    sheets = frappe.db.get_list("Timesheet", {"job_order_detail": order, "employee_company": company, "date_of_timesheet": date}, "workflow_state")
    status = [s['workflow_state'] for s in sheets]
    if("Approval Request" in status):
        return "Approval Request"
    elif("Denied" in status or "Open" in status):
        return "In Progress"
    elif("Approved" in status):
        return "Approved"

@frappe.whitelist()
def get_data(company, order):
    try:
        result = []
        if not frappe.db.exists("Company", {"name": company}):
            frappe.msgpprint(_("Company not found"))
            return []

        if not frappe.db.exists("Employee", {"company": company, "user_id": frappe.session.user}):
            frappe.msgprint(_("Company and Job Order info doesn't match with you"))
            return []

        job_order_status = frappe.db.get_value(jobOrder, order, "order_status")
        job_order_owner=frappe.db.get_value(jobOrder, order, "owner")
        user_company=frappe.db.get_value('User',{'name':job_order_owner},'organization_type')
        if user_company=='Staffing':
            data = frappe.db.get_list("Timesheet", {"job_order_detail": order, "employee_company": company}, ["date_of_timesheet", "workflow_state", "job_order_detail", "name"], group_by="date_of_timesheet", order_by="creation asc")
        else:
            data = frappe.db.get_list("Timesheet", {"job_order_detail": order, "employee_company": company,"workflow_state":['not like', '%Open%']}, ["date_of_timesheet", "workflow_state", "job_order_detail", "name"], group_by="date_of_timesheet", order_by="creation asc")

        for d in data:
            d.update({"order_status": job_order_status})
            status = get_status(order, company, d['date_of_timesheet'])
            d.update({"workflow_state": status})
            exported = frappe.db.get_list('Timesheet', {'job_order_detail':d['job_order_detail'], 'date_of_timesheet': d['date_of_timesheet']}, ['ts_exported'], pluck='ts_exported')
            ts_exported = 'Yes' if len(set(exported))==1 and exported[0]==1 else 'No'
            d.update({'ts_exported': ts_exported})
            result.append(d)

            if not frappe.db.exists("DocShare", {"user": frappe.session.user, "share_name": d['name'], "read": 1, "write": 1, "submit": 1}):
                add("Timesheet", d.name, user=frappe.session.user, read=1, write=1, submit=1, notify=0, flags={"ignore_share_permission": 1})
        return result
    except Exception as e:
        frappe.msgprint(e)

#-----------------------------------------------#
@frappe.whitelist()
def get_child_data(order, timesheet=None, date=None):
    try:
        result = []
        company = frappe.db.get_value("Timesheet", {"name": timesheet}, "employee_company")
        job_order_owner=frappe.db.get_value(jobOrder, order, "owner")
        user_company=frappe.db.get_value('User',{'name':job_order_owner},'organization_type')
        if user_company=='Staffing':
            if(date != "null"):
                sql = """ select t.workflow_state, t.name, t.employee, t.employee_name, t.no_show, t.non_satisfactory, t.dnr, t.replaced, t.date_of_timesheet, c.from_time, c.to_time, c.break_start_time, c.break_end_time, c.hours, t.ts_exported from `tabTimesheet` t inner join `tabTimesheet Detail` c where t.name = c.parent and t.job_order_detail = '{0}' and t.date_of_timesheet = '{1}' and t.employee_company = '{2}' order by t.creation asc""".format(order, date, company)
            else:
                sql = """ select t.workflow_state, t.name, t.employee, t.employee_name, t.no_show, t.non_satisfactory, t.dnr, t.replaced, t.date_of_timesheet, c.from_time, c.to_time, c.break_start_time, c.break_end_time, c.hours, t.ts_exported from `tabTimesheet` t inner join `tabTimesheet Detail` c where t.name = c.parent and t.job_order_detail = '{0}' and t.employee_company = '{1}' order by t.creation asc""".format(order, company)
        else:
            if(date != "null"):
                sql = """ select t.workflow_state, t.name, t.employee, t.employee_name, t.no_show, t.non_satisfactory, t.dnr, t.replaced, t.date_of_timesheet, c.from_time, c.to_time, c.break_start_time, c.break_end_time, c.hours, t.ts_exported from `tabTimesheet` t inner join `tabTimesheet Detail` c where t.name = c.parent and t.job_order_detail = '{0}' and t.date_of_timesheet = '{1}' and t.employee_company = '{2}' and t.workflow_state!='Open' order by t.creation asc""".format(order, date, company)
            else:
                sql = """ select t.workflow_state, t.name, t.employee, t.employee_name, t.no_show, t.non_satisfactory, t.dnr, t.replaced, t.date_of_timesheet, c.from_time, c.to_time, c.break_start_time, c.break_end_time, c.hours, t.ts_exported from `tabTimesheet` t inner join `tabTimesheet Detail` c where t.name = c.parent and t.job_order_detail = '{0}' and t.employee_company = '{1}' and t.workflow_state!='Open' order by t.creation asc""".format(order, company)
        

        data = frappe.db.sql(sql, as_dict=1)
        for d in data:
            from_time = ":".join(str(d['from_time']).split(" ").pop().split(":")[:-1])
            to_time = ":".join(str(d['to_time']).split(" ").pop().split(":")[:-1])
            break_start = ":".join(str(d['break_start_time']).split(" ").pop().split(":")[:-1])
            break_end = ":".join(str(d['break_end_time']).split(" ").pop().split(":")[:-1])

            state=employee_status(d)

            result.append({"employee": d['employee'], "employee_name": d['employee_name'], "from_time": from_time, "to_time": to_time, "break_start": break_start, "break_end": break_end, "name": d['name'], "hours": d['hours'], "workflow_state": d['workflow_state'], "state": state, "ts_exported":d["ts_exported"]})

            if not frappe.db.exists("DocShare", {"user": frappe.session.user, "share_name": d['name'], "read": 1, "write": 1, "submit": 1}):
                add("Timesheet", d['name'], user=frappe.session.user, read=1, write=1, submit=1, notify=0, flags={"ignore_share_permission": 1})

        return result
    except Exception as e:
        frappe.msgprint(e)

#------------------------------------------#
@frappe.whitelist()
def approve_timesheets(timesheet, action):
    try:
        data = []
        emp_with_insuficient_details = []
        timesheets=json.loads(timesheet)
        for t in timesheets:
            doc = frappe.get_doc("Timesheet", t)
            emp_fields = check_mandatory_field(doc.employee,1,"1")
            empty_field_str = ""
            for field in emp_fields:
                empty_field_str += ", "+field.title()
                empty_field_str = empty_field_str.replace("_"," ")
            if emp_fields == "success":
                frappe.db.set_value('Timesheet',t,'workflow_state',action)
                frappe.db.set_value('Timesheet',t,'status',"Submitted")
                frappe.db.set_value('Timesheet',t,'docstatus',1)
                data.append({"date": doc.date_of_timesheet, "timesheet": t})
            else:
                empty_field_str = empty_field_str[1:]
                emp_with_insuficient_details.append([doc.employee_name.title(),empty_field_str])

        approval_notification(job_order=doc.job_order_detail,staffing_company=doc.employee_company,date=None, hiring_company=doc.company, timesheet_name=doc.name, timesheet_approved_time=doc.modified, current_time=frappe.utils.now())
        return data[0] if(len(data) > 0) else {"date": "", "timesheet": ""},emp_with_insuficient_details,len(timesheets)
    except Exception as e:
        frappe.throw(e)

        
@frappe.whitelist()
def deny_timesheet(data, count):
    try:
        result = []
        data = json.loads(data)
        count = ast.literal_eval(count)
        for c in range(0, len(count)):
            tm = "timesheet"+str(c)
            res = "reason"+str(c)
            if(tm in data.keys()):
                doc = frappe.get_doc("Timesheet", {"name": data[tm]}, ignore_permissions=True)
                frappe.db.set_value('Timesheet',data[tm],'workflow_state',"Denied")
                frappe.db.set_value('Timesheet',data[tm],'status',"Denied")
                if(res in data.keys()):
                    frappe.db.set_value('Timesheet',data[tm],'dispute',data[res])
                result.append({"date": doc.date_of_timesheet, "timesheet": doc.name})
        denied_notification(job_order=doc.job_order_detail,staffing_company=doc.employee_company, hiring_company=doc.company, timesheet_name=doc.name)
        return result[0] if(len(result) > 0) else {"date": "", "timesheet": ""}
    except Exception as e:
        frappe.msgprint(e)

#Employee Status
def employee_status(d):
    status = []
    state=''
    if(d.dnr == 1):
        status.append('DNR')
    if(d.non_satisfactory == 1):
        status.append('Non Satisfactory')
    if(d.no_show == 1):
        status.append('No Show')
    if(len(status)>0):
        state=','.join(status)
    if(d.replaced == 1):
        state = 'Replaced'
    return state

@frappe.whitelist()
def get_selected_ts(checkbox_values):
    try:
        ts_list = []
        values=ast.literal_eval(checkbox_values)
        for i in values:
            if '_' in i:
                ts = frappe.db.get_list('Timesheet', {'date_of_timesheet': i.split('_')[1], 'job_order_detail': i.split('_')[0]}, ['name'], pluck='name')
                for t in ts:
                    ts_list.append(t)
            elif 'TS' in i:
                ts_list.append(i)
        return ts_list
    except Exception as e:
        frappe.log_error(e, 'get_selected_ts Error')
