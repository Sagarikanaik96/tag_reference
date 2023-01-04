# Copyright (c) 2022, SourceFuse and contributors
# For license information, please see license.txt

import datetime
import frappe
from frappe import _
from frappe.model.document import Document
from tag_workflow.utils.notification import make_system_notification
from frappe import enqueue
from frappe.share import add_docshare as add
from tag_workflow.utils.timesheet import remove_job_title, unsatisfied_organization, do_not_return, no_show_org
import ast
TM_FT = "%Y-%m-%d %H:%M:%S"
jobOrder='Job Order'
timesheet_time= 'select to_time,from_time from `tabTimesheet Detail` where parent= '
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

def check_old_timesheet(child_from, child_to, employee,timesheet):
    try:
        data = []
        if(child_from and child_to):
            sql = """select c.name, c.parent from `tabTimesheet Detail` c where (('{1}' >= c.from_time and '{1}' <= c.to_time) or ('{2}' >= c.from_time and '{2}' <= c.to_time) or ('{1}' <= c.from_time and '{2}' >= c.to_time)) and parent in (select name from `tabTimesheet` where employee = '{0}' and name!='{3}') """.format(employee, child_from, child_to,timesheet)
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

#---------------------------------------------------#

@frappe.whitelist()
def update_timesheet(user, company_type, items, cur_selected, job_order, date, from_time, to_time, break_from_time=None, break_to_time=None,save=None):
    try:
        added = 0
        items=ast.literal_eval(items)
        selected_items = items
        is_employee = check_if_employee_assign(items, job_order)
        if(is_employee == 0):
            return False

        job = frappe.get_doc(jobOrder, {"name": job_order})
        posting_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
    
        if(posting_date >= job.from_date and posting_date <= job.to_date):
            from_time, to_time = get_datetime(date, from_time, to_time)
            select_items=selected_items.copy()
            length_selected=len(selected_items)-1
            for i in range(length_selected,-1,-1):
                child_from, child_to, break_from, break_to = get_child_time(date, from_time, to_time, selected_items[i]['from_time'], selected_items[i]['to_time'], selected_items[i]['break_from'], selected_items[i]['break_to'])
                is_ok = check_old_timesheet(child_from, child_to, selected_items[i]['employee'],selected_items[i]['timesheet_value'])
                if(is_ok == 0):   
                    added=1              
                else:
                    select_items.pop(i)
                    frappe.msgprint(_("Timesheet is already available for employee <b>{0}</b>(<b>{1}</b>) on the given datetime.").format(selected_items[i]["employee_name"],selected_items[i]['employee']))            
        else:
            frappe.msgprint(_("Date must be in between Job Order start date and end date for timesheets"))
        frappe.enqueue('tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.create_new_timesheet',job_name=job_order,selected_items=select_items,date=date,from_time=from_time,to_time=to_time,job=job,job_order=job_order,company_type=company_type,posting_date=posting_date,save=save,now=True)
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
            remove_job_title(emp,job_order)
        elif(status == "No Show"):
            timesheet.no_show = 1
            for item in timesheet.time_logs:
                item.hours = 0
                item.is_billable = 0
                item.billing_rate = 0
                item.flat_rate = 0
                item.billing_amount = 0
            no_show_org(emp, company, job_order)
            remove_job_title(emp,job_order)
        elif(status == "Non Satisfactory"):
            timesheet.non_satisfactory = 1
            unsatisfied_organization(emp, company, job_order)
            remove_job_title(emp,job_order)
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
def send_timesheet_for_approval(timesheets,save):
    timesheet_count = 0
    try:
        if(save!='1'):
            timesheet_send_for_approval(timesheets,timesheet_count)
    except Exception as e:
        frappe.log_error(e, "Timesheet Approval")

