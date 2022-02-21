from time import time
import frappe
from frappe import _, msgprint
from frappe.share import add
import datetime
from pymysql.constants.ER import NO
from tag_workflow.utils.notification import sendmail, make_system_notification
import json
from frappe.utils import time_diff_in_seconds
from frappe import enqueue
# global #
JOB = "Job Order"
assignEmployee="Assign Employee"
TM_FT = "%Y-%m-%d %H:%M:%S"


#----------------#
@frappe.whitelist()
def send_timesheet_for_approval(employee, docname, company, job_order):
    try:
        sql = """ select parent from `tabHas Role` where role = "Staffing Admin" and parent in(select user_id from `tabEmployee` where user_id != '' and company = (select company from `tabEmployee` where name = '{0}')) """.format(employee)
        user_list = frappe.db.sql(sql, as_dict=1)
        staffing_user=[]

        for user in user_list:
            if not frappe.db.exists("User Permission",{"user": user.parent,"allow": "Timesheet","apply_to_all_doctypes":1, "for_value": docname}):
                add("Timesheet", docname, user=user.parent, read=1, write=1, submit=1, notify=0, flags={"ignore_share_permission": 1})
                perm_doc = frappe.get_doc(dict(doctype="User Permission",user=user.parent,allow="Timesheet",for_value=docname,apply_to_all_doctypes=1))
                perm_doc.save(ignore_permissions=True)
            if user.parent not in staffing_user:
                staffing_user.append(user.parent)

        sql = ''' select select_job from `tabJob Order` where name='{}' '''.format(job_order)
        job_order_data = frappe.db.sql(sql,as_dict=1)
        job_title = job_order_data[0].select_job
        today = datetime.date.today()
        msg = f'{company} has submitted a timesheet on {today} for {job_title} for approval. '
        subject = 'Timesheet For Approval'
        make_system_notification(staffing_user, msg, 'Timesheet', docname,subject)
        sendmail(staffing_user, msg, subject, 'Timesheet', docname)
        return True
    except Exception as e:
        frappe.log_error(e, "Job Order Approval")

#----------timesheet------------------#
@frappe.whitelist()
def get_timesheet_data(job_order, user, company_type):
    try:
        if(company_type in ["Hiring", "Exclusive Hiring"]):
            sql = """ select employee, employee_name from `tabAssign Employee Details` where parent in(select name from `tabAssign Employee` where job_order = '{0}' and tag_status = "Approved") """.format(job_order)
            data = frappe.db.sql(sql, as_dict=1)
            result = [{"employee": d['employee'], "employee_name": d["employee_name"], "enter_time": "", "exit_time": "", "total_hours": 0.00} for d in data]
            return result
        return []
    except Exception as e:
        return []
        frappe.msgprint(e)


#------------------------------------#
def get_child_time(posting_date, from_time, to_time, child_from=None, child_to=None):
    try:
        if(child_from and child_to):
            from_time = datetime.datetime.strptime((posting_date+" "+str(child_from)), TM_FT)
            to_time = datetime.datetime.strptime((posting_date+" "+str(child_to)), TM_FT)
            return from_time, to_time
        else:
            return from_time, to_time
    except Exception as e:
        print(e)
        return from_time, to_time

def check_old_timesheet(child_from, child_to, employee, job_order):
    try:
        sql = """select c.name, c.parent from `tabTimesheet Detail` c where (('{1}' >= c.from_time and '{1}' <= c.to_time) or ('{2}' >= c.from_time and '{2}' <= c.to_time) or ('{1}' <= c.from_time and '{2}' >= c.to_time)) and parent in (select name from `tabTimesheet` where employee = '{0}') """.format(employee, child_from, child_to)
        data = frappe.db.sql(sql, as_dict=1)
        return 1 if(len(data) > 0) else 0
    except Exception as e:
        print(e)
        return 0

def check_if_employee_assign(items):
    try:
        is_employee = 1
        for item in items['items']:
            sql = """ select employee from `tabAssign Employee Details` where employee = '{0}' and parent in (select name from `tabAssign Employee` where tag_status = "Approved" and job_order = '{1}') """.format(item['employee'], items['job_order'])
            result = frappe.db.sql(sql, as_dict=1)
            if(len(result) == 0):
                frappe.msgprint(_("Employee with ID <b>{0}</b> not assigned to this Job Order(<b>{1}</b>). Please fill the details correctly.").format(item['employee'], items['job_order']))
                is_employee = 0
        return is_employee
    except Exception as e:
        frappe.msgprint(e)
        return False
        

