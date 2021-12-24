# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt


import frappe
from tenacity import Future

def execute(filters=None):
	columns, data = [], []
	print(filters)
	if not filters:
		filters={}
	columns=[
        {'fieldname':'name','label':('Work Order ID'),'fieldtype':'Link','options':'Job Order','width':150},
        {'fieldname':'company','label':('Company Name'),'fieldtype':'Data','width':150},
        {'fieldname':'job_title','label':('Job Title'),'fieldtype':'Data' ,'width':150},
        {'fieldname':'per_hour','label':('Wage/Hour'),'fieldtype':'Data','width':150},
        {'fieldname':'category','label':('Job Category'),'fieldtype':'Data','width':150},
        {'fieldname':'job_order_start_date','label':('Start Date'),'fieldtype':'Data','width':150},
        {'fieldname':'job_site','label':('Job Site'),'fieldtype':'Data' ,'width':150},
        {'fieldname':'no_of_workers','label':('No. of Workers'),'fieldtype':'Data','width':150}
    ]
	ongoing_order=filters.get('ongoing')
	upcoming_order=filters.get('future')
	closed_order=filters.get('closed')

	if (ongoing_order==None and upcoming_order==None and closed_order==None) or (ongoing_order==1 and upcoming_order==1 and closed_order==1):
		data=frappe.db.sql(''' select name,company,job_title,per_hour,category,job_order_start_date,job_site,no_of_workers from `tabJob Order` ''')
	elif ongoing_order==1:
		data=frappe.db.sql(''' select name,company,job_title,per_hour,category,job_order_start_date,job_site,no_of_workers from `tabJob Order` where order_status="Ongoing" ''')
	elif upcoming_order==1:
		data=frappe.db.sql(''' select name,company,job_title,per_hour,category,job_order_start_date,job_site,no_of_workers from `tabJob Order` where order_status="Upcoming"  ''')
	elif closed_order==1:
		data=frappe.db.sql(''' select name,company,job_title,per_hour,category,job_order_start_date,job_site,no_of_workers from `tabJob Order` where order_status="Completed"  ''')
	elif ongoing_order==1 and upcoming_order==1:
		data=frappe.db.sql(''' select name,company,job_title,per_hour,category,job_order_start_date,job_site,no_of_workers from `tabJob Order` where order_status="Ongoing" or order_status="Upcoming" ''')
	elif closed_order==1 and upcoming_order==1:
		data=frappe.db.sql(''' select name,company,job_title,per_hour,category,job_order_start_date,job_site,no_of_workers from `tabJob Order` where order_status="Completed" or order_status="Upcoming" ''')
	elif ongoing_order==1 and closed_order==1:
		data=frappe.db.sql(''' select name,company,job_title,per_hour,category,job_order_start_date,job_site,no_of_workers from `tabJob Order` where order_status="Ongoing" or order_status="Completed" ''')
	return columns, data