@frappe.whitelist()
def job_order_name(doctype,txt,searchfield,page_len,start,filters):
    try:
        company=filters.get('company')
        company_type=filters.get('company_type')
        if(company_type=='Staffing'):
            sql=frappe.db.sql('''select name from `tabJob Order` where company_type="Exclusive" and bid>0 and order_status!='Upcoming' and  company in (select name from `tabCompany` where parent_staffing="{0}") and name like "%%{1}%%"  '''.format(company,'%s' % txt))
            return sql
        else:
            sql=frappe.db.sql('''select name from `tabJob Order` where bid>0 and company="{0}" and order_status!='Upcoming' and name like "%%{1}%%" and name in (select job_order from `tabAssign Employee` where hiring_organization="{0}")'''.format(company,'%s' % txt))
            return sql
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
            timesheet_exist=[{'name':timesheet.name}]
            update_timesheet_exist(timesheet.job_order_detail, timesheet.date_of_timesheet, timesheet.employee,timesheet,timesheet_exist)
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

def timesheet_biiling_hours(jo, timesheet_date, employee, user,from_time,timesheet=None):
    last_sat= check_day(timesheet_date)
    job=frappe.get_doc(jobOrder,jo)
    sql1= f" select sum(TS.total_hours) as total_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and date_of_timesheet between '{last_sat}' and '{timesheet_date}' and job_order_detail='{jo}'  and TS.name !='{timesheet}' and TD.to_time<'{from_time}' and TS.workflow_state!='Open'"
    data1= frappe.db.sql(sql1, as_dict=1)

    sql2= f" select sum(TS.total_hours) as total_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and date_of_timesheet between '{last_sat}' and '{timesheet_date}' and TS.name !='{timesheet}' and TD.to_time<'{from_time}' and TS.workflow_state!='Open' "
    data2= frappe.db.sql(sql2, as_dict=1)

    sql3= f" select sum(TS.total_hours) as total_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and job_order_detail='{jo}' and TS.name !='{timesheet}' and date_of_timesheet between '{job.from_date}' and '{timesheet_date}' and TD.to_time<'{from_time}' and TS.workflow_state!='Open' "
    data3= frappe.db.sql(sql3, as_dict=1)

    sql4= f" select sum(TS.total_hours) as total_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and date_of_timesheet between '{last_sat}' and '{timesheet_date}'  and TS.name !='{timesheet}' and TD.to_time<'{from_time}'and TS.workflow_state!='Open' and company in (select company from `tabEmployee` where email= '{user}') "
    data4= frappe.db.sql(sql4, as_dict=1)

    week_job_hours= data1[0]['total_hours'] or 0
    week_all_hours= data2[0]['total_hours'] or 0
    all_job_hours= data3[0]['total_hours'] or 0
    week_hiring_hours= data4[0]['total_hours'] or 0    

    return week_job_hours, week_all_hours, all_job_hours, week_hiring_hours

def all_week_jo(employee, jo,timesheet_date,from_time):
    sql= f" select min(date_of_timesheet) as min_date, max(date_of_timesheet) as max_date from `tabTimesheet` where employee='{employee}' and job_order_detail='{jo}' and workflow_state!='Open'"
    data= frappe.db.sql(sql, as_dict=1)
    d1= data[0]['min_date']
    d2= timesheet_date
    if d1 and d2:
        last_saturday= check_day(d2)

        week_oh= 0
        day_name1= d2.strftime("%A")
        if day_name1 != 'Friday':
            last_sql= f" select sum(TS.total_hours) as total_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and date_of_timesheet between '{last_saturday}' and '{d2}' and job_order_detail='{jo}' and TD.to_time<'{from_time}' and TS.workflow_state!='Open' "
            last_data= frappe.db.sql(last_sql, as_dict=1)
            if len(last_data)>0 and last_data[0]['total_hours'] is not None and last_data[0]['total_hours']> 40:
                week_oh+= last_data[0]['total_hours']- 40
                
        week_oh= sub_all_week_jo(week_oh, d1, d2, employee, jo,from_time)
        return week_oh
    else:
        week_oh=0
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

