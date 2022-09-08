# Copyright (c) 2022, SourceFuse and contributors
# For license information, please see license.txt

import datetime
import frappe
from frappe import _
from frappe.model.document import Document
import json, datetime
from tag_workflow.utils.notification import sendmail, make_system_notification
from frappe import enqueue
from frappe.share import add
from tag_workflow.utils.timesheet import unsatisfied_organization, do_not_return, no_show_org

TM_FT = "%Y-%m-%d %H:%M:%S"
jobOrder='Job Order'
class AddTimesheet(Document):
    pass


#------------------------------------#
def get_child_time(posting_date, fromtime=None, totime=None, child_from=None, child_to=None, break_from=None, break_to=None):
    try:
        if(child_from and child_to):
            from_time = datetime.datetime.strptime((posting_date+" "+str(child_from)), TM_FT)
            to_time = datetime.datetime.strptime((posting_date+" "+str(child_to)), TM_FT)
        else:
            from_time = ''
            to_time = ''

        if(break_from and break_to):
            break_from = datetime.datetime.strptime((posting_date+" "+str(break_from)), TM_FT)
            break_to = datetime.datetime.strptime((posting_date+" "+str(break_to)), TM_FT)
        else:
            break_from = ''
            break_to = ''
        return from_time, to_time, break_from, break_to
    except Exception:
        return fromtime, totime, '', ''

def check_old_timesheet(child_from, child_to, employee):
    try:
        data = []
        if(child_from and child_to):
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

            rep_sql = """ select employee from `tabReplaced Employee` where employee = '{0}' and parent in (select name from `tabAssign Employee` where tag_status = "Approved" and job_order = '{1}') """.format(item['employee'], job_order)
            rep_result = frappe.db.sql(rep_sql, as_dict=1)

            if(len(result) == 0 and len(rep_result) == 0):
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

def check_cur_selected(cur_selected):
        cur_selected = json.loads(cur_selected)
        if len(cur_selected) == 0:
            frappe.msgprint(_("Please select atleast one timesheet to submit."))
        return cur_selected
#---------------------------------------------------#