@frappe.whitelist()
def update_timesheet_data(data, company, company_type, user):
    try:
        added = 0
        if(company_type != "Hiring" and user != frappe.session.user):
            return

        data = json.loads(data)
        is_employee = check_if_employee_assign(data)
        if(is_employee == 0):
            return False

        job = frappe.get_doc("Job Order", {"name": data['job_order']})
        posting_date = datetime.datetime.strptime(data['posting_date'], "%Y-%m-%d").date()
        if(posting_date >= job.from_date and posting_date <= job.to_date):
            from_time = datetime.datetime.strptime((data['posting_date']+" "+data['enter_time']), TM_FT)
            to_time = datetime.datetime.strptime((data['posting_date']+" "+data['exit_time']), TM_FT)
            for item in data['items']:
                child_from, child_to = get_child_time(data['posting_date'], from_time, to_time, item['enter_time'], item['exit_time'])
                is_ok = check_old_timesheet(child_from, child_to, item['employee'], data['job_order'])
                if(is_ok == 0):
                    timesheet = frappe.get_doc(dict(doctype = "Timesheet", company=company, job_order_detail=data['job_order'], employee = item['employee'], from_date=job.from_date, to_date=job.to_date, job_name=job.select_job, per_hour_rate=job.per_hour, flat_rate=job.flat_rate,status_of_work_order = job.order_status,date_of_timesheet=data['posting_date']))
                    timesheet.append("time_logs", {
                        "activity_type": job.select_job,
                        "from_time": child_from,
                        "to_time": child_to,
                        "hrs": str(item['total_hours'])+" hrs",
                        "hours": float(item['total_hours']),
                        "is_billable": 1,
                        "billing_rate": job.per_hour,
                        "flat_rate": job.flat_rate
                    })
                    timesheet.insert(ignore_permissions=True)
                    timesheet.workflow_state = "Approval Request"
                    timesheet.save()
                    enqueue("tag_workflow.utils.timesheet.send_timesheet_for_approval", employee=item['employee'],docname=timesheet.name,company=company,job_order=data['job_order'])
                    added = 1
                else:
                    frappe.msgprint(_("Timesheet already filled for employee <b>{0}</b>(<b>{1}</b>) for given datetime").format(item["employee_name"],item['employee']))
        else:
            frappe.msgprint(_("Date must be in between Job Order start date and end date for timesheets"))

        return True if added == 1 else False
    except Exception as e:
        print(e)
        frappe.db.rollback()
        return False

@frappe.whitelist(allow_guest=True)
@frappe.validate_and_sanitize_search_inputs
def get_timesheet_employee(doctype, txt, searchfield, start, page_len, filters):
    job_order = filters.get('job_order')
    sql = """ select employee, employee_name from `tabAssign Employee Details` where parent in(select name from `tabAssign Employee` where job_order = '{0}' and tag_status = "Approved") """.format(job_order)
    return frappe.db.sql(sql)


@frappe.whitelist()
def notify_email(job_order, employee, value, subject, company, employee_name, date,employee_company,timesheet_name):
    try:
        sql = """ select user_id from `tabEmployee` where company = (select company from `tabEmployee` where name = '{0}') and user_id IS NOT NULL  """.format(employee)
        user_list = frappe.db.sql(sql, as_dict=1)
        if subject=='DNR':
            message=dnr_notification(job_order,value,employee_name,subject,date,company,employee_company,employee)       
        else:
            message=show_satisfactory_notification(job_order,value,employee_name,subject,date,company,employee_company,employee)
            
        users = []
        for user in user_list:
            users.append(user['user_id'])

        if users:
            make_system_notification(users, message,JOB, job_order, subject)
            sendmail(users, message, subject, "Timesheet", timesheet_name)
    except Exception as e:
        frappe.log_error(e, "Timesheet Email Error")
        frappe.throw(e)