def sub_all_week_jo(week_oh, d1, d2, employee, jo,from_time):
    dates=[]

    for d_ord in range(d1.toordinal(), d2.toordinal()+1):
        d = datetime.date.fromordinal(d_ord)
        if (d.weekday() == 4):
            dates.append(d)

    if len(dates)>0:
        for i in dates:
            last_sat = i - datetime.timedelta(days=i.weekday()+2)

            week_sql= f" select sum(TS.total_hours) as total_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and date_of_timesheet between '{last_sat}' and '{i}' and job_order_detail='{jo}' and TD.to_time<'{from_time}' and TS.workflow_state!='Open' "
            week_data= frappe.db.sql(week_sql, as_dict=1)

            if week_data[0]['total_hours'] is not None and week_data[0]['total_hours']> 40:
                oh= week_data[0]['total_hours']-40
                week_oh += oh             
        return week_oh
    return week_oh

def billing_details_data(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate,from_time):
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
    total_billable=f" select sum(TS.total_hours) as total_working_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and (date_of_timesheet between '{last_sat}' and '{timesheet_date}') and company='{hiring_company}' and TS.name !='{timesheet}' and TD.to_time<'{from_time}' and TS.workflow_state!='Open' "
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
    total_job_bill=f" select sum(TS.timesheet_billable_amount) as job_bill , sum(TS.timesheet_billable_overtime_amount) as overtime from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and job_order_detail='{jo}' and TS.name !='{timesheet}' and (date_of_timesheet between '{job_order_vals.from_date}' and '{timesheet_date}') and TD.to_time<'{from_time}' and TS.workflow_state!='Open'"
    total_rate=frappe.db.sql(total_job_bill,as_dict=1)
    total_job_amount=(total_rate[0]['job_bill'] if total_rate[0]['job_bill'] is not None else 0.00 )+timesheet_billed_amount
    total_overtime_job_amount=(total_rate[0]['overtime']  if total_rate[0]['overtime'] is not None else 0.00 )+timesheet_overtime_bill
    return timesheet_billed_amount,timesheet_overtime_bill,total_job_amount,total_overtime_job_amount
 
def update_billing_details(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate,from_time):
   timesheet_billed_amount,timesheet_overtime_bill,total_job_amount,total_overtime_job_amount=billing_details_data(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate,from_time)
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
def set_payroll_fields(pay_rate, hiring_company, employee, timesheet, timesheet_date, job_order, today_hours,to_time,from_time):
    last_sat = get_week(timesheet_date)
    weekly_hours = frappe.db.sql(f"select sum(TS.total_hours) as total_working_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and (date_of_timesheet between '{last_sat}' and '{timesheet_date}') and TS.name !='{timesheet}' and TD.to_time<'{from_time}' and TS.workflow_state!='Open'", as_dict=1)
    total_weekly_hours = weekly_hours[0].total_working_hours if weekly_hours[0].total_working_hours is not None else 0.0
    worked_time=float(total_weekly_hours)+float(today_hours)
    if worked_time > 40:
        if total_weekly_hours<= 40:
            timesheet_payable_amount = (40-total_weekly_hours)*pay_rate + 1.5*(worked_time-40)*pay_rate
        else:
            timesheet_payable_amount = 1.5*float(today_hours)*pay_rate
    else:
        timesheet_payable_amount = float(today_hours)*pay_rate
    job_order_vals=frappe.get_doc(jobOrder,job_order)
    sql2 = frappe.db.sql(f"select sum(TS.total_hours) as total_hiring_working_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and (date_of_timesheet between '{last_sat}' and '{timesheet_date}') and TS.name !='{timesheet}' and company = '{hiring_company}' and TD.to_time<'{from_time}' and TS.workflow_state!='Open'", as_dict=1)
    total_hiring_weekly_hours = sql2[0].total_hiring_working_hours if sql2[0].total_hiring_working_hours is not None else 0.0
    timesheet_ot_billable, timesheet_unbillable_ot = get_billable_unbillable_ot(total_hiring_weekly_hours, total_weekly_hours, worked_time, today_hours, pay_rate)
    sql3=frappe.db.sql(f"select sum(TS.timesheet_payable_amount) as timesheet_payable_amount, sum(TS.timesheet_billable_overtime_amount_staffing) as timesheet_billable_overtime_amount_staffing, sum(TS.timesheet_unbillable_overtime_amount) as timesheet_unbillable_overtime_amount from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and  employee='{employee}' and job_order_detail='{job_order}' and TS.name !='{timesheet}' and (date_of_timesheet between '{job_order_vals.from_date}' and '{timesheet_date}') and TD.to_time<'{from_time}' and TS.workflow_state!='Open'", as_dict=1)
    total_job_payable=(sql3[0]['timesheet_payable_amount'] if sql3[0]['timesheet_payable_amount'] is not None else 0.00)+timesheet_payable_amount
    total_job_billable_ot=(sql3[0]['timesheet_billable_overtime_amount_staffing'] if sql3[0]['timesheet_billable_overtime_amount_staffing'] is not None else 0.00)+timesheet_ot_billable
    total_unbillable_ot=(sql3[0]['timesheet_unbillable_overtime_amount'] if sql3[0]['timesheet_unbillable_overtime_amount'] is not None else 0.00)+timesheet_unbillable_ot
    return timesheet_payable_amount, timesheet_ot_billable, timesheet_unbillable_ot, total_job_payable, total_job_billable_ot, total_unbillable_ot