@frappe.whitelist()
def update_timesheet(user, company_type, items, cur_selected, job_order, date, from_time, to_time, break_from_time=None, break_to_time=None,save=None):
    try:
        added = 0
        timesheets = []
        items = json.loads(items)
        cur_selected = check_cur_selected(cur_selected)
        is_employee = check_if_employee_assign(items, job_order)
        if(is_employee == 0):
            return False

        job = frappe.get_doc(jobOrder, {"name": job_order})
        posting_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
    
        if(posting_date >= job.from_date and posting_date <= job.to_date):
            from_time, to_time = get_datetime(date, from_time, to_time)
            selected_items = (selected_item for selected_item in items if selected_item["name"] in cur_selected['items'])
            for item in selected_items:
                tip_amount=check_tip(item)
                child_from, child_to, break_from, break_to = get_child_time(date, from_time, to_time, item['from_time'], item['to_time'], item['break_from'], item['break_to'])
                is_ok = check_old_timesheet(child_from, child_to, item['employee'])
                if(is_ok == 0):
                    week_job_hours, week_all_hours, all_job_hours, week_hiring_hours = timesheet_biiling_hours(jo=job_order, timesheet_date=posting_date, employee=item['employee'], user= frappe.session.user)
                    cur_timesheet_hours=item['hours']
                    w1= all_week_jo(employee=item['employee'], jo=job_order,timesheet_date=posting_date)
                    emp=item['employee']
                    w1, overtime_hours, overtime_all_hours, overtime_hiring_hours, hiring_timesheet_oh= sub_update_timesheet(week_job_hours, w1, cur_timesheet_hours, week_all_hours,week_hiring_hours)
                    emp_pay_rate = get_emp_pay_rate(job_order, job.company, item['company'], item['employee'])
                    overtime_current_job_hours_val=current_job_overtime(job.from_date,posting_date,job_order,emp,overtime_hours)
                    timesheet = frappe.get_doc(dict(doctype = "Timesheet", company=job.company, job_order_detail=job_order, employee = item['employee'], from_date=job.from_date, to_date=job.to_date, job_name=job.select_job, per_hour_rate=job.per_hour, flat_rate=job.flat_rate, status_of_work_order=job.order_status, date_of_timesheet=date, timesheet_hours=cur_timesheet_hours,total_weekly_hours= week_all_hours+cur_timesheet_hours, current_job_order_hours=all_job_hours+cur_timesheet_hours, overtime_timesheet_hours= overtime_hours, total_weekly_overtime_hours= overtime_all_hours, cuurent_job_order_overtime_hours= float(overtime_current_job_hours_val), total_weekly_hiring_hours= week_hiring_hours + cur_timesheet_hours, total_weekly_overtime_hiring_hours= overtime_hiring_hours, overtime_timesheet_hours1= hiring_timesheet_oh, billable_weekly_overtime_hours= overtime_hiring_hours, unbillable_weekly_overtime_hours= overtime_all_hours- overtime_hiring_hours, employee_pay_rate = emp_pay_rate))
                
                    flat_rate = job.flat_rate + tip_amount
                    timesheet= update_billing_details(timesheet,jo=job_order, timesheet_date=posting_date, employee=item['employee'], working_hours=float(item['hours']),total_flat_rate=flat_rate,per_hour_rate=job.per_hour)
                    timesheet = update_payroll_details(timesheet, emp_pay_rate, job.company, item['employee'], timesheet, posting_date, job_order, today_hours=float(item['hours']))
                    timesheet.append("time_logs", {
                        "activity_type": job.select_job, "from_time": child_from, "to_time": child_to, "hrs": str(item['hours'])+" hrs",
                        "hours": float(item['hours']), "is_billable": 1, "billing_rate": job.per_hour,"tip":tip_amount, "flat_rate": flat_rate, "break_start_time": break_from,
                        "break_end_time": break_to, "extra_hours": float(item['overtime_hours']), "extra_rate": float(item['overtime_rate']), "pay_amount":timesheet.timesheet_payable_amount
                    })

                    timesheet.insert(ignore_permissions=True)
                    timesheet = add_status(timesheet, item['status'], item['employee'], job.company, job_order)
                    timesheet.save(ignore_permissions=True)
                    staffing_own_timesheet(save,timesheet,company_type)
                    timesheets.append({"employee": item['employee'], "docname": timesheet.name, "company": job.company, "job_title": job.select_job,  "employee_name": item['employee_name']})
                    added = 1
                    update_previous_timesheet(jo=job_order, timesheet_date=posting_date, employee=item['employee'],timesheet=timesheet)
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
        elif(status == "Replaced"):
            timesheet.replaced = 1
            if item.hours <= 0:
                item.billing_rate = 0
                item.flat_rate = 0
                item.billing_amount = 0
        return timesheet
    except Exception:
        return timesheet

#-------------------------------------------------------#
def send_timesheet_for_approval(timesheets):
    timesheet_count = 0
    try:
        for time in timesheets:
            timesheet_count += 1
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
            company = time["company"]
            job_title = time["job_title"]
            employee_name = time["employee_name"]
            msg = f'{time["company"]} has submitted a timesheet on {today} for {time["job_title"]} for approval.'
            subject = 'Timesheet For Approval'
            dnr_notification(time,staffing_user)
            subject = 'Timesheet For Approval'

            enqueue("tag_workflow.tag_workflow.utils.notification.sendmail", emails=staffing_user, msg=msg, subject=subject, doctype='Timesheet', docname=time['docname'])
        if timesheet_count == 1:
                msg = f'{company} has submitted a timesheet for {employee_name} on {today} for {job_title} for approval.'
        make_system_notification(staffing_user, msg, 'Timesheet', time['docname'], subject)
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

def staffing_own_timesheet(save,timesheet,company_type):
    if(save!="1"):
        timesheet_status_data=f'update `tabTimesheet` set workflow_state="Approval Request" where name="{timesheet.name}"'
        frappe.db.sql(timesheet_status_data)
        frappe.db.commit()
        if(company_type=='Staffing'):
            timesheet_status_data=f'update `tabTimesheet` set docstatus="1",workflow_state="Approved",status="Submitted" where name="{timesheet.name}"'                       
            frappe.db.sql(timesheet_status_data)
            frappe.db.commit()


