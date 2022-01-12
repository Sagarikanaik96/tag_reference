from time import time
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
def send_timesheet_for_approval(employee, docname, company, job_order):
    try:
        sql = """ select parent from `tabHas Role` where role = "Staffing Admin" and parent in(select user_id from `tabEmployee` where user_id != '' and company = (select company from `tabEmployee` where name = '{0}')) """.format(employee)
        user_list = frappe.db.sql(sql, as_dict=1)
        staffing_user=[]

        for user in user_list:
            if not frappe.db.exists("User Permission",{"user": user.parent,"allow": "Timesheet","apply_to_all_doctypes":1, "for_value": docname}):
                add("Timesheet", docname, user=user.parent, read=1, write=1, submit=1, notify=0)
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
    except Exception as e:
        frappe.error_log(e, "Job Order Approval")
        frappe.throw(e)

@frappe.whitelist(allow_guest=True)
@frappe.validate_and_sanitize_search_inputs
def get_timesheet_employee(doctype, txt, searchfield, start, page_len, filters):
    job_order = filters.get('job_order')
    sql = """ select employee, employee_name from `tabAssign Employee Details` where parent in(select name from `tabAssign Employee` where job_order = '{0}' and tag_status = "Approved") """.format(job_order)
    return frappe.db.sql(sql)


@frappe.whitelist()
def notify_email(job_order, employee, value, subject, company, employee_name, date,employee_company):
    try:
        sql = """ select name from `tabUser` where company = (select company from `tabEmployee` where name = '{0}') """.format(employee)
        user_list = frappe.db.sql(sql, as_dict=1)
        if subject=='DNR':
            message=dnr_notification(job_order,value,employee_name,subject,date,company,employee_company,employee)       
        else:
            message=show_satisfactory_notification(job_order,value,employee_name,subject,date,company,employee_company,employee)
            
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
        sql = """ select no_show, non_satisfactory, dnr from `tabTimesheet` where docstatus != 1 and job_order_detail = '{0}' and employee in (select employee from `tabAssign Employee Details` where parent = '{1}') """.format(job_order, name)
        emp_list = frappe.db.sql(sql, as_dict=1)
        for emp in emp_list:
            if((emp.no_show == 1 or emp.dnr == 1 or emp.non_satisfactory == 1) and (time_diff.seconds/60/60 < 2)):
                is_editable = 1

        return is_editable
    except Exception as e:
        print(e)
        is_editable = 1
        frappe.error_log(frappe.get_traceback(), "check_employee_editable")
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

        sql = '''select email from `tabUser` where company = '{}' '''.format(staffing_company)
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
                rating=[float(i) for i in average_rate[0]]
                doc=frappe.get_doc('Company',staffing_company)
                avg_rating=sum(rating)/len(rating)
                doc.average_rating=str(avg_rating)
                doc.save()
        return "success"
    except Exception as e:
        frappe.error_log(e, "Hiring Company Rating")
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
            user_list=frappe.db.sql(''' select email from `tabUser` where company='{}' '''.format(hiring_company),as_list=1)        
            hiring_user = [hiring_user[0] for hiring_user in user_list]
            make_system_notification(hiring_user,msg,'Timesheet',timesheet_name,subject)
            sendmail(hiring_user, msg, subject, 'Timesheet', timesheet_name)
    except Exception as e:
        frappe.error_log(e, "Timesheet Approved")
        frappe.throw(e)
def unsatisfied_organization(emp_doc,company):
    emp_doc.append('unsatisfied_from', {
        'unsatisfied_organization_name': company,
    })
    emp_doc.save(ignore_permissions=True)

