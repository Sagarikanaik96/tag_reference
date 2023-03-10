# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt


import frappe
from tenacity import Future

def execute(filters=None):
	columns, data = [], []
	if not filters:
		filters={}
	columns=[
        {'fieldname':'name','label':('Work Order ID'),'fieldtype':'Link','options':'Job Order','width':150},
        {'fieldname':'company','label':('Company Name'),'fieldtype':'Data','width':150},
        {'fieldname':'select_job','label':('Job Title'),'fieldtype':'Data' ,'width':150},
        {'fieldname':'per_hour','label':('Wage/Hour'),'fieldtype':'Currency','width':150},
        {'fieldname':'category','label':('Job Category'),'fieldtype':'Data','width':150},
        {'fieldname':'from_date','label':('Start Date'),'fieldtype':'Data','width':150},
        {'fieldname':'job_site','label':('Job Site'),'fieldtype':'Data' ,'width':150},
        {'fieldname':'no_of_workers','label':('No. of Workers'),'fieldtype':'Int','width':150}
    ]
	ongoing_order=filters.get('ongoing')
	upcoming_order=filters.get('future')
	closed_order=filters.get('closed')
	print(ongoing_order,upcoming_order,closed_order)

	if (ongoing_order==None and upcoming_order==None and closed_order==None) or (ongoing_order==1 and upcoming_order==1 and closed_order==1):
		data=frappe.db.sql(''' select name,company,select_job,per_hour,category,from_date,job_site,no_of_workers from `tabJob Order` ''')
	elif ongoing_order==1 and upcoming_order==1:
		data=frappe.db.sql(''' select name,company,select_job,per_hour,category,from_date,job_site,no_of_workers from `tabJob Order` where order_status="Ongoing" or order_status="Upcoming" ''')
	elif closed_order==1 and upcoming_order==1:
		data=frappe.db.sql(''' select name,company,select_job,per_hour,category,from_date,job_site,no_of_workers from `tabJob Order` where order_status="Completed" or order_status="Upcoming" ''')
	elif ongoing_order==1 and closed_order==1:
		data=frappe.db.sql(''' select name,company,select_job,per_hour,category,from_date,job_site,no_of_workers from `tabJob Order` where order_status="Ongoing" or order_status="Completed" ''')
	elif ongoing_order==1:
		data=frappe.db.sql(''' select name,company,select_job,per_hour,category,from_date,job_site,no_of_workers from `tabJob Order` where order_status="Ongoing" ''')
	elif upcoming_order==1:
		data=frappe.db.sql(''' select name,company,select_job,per_hour,category,from_date,job_site,no_of_workers from `tabJob Order` where order_status="Upcoming"  ''')
	elif closed_order==1:
		data=frappe.db.sql(''' select name,company,select_job,per_hour,category,from_date,job_site,no_of_workers from `tabJob Order` where order_status="Completed"  ''')
	return columns, data
