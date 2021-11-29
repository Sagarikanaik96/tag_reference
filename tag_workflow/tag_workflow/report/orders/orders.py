# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import data

jobOrder = 'Job Order'
date_time = 'Date & Time'
no_of_workers = 'No Of Workers'
staffing_company = 'Staffing Company'

def execute(filters=None):
    if not filters:
        filters={}
    columns,data=[],[]

    if filters.get('status')==None:

        columns=[
            {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':150},
            {'fieldname':'posting_date_time','label':(date_time),'fieldtype':'Data','width':150},
            {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':150},
            {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Data','width':150},
            {'fieldname':'bid','label':('Bids Received'),'fieldtype':'Data','width':150},
            {'fieldname':'claim','label':('Claimed By'),'fieldtype':'Data','width':150},
            {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':150}
            ]
        data=frappe.db.sql(''' select name,posting_date_time,job_site,no_of_workers,bid,claim,staff_org_claimed from `tabJob Order` ''')
    elif filters.get('status')=='Completed':
        columns=[
            {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':200},
            {'fieldname':'posting_date_time','label':(date_time),'fieldtype':'Data','width':200},
            {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200       },
            {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Data','width':200},
            {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200}
            ]
        data=frappe.db.sql(''' select name,posting_date_time,job_site,no_of_workers,staff_org_claimed from `tabJob Order` where order_status="Completed" ''')
    elif filters.get('status')=='Ongoing':
        columns=[
            {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':200},
            {'fieldname':'posting_date_time','label':(date_time),'fieldtype':'Data','width':200},
            {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200       },
            {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Data','width':200},
            {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200}
            ]
        data=frappe.db.sql(''' select name,posting_date_time,job_site,no_of_workers,staff_org_claimed from `tabJob Order` where order_status="Ongoing" ''')

 
    elif filters.get('status')=='Upcoming':
        columns=[
            {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':200},
            {'fieldname':'posting_date_time','label':(date_time),'fieldtype':'Data','width':200},
            {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':200        },
            {'fieldname':'bid','label':('Bids Received'),'fieldtype':'Data','width':200},
            {'fieldname':'claim','label':('Claimed By'),'fieldtype':'Data','width':200},
            ]
        data=frappe.db.sql(''' select name,posting_date_time,job_site,bid,claim from `tabJob Order` where order_status="Upcoming" ''')

    




    return columns,data