@frappe.whitelist()
def checkreplaced_emp(employee, job_order):
    try:
        sql = """ select c.employee from `tabReplaced Employee` c where c.employee = '{0}' and c.parent in(select name from `tabAssign Employee` where job_order = '{1}' and tag_status = "Approved") """.format(employee, job_order)
        result = frappe.db.sql(sql, as_dict=1)
        return 1 if len(result) > 0 else 0
    except Exception as e:
        print(e)
        return 0

#check whether tip is given
def check_tip(item):
    if 'tip_amount' in item.keys():
        tip_amount = item['tip_amount']
    else:
        tip_amount=0
    return tip_amount

def timesheet_biiling_hours(jo, timesheet_date, employee, user,timesheet=None):
    last_sat= check_day(timesheet_date)
    job=frappe.get_doc(jobOrder,jo)
    sql1= f" select sum(total_hours) as total_hours from `tabTimesheet` where employee='{employee}' and date_of_timesheet between '{last_sat}' and '{timesheet_date}' and job_order_detail='{jo}'  and name !='{timesheet}'"
    data1= frappe.db.sql(sql1, as_dict=1)

    sql2= f" select sum(total_hours) as total_hours from `tabTimesheet` where employee='{employee}' and date_of_timesheet between '{last_sat}' and '{timesheet_date}' and name !='{timesheet}' "
    data2= frappe.db.sql(sql2, as_dict=1)

    sql3= f" select sum(total_hours) as total_hours from `tabTimesheet` where employee='{employee}' and job_order_detail='{jo}' and name !='{timesheet}' and date_of_timesheet between '{job.from_date}' and '{timesheet_date}' "
    data3= frappe.db.sql(sql3, as_dict=1)

    sql4= f" select sum(total_hours) as total_hours from `tabTimesheet` where employee='{employee}' and date_of_timesheet between '{last_sat}' and '{timesheet_date}'  and name !='{timesheet}' and company in (select company from `tabEmployee` where email= '{user}') "
    data4= frappe.db.sql(sql4, as_dict=1)

    week_job_hours= data1[0]['total_hours'] or 0
    week_all_hours= data2[0]['total_hours'] or 0
    all_job_hours= data3[0]['total_hours'] or 0
    week_hiring_hours= data4[0]['total_hours'] or 0    

    return week_job_hours, week_all_hours, all_job_hours, week_hiring_hours

def all_week_jo(employee, jo,timesheet_date):
    sql= f" select min(date_of_timesheet) as min_date, max(date_of_timesheet) as max_date from `tabTimesheet` where employee='{employee}' and job_order_detail='{jo}'"
    data= frappe.db.sql(sql, as_dict=1)
    d1= data[0]['min_date']
    d2= timesheet_date
    if d1 and d2:
        last_saturday= check_day(d2)

        week_oh= 0
        day_name1= d2.strftime("%A")
        if day_name1 != 'Friday':
            last_sql= f" select sum(total_hours) as total_hours from `tabTimesheet` where employee='{employee}' and date_of_timesheet between '{last_saturday}' and '{d2}' and job_order_detail='{jo}' "
            last_data= frappe.db.sql(last_sql, as_dict=1)
            if len(last_data)>0 and last_data[0]['total_hours'] is not None and last_data[0]['total_hours']> 40:
                week_oh+= last_data[0]['total_hours']- 40
                

        week_oh= sub_all_week_jo(week_oh, d1, d2, employee, jo)
        return week_oh



