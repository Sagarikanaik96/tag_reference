# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt

import frappe
import datetime

def execute(filters=None):
	if not filters:
		filters={}
	company_search=filters.get('companies')
	time_format = '%Y-%m-%d'
	condition=""
	if(filters.get('start_date')):
		from_date = datetime.datetime.strptime(str(filters.get('start_date')), time_format)
		condition+=f" and JO.from_date>'{from_date}'"
	else:
		from_date=""
	if(filters.get('end_date')):
		to_date = datetime.datetime.strptime(str(filters.get('end_date')), time_format)
		condition+=f" and JO.to_date<'{to_date}'"
	else:
		to_date=""

	today = datetime.datetime.now()
	staff_company='Staffing Company Name'
	fromdate='From Date'
	todate='To Date'
	columns, dataa = [], []
	columns=[
			{'fieldname':'employee_company','label':(staff_company),'fieldtype':'Data','width':200},
			{'fieldname':'from_date','label':(fromdate),'fieldtype':'Date','width':150},
			{'fieldname':'to_date','label':(todate),'fieldtype':'Date' ,'width':150},
			{'fieldname':'total_hours_worked','label':('Total Cost'),'fieldtype':'Currency','width':150},
		]
	if(to_date and today.date() < to_date.date()):
		frappe.msgprint("You Can't Fetch record of Future Date")
	elif(from_date and today.date() < from_date.date()):
		frappe.msgprint("You Can't Fetch record of Future Date")
	elif(to_date and from_date and to_date.date()<from_date.date()):
		frappe.msgprint("To Date can't be before From Date")
	else:
		current_company=frappe.db.sql(''' select company from `tabUser` where email='{}' '''.format(frappe.session.user),as_list=1)
		dataa= fields_data(current_company,filters,company_search,condition)
		
			
	return columns, dataa

def fields_data(current_company,filters,company_search,condition):
	data=[]
	if(len(current_company)==0 or current_company[0][0]=='TAG'):
		if(filters.get('companies')):
			data=frappe.db.sql(''' select T.employee_company,min(JO.from_date),max(JO.to_date),sum(TD.billing_amount) from`tabJob Order` as JO,`tabTimesheet` as T,`tabTimesheet Detail` as TD where T.workflow_state='Approved' and T.name=TD.parent and T.job_order_detail=JO.name and T.employee_company like '{0}%' {1}  group by T.employee_company; '''.format(company_search,condition))
		else:
			data=frappe.db.sql(''' select T.employee_company,min(JO.from_date),max(JO.to_date),sum(TD.billing_amount) from`tabJob Order` as JO,`tabTimesheet` as T,`tabTimesheet Detail` as TD where T.workflow_state='Approved' and T.name=TD.parent and T.job_order_detail=JO.name {0} group by T.employee_company; '''.format(condition))

	
	else:
		current_company=current_company[0][0]
		if(filters.get('companies')):
			data=frappe.db.sql(''' select T.employee_company,min(JO.from_date),max(JO.to_date),sum(TD.billing_amount) from`tabJob Order` as JO,`tabTimesheet` as T,`tabTimesheet Detail` as TD where T.workflow_state='Approved' and T.name=TD.parent and T.job_order_detail=JO.name and JO.company='{0}' and T.employee_company like '{1}%' {2} group by T.employee_company; '''.format(current_company,company_search,condition))
		else:
			data=frappe.db.sql(''' select T.employee_company,min(JO.from_date),max(JO.to_date),sum(TD.billing_amount) from`tabJob Order` as JO,`tabTimesheet` as T,`tabTimesheet Detail` as TD where T.workflow_state='Approved' and T.name=TD.parent and T.job_order_detail=JO.name and JO.company='{0}' {1} group by T.employee_company; '''.format(current_company,condition))
	return data
