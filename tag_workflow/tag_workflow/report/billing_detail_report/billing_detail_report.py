# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt

import frappe
import datetime

def execute(filters=None):
	if not filters:
		filters={}
	company_search=filters.get('companies')
	time_format = '%Y-%m-%d'
	from_date = datetime.datetime.strptime(str(filters.get('start_date')), time_format)
	to_date = datetime.datetime.strptime(str(filters.get('end_date')), time_format)
	today = datetime.datetime.now()
	staff_company='Staffing Company Name'
	fromdate='From Date'
	todate='To Date'
	columns, dataa = [], []
	columns=[
		{'fieldname':'employee_company','label':(staff_company),'fieldtype':'Data','width':200},
		{'fieldname':'from_date','label':(fromdate),'fieldtype':'Date','width':150},
		{'fieldname':'to_date','label':(todate),'fieldtype':'Date' ,'width':150},
		{'fieldname':'name','label':('Total Number of Work Orders'),'fieldtype':'Int','width':200},
		{'fieldname':'base_billing_amount','label':('Total Hours Billed'),'fieldtype':'Int','width':150},
		{'fieldname':'hours','label':('Total Cost Billed'),'fieldtype':'Float','width':150}
	]
	if(today.date() < to_date.date()):
		frappe.msgprint("You Can't Fetch record of Future Date")
	elif(today.date() < from_date.date()):
		frappe.msgprint("You Can't Fetch record of Future Date")
	elif(to_date.date()<from_date.date()):
		frappe.msgprint("Start Date Can't be Future Date For End Date")
	else:
		current_company=frappe.db.sql(''' select company from `tabUser` where email='{}' '''.format(frappe.session.user),as_list=1)

		dataa=fields_data(filters,current_company,from_date,to_date,company_search)
		
			
	return columns, dataa

def fields_data(filters,current_company,from_date,to_date,company_search):
	data=[]
	if(len(current_company)==0 or current_company[0][0]=='TAG'):
		if(filters.get('companies')):
			data=frappe.db.sql(''' select T.employee_company,min(JO.from_date),max(JO.to_date),count(JO.name),sum(TD.base_billing_amount),sum(TD.hours) from`tabJob Order` as JO,`tabTimesheet` as T,`tabTimesheet Detail` as TD where T.workflow_state='Approved' and T.name=TD.parent and T.job_order_detail=JO.name and JO.from_date>'{0}' and JO.to_date<'{1}' and T.employee_company like '{2}%' group by T.employee_company;'''.format(from_date,to_date,company_search))
		else:
			data=frappe.db.sql(''' select T.employee_company,min(JO.from_date),max(JO.to_date),count(JO.name),sum(TD.base_billing_amount),sum(TD.hours) from`tabJob Order` as JO,`tabTimesheet` as T,`tabTimesheet Detail` as TD where T.workflow_state='Approved' and T.name=TD.parent and T.job_order_detail=JO.name and JO.from_date>'{0}' and JO.to_date<'{1}' group by T.employee_company;'''.format(from_date,to_date))


	
	else:
		current_company=current_company[0][0]
		if(filters.get('companies')):
			data=frappe.db.sql(''' select T.employee_company,min(JO.from_date),max(JO.to_date),count(JO.name),sum(TD.base_billing_amount),sum(TD.hours) from`tabJob Order` as JO,`tabTimesheet` as T,`tabTimesheet Detail` as TD where T.workflow_state='Approved' and T.name=TD.parent and T.job_order_detail=JO.name and JO.company='{0}' and JO.from_date>'{1}' and JO.to_date<'{2}' and T.employee_company like '{3}%' group by T.employee_company;'''.format(current_company,from_date,to_date,company_search))
		else:
			data=frappe.db.sql(''' select T.employee_company,min(JO.from_date),max(JO.to_date),count(JO.name),sum(TD.base_billing_amount),sum(TD.hours) from`tabJob Order` as JO,`tabTimesheet` as T,`tabTimesheet Detail` as TD where T.workflow_state='Approved' and T.name=TD.parent and T.job_order_detail=JO.name and JO.company='{0}' and JO.from_date>'{1}' and JO.to_date<'{2}' group by T.employee_company;'''.format(current_company,from_date,to_date))

	return data