def get_billable_unbillable_ot(total_hiring_weekly_hours, total_weekly_hours, worked_time, today_hours, pay_rate):
    if total_weekly_hours > 40 and worked_time>40:
        if total_hiring_weekly_hours >40:
            timesheet_ot_billable=1.5*float(today_hours)*pay_rate
            timesheet_unbillable_ot = 0
        else:
            today_total_hiring_weekly_hours = float(today_hours)+total_hiring_weekly_hours
            if today_total_hiring_weekly_hours > 40:
                timesheet_ot_billable = 1.5*(today_total_hiring_weekly_hours-40)*pay_rate
                timesheet_unbillable_ot= 1.5*(40-total_hiring_weekly_hours)*pay_rate
            else:
                timesheet_ot_billable = 0
                timesheet_unbillable_ot= 1.5*float(today_hours)*pay_rate
    elif worked_time>40:
        extra_hours = worked_time-40
        today_total_hiring_weekly_hours = float(today_hours)+total_hiring_weekly_hours
        if today_total_hiring_weekly_hours > 40:
            timesheet_ot_billable = 1.5*extra_hours*pay_rate
            timesheet_unbillable_ot= 0
        else:
            timesheet_ot_billable = 0
            timesheet_unbillable_ot= 1.5*extra_hours*pay_rate
    else:
        timesheet_ot_billable=0
        timesheet_unbillable_ot=0
    return timesheet_ot_billable, timesheet_unbillable_ot

def update_payroll_details(timesheet_doc, pay_rate, hiring_company, employee, timesheet, timesheet_date, job_order, today_hours,to_time,from_time):
    timesheet_payable_amount, timesheet_ot_billable, timesheet_unbillable_ot, total_job_payable, total_job_billable_ot, total_unbillable_ot = set_payroll_fields(pay_rate, hiring_company, employee, timesheet, timesheet_date, job_order, today_hours,to_time,from_time)
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
        t_time=frappe.db.sql(timesheet_time+"'"+timesheet+"'",as_dict=1)
        to_time=t_time[0].to_time
        from_time=t_time[0].from_time
        data,data2,data3=update_all_exist_timesheet(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate,to_time,from_time)
        return data,data2,data3
    except Exception as e:
        frappe.log_error(e, "Timesheet Denied Change case")
        frappe.throw(e)