def sub_update_timesheet(week_job_hours, w1, cur_timesheet_hours, week_all_hours,week_hiring_hours ):
    w1= w1 if w1 is not None else 0.00
    if week_job_hours>=40:
        w1+= cur_timesheet_hours
    elif week_job_hours+ cur_timesheet_hours >40:
        w1+= week_job_hours+ cur_timesheet_hours -40

    overtime_hours=0
    overtime_all_hours=0
    overtime_hiring_hours=0
    hiring_timesheet_oh=0

    if week_all_hours>= 40:
        overtime_hours= cur_timesheet_hours
        overtime_all_hours= week_all_hours+ cur_timesheet_hours-40.00
        
    elif week_all_hours + cur_timesheet_hours>40.00:
        overtime_hours= week_all_hours + cur_timesheet_hours-40.00
        overtime_all_hours= week_all_hours+ cur_timesheet_hours-40.00
    
    if week_hiring_hours>=40:
        hiring_timesheet_oh+= cur_timesheet_hours
        overtime_hiring_hours= week_hiring_hours+ cur_timesheet_hours-40.00

    elif week_hiring_hours+ cur_timesheet_hours> 40:
        hiring_timesheet_oh+= week_hiring_hours+ cur_timesheet_hours- 40
        overtime_hiring_hours= week_hiring_hours+ cur_timesheet_hours-40.00

    return w1, overtime_hours, overtime_all_hours, overtime_hiring_hours, hiring_timesheet_oh
                        
def check_day(timesheet_date):
    day_name= timesheet_date.strftime("%A")
    if day_name != "Saturday" and day_name !='Sunday':
        last_sat = timesheet_date - datetime.timedelta(days=timesheet_date.weekday()+2)
    elif day_name =='Sunday':
        last_sat = timesheet_date - datetime.timedelta(days=timesheet_date.weekday()-5)
    else:
        last_sat= timesheet_date
    
    return last_sat

def sub_all_week_jo(week_oh, d1, d2, employee, jo):
    dates=[]

    for d_ord in range(d1.toordinal(), d2.toordinal()+1):
        d = datetime.date.fromordinal(d_ord)
        if (d.weekday() == 4):
            dates.append(d)

    if len(dates)>0:
        for i in dates:
            last_sat = i - datetime.timedelta(days=i.weekday()+2)

            week_sql= f" select sum(total_hours) as total_hours from `tabTimesheet` where employee='{employee}' and date_of_timesheet between '{last_sat}' and '{i}' and job_order_detail='{jo}'"
            week_data= frappe.db.sql(week_sql, as_dict=1)

            if week_data[0]['total_hours'] is not None and week_data[0]['total_hours']> 40:
                oh= week_data[0]['total_hours']-40
                week_oh += oh             
        return week_oh
    return week_oh

def billing_details_data(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate):
    print(timesheet_date)
    day_name= timesheet_date.strftime("%A")
    if day_name != "Saturday" and day_name !='Sunday':
        last_sat = timesheet_date - datetime.timedelta(days=timesheet_date.weekday()+2)
    elif day_name =='Sunday':
        last_sat = timesheet_date - datetime.timedelta(days=timesheet_date.weekday()-5)
    else:
        last_sat= timesheet_date
    job_order_vals=frappe.get_doc(jobOrder,jo)
    per_rate=per_hour_rate
    flat_rate=total_flat_rate
    hiring_company=job_order_vals.company
    total_billable=f" select sum(total_hours) as total_working_hours from `tabTimesheet` where employee='{employee}' and (date_of_timesheet between '{last_sat}' and '{timesheet_date}') and company='{hiring_company}' and name !='{timesheet}' "
    total_billable_amount=frappe.db.sql(total_billable,as_dict=1)
    weekly_hours=total_billable_amount[0].total_working_hours if total_billable_amount[0].total_working_hours is not None else 0.00
    worked_time=float(weekly_hours)+float(working_hours)
    if(weekly_hours<=40):
        if(worked_time)<=40:
            timesheet_billed_amount=(float(working_hours)*per_rate)+flat_rate
            timesheet_overtime_bill=0.00
        else:
            extra_hours=worked_time-40
            timesheet_billed_amount=((working_hours-extra_hours)*per_rate)+(1.5*per_rate*extra_hours)+flat_rate
            timesheet_overtime_bill=1.5*per_rate*extra_hours
    else:
        timesheet_billed_amount=(1.5*per_rate*working_hours)+flat_rate
        timesheet_overtime_bill=(1.5*per_rate*working_hours)
    total_job_bill=f" select sum(timesheet_billable_amount) as job_bill , sum(timesheet_billable_overtime_amount) as overtime from `tabTimesheet` where employee='{employee}' and job_order_detail='{jo}' and name !='{timesheet}' and (date_of_timesheet between '{job_order_vals.from_date}' and '{timesheet_date}')"
    total_rate=frappe.db.sql(total_job_bill,as_dict=1)
    total_job_amount=(total_rate[0]['job_bill'] if total_rate[0]['job_bill'] is not None else 0.00 )+timesheet_billed_amount
    total_overtime_job_amount=(total_rate[0]['overtime']  if total_rate[0]['overtime'] is not None else 0.00 )+timesheet_overtime_bill
    return timesheet_billed_amount,timesheet_overtime_bill,total_job_amount,total_overtime_job_amount
 
