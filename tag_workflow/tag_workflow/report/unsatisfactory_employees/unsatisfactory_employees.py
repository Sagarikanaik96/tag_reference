# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
	if not filters:
		filters={}
	columns,data=[],[]
	company=frappe.defaults.get_user_default("Company")

	columns=[
		{'fieldname':'employee_name','label':('Employee Name'),'fieldtype':'data','width':150},
        {'fieldname':'job_order_detail','label':('Job Title'),'fieldtype':'Link','options':'Job Order','width':150},
        {'fieldname':'company','label':('Company'),'fieldtype':'Data','width':150},
        {'fieldname':'total_hours','label':('Hours Worked'),'fieldtype':'int','width':150},
        {'fieldname':'total_billable_amount','label':('Rate'),'fieldtype':'int','width':150},
        {'fieldname':'start_date','label':("Start Date"),'fieldtype':'Date','width':150},
        {'fieldname':'end_date','label':('End Date'),'fieldtype':'Date','width':150}
	]
	if frappe.session.user=="Administrator":
		data=frappe.db.sql(''' select employee_name,job_order_detail,company,total_hours,total_billable_amount,start_date,end_date from `tabTimesheet` where non_satisfactory=1 ''')
	else:
		data=frappe.db.sql(''' select employee_name,job_order_detail,company,total_hours,total_billable_amount,start_date,end_date from `tabTimesheet` where employee_company='{}' and non_satisfactory=1'''.format(company))



	return columns, data