def update_previous_timesheet(jo, timesheet_date, employee,timesheet,to_time,save,timesheet_already_exist=None):
    if(int(save)!=1):
        if(timesheet_already_exist is not None and len(timesheet_already_exist)>0):
            timesheet_status=frappe.get_doc('Timesheet',timesheet_already_exist)
            if(timesheet_status.workflow_state!='Approved'):
                timesheet_status_data=f'update `tabTimesheet` set docstatus="0",workflow_state="Approval Request",status="Draft" where name="{timesheet_already_exist}"'                       
                frappe.db.sql(timesheet_status_data)
                frappe.db.commit()
                timesheet_exist=[{'name':timesheet_already_exist}]
                update_timesheet_exist(jo, timesheet_date, employee,timesheet,timesheet_exist)
        job_order_last_dat = (frappe.get_doc(jobOrder,jo)).to_date
        all_timesheet=f'select TS.name as name from `tabTimesheet` as TS , `tabTimesheet Detail` as TD where TS.name=TD.parent and employee="{employee}" and date_of_timesheet between "{timesheet_date}" and "{job_order_last_dat}" and TS.name !="{timesheet}" and TD.from_time>"{to_time}" and TS.workflow_state="Approval Request" order by TD.from_time'
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
        t_time=frappe.db.sql(timesheet_time+"'"+i['name']+"'",as_dict=1)
        to_time=t_time[0].to_time
        from_time=t_time[0].from_time
        d=update_all_exist_timesheet(timesheet=i['name'],jo=job.name, timesheet_date=timeshet_date, employee=employee,working_hours=hours,total_flat_rate=flat_rate,per_hour_rate=per_hour,to_time=to_time,from_time=from_time)
        frappe.db.sql('update `tabTimesheet` set timesheet_billable_amount="{0}",timesheet_billable_overtime_amount="{1}",total_job_order_amount="{2}",total_job_order_billable_overtime_amount_="{3}",timesheet_hours="{4}",total_weekly_hours="{5}",current_job_order_hours="{6}",overtime_timesheet_hours="{7}",total_weekly_overtime_hours="{8}",cuurent_job_order_overtime_hours="{9}",total_weekly_hiring_hours="{10}",total_weekly_overtime_hiring_hours="{11}",overtime_timesheet_hours1="{12}",billable_weekly_overtime_hours="{13}",unbillable_weekly_overtime_hours="{14}",todays_overtime_hours="{16}",timesheet_payable_amount="{17}", timesheet_billable_overtime_amount_staffing = "{18}", timesheet_unbillable_overtime_amount="{19}", total_job_order_payable_amount="{20}", total_job_order_billable_overtime_amount="{21}", total_job_order_unbillable_overtime_amount="{22}" where name="{15}"'.format(d[0][0],d[0][1],d[0][2],d[0][3],d[1][0],d[1][1],d[1][2][0],d[1][3][0],d[1][4][0],d[1][5][0],d[1][6][0],d[1][7][0],d[1][8][0],d[1][9][0],d[1][10],i['name'],d[1][11],d[2][0], d[2][1], d[2][2], d[2][3], d[2][4], d[2][5]))
        frappe.db.sql('update `tabTimesheet Detail` set billing_amount="{0}", pay_amount="{1}" where parent="{2}"'.format(d[0][0],d[2][0],i['name']))
        frappe.db.commit()