#-------assign employee----------#
@frappe.whitelist()
def check_employee_editable(job_order, name, creation):
    try:
        is_editable = 0
        order = frappe.get_doc(JOB, job_order)
        time_format = TM_FT
        from_date = order.from_date#datetime.datetime.strptime(str(order.from_date), time_format)
        to_date = order.to_date#datetime.datetime.strptime(str(order.to_date), time_format)
        creation = datetime.datetime.strptime(str(creation[0:19]), time_format)
        today = datetime.datetime.now()

        if(today.date() >= to_date):
            return is_editable

        sql = """ select no_show, non_satisfactory, dnr from `tabTimesheet` where docstatus != 1 and job_order_detail = '{0}' and employee in (select employee from `tabAssign Employee Details` where parent = '{1}') """.format(job_order, name)
        emp_list = frappe.db.sql(sql, as_dict=1)
        for emp in emp_list:
            if(emp.no_show == 1 or emp.dnr == 1 or emp.non_satisfactory == 1):
                is_editable = 1

        return is_editable
    except Exception as e:
        print(e)
        is_editable = 1
        frappe.log_error(frappe.get_traceback(), "check_employee_editable")
        return is_editable

@frappe.whitelist()
def company_rating(hiring_company=None,staffing_company=None,ratings=None,job_order=None):
    try:
        ratings = json.loads(ratings)
        doc = frappe.new_doc('Company Review')
        doc.staffing_company=staffing_company
        doc.hiring_company=hiring_company
        doc.job_order=job_order
        doc.rating=ratings['Rating']
        if 'Comment' in ratings.keys():
            doc.comments=ratings['Comment']
        doc.save(ignore_permissions=True)

        sql = '''select user_id from `tabEmployee` where company = '{}' and user_id IS NOT NULL '''.format(staffing_company)
        staff_member = frappe.db.sql(sql, as_list=1)
        for staff in staff_member:
            add("Company Review", doc.name, staff[0], read=1, write = 0, share = 0, everyone = 0,notify = 1, flags={"ignore_share_permission": 1})

        sql = ''' select average_rating from `tabCompany` where name = '{}' '''.format(staffing_company)
        company_rate = frappe.db.sql(sql, as_list=1)
        if (len(company_rate)==0 or company_rate[0][0]==None):
            doc=frappe.get_doc('Company',staffing_company)
            doc.average_rating=ratings['Rating']
            doc.save()
        else:
            sql = ''' select rating from `tabCompany Review` where staffing_company='{}' '''.format(staffing_company)
            average_rate = frappe.db.sql(sql, as_list=1)
            if average_rate[0][0]!=None:
                rating=[float(i[0]) for i in average_rate]
                doc=frappe.get_doc('Company',staffing_company)
                avg_rating=round(sum(rating)/len(rating))
                doc.average_rating=str(avg_rating)
                doc.save()
        return "success"
    except Exception as e:
        frappe.log_error(e, "Hiring Company Rating")
        frappe.throw(e)

@frappe.whitelist()
def approval_notification(job_order=None,staffing_company=None,date=None,hiring_company=None,timesheet_name=None,timesheet_approved_time=None,current_time=None):
    try:
        if(time_diff_in_seconds(current_time,timesheet_approved_time)<=30):
            sql = ''' select select_job,job_site,creation from `tabJob Order` where name='{}' '''.format(job_order)
            job_order_data = frappe.db.sql(sql,as_dict=1)
            job_location=job_order_data[0].job_site
            job_title=job_order_data[0].select_job
            subject='Timesheet Approval'
            msg=f'{staffing_company} has approved the {timesheet_name} timesheet for {job_title} at {job_location}'
            user_list=frappe.db.sql(''' select user_id from `tabEmployee` where company='{}' and user_id IS NOT NULL'''.format(hiring_company),as_list=1)        
            hiring_user = [hiring_user[0] for hiring_user in user_list]
            make_system_notification(hiring_user,msg,'Timesheet',timesheet_name,subject)
            sql = """ UPDATE `tabTimesheet` SET approval_notification = 0 where name="{0}" """.format(timesheet_name)
            frappe.db.sql(sql)
            frappe.db.commit()
            sendmail(hiring_user, msg, subject, 'Timesheet', timesheet_name)
    except Exception as e:
        frappe.log_error(e, "Timesheet Approved")
        frappe.throw(e)