def update_billing_details(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate):
   timesheet_billed_amount,timesheet_overtime_bill,total_job_amount,total_overtime_job_amount=billing_details_data(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate)
   timesheet.timesheet_billable_amount=timesheet_billed_amount
   timesheet.timesheet_billable_overtime_amount=timesheet_overtime_bill
   timesheet.total_job_order_amount=total_job_amount
   timesheet.total_job_order_billable_overtime_amount_=total_overtime_job_amount
   return timesheet

@frappe.whitelist()
def get_emp_pay_rate(job_order, hiring_company, staffing_company, employee):
    assign_emp = frappe.db.get_value('Assign Employee', {"job_order": job_order, "hiring_organization": hiring_company, "company": staffing_company, "tag_status": "Approved"})
    pay_rate=frappe.db.get_value('Assign Employee Details', {'parent': assign_emp, 'employee': employee}, ['pay_rate'])
    assign_emp_doc=frappe.get_doc('Assign Employee',assign_emp)
    pay_rate= pay_rate if(frappe.db.get_value('Assign Employee Details', {'parent': assign_emp, 'employee': employee}, ['pay_rate']) is not None) else assign_emp_doc.employee_pay_rate 
    return pay_rate

def get_week(timesheet_date):
    day_name= timesheet_date.strftime("%A")
    if day_name != "Saturday" and day_name !='Sunday':
        return timesheet_date - datetime.timedelta(days=timesheet_date.weekday()+2)
    elif day_name =='Sunday':
        return timesheet_date - datetime.timedelta(days=timesheet_date.weekday()-5)
    else:
        return timesheet_date

@frappe.whitelist()
def set_payroll_fields(pay_rate, hiring_company, employee, timesheet, timesheet_date, job_order, today_hours):
    last_sat = get_week(timesheet_date)
    weekly_hours = frappe.db.sql(f"select sum(total_hours) as total_working_hours from `tabTimesheet` where employee='{employee}' and (date_of_timesheet between '{last_sat}' and '{timesheet_date}') and company='{hiring_company}' and name !='{timesheet}'", as_dict=1)
    total_weekly_hours = weekly_hours[0].total_working_hours if weekly_hours[0].total_working_hours is not None else 0.0
    worked_time=float(total_weekly_hours)+float(today_hours)
    if(total_weekly_hours<=40):
        if(worked_time)<=40:
            timesheet_payable_amount = float(today_hours)*pay_rate
            timesheet_ot_billable = 0.00
        else:
            extra_hours=worked_time-40
            timesheet_payable_amount = ((today_hours-extra_hours)*pay_rate)+(1.5*pay_rate*extra_hours)
            timesheet_ot_billable = 1.5*pay_rate*extra_hours
    else:
        timesheet_payable_amount = (1.5*pay_rate*today_hours)
        timesheet_ot_billable = (1.5*pay_rate*today_hours)
    
    weekly_hours_unbillable = frappe.db.sql(f"select sum(total_hours) as total_working_hours from `tabTimesheet` where employee='{employee}' and (date_of_timesheet between '{last_sat}' and '{timesheet_date}') and company!='{hiring_company}'", as_dict=1)
    total_weekly_hours_unbillable = weekly_hours_unbillable[0].total_working_hours if weekly_hours_unbillable[0].total_working_hours is not None else 0.0
    timesheet_unbillable_ot = 1.5*pay_rate*today_hours if total_weekly_hours_unbillable > 40 and worked_time < 40 else 0.0
    
    total_job_order = frappe.db.sql(f"select sum(timesheet_payable_amount) as job_order_payable , sum(timesheet_billable_overtime_amount_staffing) as job_order_ot from `tabTimesheet` where employee='{employee}' and job_order_detail='{job_order}' and date_of_timesheet <= '{timesheet_date}' and name!='{timesheet}'", as_dict=1)
    total_job_payable = (total_job_order[0]['job_order_payable'] if total_job_order[0]['job_order_ot'] is not None else 0.00) + timesheet_payable_amount
    total_job_billable_ot = (total_job_order[0]['job_order_ot']  if total_job_order[0]['job_order_ot'] is not None else 0.00) + timesheet_ot_billable
    
    unbillable_ot = frappe.db.sql(f"select sum(timesheet_unbillable_overtime_amount) as unbillable_ot from tabTimesheet where employee='{employee}' and company != '{hiring_company}' and date_of_timesheet <= '{timesheet_date}' and name!='{timesheet}'", as_dict=1)
    total_unbillable_ot = (unbillable_ot[0]['unbillable_ot'] if unbillable_ot[0]['unbillable_ot'] is not None else 0.00)

    return timesheet_payable_amount, timesheet_ot_billable, timesheet_unbillable_ot, total_job_payable, total_job_billable_ot, total_unbillable_ot