def update_all_exist_timesheet(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate,to_time,from_time):
    data=billing_details_data(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate,from_time)
    week_job_hours, week_all_hours, all_job_hours, week_hiring_hours = timesheet_biiling_hours(jo=jo, timesheet_date=timesheet_date, employee=employee, user= frappe.session.user,timesheet=timesheet,from_time=from_time)
    cur_timesheet_hours=working_hours
    w1= all_week_jo(employee=employee, jo=jo,timesheet_date=timesheet_date,from_time=from_time)
    cuurent_job_order_overtime_hours,todays_overtime_hours=overall_overtime(jo=jo, timesheet_date=timesheet_date, working_hours=working_hours,employee=employee,from_time=from_time,timesheet=timesheet)
    w1, overtime_hours, overtime_all_hours, overtime_hiring_hours, hiring_timesheet_oh= sub_update_timesheet(week_job_hours, w1, cur_timesheet_hours, week_all_hours,week_hiring_hours)
    timesheet_hours=cur_timesheet_hours
    total_weekly_hours= week_all_hours+cur_timesheet_hours
    current_job_order_hours=all_job_hours+cur_timesheet_hours,
    overtime_timesheet_hours= overtime_hours,
    total_weekly_overtime_hours= overtime_all_hours,
    cuurent_job_order_overtime_hours= float(cuurent_job_order_overtime_hours),
    total_weekly_hiring_hours= week_hiring_hours + cur_timesheet_hours,
    total_weekly_overtime_hiring_hours= overtime_hiring_hours,
    overtime_timesheet_hours1= hiring_timesheet_oh,
    billable_weekly_overtime_hours= overtime_hiring_hours,
    unbillable_weekly_overtime_hours= overtime_all_hours- overtime_hiring_hours
    data2=[timesheet_hours,total_weekly_hours,current_job_order_hours,overtime_timesheet_hours,total_weekly_overtime_hours,cuurent_job_order_overtime_hours,total_weekly_hiring_hours,total_weekly_overtime_hiring_hours,overtime_timesheet_hours1,billable_weekly_overtime_hours,unbillable_weekly_overtime_hours,todays_overtime_hours]
    job = frappe.get_doc(jobOrder, {"name": jo})
    timesheet_doc = frappe.get_doc('Timesheet', {"name":timesheet})
    emp_pay_rate = get_emp_pay_rate(jo, job.company, timesheet_doc.employee_company, timesheet_doc.employee)
    data3=set_payroll_fields(emp_pay_rate, job.company, employee, timesheet, timesheet_date, jo, working_hours,to_time,from_time)
    data3=list(data3)
    return data,data2,data3

@frappe.whitelist()
def edit_update_record(timesheet):
    try:
        timesheet_data=frappe.get_doc('Timesheet',timesheet)
        job = timesheet_data.job_order_detail
        timeshet_date=timesheet_data.date_of_timesheet
        t_time=frappe.db.sql(timesheet_time+"'"+timesheet+"'",as_dict=1)
        to_time=t_time[0].to_time
        enqueue("tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.update_previous_timesheet", jo=job, timesheet_date=timeshet_date, employee=timesheet_data.employee,timesheet=timesheet_data.name,to_time=to_time,save=0,timesheet_already_exist='')
        frappe.db.sql('update `tabTimesheet` set update_other_timesheet="0" where name="{0}"'.format(timesheet))
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(e, "Timesheet Update Change case")
        frappe.throw(e)

def overall_overtime(jo, timesheet_date, employee,working_hours,from_time,timesheet=None):
    last_sat=check_day(timesheet_date)
    job_order_vals=frappe.get_doc(jobOrder,jo)
    hiring_company=job_order_vals.company
    total_hour=f" select sum(TS.total_hours) as total_working_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{employee}' and (date_of_timesheet between '{last_sat}' and '{timesheet_date}') and company='{hiring_company}' and TS.name !='{timesheet}' and job_order_detail='{jo}' and TD.to_time<'{from_time}' and TS.workflow_state!='Open' "
    total_hours_week=frappe.db.sql(total_hour,as_dict=1)
    weekly_hours=total_hours_week[0].total_working_hours if total_hours_week[0].total_working_hours is not None else 0.00
    worked_time=float(weekly_hours)+float(working_hours)
    from_date=job_order_vals.from_date
    overall_week_overtime=frappe.db.sql("""select sum(TS.todays_overtime_hours) as total_overtime_hours from `tabTimesheet` as TS, `tabTimesheet Detail` as TD where TS.name=TD.parent and employee='{0}' and (date_of_timesheet between '{1}' and '{2}') and company='{3}' and TS.name !='{4}' and job_order_detail='{5}' and TD.to_time<'{6}' and TS.workflow_state!='Open'""".format(employee,from_date,timesheet_date,hiring_company,timesheet,jo,from_time),as_dict=1)
    current_week_overtime=0
    if(weekly_hours<=40):
        if(worked_time)<=40:
            current_week_overtime=0
        else:
            current_week_overtime=worked_time-40
    else:
        current_week_overtime=working_hours
    current_timesheet_overtime_hours=overall_week_overtime[0].total_overtime_hours if overall_week_overtime[0].total_overtime_hours is not None else 0.00
    current_timesheet_overtime_hours=current_timesheet_overtime_hours+current_week_overtime
    return current_timesheet_overtime_hours,current_week_overtime