def unsatisfied_organization(emp_doc,company,job_order):
    emp_doc.append('unsatisfied_from', {
        'unsatisfied_organization_name': company,
        'job_order':job_order,
        'date':datetime.datetime.now()
    })
    assign_emp_doc=f"""select name from `tabAssign Employee` where job_order='{job_order}' and company='{emp_doc.company}' """
    data=frappe.db.sql(assign_emp_doc,as_dict=True)
    assign_doc=frappe.get_doc(assignEmployee,data[0].name)
    assign_doc.append('replaced_employees', {
        'employee_name': emp_doc.name,
        "employee_status":"Non Satisfactory"
    })
    assign_doc.save(ignore_permissions=True)
    emp_doc.save(ignore_permissions=True)

def dnr_notification(job_order,value,employee_name,subject,date,company,employee_company,employee):
    sql = ''' select from_date,job_start_time,to_date from `tabJob Order` where name='{}' '''.format(job_order)
    data=frappe.db.sql(sql, as_dict=1)
    start_date=data[0].from_date
    end_date=data[0].to_date
    today = datetime.date.today()
    to_time=data[0].job_start_time
    time_object = datetime.datetime.strptime(str(to_time), '%H:%M:%S').time()
    time_diff=time_diff_in_seconds(str(datetime.datetime.now().time()),str(time_object))
    if int(value) ==1 and subject == 'DNR':
        emp_doc = frappe.get_doc('Employee', employee)
        employee_dnr(company,emp_doc,job_order)
    
    elif int(value) == 0 and subject == 'DNR':
         emp_doc = frappe.get_doc('Employee', employee)
         removing_dnr_employee(company,emp_doc,job_order)

    if(today<=end_date and today-start_date==0 and (time_diff/60/60 < 2)):
        if(int(value)):
            message = f'<b>{employee_name}</b> has been marked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>. There is time to substitute this employee for today’s work order {datetime.date.today()}'
        else:
            message = f'<b>{employee_name}</b> has been unmarked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>.'
        return message

    else:
        if(int(value)):
            message = f'<b>{employee_name}</b> has been marked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>. There is time to substitute this employee for tomorrow’s work order {datetime.date.today()}'
        else:
            message = f'<b>{employee_name}</b> has been unmarked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>.'
        return message
        
def show_satisfactory_notification(job_order,value,employee_name,subject,date,company,employee_company,employee):
    if(int(value)):
        message = f'<b>{employee_name}</b> has been marked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>.'
    else:
        message = f'<b>{employee_name}</b> has been unmarked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>.'
    
    if(subject=='Non Satisfactory' and int(value)==1):
        emp_doc = frappe.get_doc('Employee', employee)
        employee_unsatisfactory(company,emp_doc,job_order)

    elif(subject=='Non Satisfactory' and int(value)==0):
        emp_doc = frappe.get_doc('Employee', employee)
        removing_unsatisfied_employee(company,emp_doc,job_order)
    no_show(job_order,value,subject,company,employee)
            
    return message

def employee_unsatisfactory(company,emp_doc,job_order):
    if len(emp_doc.unsatisfied_from)==0:
        unsatisfied_organization(emp_doc,company,job_order)
    else:
        for i in emp_doc.unsatisfied_from:
            if(i.unsatisfied_organization_name == company):
                break
        else:
            unsatisfied_organization(emp_doc,company,job_order)


def removing_unsatisfied_employee(company,emp_doc,job_order):
    if len(emp_doc.unsatisfied_from)!=0:
        for i in emp_doc.unsatisfied_from:
            if i.unsatisfied_organization_name == company and i.job_order==job_order:
                remove_row = i
        assign_emp_doc=f"""select name from `tabAssign Employee` where job_order='{job_order}' and company='{emp_doc.company}' """
        data=frappe.db.sql(assign_emp_doc,as_dict=True)
        assign_doc=frappe.get_doc(assignEmployee,data[0].name)
        for y in assign_doc.replaced_employees:
            if y.employee_name == emp_doc.name and y.employee_status=="Non Satisfactory":
                removed_row = y
       
        emp_doc.remove(remove_row)
        emp_doc.save(ignore_permissions=True)
        assign_doc.remove(removed_row)
        assign_doc.save(ignore_permissions=True)


@frappe.whitelist()
def assigned_job_order(doctype,txt,searchfield,page_len,start,filters):
    try:
        company=filters.get('company')
        today = datetime.datetime.now()

        sql = ''' select name from `tabJob Order` where company = '{0}' and from_date<'{1}' and name in (select job_order from `tabAssign Employee` where hiring_organization = '{0}')'''.format(company,today)
        return frappe.db.sql(sql)
    except Exception as e:
        frappe.log_error(e, "Job Order For Timesheet")
        frappe.throw(e)