def update_payroll_details(timesheet_doc, pay_rate, hiring_company, employee, timesheet, timesheet_date, job_order, today_hours):
    timesheet_payable_amount, timesheet_ot_billable, timesheet_unbillable_ot, total_job_payable, total_job_billable_ot, total_unbillable_ot = set_payroll_fields(pay_rate, hiring_company, employee, timesheet, timesheet_date, job_order, today_hours)
    timesheet_doc.timesheet_payable_amount = timesheet_payable_amount
    timesheet_doc.timesheet_billable_overtime_amount_staffing = timesheet_ot_billable
    timesheet_doc.timesheet_unbillable_overtime_amount = timesheet_unbillable_ot
    timesheet_doc.total_job_order_payable_amount = total_job_payable
    timesheet_doc.total_job_order_billable_overtime_amount = total_job_billable_ot
    timesheet_doc.total_job_order_unbillable_overtime_amount = total_unbillable_ot
    return timesheet_doc
@frappe.whitelist()
def update_billing_calculation(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate):
    try:
        timesheet_date=datetime.datetime.strptime(timesheet_date, "%Y-%m-%d").date()
        total_flat_rate=float(total_flat_rate)
        per_hour_rate=float(per_hour_rate)
        working_hours=float(working_hours)
        data,data2=update_all_exist_timesheet(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate)
        return data,data2
    except Exception as e:
        frappe.log_error(e, "Timesheet Denied Change case")
        frappe.throw(e)

def update_previous_timesheet(jo, timesheet_date, employee,timesheet):
    tomorrow=timesheet_date + datetime.timedelta(days=1)
    job_order_last_dat = (frappe.get_doc(jobOrder,jo)).to_date
    all_timesheet=f'select name from `tabTimesheet` where employee="{employee}" and date_of_timesheet between "{tomorrow}" and "{job_order_last_dat}" and name !="{timesheet}" order by date_of_timesheet'
    timesheet_exist=frappe.db.sql(all_timesheet,as_dict=True)
    if(len(timesheet_exist)):
        update_timesheet_exist(jo, timesheet_date, employee,timesheet,timesheet_exist)
    
def update_timesheet_exist(jo, timesheet_date, employee,timesheet,timesheet_exist):
    print(jo, timesheet_date, employee,timesheet,timesheet_exist)
    for i in timesheet_exist:
        timesheet_det=frappe.get_doc('Timesheet',i['name'])
        job = frappe.get_doc(jobOrder, {"name": timesheet_det.job_order_detail})
        flat_rate=timesheet_det.time_logs[0].flat_rate
        per_hour=job.per_hour
        hours=timesheet_det.total_hours
        timeshet_date=timesheet_det.date_of_timesheet
        d=update_all_exist_timesheet(timesheet=i['name'],jo=job.name, timesheet_date=timeshet_date, employee=employee,working_hours=hours,total_flat_rate=flat_rate,per_hour_rate=per_hour)
        frappe.db.sql('update `tabTimesheet` set timesheet_billable_amount="{0}",timesheet_billable_overtime_amount="{1}",total_job_order_amount="{2}",total_job_order_billable_overtime_amount_="{3}",timesheet_hours="{4}",total_weekly_hours="{5}",current_job_order_hours="{6}",overtime_timesheet_hours="{7}",total_weekly_overtime_hours="{8}",cuurent_job_order_overtime_hours="{9}",total_weekly_hiring_hours="{10}",total_weekly_overtime_hiring_hours="{11}",overtime_timesheet_hours1="{12}",billable_weekly_overtime_hours="{13}",unbillable_weekly_overtime_hours="{14}" where name="{15}"'.format(d[0][0],d[0][1],d[0][2],d[0][3],d[1][0],d[1][1],d[1][2][0],d[1][3][0],d[1][4][0],d[1][5][0],d[1][6][0],d[1][7][0],d[1][8][0],d[1][9][0],d[1][10],i['name']))
        frappe.db.commit()