def timesheet_send_for_approval(timesheets,timesheet_count):
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
        dnr_notification(time,staffing_user)
        subject = 'Timesheet For Approval'

        enqueue("tag_workflow.tag_workflow.utils.notification.sendmail", emails=staffing_user, msg=msg, subject=subject, doctype='Timesheet', docname=time['docname'])
    if timesheet_count == 1:
            msg = f'{company} has submitted a timesheet for {employee_name} on {today} for {job_title} for approval.'
    make_system_notification(staffing_user, msg, 'Timesheet', time['docname'], subject)

@frappe.whitelist()
def update_todays_timesheet(jo, timesheet_date, employee,timesheet,company):
    try:
        timesheet_status_data=f'update `tabTimesheet` set docstatus="0",workflow_state="Approval Request",status="Draft" where name="{timesheet}"'                       
        frappe.db.sql(timesheet_status_data)
        frappe.db.commit()
        timesheet_exist=[{'name':timesheet}]
        update_timesheet_exist(jo, timesheet_date, employee,timesheet,timesheet_exist)
        t_time=frappe.db.sql(timesheet_time+"'"+timesheet+"'",as_dict=1)
        to_time=t_time[0].to_time
        update_previous_timesheet(jo, timesheet_date, employee,timesheet,to_time,save=0,timesheet_already_exist='')
        enqueue("tag_workflow.utils.timesheet.send_timesheet_for_approval", now=True,	employee=employee, docname= timesheet,company=company,job_order=jo )
        return 1
    except Exception as e:
        frappe.log_error(e,'open to approval error')
   