@frappe.whitelist()
def jb_ord_dispute_comment_box(comment,job_order):
    try:
        comment = json.loads(comment)
        if comment:
            job_order_doc = frappe.get_doc('Job Order',job_order)
            if job_order_doc.dispute_comment:
                job_order_doc.dispute_comment += '\n' +'-'*15 + '\n'+ comment['Comment']
            else:
                job_order_doc.dispute_comment = comment['Comment']

            job_order_doc.flags.ignore_mandatory = True
            job_order_doc.save(ignore_permissions=True)

            return True
    except Exception as e:
        frappe.log_error(e, "Dispute Message")
        frappe.throw(e)


@frappe.whitelist()
def hiring_company_rating(hiring_company=None,staffing_company=None,ratings=None,job_order=None):
    try:
        ratings = json.loads(ratings)
        doc = frappe.new_doc('Hiring Company Review')
        doc.staffing_company=staffing_company
        doc.hiring_company=hiring_company
        doc.job_order=job_order
        doc.rating=ratings['Rating']
        if 'Comment' in ratings.keys():
            doc.comments=ratings['Comment']
        doc.save(ignore_permissions=True)
        sql = ''' select user_id from `tabEmployee` where company = '{}' and user_id IS NOT NULL '''.format(hiring_company)
        hiring_member = frappe.db.sql(sql, as_list=1)
        for name in hiring_member:
            add("Hiring Company Review", doc.name, name[0], read=1, write = 0, share = 0, everyone = 0,notify = 1, flags={"ignore_share_permission": 1})
        company_rate=frappe.db.sql(''' select average_rating from `tabCompany` where name='{}' '''.format(hiring_company),as_list=1)
        if (len(company_rate)==0 or company_rate[0][0]==None):
            doc=frappe.get_doc('Company',hiring_company)
            doc.average_rating=ratings['Rating']
            doc.save()
        else:
            sql = ''' select rating from `tabHiring Company Review` where hiring_company = '{}' '''.format(hiring_company)
            average_rate = frappe.db.sql(sql, as_list=1)
            if average_rate[0][0]!=None:
                rating=[float(i[0]) for i in average_rate]
                doc=frappe.get_doc('Company',hiring_company)
                avg_rating=round(sum(rating)/len(rating),1)
                doc.average_rating=str(avg_rating)
                doc.save()
        return "success"
    except Exception as e:
        frappe.log_error(e, "Hiring Company Rating")
        frappe.throw(e)



@frappe.whitelist()
def staffing_emp_rating(employee,id,up,down,job_order,comment,timesheet_name):
    try:
        rating = 1
        if int(down):
            rating = 0
        parent = frappe.get_doc('Job Order', job_order)
        parent.append('employee_rating', {
            'employee_name': employee +'-'+ id,
            'rating':  rating,
            'comment': comment if comment else ''
        })
        parent.flags.ignore_mandatory = True
        parent.save(ignore_permissions=True)
        timesheet = frappe.get_doc('Timesheet',timesheet_name)
        timesheet.is_employee_rating_done = 1
        timesheet.flags.ignore_mandatory = True
        timesheet.save(ignore_permissions=True)
        return True
    except Exception as e:
        frappe.log_error(e, "Staffing Employee Rating")
        frappe.throw(e)


def employee_dnr(company,emp_doc,job_order):
    if len(emp_doc.dnr_employee_list) == 0:
        do_not_return(emp_doc,company,job_order)
    else:
        for i in emp_doc.dnr_employee_list:
            if i.dnr == company:
                break
        else:
            do_not_return(emp_doc,company,job_order)
            
      
def removing_dnr_employee(company,emp_doc,job_order):
    if len(emp_doc.dnr_employee_list)!=0:
        for i in emp_doc.dnr_employee_list:
            if i.dnr == company and i.job_order==job_order:
                remove_row = i
        emp_doc.remove(remove_row)
        emp_doc.save(ignore_permissions=True)
           
   
def do_not_return(emp_doc,company,job_order):
    emp_doc.append('dnr_employee_list',{'dnr':company,'job_order':job_order,'date':datetime.datetime.now()})
    emp_doc.save(ignore_permissions = True)

