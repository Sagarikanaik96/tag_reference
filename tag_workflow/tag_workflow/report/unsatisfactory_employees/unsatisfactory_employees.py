# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt

import frappe
from tag_workflow.tag_workflow.page.staff_company_list.staff_company_list import comp

def execute(filters=None):
	if not filters:
		filters={}
	columns,data=[],[]
	user_name=frappe.session.user
	sql = ''' select organization_type from `tabUser` where email='{}' '''.format(user_name)
	user_type=frappe.db.sql(sql, as_list=1)
	from_date=filters.get('start_date')
	to_date=filters.get('end_date')

	columns=[
		{'fieldname':'job_order_detail','label':('Job Order ID'),'fieldtype':'Link','options':'Job Order','width':150},
		{'fieldname':'employee_name','label':('Employee Name'),'fieldtype':'data','width':150},
        {'fieldname':'select_job','label':('Job Title'),'fieldtype':'data','width':150},
        {'fieldname':'company','label':('Company'),'fieldtype':'Data','width':150},
        {'fieldname':'total_hours','label':('Hours Worked'),'fieldtype':'Float','width':150},
        {'fieldname':'total_billable_amount','label':('Rate'),'fieldtype':'Currency','width':150},
        {'fieldname':'from_date','label':("Start Date"),'fieldtype':'Date','width':150},
        {'fieldname':'to_date','label':('End Date'),'fieldtype':'Date','width':150}
	]
	if frappe.session.user=="Administrator" or user_type[0][0]=='TAG':
		data=frappe.db.sql(''' select job_order_detail,employee_name,`tabJob Order`.select_job,`tabTimesheet`.company as company,total_hours,total_billable_amount,`tabJob Order`.from_date,`tabJob Order`.to_date from `tabTimesheet`,`tabJob Order` where `tabTimesheet`.job_order_detail=`tabJob Order`.name and non_satisfactory=1 and start_date>="{0}" and end_date<="{1}" '''.format(from_date,to_date))
	else:
		data=frappe.db.sql(''' select job_order_detail,employee_name,`tabJob Order`.select_job,`tabTimesheet`.company as company,total_hours,total_billable_amount,`tabJob Order`.from_date,`tabJob Order`.to_date from `tabTimesheet`,`tabJob Order` where `tabTimesheet`.job_order_detail=`tabJob Order`.name and employee_company in (select company from `tabEmployee` where email ="{0}") and non_satisfactory=1 and start_date>="{1}" and end_date<="{2}" '''.format(user_name,from_date,to_date))

	return columns, data