def timesheet_data(item,job_order,job,tip_amount,break_from,break_to,posting_date,child_from,child_to,date):
    week_job_hours, week_all_hours, all_job_hours, week_hiring_hours = timesheet_biiling_hours(jo=job_order, timesheet_date=posting_date, employee=item['employee'], user= frappe.session.user,from_time=child_from)
    cur_timesheet_hours=item['hours']
    w1= all_week_jo(employee=item['employee'], jo=job_order,timesheet_date=posting_date,from_time=child_from)
    overtime_current_job_hours_val,todays_overtime_hours=overall_overtime(jo=job_order, timesheet_date=posting_date, working_hours=cur_timesheet_hours,employee=item['employee'],from_time=child_from)
    w1, overtime_hours, overtime_all_hours, overtime_hiring_hours, hiring_timesheet_oh= sub_update_timesheet(week_job_hours, w1, cur_timesheet_hours, week_all_hours,week_hiring_hours)
    emp_pay_rate = get_emp_pay_rate(job_order, job.company, item['company'], item['employee'])
    if(item['timesheet_value'] and len(item['timesheet_value'])>0):
        timesheet=frappe.get_doc('Timesheet',item['timesheet_value'])                        
        timesheet.time_logs=''
    else:
        timesheet = frappe.get_doc(dict(doctype = "Timesheet", company=job.company, job_order_detail=job_order, employee = item['employee'], from_date=job.from_date, to_date=job.to_date, job_name=job.select_job, per_hour_rate=job.per_hour, flat_rate=job.flat_rate, status_of_work_order=job.order_status, date_of_timesheet=date, timesheet_hours=cur_timesheet_hours,total_weekly_hours= week_all_hours+cur_timesheet_hours, current_job_order_hours=all_job_hours+cur_timesheet_hours, overtime_timesheet_hours= overtime_hours, total_weekly_overtime_hours= overtime_all_hours, cuurent_job_order_overtime_hours= float(overtime_current_job_hours_val), total_weekly_hiring_hours= week_hiring_hours + cur_timesheet_hours, total_weekly_overtime_hiring_hours= overtime_hiring_hours, overtime_timesheet_hours1= hiring_timesheet_oh, billable_weekly_overtime_hours= overtime_hiring_hours, unbillable_weekly_overtime_hours= overtime_all_hours- overtime_hiring_hours, employee_pay_rate = emp_pay_rate,todays_overtime_hours=todays_overtime_hours))
    flat_rate = job.flat_rate + tip_amount
    timesheet= update_billing_details(timesheet,jo=job_order, timesheet_date=posting_date, employee=item['employee'], working_hours=float(item['hours']),total_flat_rate=flat_rate,per_hour_rate=job.per_hour,from_time=child_from)
    timesheet = update_payroll_details(timesheet, emp_pay_rate, job.company, item['employee'], timesheet, posting_date, job_order, today_hours=float(item['hours']),to_time=child_to,from_time=child_from)
    timesheet.append("time_logs", {
        "activity_type": job.select_job, "from_time": child_from, "to_time": child_to, "hrs": str(item['hours'])+" hrs",
        "hours": float(item['hours']), "is_billable": 1, "billing_rate": job.per_hour,"tip":tip_amount, "flat_rate": flat_rate, "break_start_time": break_from,
        "break_end_time": break_to, "extra_hours": float(item['overtime_hours']), "extra_rate": float(item['overtime_rate']), "pay_amount":timesheet.timesheet_payable_amount
    })
    if(item['timesheet_value'] and len(item['timesheet_value'])>0):
        timesheet.save(ignore_permissions=True)
    else:
        timesheet.insert(ignore_permissions=True)
    timesheet = add_status(timesheet, item['status'], item['employee'], job.company, job_order)
    timesheet.save(ignore_permissions=True)
    return timesheet

@frappe.whitelist()
def update_list_page_calculation(timesheet,jo, timesheet_date, employee,working_hours,total_flat_rate,per_hour_rate,from_time):
    try:
        timesheet_date1 = datetime.datetime.strptime(timesheet_date, '%Y-%m-%d').date()
        from_time= datetime.datetime.strptime((timesheet_date+" "+str(from_time)), TM_FT)
        data=billing_details_data(timesheet,jo, timesheet_date1, employee,float(working_hours),float(total_flat_rate),float(per_hour_rate),from_time)
        amount=data[0]
        overtime_hours=(data[1]/(1.5*float(per_hour_rate))-float(total_flat_rate)) if data[1]>0 else 0
        return amount,overtime_hours,data[1]
    except Exception as e:
        frappe.log_error(e,'listing page error')
def create_new_timesheet(selected_items,date,from_time,to_time,job,job_order,company_type,posting_date,save):
    try:
        timesheets = []
        for item in selected_items:
            tip_amount=check_tip(item)
            child_from, child_to, break_from, break_to = get_child_time(date, from_time, to_time, item['from_time'], item['to_time'], item['break_from'], item['break_to'])                  
            timesheet=timesheet_data(item,job_order,job,tip_amount,break_from,break_to,posting_date,child_from,child_to,date)
            staffing_own_timesheet(save,timesheet,company_type)
            timesheets.append({"employee": item['employee'], "docname": timesheet.name, "company": job.company, "job_title": job.select_job,  "employee_name": item['employee_name']})
            update_previous_timesheet(jo=job_order, timesheet_date=posting_date, employee=item['employee'],timesheet=timesheet,to_time=child_to,save=save,timesheet_already_exist=item['timesheet_value'])
        enqueue("tag_workflow.tag_workflow.doctype.add_timesheet.add_timesheet.send_timesheet_for_approval", timesheets=timesheets,save=save,now=True)
    except Exception as e:
        frappe.log_error(e,'back job')