@frappe.whitelist()
def denied_notification(job_order,hiring_company,staffing_company,timesheet_name):
    try:
        sql = ''' select select_job,job_site,creation from `tabJob Order` where name='{}' '''.format(job_order)
        job_order_data = frappe.db.sql(sql,as_dict=1)
        job_location=job_order_data[0].job_site
        job_title=job_order_data[0].select_job
        subject='Timesheet Denied'
        msg=f'{staffing_company} has denied the {timesheet_name} timesheet for {job_title} at {job_location}'
        user_list=frappe.db.sql(''' select user_id from `tabEmployee` where company='{}' and user_id IS NOT NULL '''.format(hiring_company),as_list=1)        
        hiring_user = [hiring_user[0] for hiring_user in user_list]
        make_system_notification(hiring_user,msg,'Timesheet',timesheet_name,subject)
        sendmail(hiring_user, msg, subject, 'Timesheet', timesheet_name)
    except Exception as e:
        frappe.log_error(e, "Timesheet Denied")
        frappe.throw(e)

@frappe.whitelist()
def timesheet_dispute_comment_box(comment,timesheet):
    try:
        comment = json.loads(comment)
        if comment:
            timesheet_doc = frappe.get_doc('Timesheet',timesheet) #timesheet
            if timesheet_doc.dispute:
                timesheet_doc.dispute += '\n' +'-'*15 + '\n'+ comment['Comment']
            else:
                timesheet_doc.dispute = comment['Comment']
            timesheet_doc.flags.ignore_mandatory = True
            timesheet_doc.save(ignore_permissions=True)
            return True
    except Exception as e:
        frappe.log_error(e, "Dispute Message")
        frappe.throw(e)

@frappe.whitelist()
def job_name(doctype,txt,searchfield,page_len,start,filters):
    try:
        job=filters.get('job_name')
        sql = ''' select select_job from `tabJob Order` where name="{0}" '''.format(job)
        return frappe.db.sql(sql)
    except Exception as e:
        frappe.log_error(e, "Job Order For Timesheet")
        frappe.throw(e)
def no_show(job_order,value,subject,company,employee):
    if(subject=='No Show' and int(value)==1):
        emp_doc = frappe.get_doc('Employee', employee)
        employee_no_show(company,emp_doc,job_order)

    elif(subject=='No Show' and int(value)==0):
        emp_doc = frappe.get_doc('Employee', employee)
        removing_no_show(company,emp_doc,job_order)


def employee_no_show(company,emp_doc,job_order,):
    if len(emp_doc.no_show)==0:
        no_show_org(emp_doc,company,job_order)
    else:
        for i in emp_doc.no_show:
            if(i.no_show_company == company and i.job_order==job_order):
                break
        else:
            no_show_org(emp_doc,company,job_order)

def no_show_org(emp_doc,company,job_order):
    emp_doc.append('no_show', {
        'no_show_company': company,
        'job_order':job_order,
        'date':datetime.datetime.now()
    })
    emp_doc.save(ignore_permissions=True)
    assign_emp_doc=f"""select name from `tabAssign Employee` where job_order='{job_order}' and company='{emp_doc.company}' """
    data=frappe.db.sql(assign_emp_doc,as_dict=True)
    assign_doc=frappe.get_doc(assignEmployee,data[0].name)
    assign_doc.append('replaced_employees', {
        'employee_name': emp_doc.name,
        "employee_status":"No Show"
    })
    assign_doc.save(ignore_permissions=True)
   


def removing_no_show(company,emp_doc,job_order):
    if len(emp_doc.no_show)!=0:
        for i in emp_doc.no_show:
            if i.no_show_company == company and i.job_order==job_order:
                remove_row = i
        assign_emp_doc=f"""select name from `tabAssign Employee` where job_order='{job_order}' and company='{emp_doc.company}' """
        data=frappe.db.sql(assign_emp_doc,as_dict=True)
        assign_doc=frappe.get_doc(assignEmployee,data[0].name)
        for y in assign_doc.replaced_employees:
            if y.employee_name == emp_doc.name and y.employee_status=="No Show":
                removed_row = y
       
        emp_doc.remove(remove_row)
        emp_doc.save(ignore_permissions=True)
        assign_doc.remove(removed_row)
        assign_doc.save(ignore_permissions=True)
    
