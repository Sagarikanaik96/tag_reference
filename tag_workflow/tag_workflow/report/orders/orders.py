# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import data
import datetime
jobOrder = 'Job Order'
date_time = 'Date & Time'
no_of_workers = 'No Of Workers'
staffing_company = 'Staffing Company'
bids_received = 'Bids Received'
claimed_by = 'Claimed By'

def execute(filters=None):
    if not filters:
        filters={}
    columns,data=[],[]
    company=frappe.defaults.get_user_default("Company")
    today = datetime.datetime.now()
    if frappe.session.user=="Administrator":
        if filters.get('status')==None:
            columns=[
                {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':150},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':150},
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':150},
                {'fieldname':'bid','label':(bids_received),'fieldtype':'Int','width':150},
                {'fieldname':'claim','label':(claimed_by),'fieldtype':'Data','width':150},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':150}
                ]
            sql = ''' select name,from_date,job_site,no_of_workers,bid,claim,staff_org_claimed from `tabJob Order` '''
            data=frappe.db.sql(sql)
        elif filters.get('status')=='Completed':
            columns=[
                {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200       },
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':200},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200}
                ]
            sql = ''' select name,from_date,job_site,no_of_workers,staff_org_claimed from `tabJob Order` where to_date<'{0}' '''.format(today)
            data=frappe.db.sql(sql)
        elif filters.get('status')=='Ongoing':
            columns=[
                {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200       },
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':200},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200}
                ]
            sql = ''' select name,from_date,job_site,no_of_workers,staff_org_claimed from `tabJob Order` where from_date<'{0}' and to_date>'{0}' '''.format(today)
            data=frappe.db.sql(sql)

    
        elif filters.get('status')=='Upcoming':
            columns=[
                {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':200        },
                {'fieldname':'bid','label':(bids_received),'fieldtype':'Int','width':200},
                {'fieldname':'claim','label':(claimed_by),'fieldtype':'Data','width':200},
                ]
            sql = ''' select name,from_date,job_site,bid,claim from `tabJob Order` where from_date>'{0}' '''.format(today)
            data=frappe.db.sql(sql)
    else:
        if filters.get('status')==None:

            columns=[
                {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':150},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':150},
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':150},
                {'fieldname':'bid','label':(bids_received),'fieldtype':'Int','width':150},
                {'fieldname':'claim','label':(claimed_by),'fieldtype':'Data','width':150},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':150}
                ]
            sql = ''' select name,from_date,job_site,no_of_workers,bid,claim,staff_org_claimed from `tabJob Order` where company='{0}' '''.format(company)
            data=frappe.db.sql(sql)
        elif filters.get('status')=='Completed':
            columns=[
                {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200       },
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':200},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200}
                ]
            sql = ''' select name,from_date,job_site,no_of_workers,staff_org_claimed from `tabJob Order`  where to_date<'{0}'  AND company='{1}' '''.format(today,company)
            data=frappe.db.sql(sql)
        elif filters.get('status')=='Ongoing':
            columns=[
                {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200       },
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':200},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200}
                ]
            sql = ''' select name,from_date,job_site,no_of_workers,staff_org_claimed from `tabJob Order` where from_date<'{0}' and to_date>'{0}' AND company='{1}' '''.format(today,company)
            data=frappe.db.sql(sql)

    
        elif filters.get('status')=='Upcoming':
            columns=[
                {'fieldname':'name','label':('Title'),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':200        },
                {'fieldname':'bid','label':(bids_received),'fieldtype':'Int','width':200},
                {'fieldname':'claim','label':(claimed_by),'fieldtype':'Data','width':200},
                ]
            sql = ''' select name,from_date,job_site,bid,claim from `tabJob Order` where from_date>'{0}'  AND company='{1}' '''.format(today,company)
            data=frappe.db.sql(sql)

    return columns,data