def dnr_notification(job_order,value,employee_name,subject,date,company,employee_company,employee):
    sql = ''' select from_date,to_date from `tabJob Order` where name='{}' '''.format(job_order)
    data=frappe.db.sql(sql, as_dict=1)
    start_date=data[0].from_date
    end_date=data[0].to_date
    time_format = '%Y-%m-%d %H:%M:%S'
    to_date = datetime.datetime.strptime(str(end_date), time_format)
    today = datetime.datetime.now()
    time_diff=today-start_date

    if int(value) ==1 and subject == 'DNR':
        emp_doc = frappe.get_doc('Employee', employee)
        employee_dnr(company,emp_doc)
    
    elif int(value) == 0 and subject == 'DNR':
         emp_doc = frappe.get_doc('Employee', employee)
         removing_dnr_employee(company,emp_doc)

    if(today<=to_date and (time_diff.seconds/60/60 < 2)):
        if(int(value)):
            message = f'<b>{employee_name}</b> has been marked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>. There is time to substitute this employee for today’s work order.'
        return message


    else:
        if(int(value)):
            message = f'<b>{employee_name}</b> has been marked as <b>{subject}</b> for work order <b>{job_order}</b> on <b>{date}</b> with <b>{company}</b>.'
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
        employee_unsatisfactory(company,emp_doc)

    elif(subject=='Non Satisfactory' and int(value)==0):
        emp_doc = frappe.get_doc('Employee', employee)
        removing_unsatisfied_employee(company,emp_doc)
        
    return message

def employee_unsatisfactory(company,emp_doc):
    if len(emp_doc.unsatisfied_from)==0:
        unsatisfied_organization(emp_doc,company)
    else:
        for i in emp_doc.unsatisfied_from:
            if(i.unsatisfied_organization_name == company):
                break
        else:
            unsatisfied_organization(emp_doc,company)

def removing_unsatisfied_employee(company,emp_doc):
    if len(emp_doc.unsatisfied_from)!=0:
        for i in emp_doc.unsatisfied_from:
            if i.unsatisfied_organization_name == company:
                remove_row = i
        emp_doc.remove(remove_row)
        emp_doc.save(ignore_permissions=True)
        
@frappe.whitelist()
def assigned_job_order(doctype,txt,searchfield,page_len,start,filters):
    try:
        company=filters.get('company')
        sql = ''' select name from `tabJob Order` where company = '{0}' and name in (select job_order from `tabAssign Employee` where hiring_organization = '{0}')'''.format(company)
        return frappe.db.sql(sql)
    except Exception as e:
        frappe.error_log(e, "Job Order For Timesheet")
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
        frappe.error_log(e, "Dispute Message")
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
        sql = ''' select email from `tabUser` where company = '{}' '''.format(hiring_company)
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
                rating=[float(i) for i in average_rate[0]]
                doc=frappe.get_doc('Company',hiring_company)
                avg_rating=sum(rating)/len(rating)
                doc.average_rating=str(avg_rating)
                doc.save()
        return "success"
    except Exception as e:
        frappe.error_log(e, "Hiring Company Rating")
        frappe.throw(e)



@frappe.whitelist()
def staffing_emp_rating(employee,id,up,down,job_order,comment,timesheet_name):
    try:
        parent = frappe.get_doc('Job Order', job_order)
        parent.append('employee_rating', {
            'employee_name': employee +'-'+ id,
            'rating':  1 if up else down,
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
        frappe.error_log(e, "Staffing Employee Rating")
        frappe.throw(e)


def employee_dnr(company,emp_doc):
    if len(emp_doc.dnr_employee_list) == 0:
        do_not_return(emp_doc,company)
    else:
        for i in emp_doc.dnr_employee_list:
            if i.dnr == company:
                break
        else:
            do_not_return(emp_doc,company)
            
        
def removing_dnr_employee(company,emp_doc):
    if len(emp_doc.dnr_employee_list)!=0:
        for i in emp_doc.dnr_employee_list:
            if i.dnr == company:
                remove_row = i
        emp_doc.remove(remove_row)
        emp_doc.save(ignore_permissions=True)
        
        
def do_not_return(emp_doc,company):
    emp_doc.append('dnr_employee_list',{'dnr':company})
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
        user_list=frappe.db.sql(''' select email from `tabUser` where company='{}' '''.format(hiring_company),as_list=1)        
        hiring_user = [hiring_user[0] for hiring_user in user_list]
        make_system_notification(hiring_user,msg,'Timesheet',timesheet_name,subject)
        sendmail(hiring_user, msg, subject, 'Timesheet', timesheet_name)
    except Exception as e:
        frappe.error_log(e, "Timesheet Denied")
        frappe.throw(e)