def update_all_exist_timesheet(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate):
    job=frappe.get_doc(jobOrder,jo)
    data=billing_details_data(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate)
    week_job_hours, week_all_hours, all_job_hours, week_hiring_hours = timesheet_biiling_hours(jo=jo, timesheet_date=timesheet_date, employee=employee, user= frappe.session.user,timesheet=timesheet)
    cur_timesheet_hours=working_hours
    w1= all_week_jo(employee=employee, jo=jo,timesheet_date=timesheet_date)
    w1, overtime_hours, overtime_all_hours, overtime_hiring_hours, hiring_timesheet_oh= sub_update_timesheet(week_job_hours, w1, cur_timesheet_hours, week_all_hours,week_hiring_hours)               
    timesheet_hours=cur_timesheet_hours
    total_weekly_hours= week_all_hours+cur_timesheet_hours 
    current_job_order_hours=all_job_hours+cur_timesheet_hours,
    overtime_timesheet_hours= overtime_hours,
    total_weekly_overtime_hours= overtime_all_hours,
    cuurent_job_order_overtime_hours=current_job_overtime(job.from_date,timesheet_date,job.name,employee,overtime_hours,timesheet_name=timesheet)
    cuurent_job_order_overtime_hours= float(cuurent_job_order_overtime_hours),
    total_weekly_hiring_hours= week_hiring_hours + cur_timesheet_hours,
    total_weekly_overtime_hiring_hours= overtime_hiring_hours, 
    overtime_timesheet_hours1= hiring_timesheet_oh,
    billable_weekly_overtime_hours= overtime_hiring_hours, 
    unbillable_weekly_overtime_hours= overtime_all_hours- overtime_hiring_hours 
    data2=[timesheet_hours,total_weekly_hours,current_job_order_hours,overtime_timesheet_hours,total_weekly_overtime_hours,cuurent_job_order_overtime_hours,total_weekly_hiring_hours,total_weekly_overtime_hiring_hours,overtime_timesheet_hours1,billable_weekly_overtime_hours,unbillable_weekly_overtime_hours]
    return data,data2

def current_job_overtime(from_date,posting_date,job_order,emp,overtime_hours,timesheet_name=None):
    curent_job_overtime=f'select sum(overtime_timesheet_hours) as c_o_h from `tabTimesheet` where date_of_timesheet between "{from_date}" and "{posting_date}" and job_order_detail="{job_order}" and employee="{emp}" and name!="{timesheet_name}"'
    current_overtime_job=frappe.db.sql(curent_job_overtime)
    if current_overtime_job[0][0] is not None:
        over_time_job=float(overtime_hours)+float(current_overtime_job[0][0])
    else:
        over_time_job=float(overtime_hours)
    return over_time_job

@frappe.whitelist()
def edit_update_record(timesheet):
    try:
        timesheet_data=frappe.get_doc('Timesheet',timesheet)
        job = timesheet_data.job_order_detail
        timeshet_date=timesheet_data.date_of_timesheet
        enqueue("tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.update_previous_timesheet", jo=job, timesheet_date=timeshet_date, employee=timesheet_data.employee,timesheet=timesheet_data.name)
        frappe.db.sql('update `tabTimesheet` set update_other_timesheet="0" where name="{0}"'.format(timesheet))
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(e, "Timesheet Update Change case")
        frappe.throw(e)